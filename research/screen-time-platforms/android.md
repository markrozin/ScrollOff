# Android Screen Time Research

Researched on 2026-03-25.

## Bottom Line

Android is the platform where the "query every so often and backfill" model is actually workable for a screen-time app.

The strongest general-market path is:

- `UsageStatsManager`
- `android.permission.PACKAGE_USAGE_STATS`
- a local event-processing pipeline built around `queryEvents()`
- periodic catch-up work, not constant high-frequency polling

## What Android Officially Gives You

### 1. `UsageStatsManager`

Official:
- Android documents `UsageStatsManager` as access to device usage history and statistics.
- `queryUsageStats()` gives aggregated usage by interval.
- `queryEvents()` gives usage events over a time range.
- Android documents that events are only kept for a few days.

Practical meaning:
- You can backfill missed windows if your app wakes up later.
- You should not rely on event history being stored forever.

### 2. `PACKAGE_USAGE_STATS`

Official:
- Android documents `PACKAGE_USAGE_STATS` as allowing an app to collect component usage statistics.
- The permission declaration implies intent to use the API, and the user can grant permission through Settings.

Practical meaning:
- This is not a normal runtime permission flow.
- You need a dedicated onboarding flow that sends the user to Usage Access settings and verifies access afterward.

Extra implementation note:
- Android’s `Settings` docs expose `ACTION_USAGE_ACCESS_SETTINGS` for sending users to the Usage Access screen.
- Android also documents `INTENT_CATEGORY_USAGE_ACCESS_CONFIG` and `METADATA_USAGE_ACCESS_REASON`, which let an app provide a settings surface and a human-readable reason for needing usage access.

### 3. Event types that support session reconstruction

Official:
- Android’s `UsageEventsQuery` docs list event types including:
  - `ACTIVITY_RESUMED`
  - `ACTIVITY_PAUSED`
  - `SCREEN_INTERACTIVE`
  - `SCREEN_NON_INTERACTIVE`
  - `KEYGUARD_SHOWN`
  - `KEYGUARD_HIDDEN`
  - `DEVICE_SHUTDOWN`
  - `DEVICE_STARTUP`

Practical meaning:
- You can reconstruct app sessions with reasonable fidelity.
- You can also distinguish app usage from just "screen on" time.

### 4. Work scheduling is inexact

Official:
- `PeriodicWorkRequest` has a minimum interval of 15 minutes.
- Android states that periodic work may be delayed because WorkManager is subject to battery optimizations such as Doze.
- Android explicitly says periodic work is for cases where you are willing to accept inexactness.

Practical meaning:
- Polling every minute in the background is not the right default architecture.
- Periodic work should be a catch-up path, not the main source of truth.

## Best Android Architecture

### Recommended: event backfill architecture

This is the best version of the "query every X amount of time" idea.

Instead of querying the current foreground app all the time, keep a durable cursor and repeatedly backfill events since the last processed timestamp.

Suggested flow:

```text
store last_processed_at

on app open / permission granted / worker run / boot complete:
  now = System.currentTimeMillis()
  events = usageStatsManager.queryEvents(last_processed_at, now)
  fold events into sessions
  persist sessions and daily totals
  last_processed_at = now - small_safety_overlap
```

Why this is strong:
- Works with Android’s actual API shape
- Recovers from missed worker runs
- Minimizes battery abuse
- Lets you compute accurate per-app sessions instead of just rough totals

### Recommended data model

Use `queryEvents()` as the main source of truth for sessions.

Use `queryUsageStats()` as:
- a daily/weekly summary fallback
- a reconciliation layer
- a faster aggregate view for charts

Why:
- `queryUsageStats()` is interval-based and Android notes that the begin/end times may expand to whole interval boundaries.
- `queryEvents()` is better when the product cares about session boundaries.

## What I Would Actually Ship on Android

### V1

