import { router, useLocalSearchParams } from 'expo-router';
import Storage from 'expo-sqlite/kv-store';
import {
  Barbell,
  Bus,
  Car,
  Cat,
  Cow,
  Dog,
  FireTruck,
  Horse,
  type Icon,
  Motorcycle,
  MusicNotes,
  PianoKeys,
  SoccerBall,
  Television,
  Van,
  WashingMachine,
} from 'phosphor-react-native';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChart } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { TextPrompt } from '@/components/ui/text-prompt';
import type { Muscle } from '@/db/schema';
import { heartSummary, workoutHealth, type WorkoutHealth } from '@/features/health/health';
import { muscleSplit, workoutOrdinal, workoutSummaries } from '@/features/stats/data';
import { useWorkoutFormat } from '@/features/stats/workout-card';
import { BodyMap } from '@/features/workouts/body-map';
import {
  clearFinished,
  finishedWorkout,
  routineChange,
  saveAsRoutine,
  updateRoutine,
} from '@/features/workouts/finish';
import { type Fact, pickFacts } from '@/features/workouts/summary-facts';
import { formatDurationWords } from '@/features/workouts/stats';
import { usePreferences } from '@/stores/preferences';
import { hex } from '@/theme/tokens';
import { useScheme } from '@/theme/theme-root';

const RECENT_KEY = 'summary-recent-facts';

const icons: Record<string, Icon> = {
  dog: Dog,
  washingMachine: WashingMachine,
  motorcycle: Motorcycle,
  piano: PianoKeys,
  horse: Horse,
  cow: Cow,
  car: Car,
  van: Van,
  bus: Bus,
  fireTruck: FireTruck,
  cat: Cat,
  song: MusicNotes,
  episode: Television,
  match: SoccerBall,
};

