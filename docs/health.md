# Apple Health

Library: `@kingstinct/react-native-healthkit` 16.2 (Nitro modules, Expo config plugin). Code in `src/features/health/`. iOS only. On Android the adapter (`healthkit.ts`) is a no-op, and on iOS the library is loaded lazily and skipped in Expo Go, so neither crashes.

## How it works

You log the workout in Repforge and record the same session with Apple's Workout app on the Watch. Repforge then attaches the Watch workout's calories and heart rate.

Profile › Apple Health has two switches, both off by default:

- **Link Apple Watch workouts**: asks for read access to workouts, heart rate and active calories, then matches automatically.
- **Save workouts to Apple Health**: each finished workout is saved as Traditional Strength Training (no calories, since Repforge doesn't measure them). Its UUID goes in `workout.exported_hk_uuid`, so it can never be matched to itself.

## Matching (`match.ts`, tested)

- Coverage = overlap ÷ duration of the shorter workout. A Health workout matches when coverage is at least 50%, so starting the Watch a couple of minutes early or late still matches.
- Automatic link only when exactly one Health workout matches the app workout **and** that Health workout matches no other app workout.
- More than one candidate either way → left for the user (the sync reports "N workouts need you to choose").
- Health workouts already linked, unlinked by the user (`dismissed_health_workout`), or written by Repforge are never auto-linked.
- Sync looks at app workouts from the last 30 days that have no link yet.

## Manual link and unlink

On a workout's detail screen:

- **Linked**: activity type, Watch start–end, active calories, average and max heart rate, and a heart-rate chart (samples copied locally, at most 240 points). **Unlink** removes the link and records the UUID as dismissed, so it isn't auto-linked again.
- **Not linked**: **Link Apple Health workout** lists every Health workout within 12 hours, best overlap first, showing "Overlaps 97%", "Overlaps only 30%" or "40 min apart". Picking one links it manually, even if it was dismissed before.

## When sync runs

- At app start and every time the app comes to the foreground.
- Right after finishing a workout (after the optional save to Health).
- When HealthKit reports a new workout: `subscribeToChanges` on the workout type plus `enableBackgroundDelivery(immediate)`. The config plugin adds the background-delivery entitlement. iOS decides when to wake the app; if it doesn't, the next foreground catches up.

## Not verified

Written on Windows: nothing has run against real HealthKit. Checked: types, matching tests, the iOS JS bundle, and that Android hides everything.

Free Apple account: whether a personal team can sign the HealthKit entitlement (and background delivery) is still open. Phase 11 researches it for the free install guide.
