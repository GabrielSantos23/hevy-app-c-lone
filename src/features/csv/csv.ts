import type { SetType } from '@/db/schema';

export type ImportedSet = {
  setType: SetType;
  weightKg: number | null;
  reps: number | null;
  distanceM: number | null;
  durationS: number | null;
  rpe: number | null;
};

export type ImportedExercise = {
  title: string;
  notes: string;
  supersetId: number | null;
  sets: ImportedSet[];
};

export type ImportedWorkout = {
  title: string;
  startedAt: number;
  endedAt: number;
  notes: string;
  exercises: ImportedExercise[];
};

export type ImportedMeasurement = {
  measuredAt: number;
  values: Record<string, number | null>;
};

const LB_PER_KG = 2.2046226218;
const KM_PER_MI = 1.609344;
const CM_PER_IN = 2.54;

export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, '');
  const firstLine = text.slice(0, text.indexOf('\n') >>> 0);
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== '')) rows.push(row);
  return rows;
}

const toRecords = (rows: string[][]) => {
  const [header, ...body] = rows;
  const keys = header.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
};

const num = (s: string | undefined) => {
  if (!s) return null;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export function parseHevyDate(s: string) {
  const m = s.match(/^(\d{1,2}) (\w{3}) (\d{4}),? (\d{1,2}):(\d{2})/);
  if (!m) return Date.parse(s);
  return new Date(+m[3], MONTHS.indexOf(m[2].toLowerCase()), +m[1], +m[4], +m[5]).getTime();
}

export function formatHevyDate(ms: number) {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  const month = MONTHS[d.getMonth()];
  return `${d.getDate()} ${month[0].toUpperCase()}${month.slice(1)} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type CsvKind = 'hevy-workouts' | 'hevy-measurements' | 'strong';

export function detectCsv(rows: string[][]): CsvKind | null {
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase());
  if (header.includes('exercise_title') && header.includes('set_index')) return 'hevy-workouts';
  if (
    header.includes('date') &&
    header.some((h) => h.startsWith('weight_') || h.endsWith('_cm') || h.endsWith('_in'))
  )
    return 'hevy-measurements';
  if (header.includes('exercise name') && header.includes('set order')) return 'strong';
  return null;
}

const setTypes: SetType[] = ['normal', 'warmup', 'dropset', 'failure'];

function groupWorkouts(
  records: Record<string, string>[],
  key: (r: Record<string, string>) => string,
  make: (r: Record<string, string>) => Omit<ImportedWorkout, 'exercises'>,
  exerciseOf: (r: Record<string, string>) => Omit<ImportedExercise, 'sets'>,
  setOf: (r: Record<string, string>) => ImportedSet | null,
  startsEntry: (r: Record<string, string>) => boolean = () => false,
): ImportedWorkout[] {
  const workouts = new Map<string, ImportedWorkout>();
  for (const r of records) {
    const set = setOf(r);
    if (!set) continue;
    const k = key(r);
    let w = workouts.get(k);
    if (!w) {
      w = { ...make(r), exercises: [] };
      workouts.set(k, w);
    }
    const e = exerciseOf(r);
    const last = w.exercises.at(-1);
    if (last && last.title === e.title && !startsEntry(r)) last.sets.push(set);
    else w.exercises.push({ ...e, sets: [set] });
  }
  return [...workouts.values()].filter((w) => Number.isFinite(w.startedAt));
}

export function parseHevyWorkouts(rows: string[][]): ImportedWorkout[] {
  const records = toRecords(rows);
  const lbs = rows[0].some((h) => h.trim() === 'weight_lbs');
  const miles = rows[0].some((h) => h.trim() === 'distance_miles');
  const text = (s: string) => s.replace(/\\n/g, '\n');
  return groupWorkouts(
    records,
    (r) => `${r.start_time}|${r.title}`,
    (r) => ({
      title: r.title,
      startedAt: parseHevyDate(r.start_time),
      endedAt: parseHevyDate(r.end_time),
      notes: text(r.description ?? ''),
    }),
    (r) => ({
      title: r.exercise_title,
      notes: text(r.exercise_notes ?? ''),
      supersetId: num(r.superset_id),
    }),
    (r) => {
      const weight = num(lbs ? r.weight_lbs : r.weight_kg);
      const distance = num(miles ? r.distance_miles : r.distance_km);
      return {
        setType: setTypes.includes(r.set_type as SetType) ? (r.set_type as SetType) : 'normal',
        weightKg: weight === null ? null : lbs ? weight / LB_PER_KG : weight,
        reps: num(r.reps),
        distanceM: distance === null ? null : (miles ? distance * KM_PER_MI : distance) * 1000,
        durationS: num(r.duration_seconds),
        rpe: num(r.rpe),
      };
    },
    (r) => r.set_index === '0',
  );
}

const strongDuration = (s: string) => {
  const h = Number(s.match(/(\d+)\s*h/)?.[1] ?? 0);
  const m = Number(s.match(/(\d+)\s*m/)?.[1] ?? 0);
  const sec = Number(s.match(/(\d+)\s*s/)?.[1] ?? 0);
  return (h * 3600 + m * 60 + sec) * 1000;
};

export function parseStrong(rows: string[][]): ImportedWorkout[] {
  const records = toRecords(rows);
  return groupWorkouts(
    records,
    (r) => `${r.date}|${r['workout name']}`,
    (r) => {
      const startedAt = Date.parse(r.date.replace(' ', 'T'));
      return {
        title: r['workout name'],
        startedAt,
        endedAt: startedAt + strongDuration(r.duration ?? ''),
        notes: r['workout notes'] ?? '',
      };
    },
    (r) => ({ title: r['exercise name'], notes: r.notes ?? '', supersetId: null }),
    (r) => {
      const order = (r['set order'] ?? '').toUpperCase();
      const setType: SetType | null =
        order === 'W'
          ? 'warmup'
          : order === 'D'
            ? 'dropset'
            : order === 'F'
              ? 'failure'
              : /^\d+$/.test(order)
                ? 'normal'
                : null;
      if (!setType) return null;
      const lbs = (r['weight unit'] ?? '').toLowerCase().startsWith('lb');
      const miles = (r['distance unit'] ?? '').toLowerCase().startsWith('mi');
      const weight = num(r.weight);
      const distance = num(r.distance);
      return {
        setType,
        weightKg: weight ? (lbs ? weight / LB_PER_KG : weight) : null,
        reps: num(r.reps) || null,
        distanceM: distance ? (miles ? distance * KM_PER_MI : distance) * 1000 : null,
        durationS: num(r.seconds) || null,
        rpe: num(r.rpe),
      };
    },
  );
}

const measurementColumns = [
  'weight',
  'fat_percent',
  'neck',
  'shoulder',
  'chest',
  'left_bicep',
  'right_bicep',
  'left_forearm',
  'right_forearm',
  'abdomen',
  'waist',
  'hips',
  'left_thigh',
  'right_thigh',
  'left_calf',
  'right_calf',
] as const;

export const measurementKey = (column: (typeof measurementColumns)[number]) =>
  column === 'weight'
    ? 'weightKg'
    : column === 'fat_percent'
      ? 'fatPercent'
      : `${column.replace(/_(\w)/g, (_, c: string) => c.toUpperCase())}Cm`;

export function parseHevyMeasurements(rows: string[][]): ImportedMeasurement[] {
  const records = toRecords(rows);
  return records
    .map((r) => {
      const values: Record<string, number | null> = {};
      for (const c of measurementColumns) {
        if (c === 'weight') {
          const lb = num(r.weight_lbs);
          values[measurementKey(c)] = lb !== null ? lb / LB_PER_KG : num(r.weight_kg);
        } else if (c === 'fat_percent') values[measurementKey(c)] = num(r.fat_percent);
        else {
          const inches = num(r[`${c}_in`]);
          values[measurementKey(c)] = inches !== null ? inches * CM_PER_IN : num(r[`${c}_cm`]);
        }
      }
      return { measuredAt: parseHevyDate(r.date), values };
    })
    .filter((m) => Number.isFinite(m.measuredAt));
}

const quote = (v: string | number | null) =>
  v === null
    ? ''
    : typeof v === 'number'
      ? String(Number(v.toFixed(2)))
      : `"${v.replace(/"/g, '""').replace(/\r?\n/g, '\\n')}"`;

