import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Text } from 'react-native';

import { Button } from '@/components/ui/button';

import { healthProbe, type WatchMessage } from '../../../modules/health-probe';

const describe = (m: WatchMessage) =>
  m.event === 'live'
    ? `live: ${Math.round(m.heartRate ?? 0)} bpm, ${Math.round(m.activeKcal ?? 0)} kcal`
    : m.event === 'error'
      ? `error: ${m.message}`
      : (m.event ?? JSON.stringify(m));

// Buttons to check the Repforge watch app: install, opening it from here, and messages both ways.
export function WatchAppTest() {
  const { t } = useTranslation();
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    const sub = healthProbe?.addListener('onWatch', (m) =>
      setLast(`${new Date().toLocaleTimeString()} · ${describe(m)}`),
    );
    return () => sub?.remove();
  }, []);

  if (!healthProbe) return null;
  const probe = healthProbe;
  const show = (result: string) => Alert.alert(t('data.watchTitle'), result);

  return (
    <>
      <Button
        label={t('data.watchState')}
        variant="secondary"
        onPress={() => show(probe.watchState())}
      />
      <Button
        label={t('data.watchOpen')}
        variant="secondary"
        onPress={() =>
          probe
            .startWatchApp()
            .then(show)
            .catch((e: unknown) => show(String(e)))
        }
      />
      <Button
        label={t('data.watchStart')}
        variant="secondary"
        onPress={() => show(probe.sendToWatch('start'))}
      />
      <Button
        label={t('data.watchEnd')}
        variant="secondary"
        onPress={() => show(probe.sendToWatch('end'))}
      />
      <Text selectable className="font-regular text-footnote text-muted-foreground">
        {t('data.watchLast', { message: last ?? '—' })}
      </Text>
    </>
  );
}
