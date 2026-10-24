# Offline Workout Tracker (Hevy-inspired) — Build Prompt

You are building a personal, offline-first workout tracking app for my portfolio, inspired by Hevy. The Hevy Android APK is in the current working folder. Use the REA MCP tools (reverse engineer anything) to study it, then build my own app with Expo.

## How to work

- Work phase by phase. When a phase is done, stop, summarize what you did, list anything you were unsure about, and wait for my "go" before starting the next one.
- Before each phase, show a short plan (files, libraries, decisions). Don't ask me things you can decide with sensible defaults; note the decision and move on.
- Verify current library versions and APIs in the docs before using them (Expo SDK, Liquid Glass packages, HealthKit libs change fast). Don't rely on memory for versions.
- TypeScript everywhere, strict mode.
- No inline comments in code.
- Styling: NativeWind (Tailwind utilities), colors as CSS variables / theme tokens, no inline style objects unless a native component requires it.
- Dark theme is the default; light theme supported.

## Hard rules about Hevy

- REA is for understanding features, flows, data model and calculations only.
- Do NOT copy Hevy's code, UI design, layouts, icons, colors, name, branding, copy text, or exercise images/videos/animations. Everything visual must be original.
- Do NOT commit the APK, decompiled output, or extracted assets to the repo. Add them to `.gitignore`. Analysis notes go in `docs/` written in your own words.
- Exercise library must come from an openly licensed source (check the license, e.g. free-exercise-db or wger) or be created by me. Record the source and license in `docs/`.

## Scope

Remove all social features completely: feed, followers/following, likes, comments, profiles of other users, sharing to feed, discovery, leaderboards, social notifications. No traces in the data model or UI.

Keep login, but optional: the app must be 100% usable without an account. Login only exists to enable a future optional backup/sync. For now implement the auth screens and a local "signed out" mode; the backend can be a stub/interface I'll implement later.

Everything else runs offline with local storage.

## Features

- Exercise library (search, filter by muscle group/equipment, custom exercises)
- Routines/templates and folders
- Workout logging: sets, reps, weight, RPE, set types (warm-up, normal, drop set, failure), supersets, notes, rest timer with notification
- Previous-performance hints while logging ("last time: 80kg x 8")
- History and calendar
- Stats: volume, estimated 1RM, PRs, per-exercise progress charts, muscle distribution
- Body measurements
- Units kg/lb, locale pt-BR and en
- CSV export of workouts and measurements, in a format compatible with Hevy's CSV export (inspect the real column layout)
- CSV import from Hevy and Strong exports
- Apple Health integration (iOS):
  - I won't have a custom Apple Watch app (can't sideload watchOS apps without a paid account). Instead, I record the workout with Apple's native Workout app on the Watch.
  - Read `HKWorkout` samples (type, start/end, active energy, heart rate) and attach them to the app's workout session by time overlap. Handle no match, multiple matches, and manual linking/unlinking.
  - Use background delivery / observer queries if feasible.
  - Write the finished workout to Apple Health as an option.
- Android: Health Connect equivalent is optional, lower priority.

## Tech

- Expo (latest SDK), Expo Router, development builds (not Expo Go) since native modules are needed
- Local DB: expo-sqlite + Drizzle ORM with migrations
- State: Zustand or TanStack Query over the local DB (pick one and justify)
- HealthKit: a maintained React Native HealthKit library compatible with the current Expo SDK (config plugin)
- Tests for calculations (1RM, volume, PRs), CSV import/export and HealthKit matching logic

## UI

- Do NOT copy Hevy's design. Use the Better Design MCP to define principles, create a design system and review screens.
- iOS: use Apple's Liquid Glass (iOS 26) through Expo's native options (e.g. `expo-glass-effect`, native tabs, `@expo/ui` — check what's current). Glass for navigation, toolbars and floating controls, not for every card.
- Android and iOS < 26: graceful fallback (blur or solid surfaces) with the same layout.
- Respect accessibility: Dynamic Type, contrast, reduce transparency / reduce motion.
- The logging screen must be fast to use one-handed at the gym: big tap targets, minimal typing, number steppers.

## Constraints

- I don't have a paid Apple Developer account. Research and document how I can build and install the iOS app for free (Xcode with a free Apple ID if a Mac is available, unsigned IPA + SideStore/AltStore, etc.), including whether the HealthKit entitlement survives that signing method. Flag anything that would force a paid account.

## Phases

1. **Analysis**: inspect the APK with REA (framework: native, React Native/Hermes, Flutter?), map features, screens, data model, calculations and CSV format. Output `docs/analysis.md` and `docs/data-model.md`. Write no app code.
2. **Design system**: with Better Design MCP, define the visual direction, tokens, typography, components, Liquid Glass usage and fallbacks. Output `docs/design-system.md` and a theme setup.
3. **Project setup**: Expo project, router, NativeWind, theme, DB + migrations, lint/format, folder structure.
4. **Exercise library**: seed data, search/filter, custom exercises.
5. **Routines**.
6. **Workout logging** + rest timer.
7. **History, stats and measurements**.
8. **CSV import/export**.
9. **Apple Health integration** + session matching.
10. **Optional login** (UI + local mode + sync interface stub).
11. **Polish**: accessibility, empty states, performance, tests, iOS free install guide in `docs/`.
12. **README** for the portfolio in informal first-person Brazilian Portuguese, focused on how it was built.

Start with phase 1.
