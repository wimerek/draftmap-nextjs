// lib/teamContext.ts
// Server-only. Builds team-season and player-team lookups from CSV data at
// module load time. Returns null (not throws) on missing data so scoring
// degrades gracefully for players or seasons outside the 2021-2024 range.
//
// Known gap: multi-team seasons use primary team only (~5% of player-seasons).
// A player traded at week 12 gets their pre-trade team's context for the full
// season. Low impact — flagged for a future data expansion pass.

import fs from 'fs'
import path from 'path'

export interface TeamSeasonContext {
  season: number
  team: string
  oline_quality: number         // 0–100, higher = better OL
  pass_prot_quality: number     // 0–100
  run_block_quality: number     // 0–100
  def_pass_rush_quality: number // 0–100, higher = better pass rush
  def_run_stop_quality: number  // 0–100
  pressure_rate_allowed: number // raw rate (sacks+hits) / dropbacks
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const values = line.split(',')
    return Object.fromEntries(headers.map((h, i) => [h, (values[i] ?? '').trim()]))
  })
}

function loadCSV(filename: string): Record<string, string>[] {
  try {
    const text = fs.readFileSync(path.join(process.cwd(), 'data', filename), 'utf-8')
    return parseCSV(text)
  } catch {
    return []
  }
}

// Build lookups once on module load — O(1) lookups at scoring time
const contextMap = new Map<string, TeamSeasonContext>()    // "season_team"  → context
const playerTeamMap = new Map<string, string>()            // "season_pfrId" → team

for (const row of loadCSV('team_season_context_2021_2024.csv')) {
  const season = parseInt(row.season, 10)
  if (!row.team || !season) continue
  contextMap.set(`${season}_${row.team}`, {
    season,
    team:                  row.team,
    oline_quality:         parseFloat(row.oline_quality),
    pass_prot_quality:     parseFloat(row.pass_prot_quality),
    run_block_quality:     parseFloat(row.run_block_quality),
    def_pass_rush_quality: parseFloat(row.def_pass_rush_quality),
    def_run_stop_quality:  parseFloat(row.def_run_stop_quality),
    pressure_rate_allowed: parseFloat(row.pressure_rate_allowed),
  })
}

for (const row of loadCSV('player_season_team_2021_2024.csv')) {
  const season = parseInt(row.season, 10)
  if (row.pfr_id && season) {
    playerTeamMap.set(`${season}_${row.pfr_id}`, row.team)
  }
}

export function getTeamContext(team: string, season: number): TeamSeasonContext | null {
  return contextMap.get(`${season}_${team}`) ?? null
}

export function getPlayerTeam(pfrId: string, season: number): string | null {
  return playerTeamMap.get(`${season}_${pfrId}`) ?? null
}

export function getPlayerContext(pfrId: string, season: number): TeamSeasonContext | null {
  const team = getPlayerTeam(pfrId, season)
  if (!team) return null
  return getTeamContext(team, season)
}

// Pre-computed league average pressure rate across all 128 team-seasons (2021–2024)
export const LEAGUE_AVG_PRESSURE_RATE = 0.2064
