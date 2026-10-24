# Design system

Working name for the app: **Repforge** (placeholder, easy to rename).

Generated with the Better Design MCP from the catalog's "Ember" base (dark glass, warm accent), then adapted by hand for React Native and checked for contrast. Live source: <https://better-design.com/projects/82d87fca-728d-4670-b8b2-b66c70b516b6>. Nothing here comes from the reference app's visuals. That app uses a cool blue accent and a light-first layout; this one is warm and dark-first.

## Direction

- **Dark-first, warm graphite.** Surfaces are near-black with a slight warm cast, not pure #000. That keeps OLED glare down in a dim gym, and the warm cast stops the dark from feeling cold.
- **One loud color.** Ember orange marks the main action and nothing else, so you can find it in a glance between sets. Everything else stays neutral.
- **Numbers are the content.** Weight, reps and the timer are the largest text on screen, in tabular figures so they don't jitter while editing.
- **Glass only where the system puts it:** tab bar, navigation bars, toolbars and floating controls. Cards and lists are solid surfaces.

### Trade-offs taken

- Dark-first with warm neutrals. Gain: low glare, the accent stands out. Lose: light mode is secondary and less tested. Affects: people who prefer light UIs (supported, just not the default).
- Inter instead of SF Pro / Roboto. Gain: one typeface and identical number widths on both platforms, which matters for set rows. Lose: slightly less "native" body text on iOS, plus about 300 KB of fonts. Fits because the logging grid depends on consistent figures.
- Solid fallback instead of blur on Android and iOS < 26. Gain: same layout, no dropped frames on mid-range Android. Lose: no frosted look on older devices.

## Color tokens

Source of truth: [`src/theme/tokens.ts`](../src/theme/tokens.ts). Values are RGB channels, because React Native can't parse `oklch()`. The generator's oklch values were converted to sRGB, then fill/text pairs were split where white-on-color failed AA.

| Token            | Dark      | Light     | Use                                    |
| ---------------- | --------- | --------- | -------------------------------------- |
| background       | `#110f0d` | `#f8f6f4` | Screen                                 |
| surface          | `#1c1a18` | `#ffffff` | Cards, set rows                        |
| surface-raised   | `#272421` | `#f2f0ed` | Inputs, steppers, pressed rows, sheets |
| foreground       | `#f3f2ee` | `#1a1815` | Primary text                           |
| muted-foreground | `#a9a49c` | `#5f5a54` | Secondary text, "previous" values      |
| border           | `#302d2b` | `#e3e1de` | Dividers (decorative)                  |
| border-strong    | `#74716c` | `#898581` | Input and control edges (≥ 3:1)        |
| primary          | `#ca4500` | `#c64100` | Main button fill, completed-set fill   |
| on-primary       | `#fffdfa` | `#fffdfa` | Text/icon on primary                   |
| primary-text     | `#fa8746` | `#b53900` | Accent text and icons on surfaces      |
| destructive      | `#cc2827` | `#c51e21` | Destructive button fill                |
| on-destructive   | `#fffbfa` | `#fffbfa` | Text on destructive                    |
| destructive-text | `#f66d67` | `#b7191c` | Error text                             |
| success          | `#4bc680` | `#007840` | PR badge, saved state                  |
| warning          | `#edb345` | `#9d6300` | Warnings                               |
| set-warmup       | `#edb345` | `#9d6300` | Warm-up set marker                     |
| set-dropset      | `#ab91f2` | `#6d47b8` | Drop-set marker                        |
| set-failure      | `#f66d67` | `#b7191c` | Failure-set marker                     |
| superset         | `#46c6cd` | `#007277` | Superset bracket and label             |

### Measured contrast (WCAG 2.1)

| Pair                                 | Dark | Light |
| ------------------------------------ | ---- | ----- |
| foreground / surface                 | 15.5 | 17.7  |
| muted-foreground / surface           | 7.0  | 6.8   |
| on-primary / primary                 | 4.74 | 4.98  |
| primary-text / surface               | 7.1  | 5.9   |
| on-destructive / destructive         | 5.2  | 5.7   |
| destructive-text / surface           | 6.0  | 6.6   |
| set-warmup / surface                 | 9.2  | 5.0   |
| set-dropset / surface                | 6.7  | 6.5   |
| superset / surface                   | 8.4  | 5.7   |
| border-strong / surface (non-text)   | 3.6  | 3.7   |
| primary fill / background (non-text) | 4.0  | 4.7   |

Every text pair passes AA (≥ 4.5), every control edge passes 3:1. Set types never rely on color alone: each marker also shows a letter (W, D, F) or the set number, and has an accessibility label ("Warm-up set").

