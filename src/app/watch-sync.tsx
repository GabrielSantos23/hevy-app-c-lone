import { router } from 'expo-router';
import { useEffect } from 'react';

import { useWorkout } from '@/stores/workout';

export default function WatchSyncRoute() {
  useEffect(() => {
    if (!useWorkout.getState().workout) return router.replace('/');
    router.replace({ pathname: '/workout', params: { finish: '1' } });
  }, []);

  return null;
}
