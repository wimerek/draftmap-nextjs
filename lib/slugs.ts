import type { Player } from './sheets';

export function generateBaseSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function buildSlugMap(players: Player[]): Map<string, string> {
  const playerById = new Map(players.map(p => [p.player_id, p]));

  // First pass: base slugs per player
  const baseByPid = new Map<string, string>();
  players.forEach(p => {
    baseByPid.set(p.player_id, generateBaseSlug(p.name));
  });

  // Group player_ids by base slug to detect collisions
  const pidsByBase = new Map<string, string[]>();
  baseByPid.forEach((slug, pid) => {
    const group = pidsByBase.get(slug) ?? [];
    group.push(pid);
    pidsByBase.set(slug, group);
  });

  const result = new Map<string, string>();

  pidsByBase.forEach((pids, baseSlug) => {
    if (pids.length === 1) {
      result.set(pids[0], baseSlug);
      return;
    }

    // Collision: append -{pos} to all
    const pidsByPosSlug = new Map<string, string[]>();
    pids.forEach(pid => {
      const p = playerById.get(pid)!;
      const posSlug = `${baseSlug}-${p.pos.toLowerCase()}`;
      const group = pidsByPosSlug.get(posSlug) ?? [];
      group.push(pid);
      pidsByPosSlug.set(posSlug, group);
    });

    pidsByPosSlug.forEach((posPids, posSlug) => {
      if (posPids.length === 1) {
        result.set(posPids[0], posSlug);
        return;
      }

      // Final fallback: append -{school3}
      posPids.forEach(pid => {
        const p = playerById.get(pid)!;
        const school3 = (p.school ?? 'unk')
          .slice(0, 3)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        result.set(pid, `${posSlug}-${school3}`);
      });
    });
  });

  return result;
}
