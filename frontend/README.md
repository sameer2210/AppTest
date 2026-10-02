# Stron — React Native (Expo)

Step-tracking fitness game app built with Expo and a feature-based React Native architecture.

## App identity

- **App name:** Stron
- **iOS bundle ID:** `com.t21.stron`
- **Android package:** `com.stepwars.stepwarsnew_app` (Play Store applicationId — do not change without store migration)
- **Backend:** `https://apiv2.stron.in` (override with `EXPO_PUBLIC_API_BASE_URL`)
- **Auth:** Firebase Auth + JWT exchange

## Architecture

```
app/                     # Expo Router routes (thin re-exports)
src/
  constants/stron.ts     # Brand + backend constants
  features/              # Redux slices (auth, steps, clan, events, battle)
  models/                # Domain types
  navigation/            # href map + bottom tab bar
  screens/stron/         # Screen implementations
  services/              # API client, auth, battles, steps, deep links
  shell/                 # Bootstrap, loader, toast, modals
```

## Navigation

| Tab     | Screen                                          |
| ------- | ----------------------------------------------- |
| Home    | Steps, 1v1 battles, clan battles, events, clans |
| Clan    | Discover / search / create clans                |
| Rewards | Badges, medals, titles (Kingdom)                |
| Events  | Marathons, step challenges, survivor            |
| Shop    | Coming soon feature voting                      |

**Auth flow:** Loading → Login (Google / Email OTP / Guest) → Main tabs

## Setup

```bash
npm install
copy .env.example .env
npm run android
```

Required env vars:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — Google Sign-In web client ID
- `GoogleService-Info.plist` for iOS (`com.t21.stron`)
- `google-services.json` for Android (`com.stepwars.stepwarsnew_app` Play Store applicationId)

Native build required for Firebase Auth, Google Sign-In, RTDB, and pedometer (Expo dev client / `expo run:android` — not Expo Go).

## Feature status

| Area                                              | Status                              |
| ------------------------------------------------- | ----------------------------------- |
| 5-tab shell + branding                            | Done                                |
| Loading + Login (Google / OTP / Guest)            | Done                                |
| Firebase auth + JWT API client                    | Done                                |
| Home / Clan / Kingdom / Events / Shop (API wired) | Done                                |
| Profile + Edit Profile (Cloudinary)               | Done                                |
| Create / My / View Clan screens                   | Done                                |
| Squad battle screen + RTDB live scores            | Done                                |
| 1v1 bot battles + RTDB game sync                  | Done                                |
| Firebase RTDB matchmaking pool                    | Done                                |
| Battle result modal (post 1v1)                    | Done                                |
| Step tracking (pedometer + periodic sync)         | Done                                |
| Deep links (clan / squad / reinforce invites)     | Done                                |
| Onboarding tutorial (4 pages)                     | Done                                |
| Event leaderboards                                | Scaffolded                          |
| Leader admin panels / announcements               | Pending                             |
| RevenueCat marathon payments                      | Implemented (native build required) |
| ViewClan admin / announcements polish             | Pending                             |
| Stron Firebase project credentials                | Pending (replace template config)   |

## Scripts

| Command               | Description              |
| --------------------- | ------------------------ |
| `npm run dev`         | Start Expo               |
| `npm run android`     | Run Android native build |
| `npm run check-types` | TypeScript check         |