function readRecent(): string[] {
  try {
    return JSON.parse(Storage.getItemSync(RECENT_KEY) ?? '[]');
  } catch {
    return [];
  }
}

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const scheme = useScheme();
  const format = useWorkoutFormat();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const prefs = usePreferences();
  const units = { weightUnit: prefs.weightUnit, distanceUnit: prefs.distanceUnit };
  const [page, setPage] = useState(0);
  const [naming, setNaming] = useState(false);
  const [active] = useState(() => finishedWorkout(id));
  const [health, setHealth] = useState<WorkoutHealth | null>(null);

  // Read once: the summary describes the workout as it was saved.
  const [data] = useState(() => {
    const summary = workoutSummaries(prefs.bodyWeightKg, prefs.countWarmupsInVolume, [id])[0];
    if (!summary) return null;
    const muscles = Object.entries(muscleSplit(summary.exercises)) as [Muscle, number][];
    const top = muscles.sort((a, b) => b[1] - a[1])[0];
    const heaviestKg = Math.max(
      0,
      ...summary.exercises.flatMap((e) => e.sets.map((s) => s.weightKg ?? 0)),
    );
    const facts = pickFacts(
      {
        volumeKg: summary.volume,
        heaviestKg,
        durationS: summary.durationS,
        topMuscle: top ? { muscle: top[0], sets: top[1] } : null,
      },
      readRecent(),
    );
    try {
      Storage.setItemSync(RECENT_KEY, JSON.stringify(facts.map((f) => f.id)));
    } catch {}
    return { summary, ordinal: workoutOrdinal(summary.startedAt), facts, muscles, heaviestKg };
  });

  // Calories and heart rate the Apple Watch wrote to Health during the workout.
  useEffect(() => {
    if (!data) return;
    const start = data.summary.startedAt;
    workoutHealth(start, start + data.summary.durationS * 1000).then(setHealth);
  }, [data]);

  // Ask about the routine once the screen has settled; iOS drops alerts shown mid-transition.
  useEffect(() => {
    const change = active && routineChange(active, units);
    if (!active || !change) return;
    const timer = setTimeout(() => {
      clearFinished();
      if (change.kind === 'save')
        Alert.alert(t('summary.saveTitle'), t('summary.saveBody'), [
          { text: t('summary.notNow'), style: 'cancel' },
          {
            text: t('summary.save'),
            onPress: () => setTimeout(() => setNaming(true), 500),
          },
        ]);
      else
        Alert.alert(t('summary.updateTitle', { name: change.name }), t('summary.updateBody'), [
          { text: t('summary.keepRoutine'), style: 'cancel' },
          { text: t('summary.update'), onPress: () => updateRoutine(active, units) },
        ]);
    }, 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) return null;
  const { summary, ordinal, facts } = data;
  const cardWidth = width - 32;
  const heart = health ? heartSummary(health.heartRates) : null;
  const hasHealth = !!health && (health.activeKcal > 0 || heart !== null);
  const pages = 1 + Number(hasHealth) + facts.length;
  const time = (ms: number) =>
    new Date(ms).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });

  const factCard = (f: Fact) => {
    const FactIcon = 'object' in f ? icons[f.object] : null;
    const art = FactIcon ? (
      <FactIcon size={112} weight="duotone" color={hex(scheme, 'primary-text')} />
    ) : (
      <BodyMap sets={Object.fromEntries(data.muscles)} height={130} />
    );
    switch (f.kind) {
      case 'volume':
        return (
          <FactCard
            lead={t('summary.volumeLead')}
            value={format.volume(summary.volume)}
            line={t('summary.liftLike', {
              thing: t(`summary.things.${f.object}`, { count: f.times }),
            })}
            art={art}
          />
        );
      case 'heaviest':
        return (
          <FactCard
            lead={t('summary.heaviestLead')}
            value={format.volume(data.heaviestKg)}
            line={t('summary.heavyLike', {
              thing: t(`summary.things.${f.object}`, { count: f.times }),
            })}
            art={art}
          />
        );
      case 'duration':
        return (
          <FactCard
            lead={t('summary.durationLead')}
            value={formatDurationWords(summary.durationS)}
            line={t('summary.longLike', {
              thing: t(`summary.things.${f.object}`, { count: f.times }),
            })}
            art={art}
          />
        );
      case 'muscle':
        return (
          <FactCard
            lead={t('summary.muscleLead')}
            value={t(`muscles.${f.muscle}`)}
            line={t('workout.setCount', { count: f.sets })}
            art={art}
          />
        );
    }
  };

  return (
    <View
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 12 }}
      className="flex-1 bg-background"
    >
      <View className="items-center gap-1 px-4 pb-6">
        <Text accessibilityRole="header" className="font-bold text-title-1 text-foreground">
          {t('summary.title')}
        </Text>
        <Text className="font-regular text-body text-muted-foreground">
          {t('summary.ordinal', { count: ordinal })}
        </Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        className="flex-grow-0"
      >
        <Page width={width}>
          <Card width={cardWidth}>
            <Text numberOfLines={2} className="font-bold text-title-2 text-foreground">
              {summary.name}
            </Text>
            <View className="flex-row flex-wrap gap-y-6 pt-6">
              <Stat label={t('workout.duration')} value={formatDurationWords(summary.durationS)} />
              <Stat label={t('workout.volume')} value={format.volume(summary.volume)} />
              <Stat label={t('summary.exercises')} value={String(summary.exercises.length)} />
              <Stat label={t('workout.sets')} value={String(summary.sets)} />
            </View>
          </Card>
        </Page>
        {hasHealth && health ? (
          <Page width={width}>
            <Card width={cardWidth}>
              <Text className="font-bold text-title-2 text-foreground">
                {t('summary.detailsTitle')}
              </Text>
              <View className="flex-row flex-wrap gap-y-6 pt-6">
                <Stat
                  label={t('summary.workoutTime')}
                  value={formatDurationWords(summary.durationS)}
                  color={hex(scheme, 'set-warmup')}
                />
                <Stat
                  label={t('summary.activeKcal')}
                  value={`${Math.round(health.activeKcal)} kcal`}
                  color={hex(scheme, 'destructive-text')}
                />
                <Stat
                  label={t('summary.totalKcal')}
                  value={`${Math.round(health.activeKcal + health.basalKcal)} kcal`}
                  color={hex(scheme, 'destructive-text')}
                />
                {heart ? (
                  <Stat
                    label={t('summary.avgHeartRate')}
                    value={`${heart.avg} bpm`}
                    color={hex(scheme, 'destructive-text')}
                  />
                ) : null}
              </View>
              {heart ? (
                <View className="gap-2 pt-6">
                  <Text className="font-semibold text-body text-foreground">
                    {t('summary.heartRate')}
                  </Text>
                  <HeartChart
                    buckets={heart.buckets}
                    min={heart.min}
                    labels={[
                      time(summary.startedAt),
                      time(summary.startedAt + summary.durationS * 1000),
                    ]}
                    summary={t('summary.heartChart', heart)}
                  />
                  <Text className="font-regular text-footnote text-destructive-text">
                    {t('summary.heartAvg', { avg: heart.avg, min: heart.min, max: heart.max })}
                  </Text>
                </View>
              ) : null}
            </Card>
          </Page>
        ) : null}
        {facts.map((f) => (
          <Page key={f.id} width={width}>
            <Card width={cardWidth}>{factCard(f)}</Card>
          </Page>
        ))}
      </ScrollView>

      {pages > 1 ? (
        <View
          accessible
          accessibilityLabel={t('summary.page', { page: page + 1, total: pages })}
          className="flex-row justify-center gap-2 pt-4"
        >
          {Array.from({ length: pages }, (_, i) => (
            <View
              key={i}
              className={`h-2 w-2 rounded-full ${i === page ? 'bg-primary' : 'bg-surface-raised'}`}
            />
          ))}
        </View>
      ) : null}

      <View className="flex-1" />
      <View className="px-4">
        <Button
          label={t('summary.done')}
          size="lg"
          icon={<Barbell size={20} weight="bold" color={hex(scheme, 'on-primary')} />}
          onPress={() => router.back()}
        />
      </View>

      {naming && active ? (
        <TextPrompt
          title={t('summary.nameTitle')}
          label={t('summary.nameLabel')}
          initial={active.name}
          confirmLabel={t('summary.save')}
          onSubmit={(name) => saveAsRoutine(active, name.trim(), units)}
          onClose={() => setNaming(false)}
        />
      ) : null}
    </View>
  );
}

