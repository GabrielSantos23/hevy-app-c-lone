# Repforge Watch (test app)

A minimal watchOS app to test, with a free Apple account, three things:

- installing from Xcode;
- running a workout session on the watch;
- talking to Repforge on the iPhone.

It is not part of the Expo build. Build it in Xcode on macOS.

## Set up in Xcode

1. File → New → Project → watchOS → App.
   - Product Name: `RepforgeWatch`.
   - Team: the Personal Team used by SideStore.
   - Choose "Watch-only App".
2. Replace the generated Swift files with the three in `RepforgeWatch/`. Delete the template's `ContentView.swift` and `RepforgeWatchApp.swift` first.
3. In the target's Build Settings, set Swift Language Version to Swift 5.
4. In Signing & Capabilities:
   - Bundle Identifier: `dev.gabs.repforge.<team>.watchkitapp`, the SideStore App ID plus `.watchkitapp`.
   - Add HealthKit.
   - Add Background Modes, then Workout Processing.
5. On the Info tab, add:
   - `WKCompanionAppBundleIdentifier` = `dev.gabs.repforge.<team>`. This links it to the SideStore iPhone app.
   - `WKRunsIndependentlyOfCompanionApp` = YES.
   - `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription`, each with any sentence.
6. Pick the watch as the run destination and press Run.
   - The watch needs Developer Mode: Settings → Privacy & Security.
   - The watch app expires after 7 days, like any free-account install.

## Test from the iPhone

In Repforge, go to Profile → Import & export → Apple Watch app (test).

- **Connection status:** should report `paired: true, app installed: true`. "app installed" is true only if the companion link above worked.
- **Open app on watch:** calls `startWatchApp`. The watch app should open and start a workout.
- **Start / End workout on watch:** messages over WatchConnectivity. These work only while the watch app is open.
- **Last message from the watch:** shows started, ended and live heart rate updates.
