import {
  AndroidImportance,
  cancelScheduledNotificationAsync,
  requestPermissionsAsync,
  SchedulableTriggerInputTypes,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import i18n from '@/i18n';
import { usePreferences } from '@/stores/preferences';
import { useWorkout } from '@/stores/workout';

const CHANNEL = 'rest-timer';

setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let setup: Promise<boolean> | null = null;

const ensureSetup = () =>
  (setup ??= (async () => {
    if (Platform.OS === 'android')
      await setNotificationChannelAsync(CHANNEL, {
        name: i18n.t('rest.channel'),
        importance: AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 150, 300],
      });
    const { granted } = await requestPermissionsAsync();
    return granted;
  })().catch(() => false));

async function schedule(seconds: number) {
  if (!usePreferences.getState().restNotification || seconds <= 0) return null;
  if (!(await ensureSetup())) return null;
  return scheduleNotificationAsync({
    content: { title: i18n.t('rest.doneTitle'), body: i18n.t('rest.doneBody') },
    trigger: {
      type: SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.round(seconds),
      channelId: CHANNEL,
    },
  }).catch(() => null);
}

const cancel = (id: string | null) => {
  if (id) cancelScheduledNotificationAsync(id).catch(() => undefined);
};

async function setRest(endsAt: number, total: number) {
  const { rest, setRestState } = useWorkout.getState();
  cancel(rest?.notificationId ?? null);
  setRestState({ endsAt, total, notificationId: null });
  const notificationId = await schedule((endsAt - Date.now()) / 1000);
  const current = useWorkout.getState().rest;
  if (current?.endsAt === endsAt) setRestState({ ...current, notificationId });
  else cancel(notificationId);
}

export const prepareRestNotifications = () => {
  if (usePreferences.getState().restNotification) ensureSetup();
};

export const startRest = (seconds: number) => setRest(Date.now() + seconds * 1000, seconds);

export function adjustRest(delta: number) {
  const rest = useWorkout.getState().rest;
  if (!rest) return;
  const endsAt = Math.max(Date.now() + 1000, rest.endsAt + delta * 1000);
  setRest(endsAt, Math.max(1, rest.total + delta));
}

export function stopRest() {
  const { rest, setRestState } = useWorkout.getState();
  cancel(rest?.notificationId ?? null);
  setRestState(null);
}
