import { carryForward, type DraftSet, emptySet } from './exercise-draft';

const set = (weight: string, reps: string, done = false): DraftSet => ({
  ...emptySet(),
  weight,
  reps,
  done,
});

describe('carryForward', () => {
  it('copies a new weight to later sets that still match the old one', () => {
    const sets = [set('20', '10'), set('20', '9'), set('20', '8')];
    const next = carryForward(sets, sets[0].key, { weight: '25' });
    expect(next.map((s) => s.weight)).toEqual(['25', '25', '25']);
    expect(next.map((s) => s.reps)).toEqual(['10', '9', '8']);
  });

  it('fills later empty sets', () => {
    const sets = [set('', ''), set('', ''), set('', '')];
    const next = carryForward(sets, sets[0].key, { reps: '12' });
    expect(next.map((s) => s.reps)).toEqual(['12', '12', '12']);
  });

  it('keeps sets edited by hand, earlier sets and done sets', () => {
    const sets = [set('20', '10'), set('20', '10', true), set('30', '10'), set('20', '10')];
    const next = carryForward(sets, sets[0].key, { weight: '22' });
    expect(next.map((s) => s.weight)).toEqual(['22', '20', '30', '22']);
    const fromMiddle = carryForward(sets, sets[2].key, { weight: '35' });
    expect(fromMiddle.map((s) => s.weight)).toEqual(['20', '20', '35', '20']);
  });

  it('does not copy non-value fields such as done', () => {
    const sets = [set('20', '10'), set('20', '10')];
    const next = carryForward(sets, sets[0].key, { done: true, doneAt: 1 });
    expect(next.map((s) => s.done)).toEqual([true, false]);
  });
});
