import {
  Circle,
  HStack,
  Image,
  Link,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from '@expo/ui/swift-ui';
import {
  background,
  containerBackground,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  minimumScaleFactor,
  monospacedDigit,
  padding,
  shapes,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { CalendarProps, StartProps, StreakProps, VolumeProps, WeekProps } from './data';

const VolumeWidget = (props: VolumeProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const medium = env.widgetFamily === 'systemMedium';
  const muted = { type: 'hierarchical', style: 'secondary' } as const;
  const empty = { type: 'hierarchical', style: 'quaternary' } as const;
  const height = medium ? 72 : 40;
  const head = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{props.title}</Text>
      <Text
        modifiers={[
          font({ size: 24, weight: 'bold' }),
          monospacedDigit(),
          lineLimit(1),
          minimumScaleFactor(0.6),
        ]}
      >
        {props.value}
      </Text>
      <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.caption}</Text>
    </VStack>
  );
  const chart = (
    <HStack alignment="bottom" spacing={medium ? 12 : 5}>
      {props.bars.map((b, i) => (
        <VStack key={i} spacing={4}>
          <RoundedRectangle
            cornerRadius={3}
            modifiers={[
              foregroundStyle(b.ratio > 0 ? '#CA4500' : empty),
              frame({ width: medium ? 10 : 8, height: Math.max(3, b.ratio * height) }),
            ]}
          />
          <Text
            modifiers={[
              font({ size: 10, weight: b.today ? 'bold' : 'regular' }),
              foregroundStyle(muted),
            ]}
          >
            {b.label}
          </Text>
        </VStack>
      ))}
    </HStack>
  );
  const root = [
    frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' as const }),
    containerBackground(dark ? '#1C1A18' : '#FFFFFF', 'widget'),
    widgetURL('repforge://profile'),
  ];
  return medium ? (
    <HStack alignment="top" modifiers={root}>
      {head}
      <Spacer />
      {chart}
    </HStack>
  ) : (
    <VStack alignment="leading" modifiers={root}>
      {head}
      <Spacer />
      {chart}
    </VStack>
  );
};

const CalendarWidget = (props: CalendarProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const small = env.widgetFamily === 'systemSmall';
  const accent = dark ? '#FA8746' : '#B53900';
  const muted = { type: 'hierarchical', style: 'secondary' } as const;
  const cell = small ? 17 : 34;
  const size = small ? 9 : 14;
  return (
    <VStack
      alignment="leading"
      spacing={small ? 2 : 6}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        containerBackground(dark ? '#1C1A18' : '#FFFFFF', 'widget'),
        widgetURL('repforge://history'),
      ]}
    >
      <Text modifiers={[font({ size: small ? 12 : 15, weight: 'bold' }), lineLimit(1)]}>
        {props.title}
      </Text>
      <HStack spacing={0}>
        {props.weekdays.map((w, i) => (
          <Text
            key={i}
            modifiers={[font({ size: size - 1 }), foregroundStyle(muted), frame({ width: cell })]}
          >
            {w}
          </Text>
        ))}
      </HStack>
      {props.weeks.map((week, r) => (
        <HStack key={r} spacing={0}>
          {week.map((day, c) => {
            const done = props.done.includes(day);
            const label = (
              <Text
                modifiers={[
                  font({ size, weight: done || day === props.today ? 'bold' : 'regular' }),
                  monospacedDigit(),
                  foregroundStyle(done ? '#FFFFFF' : day === props.today ? accent : 'primary'),
                ]}
              >
                {day ? String(day) : ''}
              </Text>
            );
            return (
              <ZStack key={c} modifiers={[frame({ width: cell, height: cell - (small ? 2 : 4) })]}>
                {done ? (
                  <Circle
                    modifiers={[
                      foregroundStyle('#CA4500'),
                      frame({ width: cell - 2, height: cell - 2 }),
                    ]}
                  />
                ) : null}
                {label}
              </ZStack>
            );
          })}
        </HStack>
      ))}
    </VStack>
  );
};

