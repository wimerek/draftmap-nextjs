#!/usr/bin/env python3
"""
migrate_airtable_to_sheets.py

Merges Airtable CSV exports (2024, 2025, 2026) into a single Google Sheets-ready CSV.
Generates player_id slugs, normalizes field names, drops unused stat fields.

Usage:
  python scripts/migrate_airtable_to_sheets.py \
    --y2024 data/airtable_2024.csv \
    --y2025 data/airtable_2025.csv \
    --y2026 data/airtable_2026.csv \
    --out   data/players_combined.csv

Steps:
  1. Export each Airtable table as CSV (Grid view → Download CSV).
  2. Place them in the draftmap-nextjs/data/ folder and run this script.
  3. Open the output CSV, copy all rows, paste into the 'players' tab in Google Sheets.

player_id format: firstname-lastname-pos-school3-draftyear
  e.g. "caleb-williams-qb-usc-2024"
  e.g. "byron-young-dt-ala-2023" vs "byron-young-edge-ten-2023"
"""

import argparse
import csv
import re
import sys
from pathlib import Path

# ── Column mapping: Airtable field name → new schema field name ───────────────

FIELD_MAP = {
    "Player Name":              "name",
    "Position":                 "pos",
    "School":                   "school",
    "Draft Round":              "rd",
    "Rank":                     "rank",
    "Height (NFL format)":      "height",
    "Weight (lbs)":             "weight",
    "Hand Size (inches)":       "hand",
    "Arm Length (inches)":      "arm",
    "40-yard dash (s)":         "forty",
    "10-yard split (s)":        "split10",
    "Vertical Jump (inches)":   "vertical",
    "Broad Jump (inches)":      "broad",
    "3-Cone Drill (s)":         "cone3",
    "Shuttle (s)":              "shuttle",
    "Bench Press (reps)":       "bench",
    "Scouting Notes":           "notes",
    "Role":                     "role",
    "s1":                       "s1",
    "s2":                       "s2",
    "s3":                       "s3",
    "Round Drafted":            "rd_drafted",
    "Pick Drafted":             "pick_drafted",
    "Team Drafted":             "team_drafted",
}

# Fields intentionally dropped (belong in player_seasons tab, not players tab)
DROPPED_FIELDS = {"Yards", "Touchdowns", "Tackles", "Interceptions", "Pass Breakups (PBUs)"}

# Output column order (matches the Google Sheets header row you'll set up)
OUTPUT_COLUMNS = [
    "player_id",
    "draft_year",
    "name",
    "pos",
    "school",
    "rd",
    "rank",
    "consensus_source",
    "height",
    "weight",
    "hand",
    "arm",
    "forty",
    "split10",
    "vertical",
    "broad",
    "cone3",
    "shuttle",
    "bench",
    "role",
    "s1",
    "s2",
    "s3",
    "notes",
    "rd_drafted",
    "pick_drafted",
    "team_drafted",
]

# ── player_id helpers ─────────────────────────────────────────────────────────

def name_to_slug(name: str) -> str:
    """'Shedeur Sanders' → 'shedeur-sanders', handles apostrophes, hyphens, accents."""
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9\s]", "", name)   # strip apostrophes, dots, etc.
    name = re.sub(r"\s+", "-", name.strip())
    return name

def school_to_code(school: str) -> str:
    """
    Derive a 3-letter school code from the school name.
    Uses first 3 letters of the first word (letters only).
    e.g. "Alabama" → "ala", "Ohio State" → "ohi", "USC" → "usc"
    Note: replace with PFR standard codes once that table is downloaded.
    """
    if not school or not school.strip():
        return "unk"
    first_word = re.sub(r"[^a-zA-Z]", "", school.strip().split()[0])
    return first_word[:3].lower() if first_word else "unk"

def make_player_id(name: str, pos: str, school: str, draft_year: int) -> str:
    """'Caleb Williams', 'QB', 'USC', 2024 → 'caleb-williams-qb-usc-2024'"""
    name_slug   = name_to_slug(name)
    pos_slug    = re.sub(r"[^a-z0-9]", "", pos.lower())
    school_code = school_to_code(school)
    return f"{name_slug}-{pos_slug}-{school_code}-{draft_year}"

# ── CSV processing ────────────────────────────────────────────────────────────

def normalize_pos(pos: str) -> str:
    """Uppercase and map DL → DT for consistency."""
    p = pos.strip().upper()
    return "DT" if p == "DL" else p

def process_file(csv_path: Path, year: int) -> list[dict]:
    """Read one Airtable CSV export and return list of normalized row dicts."""
    rows = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for raw in reader:
            row = {"draft_year": str(year), "consensus_source": ""}

            for airtable_col, new_col in FIELD_MAP.items():
                val = raw.get(airtable_col, "").strip()
                row[new_col] = val

            # Normalize position
            row["pos"] = normalize_pos(row.get("pos", ""))

            # Generate player_id
            row["player_id"] = make_player_id(
                row.get("name", ""),
                row.get("pos", ""),
                row.get("school", ""),
                year,
            )

            rows.append(row)

    return rows

def check_duplicate_ids(all_rows: list[dict]) -> None:
    """Warn if any player_ids collide — requires manual review."""
    seen = {}
    dupes = []
    for row in all_rows:
        pid = row["player_id"]
        name = row["name"]
        if pid in seen and seen[pid] != name:
            dupes.append((pid, seen[pid], name))
        seen[pid] = name
    if dupes:
        print("\n⚠️  DUPLICATE player_ids detected — review these manually:")
        for pid, first, second in dupes:
            print(f"   {pid!r}  →  '{first}'  vs  '{second}'")
        print("   Tip: add school or year suffix to disambiguate.\n")
    else:
        print("✓  No duplicate player_ids detected.")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Merge Airtable CSVs → Google Sheets players CSV")
    parser.add_argument("--y2024", required=True, help="Path to 2024 Airtable CSV export")
    parser.add_argument("--y2025", required=True, help="Path to 2025 Airtable CSV export")
    parser.add_argument("--y2026", required=True, help="Path to 2026 Airtable CSV export")
    parser.add_argument("--out",   required=True, help="Output CSV path (e.g. data/players_combined.csv)")
    args = parser.parse_args()

    sources = [
        (Path(args.y2024), 2024),
        (Path(args.y2025), 2025),
        (Path(args.y2026), 2026),
    ]

    all_rows = []
    for path, year in sources:
        if not path.exists():
            print(f"ERROR: File not found: {path}", file=sys.stderr)
            sys.exit(1)
        rows = process_file(path, year)
        print(f"  {year}: {len(rows)} players loaded from {path.name}")
        all_rows.append(rows)

    # Sort: 2026 first (most recent), then 2025, 2024
    all_rows_flat = []
    for rows in reversed(all_rows):
        all_rows_flat.extend(rows)

    check_duplicate_ids(all_rows_flat)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLUMNS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_rows_flat)

    print(f"\n✓  Combined CSV written to: {out_path}")
    print(f"   Total rows: {len(all_rows_flat)}")
    print("\nNext steps:")
    print("  1. Open Google Sheets (data@draftmap.app)")
    print("  2. Create a new spreadsheet: 'DraftMap Data'")
    print("  3. Rename the first tab: 'players'")
    print("  4. File → Import → Upload the output CSV → 'Replace current sheet'")
    print("  5. Share → Anyone with the link → Viewer")
    print("  6. Copy the Spreadsheet ID from the URL")
    print("     e.g. docs.google.com/spreadsheets/d/[THIS_PART]/edit")

if __name__ == "__main__":
    main()