## Typography

Inter (`@expo-google-fonts/inter`): 400, 500, 600, 700.

| Style    | Size / line | Weight       | Use                                    |
| -------- | ----------- | ------------ | -------------------------------------- |
| display  | 56 / 60     | 700, tabular | Stepper value, rest timer              |
| title-1  | 28 / 34     | 700          | Screen titles (large title)            |
| title-2  | 22 / 28     | 600          | Section heads, exercise name in logger |
| headline | 17 / 22     | 600          | Row titles, buttons                    |
| body     | 17 / 24     | 400          | Default text                           |
| callout  | 15 / 20     | 400–500      | Set row values, chips                  |
| footnote | 13 / 18     | 400          | Previous values, meta                  |
| caption  | 12 / 16     | 500          | Column headers, badges                 |

- Sizes follow iOS text styles so Dynamic Type scaling feels right. Text scales with the system setting (`allowFontScaling` stays on). Only `display` gets `maxFontSizeMultiplier={1.4}` so a 56 pt number can't push the stepper buttons off-screen.
- All numbers that change in place use `tabular-nums`.
- Bold is only for the display value, screen and section titles, and active values.

## Spacing, radius, size

- 4 pt grid. Screen gutter 16. Card padding 16. Gap between related rows 8, between sections 24–32.
- Radius: sm 8 (chips, badges), md 12 (inputs, set rows, buttons), lg 16 (cards), xl 20 (sheets, floating bars). Pills use full rounding.
- Touch targets: 44 minimum everywhere (`min-h-touch`). The logging screen uses **56** (`min-h-log`) for steppers, the set-complete check and the main buttons. Neighboring targets are ≥ 8 apart.

## Elevation

- Dark: depth comes from the surface steps (background → surface → surface-raised) and a 1 px top highlight (`border` at the top edge), not drop shadows, which don't read on black.
- Light: a 1 px border plus a soft shadow (`shadow-sm`) on cards. Sheets use the native sheet chrome.

## Icons

Phosphor, duotone variant (`phosphor-react-native`), assigned by the generator. In-app icons are always Phosphor. Tab bar icons use SF Symbols on iOS and Material Symbols on Android, because native tabs only accept platform symbols or images. The tab icon picks are mine and generic (dumbbell, list, clock, chart, person). Icon-only buttons always have `accessibilityLabel`.

## Liquid Glass (iOS 26) and fallbacks

Checked against Expo SDK 58 docs: `expo-glass-effect@58`, `expo-router/native-tabs` (now stable, no longer `unstable-`), native stack headers.

| Surface                                 | iOS 26+                                                              | iOS < 26                                                                                                               | Android                              |
| --------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Tab bar                                 | `NativeTabs`: system Liquid Glass, `minimizeBehavior="onScrollDown"` | System tab bar (opaque/blurred by UIKit)                                                                               | Material bottom nav, `surface` color |
| Active workout bar above tabs           | `NativeTabs.BottomAccessory` (glass, system-drawn)                   | Own floating bar above the tab bar, `surface-raised` + border (the accessory API is iOS 26 only, to verify in phase 6) | Same own floating bar                |
| Nav bars                                | Native stack header, transparent + large title (system glass)        | Native header, `background`                                                                                            | Native header, `background`          |
| Logger toolbar (timer, finish)          | `GlassView` (`regular`, `isInteractive`) inside `GlassContainer`     | Solid `surface-raised`                                                                                                 | Solid `surface-raised`               |
| Rest timer pill                         | `GlassView` tinted `primary` at low alpha                            | Solid `surface-raised` + primary text                                                                                  | Same as iOS < 26                     |
| Cards, set rows, lists                  | Solid `surface`                                                      | Solid `surface`                                                                                                        | Solid `surface`                      |
| Sheets (set type, RPE, exercise picker) | Native `formSheet` with detents (system glass)                       | Native sheet                                                                                                           | Bottom sheet on `surface-raised`     |

The rule in code: a single `<Glass>` wrapper renders `GlassView` only when **all three** are true: `isGlassEffectAPIAvailable()`, `isLiquidGlassAvailable()`, and `AccessibilityInfo.isReduceTransparencyEnabled()` is false. Otherwise it renders a `View` with `bg-surface-raised border border-border`. Same children, same padding, so the layout doesn't shift between paths.

## Accessibility

