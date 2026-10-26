import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';

import { TextPrompt } from '@/components/ui/text-prompt';

import { parseRoutinePage, routineUrl } from './page';
import { RoutinePageReader } from './routine-page-reader';
import { importHevyRoutines } from './routines';

// Paste a hevy.com/routine link → read the page → confirm → save the routine.
export function useHevyRoutineImport() {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const fail = (e: unknown) =>
    Alert.alert(t('data.errorTitle'), e instanceof Error ? e.message : String(e));

  const read = (link: string) => {
    const url = routineUrl(link);
    if (url) setReading(url);
    else Alert.alert(t('data.errorTitle'), t('data.hevyBadLink'));
  };

  const onPage = (page: { title: string; text: string }) => {
    setReading(null);
    const routine = parseRoutinePage(page.title, page.text);
    if (!routine.exercises.length) {
      Alert.alert(t('data.errorTitle'), t('data.hevyEmpty'));
      return;
    }
    Alert.alert(
      t('data.hevyConfirmTitle', { name: routine.title }),
      t('data.hevyConfirm', { count: routine.exercises.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('data.import'),
          onPress: () => {
            try {
              const r = importHevyRoutines([routine], []);
              Alert.alert(
                t('data.doneTitle'),
                r.routines
                  ? t('data.hevyDone', { name: routine.title, created: r.exercisesCreated })
                  : t('data.hevySkipped', { name: routine.title }),
              );
            } catch (e) {
              fail(e);
            }
          },
        },
      ],
    );
  };

  const element = (
    <>
      {prompt ? (
        <TextPrompt
          title={t('data.hevyLinkTitle')}
          label={t('data.hevyLinkLabel')}
          initial=""
          confirmLabel={t('data.import')}
          onSubmit={read}
          onClose={() => setPrompt(false)}
        />
      ) : null}
      {reading ? (
        <RoutinePageReader
          url={reading}
          onRead={onPage}
          onError={() => {
            setReading(null);
            Alert.alert(t('data.errorTitle'), t('data.hevyLoadError'));
          }}
        />
      ) : null}
    </>
  );

  return { open: () => setPrompt(true), reading: reading !== null, element };
}
