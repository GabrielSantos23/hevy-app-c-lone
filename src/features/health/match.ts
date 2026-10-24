export type HealthWorkout = {
  uuid: string;
  start: number;
  end: number;
  activityType: string;
  source: string;
};

export type AppSession = { id: string; start: number; end: number };

export const MIN_COVERAGE = 0.5;

export const overlap = (a: { start: number; end: number }, b: { start: number; end: number }) =>
  Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));

export function coverage(a: { start: number; end: number }, b: { start: number; end: number }) {
  const shorter = Math.min(a.end - a.start, b.end - b.start);
  return shorter > 0 ? overlap(a, b) / shorter : 0;
}

const matches = (a: AppSession, h: HealthWorkout) => coverage(a, h) >= MIN_COVERAGE;

export type MatchResult = {
  links: { workoutId: string; uuid: string }[];
  ambiguous: { workoutId: string; uuids: string[] }[];
};

export function autoMatch(
  sessions: AppSession[],
  health: HealthWorkout[],
  excluded: Set<string>,
): MatchResult {
  const pool = health.filter((h) => !excluded.has(h.uuid));
  const links: MatchResult['links'] = [];
  const ambiguous: MatchResult['ambiguous'] = [];
  for (const s of sessions) {
    const hits = pool.filter((h) => matches(s, h));
    if (hits.length > 1) {
      ambiguous.push({ workoutId: s.id, uuids: hits.map((h) => h.uuid) });
      continue;
    }
    const [hit] = hits;
    if (!hit) continue;
    const rivals = sessions.filter((other) => other.id !== s.id && matches(other, hit));
    if (rivals.length) ambiguous.push({ workoutId: s.id, uuids: [hit.uuid] });
    else links.push({ workoutId: s.id, uuid: hit.uuid });
  }
  return { links, ambiguous };
}

export const NEARBY_MS = 12 * 3_600_000;

export function candidates(session: AppSession, health: HealthWorkout[], taken: Set<string>) {
  const distance = (h: HealthWorkout) =>
    overlap(session, h) > 0
      ? 0
      : Math.min(Math.abs(h.start - session.end), Math.abs(session.start - h.end));
  return health
    .filter((h) => !taken.has(h.uuid) && distance(h) <= NEARBY_MS)
    .map((h) => ({ ...h, coverage: coverage(session, h), distance: distance(h) }))
    .sort((a, b) => b.coverage - a.coverage || a.distance - b.distance);
}
