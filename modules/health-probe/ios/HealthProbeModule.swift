import ExpoModulesCore
import HealthKit
import WatchConnectivity

// Reads Apple Health: heart rate and calories while a workout runs, and totals for a finished one.
// The Apple Watch writes these samples during its own workout; they reach the iPhone with some delay.
public class HealthProbeModule: Module {
  private let store = HKHealthStore()
  private let heartRate = HKQuantityType(.heartRate)
  private let activeEnergy = HKQuantityType(.activeEnergyBurned)
  private let basalEnergy = HKQuantityType(.basalEnergyBurned)
  private let bpm = HKUnit.count().unitDivided(by: .minute())

  // Live state, only touched on the main queue.
  private var liveQueries: [HKQuery] = []
  private var latest: (date: Date, bpm: Double)?
  private var activeKcal = 0.0
  private lazy var watch = WatchLink { [weak self] message in
    self?.sendEvent("onWatch", message.mapValues { $0 as Any? })
  }

  public func definition() -> ModuleDefinition {
    Name("HealthProbe")
    Events("onLive", "onWatch")

    OnCreate { self.watch.activate() }

    // Opens the Repforge watch app and starts a strength workout there.
    AsyncFunction("startWatchApp") { (promise: Promise) in
      let config = HKWorkoutConfiguration()
      config.activityType = .traditionalStrengthTraining
      config.locationType = .indoor
      self.store.startWatchApp(with: config) { ok, error in
        promise.resolve(ok ? "Watch app opened" : "Failed: \(error?.localizedDescription ?? "unknown")")
      }
    }

    // "start" or "end"; the watch must be reachable (its app open or running a workout).
    Function("sendToWatch") { (command: String) -> String in
      self.watch.send(command)
    }

    Function("watchState") { () -> String in
      self.watch.state()
    }

    AsyncFunction("probe") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve("Health data is not available on this device.")
        return
      }
      let read: Set<HKObjectType> = [HKObjectType.workoutType(), self.heartRate]
      self.store.requestAuthorization(toShare: [], read: read) { granted, error in
        if let error {
          promise.resolve("Authorization failed: \(error.localizedDescription)")
          return
        }
        let newest = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)
        let query = HKSampleQuery(
          sampleType: HKObjectType.workoutType(), predicate: nil, limit: 3, sortDescriptors: [newest]
        ) { _, samples, error in
          if let error {
            promise.resolve("Authorized: \(granted). Reading failed: \(error.localizedDescription)")
            return
          }
          let workouts = (samples as? [HKWorkout] ?? []).map {
            "\($0.workoutActivityType.rawValue) on \($0.startDate.formatted(date: .abbreviated, time: .shortened)), \(Int($0.duration / 60)) min"
          }
          promise.resolve(
            "Authorized: \(granted). Latest workouts read: \(workouts.count)\n" + workouts.joined(separator: "\n")
          )
        }
        self.store.execute(query)
      }
    }

    // Shows the Health permission sheet the first time; true when the request went through.
    AsyncFunction("requestAccess") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve(false)
        return
      }
      let read: Set<HKObjectType> = [
        HKObjectType.workoutType(), self.heartRate, self.activeEnergy, self.basalEnergy,
      ]
      self.store.requestAuthorization(toShare: [], read: read) { ok, _ in promise.resolve(ok) }
    }

    // Sends onLive { heartRate, activeKcal } whenever new samples since startMs arrive.
    Function("startLive") { (startMs: Double) in
      DispatchQueue.main.async { self.startLive(from: Date(timeIntervalSince1970: startMs / 1000)) }
    }

    Function("stopLive") {
      DispatchQueue.main.async { self.stopLive() }
    }

    // Totals and the heart rate curve for [startMs, endMs].
    AsyncFunction("workoutStats") { (startMs: Double, endMs: Double, promise: Promise) in
      self.workoutStats(
        from: Date(timeIntervalSince1970: startMs / 1000),
        to: Date(timeIntervalSince1970: endMs / 1000),
        promise: promise
      )
    }
  }

  private func startLive(from start: Date) {
    stopLive()
    let predicate = HKQuery.predicateForSamples(withStart: start, end: nil, options: .strictStartDate)
    for type in [heartRate, activeEnergy] {
      let handler: (HKAnchoredObjectQuery, [HKSample]?, [HKDeletedObject]?, HKQueryAnchor?, Error?) -> Void = {
        [weak self] _, samples, _, _, _ in
        let quantities = samples as? [HKQuantitySample] ?? []
        DispatchQueue.main.async { self?.receive(type, quantities) }
      }
      let query = HKAnchoredObjectQuery(
        type: type, predicate: predicate, anchor: nil, limit: HKObjectQueryNoLimit, resultsHandler: handler
      )
      query.updateHandler = handler
      store.execute(query)
      liveQueries.append(query)
    }
  }

  private func stopLive() {
    liveQueries.forEach(store.stop)
    liveQueries = []
    latest = nil
    activeKcal = 0
  }

  private func receive(_ type: HKQuantityType, _ samples: [HKQuantitySample]) {
    guard !liveQueries.isEmpty, !samples.isEmpty else { return }
    if type == heartRate {
      for s in samples where s.endDate > (latest?.date ?? .distantPast) {
        latest = (s.endDate, s.quantity.doubleValue(for: bpm))
      }
    } else {
      activeKcal += samples.reduce(0) { $0 + $1.quantity.doubleValue(for: .kilocalorie()) }
    }
    sendEvent("onLive", ["heartRate": latest?.bpm ?? 0, "activeKcal": activeKcal])
  }

  private func workoutStats(from start: Date, to end: Date, promise: Promise) {
    let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: [])
    let group = DispatchGroup()
    var result: [String: Any] = [:]
    let lock = NSLock()
    let set = { (key: String, value: Any) in
      lock.lock()
      result[key] = value
      lock.unlock()
    }

    for (type, key) in [(activeEnergy, "activeKcal"), (basalEnergy, "basalKcal")] {
      group.enter()
      store.execute(
        HKStatisticsQuery(quantityType: type, quantitySamplePredicate: predicate, options: .cumulativeSum) {
          _, stats, _ in
          set(key, stats?.sumQuantity()?.doubleValue(for: .kilocalorie()) ?? 0)
          group.leave()
        })
    }

    group.enter()
    let oldest = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
    store.execute(
      HKSampleQuery(sampleType: heartRate, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: [oldest]) {
        _, samples, _ in
        let points = (samples as? [HKQuantitySample] ?? []).map {
          [$0.startDate.timeIntervalSince1970 * 1000, $0.quantity.doubleValue(for: self.bpm)]
        }
        set("heartRates", points)
        group.leave()
      })

    group.notify(queue: .main) { promise.resolve(result) }
  }
}

// WatchConnectivity needs an NSObject delegate, which an Expo Module is not.
final class WatchLink: NSObject, WCSessionDelegate {
  private let onMessage: ([String: Any]) -> Void

  init(onMessage: @escaping ([String: Any]) -> Void) {
    self.onMessage = onMessage
  }

  func activate() {
    guard WCSession.isSupported() else { return }
    WCSession.default.delegate = self
    WCSession.default.activate()
  }

  func send(_ command: String) -> String {
    let session = WCSession.default
    guard session.activationState == .activated else { return "Not activated" }
    guard session.isReachable else { return "Watch not reachable (open the app on the watch)" }
    session.sendMessage(["command": command], replyHandler: nil) { [weak self] error in
      self?.onMessage(["event": "error", "message": error.localizedDescription])
    }
    return "Sent \(command)"
  }

  func state() -> String {
    guard WCSession.isSupported() else { return "WatchConnectivity not supported" }
    let s = WCSession.default
    return "activated: \(s.activationState == .activated), paired: \(s.isPaired), "
      + "app installed: \(s.isWatchAppInstalled), reachable: \(s.isReachable)"
  }

  func session(
    _ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState,
    error: Error?
  ) {}

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
    onMessage(message)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
    onMessage(userInfo)
  }
}
