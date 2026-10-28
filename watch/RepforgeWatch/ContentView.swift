import SwiftUI

struct ContentView: View {
  @ObservedObject private var workout = WorkoutManager.shared

  var body: some View {
    ScrollView {
      VStack(spacing: 10) {
        Text(workout.status)
          .font(.footnote)
          .multilineTextAlignment(.center)
        if workout.running {
          Label("\(Int(workout.heartRate)) bpm", systemImage: "heart.fill")
            .font(.title3.bold())
            .foregroundStyle(.red)
          Label("\(Int(workout.activeKcal)) kcal", systemImage: "flame.fill")
            .font(.headline)
            .foregroundStyle(.orange)
          Button("End workout", role: .destructive) { workout.end() }
        } else {
          Button("Start workout") { workout.start() }
            .tint(.blue)
        }
        Text(workout.phoneReachable ? "iPhone: connected" : "iPhone: not connected")
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
    .onAppear { workout.requestAuthorization() }
  }
}
