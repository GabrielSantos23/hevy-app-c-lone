import { Button, HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  lineLimit,
  monospacedDigit,
  padding,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

import type { ActivityProps } from './activity';

const WorkoutActivity = (props: ActivityProps, env: LiveActivityEnvironment) => {
  'widget';
  const accent = env.isLuminanceReduced ? '#FFFFFF' : '#409CFF';
  const muted = { type: 'hierarchical', style: 'secondary' } as const;
  const started = new Date(props.startedAt);
  const elapsed = { lower: started, upper: new Date(props.startedAt + 86_400_000) };
  const rest =
    props.restStart !== null && props.restEnd !== null
      ? { lower: new Date(props.restStart), upper: new Date(props.restEnd) }
      : null;
  const clock = (size: number) => (
    <Text
      timerInterval={elapsed}
      countsDown={false}
      modifiers={[font({ size }), monospacedDigit(), foregroundStyle(muted)]}
    />
  );
  const restClock = (size: number) =>
    rest ? (
      <Text
        timerInterval={rest}
        countsDown
        modifiers={[font({ size, weight: 'semibold' }), monospacedDigit(), foregroundStyle(accent)]}
      />
    ) : null;
  const heading = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 16, weight: 'semibold' }), lineLimit(1)]}>{props.title}</Text>
      <Text modifiers={[font({ size: 13 }), foregroundStyle(muted), lineLimit(1)]}>
        {props.detail}
      </Text>
    </VStack>
  );
  const restControls = rest ? (
    <VStack spacing={8}>
      <ProgressView timerInterval={rest} countsDown modifiers={[tint(accent)]} />
      <HStack spacing={8}>
        <Button label="-15s" target="rest-minus" modifiers={[buttonStyle('bordered')]} />
        <Spacer />
        <Text modifiers={[font({ size: 17 })]}>{props.labels.rest}</Text>
        {restClock(17)}
        <Spacer />
        <Button label="+15s" target="rest-plus" modifiers={[buttonStyle('bordered')]} />
        <Button
          label={props.labels.skip}
          target="rest-skip"
          modifiers={[buttonStyle('borderedProminent'), tint('#0071E3')]}
        />
      </HStack>
    </VStack>
  ) : null;
  const setControls = props.value ? (
    <HStack>
      <Text modifiers={[font({ size: 18, weight: 'semibold' }), monospacedDigit()]}>
        {props.value}
      </Text>
      <Spacer />
      {props.canComplete ? (
        <Button
          label={props.labels.complete}
          systemImage="checkmark"
          target="complete-set"
          modifiers={[labelStyle('iconOnly'), buttonStyle('borderedProminent'), tint('#0071E3')]}
        />
      ) : null}
    </HStack>
  ) : null;

  return {
    banner: (
      <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 14 })]}>
        <HStack spacing={6}>
          <Image systemName="dumbbell.fill" size={12} color={accent} />
          <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>
            {props.labels.workout}
          </Text>
          <Spacer />
          {clock(12)}
        </HStack>
        {heading}
        {restControls ?? setControls}
      </VStack>
    ),
    compactLeading: <Image systemName="dumbbell.fill" color={accent} />,
    compactTrailing: rest ? (
      restClock(14)
    ) : (
      <Text
        timerInterval={elapsed}
        countsDown={false}
        modifiers={[monospacedDigit(), frame({ maxWidth: 52 })]}
      />
    ),
    minimal: rest ? (
      <Image systemName="timer" color={accent} />
    ) : (
      <Image systemName="dumbbell.fill" color={accent} />
    ),
    expandedLeading: (
      <HStack spacing={6} modifiers={[padding({ leading: 6 })]}>
        <Image systemName="dumbbell.fill" color={accent} />
        <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{props.labels.workout}</Text>
      </HStack>
    ),
    expandedTrailing: <HStack modifiers={[padding({ trailing: 6 })]}>{clock(13)}</HStack>,
    expandedBottom: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ horizontal: 6 })]}>
        {heading}
        {restControls ?? setControls}
      </VStack>
    ),
  };
};

export const workoutActivity = createLiveActivity('WorkoutActivity', WorkoutActivity);
