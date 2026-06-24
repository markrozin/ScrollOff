# Cross-Platform Recommendation

Researched on 2026-03-25.

## Main Product Decision

Do not define the product around a single raw data model that both platforms must satisfy equally.

Reason:
- Android supports event-based reconstruction well.
- iOS supports official Screen Time authorization, reports, thresholds, and restrictions, but not a public Android-style polling model.

## Recommended Product Shape

### Shared user-facing concepts

Keep these consistent across platforms:
- daily total screen time
- selected app/category budgets
- nudges when limits are near
- focus sessions
- weekly summaries
- streaks and goal completion

### Platform-specific collection model

Android:
- use package-level event reconstruction
- compute precise local sessions
- sync aggregates or sessions as needed

iOS:
- use Screen Time authorization and opaque tokens
- center the experience on reports, thresholds, and interventions
- avoid assuming unrestricted raw session export

## Best V1

### Android V1

Build the real tracker first:
- Usage Access onboarding
- event backfill
- daily totals
- per-app history

### iOS V1

Build the best Apple-native version:
- individual authorization
- app/category selection
- reports
- threshold-based nudges
- optional restrictions/shields

This creates a coherent product without pretending the operating systems are symmetric.

## Backend / Data Model Advice

If you keep a server-side model, include fields like:
- `platform`
- `source_type`
- `granularity`
- `confidence`

Example:
- Android session from `queryEvents()` -> high confidence, package-level
- iOS report-derived observation -> user-visible Screen Time data, privacy-scoped

This keeps analytics honest and prevents accidental cross-platform mismatches.

## What I Would Not Do

- I would not promise identical raw per-app telemetry on iOS and Android.
- I would not make the iOS roadmap depend on discovering an undocumented polling workaround.
- I would not start Android with AccessibilityService unless the app truly needs near-real-time control from day one.

## Best Overall Recommendation

If the app’s headline is "track screen time":

- let Android carry the tracking depth
- let iOS carry the official Screen Time experience
- unify the product at the UX layer, not at the lowest telemetry layer

That gives you the highest chance of a product that is both useful and actually shippable.
