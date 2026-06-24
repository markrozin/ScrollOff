# iOS Screen Time Research

Researched on 2026-03-25.

## Bottom Line

If the app needs to track overall device or per-app screen time on iOS, the right official path is Apple’s Screen Time API:

- `FamilyControls`
- `DeviceActivity`
- `ManagedSettings`

This is good for:
- self-control apps
- parental control apps
- thresholds and limits
- custom user-facing reports

For your narrower use case, the answer is:

- Yes, iOS is a fit if you want to show end-of-day time totals for selected apps like Instagram or Snapchat.
- No, you do not need blocking for that use case.
- No, you should not design it as Android-style continuous polling of the foreground app.

The public iOS model is "ask Screen Time for report data and show it to the user," not "keep reading the active app in the background every few minutes."

## The Short Answer for Your Exact Use Case

If your product is:

- "At the end of each day, show me how many minutes I spent on Instagram"
- "Show me Snapchat, TikTok, YouTube, etc. in a daily report"

then iOS can support that with the Screen Time APIs.

The clean Apple-shaped version looks like this:

1. The user grants Screen Time authorization to your app.
2. The user selects the apps or categories they care about.
3. Your app asks for a daily device-activity report.
4. Your report extension renders totals like:
   - Instagram: 47m
   - Snapchat: 32m
   - TikTok: 1h 14m

So for this use case, the answer is basically yes.

The part that is different from Android is where the data comes from and how you present it:

- Android: your app can reconstruct usage itself from usage events.
- iOS: Apple’s Screen Time system is the source of truth, and your app presents report data from that system.

## What This Means in Product Terms

### If you only want end-of-day totals

You probably need:

- `FamilyControls` for authorization and app selection
- `DeviceActivity` reporting APIs for usage data
- a `DeviceActivityReportExtension` to render the daily report UI

You probably do not need:

- `ManagedSettings`
- app shielding
- blocking logic
- threshold callbacks

That means the simplest iOS version of your product is a reporting app, not a blocking app.

### If you want Instagram and Snapchat specifically

The user can choose those apps in the picker, and your app can build the daily report around those selected tokens.

Important nuance:
- Apple’s model is privacy-preserving.
- You should think in terms of "user-selected applications represented by tokens, then displayed in a report" rather than "my app freely inspects every installed app however it wants."

### If you want a plain-English answer

Think of iOS like this:

- Apple tracks the real app usage.
- Your app gets permission to ask Apple for the usage totals.
- Your app then shows those totals in your own report UI.

That is very different from:

- your app running in the background all day
- detecting the foreground app itself
- building its own raw event log from scratch

## What You Can Reasonably Expect to Show

For a selected app, the Screen Time report model is designed for things like:

- total activity duration for today
- total activity duration for this week
- per-app or per-category summaries

If the goal is a daily summary screen, that aligns well with the public API shape.

## What Is Still Less Clear / More Limited

Even though daily totals are a good fit, there are still some boundaries:

- Apple’s public docs are much clearer about rendering report data than about exporting unrestricted raw telemetry into your own general-purpose analytics pipeline.
- The platform is designed around a Screen Time report flow, not a free-form background surveillance model.
- If you later want second-by-second raw sessions, custom event timelines, or unrestricted backend export semantics identical to Android, that is where iOS becomes much harder.

## What Apple Officially Gives You

### 1. Authorization through `FamilyControls`

Official:
- Apple describes `FamilyControls` as the gateway to the Screen Time API.
- In iOS 15, the API was introduced for parental-control flows tied to Family Sharing.
- In iOS 16, Apple added `individual` authorization, so independent users can authorize apps from their own device.

Important implications:
- A self-control app is viable on iOS 16+ with `.individual` authorization.
- Multiple apps on the same device can use individual authorization.
- Individual authorization is weaker than child/guardian authorization for anti-tampering. Apple explicitly says the implicit restrictions around iCloud sign-out and app deletion do not apply to the individual flow.
- Apple also shows that users can deauthorize the app from Settings.

### 2. Privacy-preserving app selection with `FamilyActivityPicker`

Official:
- Apple documents `FamilyActivityPicker` as a view where users specify apps, web domains, and categories without revealing their choices to the app.
- Apple also documents "Displaying Activity Labels" as a way to show a read-only visual representation from the user-selected tokens.

Practical meaning:
- Your iOS product should be built around user-selected opaque tokens, not around expecting raw bundle identifiers for every installed app.
- Apple’s design strongly favors privacy-preserving selection and display.

### 3. `DeviceActivity` for schedules, thresholds, and reporting

Official:
- Apple says `DeviceActivity` can call your extension at schedule boundaries and when usage thresholds are reached.
- In iOS 16, Apple added a reporting service so apps can create custom usage reports with SwiftUI.
- Apple’s `DeviceActivityReportExtension` docs say the extension is provided with the data requested when the app instantiates a `DeviceActivityReport`, which it uses to render a view of the user’s device activity.

Practical meaning:
- This is the right place to build dashboards and summaries on iOS.
- The official model is "request a report and render a user-facing view," not "stream raw usage events into your backend."
- For your use case, this is the key API area: it is the part of the stack that lets you show "Instagram today: 47 minutes."

