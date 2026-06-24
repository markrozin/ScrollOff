import DeviceActivity
import ExtensionKit
import SwiftUI

struct DailyAppUsageConfiguration {
    let totalActivityDuration: TimeInterval
    let applications: [DailyAppUsageItem]
}

struct DailyAppUsageItem: Identifiable, Hashable {
    let id: String
    let name: String
    let bundleIdentifier: String?
    let duration: TimeInterval
    let pickups: Int
    let notifications: Int
}

struct DailyAppUsageReport: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .dailyAppBreakdown
    let content: (DailyAppUsageConfiguration) -> DailyAppUsageView

    func makeConfiguration(
        representing data: DeviceActivityResults<DeviceActivityData>
    ) async -> DailyAppUsageConfiguration {
        let aggregate = await data
            .flatMap { $0.activitySegments }
            .flatMap { $0.categories }
            .flatMap { $0.applications }
            .reduce(into: [String: DailyAppUsageItem]()) { partialResult, appActivity in
                let application = appActivity.application
                let displayName = application.localizedDisplayName
                    ?? application.bundleIdentifier
                    ?? "Unknown App"
                let key = application.bundleIdentifier ?? displayName

                if let existing = partialResult[key] {
                    partialResult[key] = DailyAppUsageItem(
                        id: existing.id,
                        name: existing.name,
                        bundleIdentifier: existing.bundleIdentifier,
                        duration: existing.duration + appActivity.totalActivityDuration,
                        pickups: existing.pickups + appActivity.numberOfPickups,
                        notifications: existing.notifications + appActivity.numberOfNotifications
                    )
                } else {
                    partialResult[key] = DailyAppUsageItem(
                        id: key,
                        name: displayName,
                        bundleIdentifier: application.bundleIdentifier,
                        duration: appActivity.totalActivityDuration,
                        pickups: appActivity.numberOfPickups,
                        notifications: appActivity.numberOfNotifications
                    )
                }
            }

        let applications = aggregate.values.sorted { lhs, rhs in
            lhs.duration > rhs.duration
        }
        let totalDuration = applications.reduce(0) { $0 + $1.duration }

        return DailyAppUsageConfiguration(
            totalActivityDuration: totalDuration,
            applications: applications
        )
    }
}
