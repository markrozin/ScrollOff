# Screen Time Platform Research

Researched on 2026-03-25.

This folder is a close look at the best ways to build a screen-time product on iOS and Android, using current primary platform docs and policies.

Files:
- `ios.md`: what is actually possible on iPhone/iPad
- `android.md`: the strongest consumer and enterprise paths on Android
- `cross-platform-plan.md`: how I would shape the product if we want one app across both platforms

## Executive Summary

| Platform | Best official route | Good for | Main constraint |
| --- | --- | --- | --- |
| iOS | Apple Screen Time API: `FamilyControls` + `DeviceActivity` + `ManagedSettings` | Self-control apps, parental controls, limits, thresholds, reports | Apple’s model is privacy-preserving and entitlement-gated. Do not assume raw Android-style polling of other apps is available. |
| Android | `UsageStatsManager` + `PACKAGE_USAGE_STATS` + event backfill | Real screen-time tracking, daily totals, per-app sessions, history | User must grant Usage Access in Settings, and background scheduling is inexact. |

## Short Recommendation

If we want the best shot at a real product:

1. Build Android around `UsageStatsManager.queryEvents()` plus local session reconstruction.
2. Build iOS around the official Screen Time stack, especially reports, thresholds, and restrictions.
3. Do not force identical data collection semantics across platforms.
4. Keep the cross-platform UX aligned around goals, nudges, budgets, and summaries, not around identical raw telemetry.

## Bottom Line

Android supports the "query every so often and backfill" idea reasonably well.

iOS does not expose a comparable public polling model for arbitrary third-party app usage. The public path is the Screen Time API, which is built around authorization, opaque tokens, scheduled monitors, thresholds, restrictions, and privacy-preserving reports.
