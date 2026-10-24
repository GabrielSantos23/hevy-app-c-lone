import { buildLibrary, inferEquipment, inferType, normalizeName, slugify } from './gif-mapper';

const byName = (entries: { folder: string; title: string }[], instructions = new Map()) =>
  Object.fromEntries(buildLibrary(entries, instructions).map((e) => [e.name, e]));

describe('inferEquipment', () => {
  it.each([
    ['Barbell Bent Over Row', 'barbell'],
    ['Bench Press', 'barbell'],
    ['Deadlift', 'barbell'],
    ['Bent Over Dumbbell Row', 'dumbbell'],
    ['Cable Crossover Lat Pulldown', 'machine'],
    ['Close Grip Lat-Pulldown', 'machine'],
    ['Band Seated Row', 'resistance_band'],
    ['Bent Over Row - Gymstick', 'resistance_band'],
    ['Archer Push-Up', 'none'],
    ['Battle Rope', 'other'],
    ['Close Grip Bench Press', 'barbell'],
    ['Dumbbell Bench Press', 'dumbbell'],
    ['Hammer Curl', 'dumbbell'],
    ['High Pulley Overhead Tricep Extension', 'machine'],
    ['Lever Chest Press', 'machine'],
    ['Bodyweight Military Press', 'none'],
    ['Close Grip Z-Bar Curl', 'barbell'],
  ])('%s -> %s', (title, expected) => {
    expect(inferEquipment(title)).toBe(expected);
  });
});

describe('inferType', () => {
  it('maps cardio machines, holds, carries and assisted moves', () => {
    expect(inferType('Treadmill', 'none', 'cardio')).toBe('distance_duration');
    expect(inferType('Stair Climber Machine', 'machine', 'cardio')).toBe('floors_duration');
    expect(inferType('Jumping jack', 'none', 'cardio')).toBe('duration');
    expect(inferType('Front Plank', 'none', 'abdominals')).toBe('duration');
    expect(inferType('Back Lever', 'none', 'upper_back')).toBe('duration');
    expect(inferType('Lever Chest Press', 'machine', 'chest')).toBe('weight_reps');
    expect(inferType('Medicine Ball-Sit-up Throw', 'other', 'abdominals')).toBe('weight_reps');
    expect(inferType("Farmer's Walk", 'dumbbell', 'forearms')).toBe('short_distance_weight');
    expect(inferType('Assisted Pull-up', 'none', 'lats')).toBe('bodyweight_assisted_reps');
    expect(inferType('Weighted Pull-up', 'none', 'lats')).toBe('bodyweight_reps');
    expect(inferType('Chin-Up', 'none', 'lats')).toBe('reps_only');
    expect(inferType('Barbell Curl', 'barbell', 'biceps')).toBe('weight_reps');
  });
});

describe('buildLibrary', () => {
  it('drops stretches and merges titles found in several folders', () => {
    const lib = byName([
      { folder: 'back', title: 'Deadlift' },
      { folder: 'leg', title: 'Deadlift' },
      { folder: 'erector-spinae', title: 'Deadlift' },
      { folder: 'chest', title: 'Back Pec Stretch' },
    ]);
    expect(Object.keys(lib)).toEqual(['Deadlift']);
    expect(lib.Deadlift).toMatchObject({
      sourceId: 'deadlift',
      primaryMuscle: 'hamstrings',
      equipment: 'barbell',
      type: 'weight_reps',
      bodyweightFactor: 0,
    });
    expect(lib.Deadlift.secondaryMuscles).toEqual(['upper_back', 'quadriceps', 'lower_back']);
  });

  it('uses the folder muscle when the name gives no hint', () => {
    const lib = byName([{ folder: 'chest', title: 'Archer Push-Up' }]);
    expect(lib['Archer Push-Up']).toMatchObject({
      primaryMuscle: 'chest',
      equipment: 'none',
      type: 'reps_only',
      bodyweightFactor: 1,
      secondaryMuscles: [],
    });
  });

  it('keeps cardio as primary for cardio entries', () => {
    const lib = byName([
      { folder: 'full-body', title: 'Burpees' },
      { folder: 'cardio', title: 'Burpees' },
    ]);
    expect(lib.Burpees).toMatchObject({ primaryMuscle: 'cardio', secondaryMuscles: ['full_body'] });
  });

  it('copies instructions only on an exact normalized name match', () => {
    const lib = byName(
      [
        { folder: 'back', title: 'Chin-Up' },
        { folder: 'chest', title: 'Bench Press' },
      ],
      new Map([[normalizeName('Chin Up'), 'Hang from the bar.']]),
    );
    expect(lib['Chin-Up'].instructions).toBe('Hang from the bar.');
    expect(lib['Bench Press'].instructions).toBeNull();
  });

  it('builds stable slugs', () => {
    expect(slugify("Farmer's Walk (Heavy)")).toBe('farmer-s-walk-heavy');
    expect(slugify('ATG Split Squat')).toBe('atg-split-squat');
  });
});
