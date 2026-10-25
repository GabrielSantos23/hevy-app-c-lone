import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { saveWatchData } from '@/features/watch/data';
import { parseWatchResult } from '@/features/watch/shortcuts';

export default function WatchDataRoute() {
  const { workout, result } = useLocalSearchParams<{ workout?: string; result?: string }>();

  useEffect(() => {
    if (workout && result) saveWatchData(workout, parseWatchResult(result));
    if (workout) router.replace({ pathname: '/history/[id]', params: { id: workout } });
    else router.replace('/');
  }, [workout, result]);

  return null;
}