### 4. `ManagedSettings` for interventions

Official:
- `ManagedSettings` lets the app apply restrictions similar to Screen Time.
- Apple’s WWDC22 update added named stores that can be shared between the app and extensions, with up to 50 stores per process.

Practical meaning:
- iOS is especially strong if the app’s value includes blocking, shielding, schedule-based restrictions, or unlocking after some goal is met.

## What iOS Is Good At

- Self-control products where the user opts in to limits and reports
- Parental-control products
- Threshold-based interventions
- Scheduled enable/disable windows
- User-facing usage reports that stay inside Apple’s privacy model
- Daily and weekly per-app totals for selected apps

## What iOS Is Bad At

### No public Android-style polling model

Inference from Apple’s public APIs:
- Apple documents authorization, opaque selection tokens, schedules, threshold callbacks, restrictions, and report rendering.
- Apple does not document a general-purpose API for continuously polling which third-party app is foregrounded.

Recommendation:
- Do not promise users "always-on raw app activity logging" on iOS unless you have validated a fully supported Apple path for your exact use case.

### Weak parity with Android raw telemetry

Inference from Apple’s public APIs:
- The documented experience is privacy-preserving and extension/report oriented.
- If your business model depends on exporting raw per-session cross-app telemetry the same way Android can, iOS will be the harder platform.

### Individual authorization is user-revocable

Official:
- Apple’s WWDC22 session shows deauthorization switches in Settings for individually authorized apps.

Recommendation:
- Treat this as cooperative self-control, not tamper-proof enforcement.

## Best iOS Strategies

### Strategy A: Official Screen Time self-control app

This is the best fit if the product is about helping someone manage their own device habits.

Recommended shape:
- Request `.individual` authorization on first launch
- Let the user choose apps/categories through `FamilyActivityPicker`
- Use `DeviceActivityReport` for charts and usage summaries
- Use `DeviceActivity` schedules and thresholds for nudges or unlocking logic
- Use `ManagedSettings` when the app needs shielding or restrictions

Why this is strong:
- Fully aligned with Apple’s intended model
- Best chance of surviving review once entitlement approval is in place
- Lets the app feel genuinely native on iOS

For your specific product:
- this strategy can be reduced to a reporting-only app
- you do not need to block apps to make it useful
- the core feature can simply be "show daily totals for the apps the user selected"

### Strategy B: Official parental-control app

This is the best fit if the product is guardian-controlled rather than self-controlled.

Why it is strong:
- This is the use case Apple originally launched the API for
- Guardian approval and stronger restrictions fit the platform better than trying to imitate an analytics tracker

### Strategy C: Companion-mode iOS app

This is the fallback if Apple entitlement approval or the Screen Time API shape does not fit the exact product.

Suggested scope:
- focus timers
- manual goals
- interventions inside your own app
- lighter summaries
- user-entered or user-confirmed data

Inference:
- If the core promise is "exact raw cross-app tracking like Android," reducing the iOS scope is safer than overpromising.

## Entitlement and Distribution Risk

Official:
- Apple’s "Configuring Family Controls" docs say the `com.apple.developer.family-controls` entitlement is used for development.
- The same doc says you must request permission to use the Family Controls entitlement for TestFlight and App Store distribution.
- Apple also says the entitlement needs to be configured for the app and its Screen Time API extensions.

Practical meaning:
- iOS implementation risk is not just technical. It is also entitlement and review risk.
- A prototype may work before distribution approval is fully sorted out.

## My Recommendation for iOS

Use iOS as:
- an official Screen Time integration
- a reporting and intervention surface
- a self-control or parental-control experience

If your main feature is "show me how much time I spent on Instagram, Snapchat, and TikTok today," iOS is a reasonable fit as long as you are comfortable using Apple’s report-based Screen Time model.

Do not use iOS as:
- a raw foreground-app polling platform
- the place where cross-platform telemetry assumptions are defined

If the app’s main promise is "accurately measure all app usage across the device," Android should define the tracking architecture. iOS should define the intervention and Apple-native Screen Time experience.

## Primary Sources

- Apple WWDC21, "Meet the Screen Time API": https://developer.apple.com/videos/play/wwdc2021/10123/
- Apple WWDC22, "What’s new in Screen Time API": https://developer.apple.com/videos/play/wwdc2022/110336/
- Apple docs, "Configuring Family Controls": https://developer.apple.com/documentation/xcode/configuring-family-controls
- Apple docs, `FamilyActivityPicker`: https://developer.apple.com/documentation/familycontrols/familyactivitypicker
- Apple docs, "Displaying Activity Labels": https://developer.apple.com/documentation/familycontrols/displayingactivitylabels
- Apple docs, `DeviceActivityReportExtension`: https://developer.apple.com/documentation/deviceactivity/deviceactivityreportextension
- Apple docs, `ApplicationActivity.totalActivityDuration`: https://developer.apple.com/documentation/deviceactivity/deviceactivitydata/applicationactivity/totalactivityduration
- Apple docs, `CategoryActivity.totalActivityDuration`: https://developer.apple.com/documentation/deviceactivity/deviceactivitydata/categoryactivity/totalactivityduration
