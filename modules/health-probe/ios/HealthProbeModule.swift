import ExpoModulesCore
import HealthKit

// Asks for read access to workouts and heart rate, then reads the latest workouts,
// so a sideloaded build can show whether its signature kept the HealthKit entitlement.
public class HealthProbeModule: Module {
  private let store = HKHealthStore()

  public func definition() -> ModuleDefinition {
    Name("HealthProbe")

    AsyncFunction("probe") { (promise: Promise) in
      guard HKHealthStore.isHealthDataAvailable() else {
        promise.resolve("Health data is not available on this device.")
        return
      }
      let read: Set<HKObjectType> = [HKObjectType.workoutType(), HKQuantityType(.heartRate)]
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
  }
}