const WeekWidget = (props: WeekProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const accent = dark ? '#FA8746' : '#B53900';
  const muted = { type: 'hierarchical', style: 'secondary' } as const;
  const empty = { type: 'hierarchical', style: 'quaternary' } as const;
  if (env.widgetFamily === 'accessoryRectangular')
    return (
      <VStack alignment="leading" spacing={2} modifiers={[widgetURL('repforge://history')]}>
        <Text modifiers={[font({ size: 13, weight: 'semibold' })]}>{props.title}</Text>
        <HStack spacing={3}>
          {props.days.map((d, i) => (
            <Circle
              key={i}
              modifiers={[
                foregroundStyle(d.done ? 'primary' : empty),
                frame({ width: 12, height: 12 }),
              ]}
            />
          ))}
        </HStack>
      </VStack>
    );
  return (
    <VStack
      alignment="leading"
      spacing={10}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        containerBackground(dark ? '#1C1A18' : '#FFFFFF', 'widget'),
        widgetURL('repforge://history'),
      ]}
    >
      <VStack alignment="leading" spacing={2}>
        <Text modifiers={[font({ size: 17, weight: 'bold' })]}>{props.title}</Text>
        <Text modifiers={[font({ size: 11 }), foregroundStyle(muted)]}>{props.caption}</Text>
      </VStack>
      <Spacer />
      <HStack spacing={6}>
        {props.days.map((d, i) => (
          <VStack key={i} spacing={4}>
            <ZStack modifiers={[frame({ width: 34, height: 34 })]}>
              <Circle modifiers={[foregroundStyle(d.done ? '#CA4500' : empty)]} />
              <Text
                modifiers={[
                  font({ size: 14, weight: d.done || d.today ? 'bold' : 'regular' }),
                  monospacedDigit(),
                  foregroundStyle(d.done ? '#FFFFFF' : d.today ? accent : 'primary'),
                ]}
              >
                {String(d.day)}
              </Text>
            </ZStack>
            <Text modifiers={[font({ size: 10 }), foregroundStyle(muted)]}>{d.label}</Text>
          </VStack>
        ))}
      </HStack>
    </VStack>
  );
};

const StreakWidget = (props: StreakProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const muted = { type: 'hierarchical', style: 'secondary' } as const;
  if (env.widgetFamily === 'accessoryCircular')
    return (
      <VStack spacing={0} modifiers={[widgetURL('repforge://profile')]}>
        <Image systemName="flame.fill" size={14} />
        <Text modifiers={[font({ size: 20, weight: 'bold' }), monospacedDigit()]}>
          {String(props.value)}
        </Text>
      </VStack>
    );
  if (env.widgetFamily === 'accessoryInline')
    return (
      <Text modifiers={[widgetURL('repforge://profile')]}>
        {`${props.title}: ${props.value} ${props.unit}`}
      </Text>
    );
  return (
    <VStack
      alignment="leading"
      spacing={2}
      modifiers={[
        frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' }),
        containerBackground(dark ? '#1C1A18' : '#FFFFFF', 'widget'),
        widgetURL('repforge://profile'),
      ]}
    >
      <Image systemName="flame.fill" size={26} color={dark ? '#FA8746' : '#CA4500'} />
      <Spacer />
      <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{props.title}</Text>
      <Text modifiers={[font({ size: 34, weight: 'bold' }), monospacedDigit()]}>
        {String(props.value)}
      </Text>
      <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>{props.unit}</Text>
    </VStack>
  );
};

const StartWidget = (props: StartProps, env: WidgetEnvironment) => {
  'widget';
  const dark = env.colorScheme === 'dark';
  const muted = { type: 'hierarchical', style: 'secondary' } as const;
  const tile = dark ? '#272421' : '#F2F0ED';
  const card = containerBackground(dark ? '#1C1A18' : '#FFFFFF', 'widget');
  const fill = frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: 'topLeading' });
  const start = (
    <VStack alignment="leading" spacing={2}>
      <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{props.caption}</Text>
      <Text modifiers={[font({ size: 17, weight: 'bold' }), lineLimit(2)]}>{props.label}</Text>
      <Spacer />
      <ZStack modifiers={[frame({ width: 40, height: 40 })]}>
        <Circle modifiers={[foregroundStyle('#CA4500')]} />
        <Image systemName="plus" size={18} color="#FFFFFF" />
      </ZStack>
    </VStack>
  );
  if (env.widgetFamily === 'systemSmall')
    return (
      <VStack alignment="leading" modifiers={[fill, card, widgetURL(props.url)]}>
        {start}
      </VStack>
    );
  const rows = [props.routines.slice(0, 2), props.routines.slice(2, 4)].filter((r) => r.length);
  return (
    <HStack alignment="top" spacing={14} modifiers={[fill, card]}>
      <Link destination={props.url}>{start}</Link>
      <VStack alignment="leading" spacing={8} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(muted)]}>{props.routinesTitle}</Text>
        {rows.length ? (
          rows.map((row, r) => (
            <HStack key={r} spacing={8}>
              {row.map((routine, i) => (
                <Link key={i} destination={routine.url}>
                  <Text
                    modifiers={[
                      font({ size: 13, weight: 'semibold' }),
                      lineLimit(2),
                      frame({ maxWidth: Infinity, minHeight: 44, alignment: 'topLeading' }),
                      padding({ all: 8 }),
                      background(tile, shapes.roundedRectangle({ cornerRadius: 10 })),
                      foregroundStyle('primary'),
                    ]}
                  >
                    {routine.name}
                  </Text>
                </Link>
              ))}
            </HStack>
          ))
        ) : (
          <Text modifiers={[font({ size: 13 }), foregroundStyle(muted)]}>{props.empty}</Text>
        )}
      </VStack>
    </HStack>
  );
};

export const widgets = {
  volume: createWidget('VolumeWidget', VolumeWidget),
  calendar: createWidget('CalendarWidget', CalendarWidget),
  week: createWidget('WeekWidget', WeekWidget),
  streak: createWidget('StreakWidget', StreakWidget),
  start: createWidget('StartWidget', StartWidget),
};
