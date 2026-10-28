import HealthKit
import SwiftUI
import WatchKit

final class AppDelegate: NSObject, WKApplicationDelegate {
  // Called when Repforge on the iPhone opens this app with startWatchApp.
  func handle(_ workoutConfiguration: HKWorkoutConfiguration) {
    Task { @MainActor in WorkoutManager.shared.start(workoutConfiguration) }
  }
}

@main
struct RepforgeWatchApp: App {
  @WKApplicationDelegateAdaptor private var delegate: AppDelegate

  var body: some Scene {
    WindowGroup {
      ContentView()
    }
  }
}
