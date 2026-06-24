import SwiftUI

struct DailyAppUsageView: View {
    let configuration: DailyAppUsageConfiguration

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Total Selected App Time")
                .font(.headline)

            Text(durationString(configuration.totalActivityDuration))
                .font(.system(size: 34, weight: .bold, design: .rounded))

            if configuration.applications.isEmpty {
                Spacer(minLength: 0)
                Text("No activity data for the selected apps in this time range.")
                    .foregroundStyle(.secondary)
                Spacer(minLength: 0)
            } else {
                List(configuration.applications) { app in
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(app.name)
                                .font(.body.weight(.semibold))

                            if let bundleIdentifier = app.bundleIdentifier {
                                Text(bundleIdentifier)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Text("\(app.pickups) pickups, \(app.notifications) notifications")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer(minLength: 12)

                        Text(durationString(app.duration))
                            .font(.body.monospacedDigit())
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(.plain)
            }
        }
        .padding()
    }

    private func durationString(_ duration: TimeInterval) -> String {
        let formatter = DateComponentsFormatter()
        formatter.allowedUnits = duration >= 3600 ? [.hour, .minute] : [.minute]
        formatter.unitsStyle = .abbreviated
        formatter.zeroFormattingBehavior = .dropAll
        return formatter.string(from: duration) ?? "0m"
    }
}
