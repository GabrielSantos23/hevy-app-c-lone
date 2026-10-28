import Combine
import Foundation
import HealthKit
import WatchConnectivity

// Runs a strength workout on the watch and talks to Repforge on the iPhone.
// Minimal on purpose: it exists to test install, workout session and connectivity.
@MainActor
final class WorkoutManager: NSObject, ObservableObject {
  static let shared = WorkoutManager()

  @Published var running = false
  @Published var heartRate = 0.0
  @Published var activeKcal = 0.0
  @Published var status = "Ready"
  @Published var phoneReachable = false

  private let store = HKHealthStore()
  private var session: HKWorkoutSession?
  private var builder: HKLiveWorkoutBuilder?

  override init() {
    super.init()
    if WCSession.isSupported() {
      WCSession.default.delegate = self
      WCSession.default.activate()
    }
  }

  func requestAuthorization() {
    let share: Set<HKSampleType> = [HKObjectType.workoutType()]
    let read: Set<HKObjectType> = [
      HKObjectType.workoutType(), HKQuantityType(.heartRate), HKQuantityType(.activeEnergyBurned),
    ]
    store.requestAuthorization(toShare: share, read: read) { ok, error in
      let message = ok ? "Ready" : "Health access failed: \(error?.localizedDescription ?? "denied")"
      Task { @MainActor in self.status = message }
    }
  }

  // configuration comes from the iPhone when it opens this app with startWatchApp.
  func start(_ configuration: HKWorkoutConfiguration? = nil) {
    guard session == nil else { return }
    let config = configuration ?? Self.strength()
    do {
      let session = try HKWorkoutSession(healthStore: store, configuration: config)
      let builder = session.associatedWorkoutBuilder()
      builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
      session.delegate = self
      builder.delegate = self
      self.session = session
      self.builder = builder
      let start = Date()
      session.startActivity(with: start)
      builder.beginCollection(withStart: start) { _, _ in }
      running = true
      status = configuration == nil ? "Started on watch" : "Started from iPhone"
      send(["event": "started"])
    } catch {
      status = "Could not start: \(error.localizedDescription)"
    }
  }

  func end() {
    session?.end()
  }

  private static func strength() -> HKWorkoutConfiguration {
    let config = HKWorkoutConfiguration()
    config.activityType = .traditionalStrengthTraining
    config.locationType = .indoor
    return config
  }

  private func finish(at date: Date) {
    guard let builder else { return }
    builder.endCollection(withEnd: date) { _, _ in
      builder.finishWorkout { _, _ in }
    }
    session = nil
    self.builder = nil
    running = false
    status = "Workout saved"
    send(["event": "ended"])
  }

  private func send(_ message: [String: Any]) {
    let link = WCSession.default
    guard link.activationState == .activated else { return }
    if link.isReachable {
      link.sendMessage(message, replyHandler: nil)
    } else if message["event"] as? String != "live" {
      // Delivered when the iPhone app next runs.
      link.transferUserInfo(message)
    }
  }
}

extension WorkoutManager: HKWorkoutSessionDelegate {
  nonisolated func workoutSession(
    _ workoutSession: HKWorkoutSession, didChangeTo toState: HKWorkoutSessionState,
    from fromState: HKWorkoutSessionState, date: Date
  ) {
    guard toState == .ended else { return }
    Task { @MainActor in self.finish(at: date) }
  }

  nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
    let message = error.localizedDescription
    Task { @MainActor in self.status = "Workout failed: \(message)" }
  }
}

extension WorkoutManager: HKLiveWorkoutBuilderDelegate {
  nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

  nonisolated func workoutBuilder(
    _ workoutBuilder: HKLiveWorkoutBuilder, didCollectDataOf collectedTypes: Set<HKSampleType>
  ) {
    let bpm = workoutBuilder.statistics(for: HKQuantityType(.heartRate))?
      .mostRecentQuantity()?.doubleValue(for: .count().unitDivided(by: .minute())) ?? 0
    let kcal = workoutBuilder.statistics(for: HKQuantityType(.activeEnergyBurned))?
      .sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0
    Task { @MainActor in
      self.heartRate = bpm
      self.activeKcal = kcal
      self.send(["event": "live", "heartRate": bpm, "activeKcal": kcal])
    }
  }
}

extension WorkoutManager: WCSessionDelegate {
  nonisolated func session(
    _ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {
    let reachable = session.isReachable
    Task { @MainActor in self.phoneReachable = reachable }
  }

  nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
    let reachable = session.isReachable
    Task { @MainActor in self.phoneReachable = reachable }
  }

  // The iPhone sends {"command": "start" | "end"}.
  nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    let command = message["command"] as? String
    Task { @MainActor in
      if command == "start" { self.start() } else if command == "end" { self.end() }
    }
  }
}
