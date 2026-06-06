# Nurture

iOS-first React Native app for menstrual and fertility management. The MVP focuses on cycle logging, fertile-window guidance, HealthKit sync boundaries, AI coaching, and subscription-ready Pro entitlements.

## Stack

- Expo 53 + React Native 0.79 + TypeScript
- Expo Router tab navigation
- Supabase Auth/Postgres/RLS/Edge Functions
- OpenRouter Chat Completions through Supabase Edge Functions
- RevenueCat subscriptions with Supabase entitlement sync
- HealthKit service boundary for menstrual flow, basal body temperature, and ovulation tests

## Run

```bash
pnpm install
pnpm test
pnpm typecheck
pnpm start
```

For iOS native modules, use a custom dev client:

```bash
pnpm ios
```

RevenueCat purchases require a dev client or store build. Expo Go cannot load the native purchases module.

## Environment

Copy `.env.example` to `.env` and set Supabase values. `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, and `REVENUECAT_WEBHOOK_SECRET` are server-side only and belong in Supabase Edge Function secrets.

RevenueCat setup:

- Set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and/or `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` for client purchases.
- Set Supabase secret `REVENUECAT_WEBHOOK_SECRET` to the exact Authorization value configured in RevenueCat.
- Configure RevenueCat entitlement id `pro` and send webhooks to `https://vyjryphiugsfslvorgoc.supabase.co/functions/v1/revenuecat-webhook`.
- The webhook is deployed with JWT verification disabled and validates the RevenueCat Authorization header itself.

## Product Boundaries

- AI is a fertility coach, not a medical diagnosis system.
- Health data stays local unless the user enables cloud sync or AI context sharing.
- HealthKit read/write must be explicit and scoped.
- Subscription screens must include auto-renewal terms and restore purchase.

## Implemented MVP Surface

- Today dashboard with cycle day, fertile-window timeline, quick logs, daily tasks, and AI recommendation.
- Cycle tab with calendar, HealthKit sync copy, and sample records.
- Coach tab with non-diagnostic notice, structured suggestions, and input shell.
- Insights tab with Pro report framing.
- Profile tab with privacy toggles and subscription framing.
