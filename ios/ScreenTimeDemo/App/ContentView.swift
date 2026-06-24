import DeviceActivity
import FamilyControls
import SwiftUI

struct ContentView: View {
    @ObservedObject private var authorizationCenter = AuthorizationCenter.shared

    @AppStorage("familyActivitySelectionData") private var selectionData = Data()

    @State private var selection = FamilyActivitySelection()
    @State private var isPickerPresented = false
    @State private var selectedDay = Calendar.current.startOfDay(for: .now)
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            List {
                Section("Access") {
                    LabeledContent("Authorization") {
                        Text(authorizationCenter.authorizationStatus.description.capitalized)
                            .fontWeight(.semibold)
                    }

                    Button("Request Screen Time Access") {
                        requestAuthorization()
                    }
                }

                Section("Apps To Track") {
                    Button("Choose Apps") {
                        isPickerPresented = true
                    }

                    if selection.applicationTokens.isEmpty {
                        Text("No apps selected yet.")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(Array(selection.applicationTokens), id: \.self) { token in
                            Label(token)
                        }
                    }
                }

                Section("Daily Report") {
                    DatePicker(
                        "Day",
                        selection: $selectedDay,
                        in: ...Date(),
                        displayedComponents: .date
                    )

                    if authorizationCenter.authorizationStatus != .approved {
                        Text("Grant Screen Time access first.")
                            .foregroundStyle(.secondary)
                    } else if selection.applicationTokens.isEmpty {
                        Text("Choose one or more apps to see per-app daily totals.")
                            .foregroundStyle(.secondary)
                    } else {
                        DeviceActivityReport(.dailyAppBreakdown, filter: reportFilter)
                            .frame(minHeight: 360)
                    }
                }

                if let errorMessage {
                    Section("Last Error") {
                        Text(errorMessage)
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Screen Time Demo")
            .task {
                loadSelection()
            }
            .onChange(of: selection) { newSelection in
                persistSelection(newSelection)
            }
            .familyActivityPicker(
                headerText: "Select the apps you want in the end-of-day report.",
                footerText: "Apple will provide report data for the user-selected apps.",
                isPresented: $isPickerPresented,
                selection: $selection
            )
        }
    }

    private var reportFilter: DeviceActivityFilter {
        DeviceActivityFilter(
            segment: .daily(during: selectedDateInterval),
            applications: selection.applicationTokens,
            categories: selection.categoryTokens,
            webDomains: selection.webDomainTokens
        )
    }

    private var selectedDateInterval: DateInterval {
        let calendar = Calendar.current
        let start = calendar.startOfDay(for: selectedDay)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: start) ?? .now
        let end = min(endOfDay, .now)
        return DateInterval(start: start, end: end)
    }

    private func requestAuthorization() {
        Task {
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                }
            }
        }
    }

    private func loadSelection() {
        guard !selectionData.isEmpty else { return }

        do {
            selection = try JSONDecoder().decode(FamilyActivitySelection.self, from: selectionData)
        } catch {
            errorMessage = "Could not restore the previous app selection: \(error.localizedDescription)"
        }
    }

    private func persistSelection(_ newSelection: FamilyActivitySelection) {
        do {
            selectionData = try JSONEncoder().encode(newSelection)
        } catch {
            errorMessage = "Could not save the current app selection: \(error.localizedDescription)"
        }
    }
}
