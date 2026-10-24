# Widgets and Live Activity (iOS)

Built with `expo-widgets` and `@expo/ui/swift-ui`. Code in `src/features/widgets/`. Nothing here runs on Android or in Expo Go; it needs a development build on an iPhone.

## Home screen and Lock Screen widgets

| Name | Sizes | Shows | Tap opens |
| --- | --- | --- | --- |
| Volume | small, medium | Total volume of the last 7 days and a bar per day | Profile |
| Calendar | small, large | The current month with trained days filled | History |
| Last 7 days | medium, Lock Screen rectangular | Workout count and the last 7 days | History |
| Streak | small, Lock Screen circular and inline | Weeks in a row with at least one workout | Profile |
| Quick start | small, medium | Log workout button, medium adds up to 4 routines | Starts that workout |

- `data.ts` computes every widget's props (tested). Widgets get text already translated and formatted, because widget code can't import anything.
- The app writes a 7-entry timeline (now and the next 6 midnights) so "last 7 days", today's mark and the calendar move on even if the app isn't opened.
- `sync.ios.ts` refreshes the timeline 1.5 s after a change to workouts or routines, when the app comes to the foreground, and when units, week start or language change.
- Quick start links use `repforge://train?start=empty` or `?start=<routine id>`. The Train tab reads that parameter and starts the workout, with the usual "workout already running" prompt.

## Workout Live Activity

Starts when a workout begins and ends when it's finished or discarded. Tapping it opens the workout.

- Lock Screen: elapsed time, current exercise, "Set 2 of 6", and the set's values (typed or from the previous workout) with a checkmark to complete it.
- During rest: "Next: set 3 of 6 (60 kg × 3-5 reps)", a countdown bar, −15s, +15s and Skip.
- Dynamic Island: elapsed time, or the rest countdown while resting.
- Timers are native date timers, so they tick without the app running.
- Buttons send an event to the app (iOS wakes it in the background), which reuses the same code as the workout screen (`completeSet`, `adjustRest`, `stopRest`) and then updates the activity. If iOS doesn't wake the app, the tap does nothing.

## Not verified

None of this has run on a device: it was written on Windows. What was checked: types, unit tests for the data, the iOS JS bundle, and the widget layout registry build (each widget compiles to a standalone function).

A free Apple account may not be able to sign the widget extension, because widgets need an App Group. The Live Activity is drawn by the same extension.