export type ExportUnits = {
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'km' | 'mi';
  lengthUnit: 'cm' | 'in';
};

export function exportHevyWorkouts(workouts: ImportedWorkout[], units: ExportUnits) {
  const lb = units.weightUnit === 'lb';
  const mi = units.distanceUnit === 'mi';
  const header = [
    'title',
    'start_time',
    'end_time',
    'description',
    'exercise_title',
    'superset_id',
    'exercise_notes',
    'set_index',
    'set_type',
    lb ? 'weight_lbs' : 'weight_kg',
    'reps',
    mi ? 'distance_miles' : 'distance_km',
    'duration_seconds',
    'rpe',
  ];
  const lines = [header.map(quote).join(',')];
  for (const w of workouts)
    for (const e of w.exercises)
      e.sets.forEach((s, i) => {
        const km = s.distanceM ? s.distanceM / 1000 : null;
        lines.push(
          [
            w.title,
            formatHevyDate(w.startedAt),
            formatHevyDate(w.endedAt),
            w.notes,
            e.title,
            e.supersetId,
            e.notes,
            i,
            s.setType,
            s.weightKg ? (lb ? s.weightKg * LB_PER_KG : s.weightKg) : null,
            s.reps,
            km ? (mi ? km / KM_PER_MI : km) : null,
            s.durationS,
            s.rpe,
          ]
            .map(quote)
            .join(','),
        );
      });
  return lines.join('\n');
}

export function exportHevyMeasurements(items: ImportedMeasurement[], units: ExportUnits) {
  const lb = units.weightUnit === 'lb';
  const inches = units.lengthUnit === 'in';
  const header = [
    'date',
    ...measurementColumns.map((c) =>
      c === 'weight'
        ? lb
          ? 'weight_lbs'
          : 'weight_kg'
        : c === 'fat_percent'
          ? c
          : `${c}_${inches ? 'in' : 'cm'}`,
    ),
  ];
  const lines = [header.map(quote).join(',')];
  for (const m of items)
    lines.push(
      [
        formatHevyDate(m.measuredAt),
        ...measurementColumns.map((c) => {
          const v = m.values[measurementKey(c)];
          if (v === null || v === undefined) return null;
          if (c === 'weight') return lb ? v * LB_PER_KG : v;
          if (c === 'fat_percent') return v;
          return inches ? v / CM_PER_IN : v;
        }),
      ]
        .map(quote)
        .join(','),
    );
  return lines.join('\n');
}
