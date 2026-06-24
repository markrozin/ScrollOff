import DeviceActivity
import ExtensionKit
import SwiftUI

@main
struct ScreenTimeReportExtension: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        DailyAppUsageReport { configuration in
            DailyAppUsageView(configuration: configuration)
        }
    }
}
