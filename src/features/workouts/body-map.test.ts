import { slugLevels } from './body-map';

jest.mock('react-native-body-highlighter', () => () => null);

it('maps muscles to body parts with three intensity levels', () => {
  const levels = slugLevels({ chest: 3, triceps: 1.5, shoulders: 0.5, cardio: 2, lats: 0 });
  expect(Object.fromEntries(levels)).toEqual({ chest: 3, triceps: 2, deltoids: 1 });
});
