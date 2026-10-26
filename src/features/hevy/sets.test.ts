import { hevySetValues } from './sets';

const base = {
  type: 'normal',
  weight_kg: 60,
  reps: 10,
  rep_range: null,
  distance_meters: null,
  duration_seconds: null,
  custom_metric: null,
};

describe('hevySetValues', () => {
  it('keeps plain reps and weight', () => {
    expect(hevySetValues(base)).toMatchObject({ setType: 'normal', weightKg: 60, reps: 10 });
  });

  it('turns a rep range into min and max', () => {
    const v = hevySetValues({ ...base, reps: null, rep_range: { start: 8, end: 12 } });
    expect(v).toMatchObject({ reps: null, repMin: 8, repMax: 12 });
  });

  it('treats an equal range as plain reps and unknown types as normal', () => {
    const v = hevySetValues({
      ...base,
      type: 'amrap',
      reps: null,
      rep_range: { start: 8, end: 8 },
    });
    expect(v).toMatchObject({ setType: 'normal', reps: 8, repMin: null });
  });
});
