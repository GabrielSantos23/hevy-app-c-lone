import { parseRoutinePage, routineUrl } from './page';

const text = [
  'Download',
  'chest',
  'Created by gabs_0',
  'Bench Press (Barbell)',
  '3 sets · 6–12 reps',
  'Rest 2min 0s',
  'Cable Fly Crossovers',
  '4 sets · 12 reps',
  'Rest 1min 30s',
  'Hanging Leg Raise',
  '3 sets · 20 reps',
  'Save routine',
].join('\n\n');

describe('parseRoutinePage', () => {
  it('reads exercises, set counts, rep ranges and rest', () => {
    const r = parseRoutinePage('chest', text);
    expect(r.title).toBe('chest');
    expect(r.exercises.map((e) => e.title)).toEqual([
      'Bench Press (Barbell)',
      'Cable Fly Crossovers',
      'Hanging Leg Raise',
    ]);
    expect(r.exercises[0].sets).toHaveLength(3);
    expect(r.exercises[0].sets[0].rep_range).toEqual({ start: 6, end: 12 });
    expect(r.exercises[1].sets[0].reps).toBe(12);
    expect(r.exercises.map((e) => e.rest_seconds)).toEqual([120, 90, null]);
  });

  it('works with the Portuguese page', () => {
    const r = parseRoutinePage(
      'peito',
      'Supino Reto (Barra)\n3 séries · 6–12 repetições\nDescanse 2 min 0 s',
    );
    expect(r.exercises[0]).toMatchObject({ title: 'Supino Reto (Barra)', rest_seconds: 120 });
  });
});

describe('routineUrl', () => {
  it('finds the routine link inside shared text', () => {
    expect(routineUrl('Look: https://hevy.com/routine/rSjshpFq9mZ ok')).toBe(
      'https://hevy.com/routine/rSjshpFq9mZ',
    );
    expect(routineUrl('https://example.com')).toBeNull();
  });
});
