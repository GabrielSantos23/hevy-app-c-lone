import { type FedbEntry, fromFedb } from './fedb-mapper';

const entry = (over: Partial<FedbEntry>): FedbEntry => ({
  id: 'Some_Lift',
  name: 'Some Lift',
  force: 'push',
  equipment: 'barbell',
  primaryMuscles: ['chest'],
  secondaryMuscles: [],
  instructions: ['Step one.', 'Step two.'],
  category: 'strength',
  images: ['Some_Lift/0.jpg', 'Some_Lift/1.jpg'],
  ...over,
});

describe('fromFedb', () => {
  it('maps fields and keeps the dataset id', () => {
    const [e] = fromFedb(
      [entry({ secondaryMuscles: ['middle back', 'chest', 'lower back'] })],
      new Set(),
    );
    expect(e).toMatchObject({
      source: 'free-exercise-db',
      sourceId: 'Some_Lift',
      equipment: 'barbell',
      primaryMuscle: 'chest',
      secondaryMuscles: ['upper_back', 'lower_back'],
      type: 'weight_reps',
      bodyweightFactor: 0,
      instructions: 'Step one.\nStep two.',
    });
  });

  it('drops stretches, entries without images and names already in the library', () => {
    const out = fromFedb(
      [
        entry({ id: 'a', name: 'Hamstring Stretch', category: 'stretching' }),
        entry({ id: 'b', name: 'Kettlebell Halo', images: [] }),
        entry({ id: 'c', name: 'Barbell Squat' }),
        entry({ id: 'd', name: 'Kept' }),
      ],
      new Set(['barbell squat']),
    );
    expect(out.map((e) => e.sourceId)).toEqual(['d']);
  });

  it('maps equipment and logging types', () => {
    const [plank, cable, cardio] = fromFedb(
      [
        entry({ name: 'Plank', equipment: 'body only', force: 'static' }),
        entry({ name: 'Cable Fly', equipment: 'cable' }),
        entry({ name: 'Jogging, Treadmill', equipment: 'machine', category: 'cardio' }),
      ],
      new Set(),
    );
    expect(plank).toMatchObject({ type: 'duration', equipment: 'none', bodyweightFactor: 1 });
    expect(cable).toMatchObject({ equipment: 'machine', type: 'weight_reps' });
    expect(cardio).toMatchObject({ primaryMuscle: 'cardio', type: 'distance_duration' });
  });
});
