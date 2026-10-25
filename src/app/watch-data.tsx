import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { saveWatchData } from '@/features/watch/data';
import { parseWatchResult } from '@/features/watch/shortcuts';

export default function WatchDataRoute() {
  const { t } = useTranslation();
  const { workout, result, errorMessage } = useLocalSearchParams<{
    workout?: string;
    result?: string;
    errorMessage?: string;
  }>();

  useEffect(() => {
    const data = parseWatchResult(result ?? '');
    if (workout && (data.kcal !== null || data.hr.length)) saveWatchData(workout, data);
    else
      Alert.alert(
        t('watch.noDataTitle'),
        errorMessage
          ? t('watch.shortcutError', { message: errorMessage })
          : t('watch.noDataBody', { result: (result ?? '').slice(0, 300) || '–' }),
      );
    if (workout) router.replace({ pathname: '/history/[id]', params: { id: workout } });
    else router.replace('/');
  }, [workout, result, errorMessage, t]);

  return null;
}
