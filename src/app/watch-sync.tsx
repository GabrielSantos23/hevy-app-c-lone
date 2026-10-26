import { router } from 'expo-router';
import { useEffect } from 'react';

import { watchWorkoutEnded } from '@/features/watch/sync';
import { useWorkout } from '@/stores/workout';

export default function WatchSyncRoute() {
  useEffect(() => {
    watchWorkoutEnded();
    router.replace(
      useWorkout.getState().workout ? { pathname: '/workout', params: { finish: '1' } } : '/',
    );
  }, []);

  return null;
}