- **Dynamic Type**: system scaling on. Set rows wrap to two lines instead of truncating values at the largest sizes.
- **Reduce transparency**: solid fallback (see above).
- **Reduce motion**: `useReducedMotion()` from Reanimated. Timer ring and set-complete feedback switch to a cross-fade, and no springs on sheets beyond the system's own.
- **Screen readers**: every set row reads as one element ("Set 2, 80 kilograms, 8 reps, completed"). Steppers expose `accessibilityRole="adjustable"` with increment/decrement actions. The rest timer announces "Rest over" through `AccessibilityInfo.announceForAccessibility` as well as the notification.
- **Color is never the only signal**: set types have letters, PRs have a trophy icon + "PR" label, errors have an icon + text.
- **Haptics** (expo-haptics): light on set complete, success on PR, warning when the timer ends. They follow the system setting.

## Motion

From the generated tokens: fast 180 ms, base 240 ms, slow 300 ms. Ease-out `cubic-bezier(0.19, 1, 0.22, 1)`.

- Motion never blocks input: a set can be completed again or edited mid-animation.
- Set complete: row fill fades to the primary tint over 180 ms, plus a haptic.
- Big flourishes only for rare moments: finishing a workout, a new PR.

## Core components (to build in phase 3+)

| Component                    | Spec                                                                                                                                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Button                       | `primary` (fill primary, label on-primary), `secondary` (surface-raised + border-strong), `ghost`, `destructive`. Heights 44 / 56. Label in headline. The disabled state uses muted tokens, never opacity.                                       |
| IconButton                   | 44 × 44 minimum, Phosphor 24, required `accessibilityLabel`.                                                                                                                                                                                     |
| Stepper                      | `−  value  +`, 56 high, value in display or title-2 depending on context. Tap = ±step (weight: 2.5 kg / 5 lb by default, configurable; reps: 1). Long-press repeats with acceleration. Tapping the value opens the numeric keypad as a fallback. |
| SetRow                       | Columns: set marker · previous (muted, footnote) · weight · reps · (RPE) · complete check (56). Completed row: primary at 16% fill. One a11y element.                                                                                            |
| SetMarker                    | Number for normal sets, W/D/F letter in the set-type color for others. Tap opens the set-type sheet.                                                                                                                                             |
| SupersetBracket              | 3 px rounded bar in `superset` color down the left edge of the grouped exercises + "Superset" label in caption.                                                                                                                                  |
| RestTimerPill                | Floating `Glass`, countdown in tabular headline, −15 s / +15 s / skip.                                                                                                                                                                           |
| Card, ListRow, SectionHeader | Solid surfaces. ListRow min 44, chevron for navigation.                                                                                                                                                                                          |
| Chip / FilterChip            | Muscle and equipment filters; selected = primary at 16% fill + primary-text label + check icon.                                                                                                                                                  |
| SegmentedControl             | `@expo/ui` native segmented picker (SwiftUI/Compose) for kg/lb, period ranges.                                                                                                                                                                   |
| TextField                    | surface-raised fill, border-strong edge, visible label above (never placeholder-only).                                                                                                                                                           |
| EmptyState                   | One line of what's missing + the action that fills it (for example "No workouts yet" + "Start workout").                                                                                                                                         |
| StatValue                    | Number in title-1 tabular + caption label below. The number dominates the label.                                                                                                                                                                 |

## UI copy rules

- Short and plain. Titles about 6 words, at most one supporting line per section, no exclamation marks, no emoji as icons.
- One primary action per screen, at most two secondary ones in view. Logger: "Finish workout" is primary. The rest-timer controls live inside the floating pill as their own group.
- Buttons say the outcome: "Finish workout", "Add exercise", not "Continue" / "OK".
- Units always shown with values (`80 kg`, `8 reps`), localized (pt-BR uses a decimal comma: `82,5 kg`).

## Review status

Better Design rules used so far: dark-mode elevation, tap targets, color contrast, tabular numbers, accessibility review rules. Contrast was checked numerically (table above). **No screen exists yet**, so `check-comprehension` and `inspect-spacing` haven't run. From phase 4 on, every screen gets them, using a React Native web export for spacing and simulator screenshots for native-only surfaces (glass, native tabs).

## Body diagram

The muscle map on the workout screen uses the front and back figures from [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) 3.2 (MIT, © 2022 ELABBASSI Hicham). `src/features/workouts/body-map.tsx` maps our muscle groups to its slugs (shoulders → deltoids, lats → upper back, abductors → glutes) and tints worked muscles with the accent color in three steps, by sets relative to the most-worked muscle.

## Workout palette

The live workout screens (logging, its exercise picker and settings) use a third palette, `workout`: black background, blue accent, green completed sets. It is applied with `SchemeScope` from `src/theme/theme-root.tsx`, so shared components restyle without changes. All three palettes are checked for WCAG AA text contrast in `tokens.test.ts`.
