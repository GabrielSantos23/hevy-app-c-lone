import {
  detectCsv,
  exportHevyMeasurements,
  exportHevyWorkouts,
  formatHevyDate,
  parseCsv,
  parseHevyDate,
  parseHevyMeasurements,
  parseHevyWorkouts,
  parseStrong,
} from './csv';
import type { Equipment } from '@/db/schema';

import { hevyAliases } from './hevy-aliases';
import { buildMatcher, inferCustom } from './match';

const hevy = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Push 💪","23 Oct 2026, 16:17","23 Oct 2026, 17:37","Felt \\"good\\"\\nslept well","Bench Press (Barbell)",,"",0,"warmup",40,15,,,
"Push 💪","23 Oct 2026, 16:17","23 Oct 2026, 17:37","Felt \\"good\\"\\nslept well","Bench Press (Barbell)",,"slow",1,"normal",60.5,8,,,8.5
"Push 💪","23 Oct 2026, 16:17","23 Oct 2026, 17:37","Felt \\"good\\"\\nslept well","Treadmill",,"",0,"normal",,,1.5,600,
"Legs","22 Oct 2026, 09:05","22 Oct 2026, 10:00","","Leg Press (Machine)",1,"",0,"normal",120,10,,,
`;

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, line breaks and semicolons', () => {
    expect(parseCsv('a,b\r\n"x, ""y""","line1\nline2"\n')).toEqual([
      ['a', 'b'],
      ['x, "y"', 'line1\nline2'],
    ]);
    expect(parseCsv('﻿a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('Hevy workouts', () => {
  const rows = parseCsv(hevy.replace(/\\"/g, '""'));

  it('detects the file and groups rows into workouts and exercises', () => {
    expect(detectCsv(rows)).toBe('hevy-workouts');
    const [push, legs] = parseHevyWorkouts(rows);
    expect(push.title).toBe('Push 💪');
    expect(push.notes).toBe('Felt "good"\nslept well');
    expect(push.endedAt - push.startedAt).toBe(80 * 60_000);
    expect(push.exercises.map((e) => [e.title, e.sets.length])).toEqual([
      ['Bench Press (Barbell)', 2],
      ['Treadmill', 1],
    ]);
    expect(push.exercises[0].sets[1]).toEqual({
      setType: 'normal',
      weightKg: 60.5,
      reps: 8,
      distanceM: null,
      durationS: null,
      rpe: 8.5,
    });
    expect(push.exercises[1].sets[0]).toMatchObject({ distanceM: 1500, durationS: 600 });
    expect(legs.exercises[0].supersetId).toBe(1);
  });

  it('keeps the same exercise logged twice in a row as two entries', () => {
    const csv = [
      hevy.split('\n')[0],
      '"A","1 Jan 2026, 10:00","1 Jan 2026, 11:00","","Curl",,"",0,"normal",10,10,,,',
      '"A","1 Jan 2026, 10:00","1 Jan 2026, 11:00","","Curl",,"",1,"normal",10,10,,,',
      '"A","1 Jan 2026, 10:00","1 Jan 2026, 11:00","","Curl",,"",0,"normal",12,8,,,',
    ].join('\n');
    const [w] = parseHevyWorkouts(parseCsv(csv));
    expect(w.exercises.map((e) => e.sets.length)).toEqual([2, 1]);
  });

  it('round-trips through export, including pounds', () => {
    const workouts = parseHevyWorkouts(rows);
    const kgUnits = { weightUnit: 'kg', distanceUnit: 'km', lengthUnit: 'cm' } as const;
    expect(parseHevyWorkouts(parseCsv(exportHevyWorkouts(workouts, kgUnits)))).toEqual(workouts);
    const lbCsv = exportHevyWorkouts(workouts, {
      ...kgUnits,
      weightUnit: 'lb',
      distanceUnit: 'mi',
    });
    expect(lbCsv.split('\n')[0]).toContain('"weight_lbs"');
    const back = parseHevyWorkouts(parseCsv(lbCsv));
    expect(back[0].exercises[0].sets[1].weightKg).toBeCloseTo(60.5, 1);
    expect(back[0].exercises[1].sets[0].distanceM).toBeCloseTo(1500, -1);
  });

  it('writes dates the way Hevy does', () => {
    expect(formatHevyDate(parseHevyDate('3 Mar 2025, 08:05'))).toBe('3 Mar 2025, 08:05');
  });
});

describe('Hevy measurements', () => {
  it('reads metric and imperial columns', () => {
    const rows = parseCsv(
      '"date","weight_lbs","fat_percent","waist_in"\n"1 Jan 2026, 08:00",180,15,32\n',
    );
    expect(detectCsv(rows)).toBe('hevy-measurements');
    const [m] = parseHevyMeasurements(rows);
    expect(m.values.weightKg).toBeCloseTo(81.6, 1);
    expect(m.values.fatPercent).toBe(15);
    expect(m.values.waistCm).toBeCloseTo(81.28, 2);
    const out = exportHevyMeasurements([m], {
      weightUnit: 'kg',
      distanceUnit: 'km',
      lengthUnit: 'cm',
    });
    expect(out.split('\n')[0]).toContain('"waist_cm"');
  });
});

describe('Strong', () => {
  it('reads sets, skips rest timer rows and converts pounds', () => {
    const rows = parseCsv(
      'Date;Workout Name;Duration;Exercise Name;Set Order;Weight;Weight Unit;Reps;Distance;Distance Unit;Seconds;Notes;Workout Notes;RPE\n' +
        '2024-05-01 18:00:00;Upper;1h 5m;Bench Press (Barbell);W;45;lbs;10;0;;0;;;\n' +
        '2024-05-01 18:00:00;Upper;1h 5m;Bench Press (Barbell);1;135;lbs;8;0;;0;;;8\n' +
        '2024-05-01 18:00:00;Upper;1h 5m;Bench Press (Barbell);Rest Timer;0;;0;0;;90;;;\n',
    );
    expect(detectCsv(rows)).toBe('strong');
    const [w] = parseStrong(rows);
    expect(w.endedAt - w.startedAt).toBe(65 * 60_000);
    expect(w.exercises[0].sets.map((s) => s.setType)).toEqual(['warmup', 'normal']);
    expect(w.exercises[0].sets[1].weightKg).toBeCloseTo(61.2, 1);
  });
});

describe('exercise matching', () => {
  const match = buildMatcher([
    { id: 'pulldown-free', name: 'Lat Pulldown', equipment: 'none' },
    { id: 'bench', name: 'Bench Press', equipment: 'barbell' },
    { id: 'pulldown', name: 'Lat Pulldown', equipment: 'machine' },
    { id: 'chin', name: 'Chin-Up', equipment: 'none' },
    { id: 'fly', name: 'Cable Front Raise', equipment: 'machine' },
  ]);

  it('matches exact names, reordered equipment and same-equipment variants only', () => {
    expect(match('Bench Press (Barbell)')).toBe('bench');
    expect(match('Bench Press (Dumbbell)')).toBeNull();
    expect(match('Lat Pulldown (Cable)')).toBe('pulldown');
    expect(match('Front Raise (Cable)')).toBe('fly');
    expect(match('Chin Up')).toBe('chin');
    expect(match('Chin Up (Assisted)')).toBeNull();
  });

  it('infers type, equipment and muscle for custom exercises', () => {
    const weighted = {
      setType: 'normal' as const,
      weightKg: 30,
      reps: 10,
      distanceM: null,
      durationS: null,
      rpe: null,
    };
    expect(inferCustom('Crunch (Machine)', [weighted]).primaryMuscle).toBe('abdominals');
    expect(inferCustom('Rear Delt Reverse Fly (Cable)', [weighted]).primaryMuscle).toBe(
      'shoulders',
    );
    expect(inferCustom('Triceps Rope Pushdown', [weighted]).equipment).toBe('other');
    const set = {
      setType: 'normal' as const,
      weightKg: null,
      reps: null,
      distanceM: null,
      durationS: null,
      rpe: null,
    };
    expect(inferCustom('Chin Up (Assisted)', [{ ...set, reps: 8 }])).toMatchObject({
      type: 'bodyweight_assisted_reps',
      primaryMuscle: 'lats',
    });
    expect(inferCustom('Leg Raise Parallel Bars', [{ ...set, reps: 12 }])).toMatchObject({
      type: 'reps_only',
      equipment: 'none',
      primaryMuscle: 'abdominals',
    });
    expect(
      inferCustom('Shoulder Press (Machine Plates)', [{ ...set, weightKg: 40, reps: 10 }]),
    ).toMatchObject({ type: 'weight_reps', equipment: 'machine', primaryMuscle: 'shoulders' });
  });
});

describe('Hevy aliases', () => {
  it('point at weighted library exercises that exist', () => {
    const { exercises } = require('../../db/seed/exercises.json') as {
      exercises: { sourceId: string; name: string; equipment: Equipment; type: string }[];
    };
    const match = buildMatcher(exercises.map((e) => ({ ...e, id: e.sourceId })));
    const untyped: Record<string, string> = {
      'Captains Chair Leg Raise': 'reps_only',
      'Assisted Pull-up': 'bodyweight_assisted_reps',
    };
    for (const [hevy, ours] of Object.entries(hevyAliases)) {
      const hit = exercises.find((e) => e.sourceId === match(hevy));
      expect([hevy, hit?.name]).toEqual([hevy, ours]);
      expect([hevy, hit?.type]).toEqual([hevy, untyped[ours] ?? 'weight_reps']);
    }
  });
});