- Onboarding flow for Usage Access
- Local database for events, sessions, and daily totals
- Backfill on:
  - first permission grant
  - every foreground app open
  - boot completed
  - periodic WorkManager run
- Daily and weekly charts from local aggregates
- Optional sync to backend after local aggregation

### V2

- Better reconciliation around screen lock/unlock and shutdown/startup events
- Foreground service only for explicitly user-expected modes, if needed
- Smarter battery-aware sync

## What to Avoid on Android

### Avoid high-frequency blind polling

Because WorkManager is inexact and background execution is battery-constrained, "check every few seconds forever" is the wrong mental model for a consumer app.

Better model:
- fetch events in chunks
- reconstruct state after the fact

### Avoid making `queryUsageStats()` the only source of truth

Reason:
- It is aggregated data
- Android says the requested time range can be expanded to interval boundaries

## AccessibilityService: Possible, but High-Risk

Official Google Play policy:
- Accessibility API use must be documented in the Play listing.
- Apps must use more narrowly scoped APIs and permissions instead when possible.
- Non-accessibility-tool apps must provide disclosure and get consent.
- Google Play says the Accessibility API cannot be used to work around Android privacy controls.

Practical meaning:
- If your goal is general app-usage tracking, `UsageStatsManager` should be your first choice.
- AccessibilityService is only worth evaluating if you truly need near-real-time reactions or UI-layer enforcement.
- Review risk and compliance burden are materially higher.

Extra note:
- Google Play documentation also indicates parental-control apps have special consideration around accessibility in some cases, but this is not the clean default path for a standard tracker.

## Package Visibility Is an Extra Android 11+ Concern

Official:
- Android 11+ filters information about installed apps by default.
- To expand visibility, you use `<queries>` or in rare cases `QUERY_ALL_PACKAGES`.
- Google Play subjects `QUERY_ALL_PACKAGES` usage to approval.

Practical meaning:
- A tracker that wants to show names/icons for arbitrary installed apps needs to account for package visibility.
- Even if `UsageStatsManager` gives you package names, resolving full metadata for every package may need a package-visibility strategy.

## Enterprise / Dedicated Device Path

Official:
- Android Enterprise docs describe dedicated devices and device-owner management.
- Device-owner or fully managed deployments can use stronger controls like lock task mode.

Practical meaning:
- If you ever build for schools, employers, kiosks, or managed fleets, Android has a much stronger control story than ordinary consumer installs.
- This is a different product path than a normal Play-distributed BYOD app.

## My Recommendation for Android

Use Android as the platform where the app does real tracking.

Best default stack:
- `UsageStatsManager`
- `PACKAGE_USAGE_STATS`
- local event-to-session reconstruction
- WorkManager for periodic catch-up

Only reach for AccessibilityService if:
- you truly need near-real-time intervention
- `UsageStatsManager` is insufficient
- you are ready for Play policy overhead

## Primary Sources

- Android docs, `UsageStatsManager`: https://developer.android.com/reference/android/app/usage/UsageStatsManager
- Android docs, `UsageEventsQuery`: https://developer.android.com/reference/android/app/usage/UsageEventsQuery
- Android docs, `Manifest.permission.PACKAGE_USAGE_STATS`: https://developer.android.com/reference/android/Manifest.permission.html
- Android docs, `Settings`: https://developer.android.com/reference/android/provider/Settings
- Android docs, `PeriodicWorkRequest`: https://developer.android.com/reference/androidx/work/PeriodicWorkRequest
- Android docs, package visibility filtering: https://developer.android.com/training/package-visibility
- Android docs, declaring package visibility: https://developer.android.com/training/package-visibility/declaring
- Google Play policy, permissions and APIs that access sensitive information: https://support.google.com/googleplay/android-developer/answer/9888170
- Google Play policy, AccessibilityService API: https://support.google.com/googleplay/android-developer/answer/16324062
- Android Enterprise, dedicated devices overview: https://developer.android.com/work/dpc/dedicated-devices
- Android Enterprise, lock task mode: https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode
