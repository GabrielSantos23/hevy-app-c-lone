import { File, Paths } from 'expo-file-system';
import { shareAsync } from 'expo-sharing';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Share } from 'react-native';

import { useExerciseName } from '@/features/exercises/display';
import { formatDurationWords } from '@/features/workouts/stats';
import { usePreferences } from '@/stores/preferences';

import { workoutSummaries } from './data';
import { type ReportPeriod, workoutReport, workoutsInPeriod } from './report';
import { useWorkoutFormat } from './workout-card';

// claude.ai/new?q= opens a new chat with the text filled in (the Claude app takes the link on iOS).
const CLAUDE_URL = 'https://claude.ai/new?q=';
const MAX_URL = 8000;

export type ShareTarget = 'file' | 'claude';

export function useShareWorkouts() {
  const { t } = useTranslation();
  const format = useWorkoutFormat();
  const displayName = useExerciseName();
  const prefs = usePreferences();

  return async (period: ReportPeriod, target: ShareTarget) => {
    const all = workoutSummaries(prefs.bodyWeightKg, prefs.countWarmupsInVolume);
    const workouts = workoutsInPeriod(all, period, Date.now());
    if (!workouts.length) {
      Alert.alert(t('share.emptyTitle'), t(`share.emptyBody.${period}`));
      return;
    }
    const report = workoutReport(
      workouts,
      { weightUnit: prefs.weightUnit, distanceUnit: prefs.distanceUnit },
      {
        title: t(`share.title.${period}`, { count: workouts.length }),
        date: format.date,
        duration: formatDurationWords,
        volume: format.volume,
        exerciseName: displayName,
        setLabel: (type) => t(`setTypes.${type}Short` as 'setTypes.warmupShort'),
      },
    );

    if (target === 'file') {
      const file = new File(Paths.cache, `repforge-${period}.txt`);
      if (file.exists) file.delete();
      file.create();
      file.write(report);
      await shareAsync(file.uri, { mimeType: 'text/plain', UTI: 'public.plain-text' });
      return;
    }
    const prompt = `${t('share.claudePrompt')}\n\n${report}`;
    const url = CLAUDE_URL + encodeURIComponent(prompt);
    // A long year doesn't fit in a link; the share sheet still reaches the Claude app.
    if (url.length > MAX_URL) await Share.share({ message: prompt });
    else await Linking.openURL(url);
  };
}