function Page({ width, children }: { width: number; children: ReactNode }) {
  return (
    <View style={{ width }} className="items-center">
      {children}
    </View>
  );
}

function Card({ width, children }: { width: number; children: ReactNode }) {
  return (
    <View style={{ width, minHeight: 340 }} className="rounded-xl bg-surface p-6">
      {children}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} className="w-1/2 gap-1">
      <Text
        style={color ? { color } : undefined}
        className="font-bold text-title-2 text-foreground"
      >
        {value}
      </Text>
      <Text className="font-regular text-footnote text-muted-foreground">{label}</Text>
    </View>
  );
}

function FactCard({
  lead,
  value,
  line,
  art,
}: {
  lead: string;
  value: string;
  line: string;
  art: ReactNode;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${lead} ${value}. ${line}`}
      className="items-center gap-1"
    >
      <Text className="font-medium text-body text-foreground">{lead}</Text>
      <Text className="font-bold text-display text-foreground">{value}</Text>
      <Text className="text-center font-regular text-body text-muted-foreground">{line}</Text>
      <View className="items-center justify-center pt-6">{art}</View>
    </View>
  );
}

// Bars start a little under the lowest reading so the changes stay visible.
function HeartChart({
  buckets,
  min,
  labels,
  summary,
}: {
  buckets: number[];
  min: number;
  labels: [string, string];
  summary: string;
}) {
  const floor = Math.max(0, min - 10);
  return (
    <BarChart
      values={buckets.map((v) => (v ? v - floor : 0))}
      labels={labels}
      height={90}
      summary={summary}
      format={(v) => `${Math.round(v + floor)} bpm`}
    />
  );
}
