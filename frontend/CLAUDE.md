# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Stron — a step-tracking fitness game built with Expo / React Native. Users earn steps and spend them in 1v1 battles, clan (squad) battles, and STRON-managed events (marathons, step challenges, face-offs, king-of-the-hill). Backend lives in the sibling `Stron-Backend` repo.

- App name: Stron · iOS bundle ID `com.t21.stron` · Android applicationId `com.stepwars.stepwarsnew_app` (Play Store — do not change without a store migration)
- Backend: `https://apiv2.stron.in` (override via `EXPO_PUBLIC_API_BASE_URL`)
- Auth: Firebase Auth (Google / Email OTP / Guest / Apple) + JWT exchange with the backend

## Commands

```bash
npm install
npm run dev              # adb reverse + expo start --dev-client --localhost
npm run android           # expo run:android (native build)
npm run ios                # expo run:ios (native build)
npm run web                 # expo start --web
npm run check-types      # tsc --noEmit
npm run lint                 # expo lint
npm run format              # prettier --write (app/src/plugins/*.js/config)
npm run format:check
npm run prebuild             # expo prebuild
npm run prebuild:clean
npm run build:apk           # prebuild android + gradlew assembleRelease
npm run build:aab           # prebuild android + gradlew bundleRelease
```

No test framework is configured in this repo (no jest/vitest, no `*.test.ts` files) — do not assume `npm test` exists.

A native build (Expo dev client / `expo run:android`) is required for Firebase Auth, Google Sign-In, Realtime Database, and pedometer/health APIs — these do not work in plain Expo Go.

## Architecture (Feature-Sliced Design)

**Canonical doc:** [`.cursor/docs/feature-sliced-architecture.md`](.cursor/docs/feature-sliced-architecture.md)  
**Import rules:** [`.cursor/docs/fsd-import-rules.md`](.cursor/docs/fsd-import-rules.md)  
**Cursor rules:** `.cursor/rules/fsd-*.mdc`

Stron uses **Feature-Sliced Design** as a **modular monolith** — each domain is a self-contained vertical slice with strict layer separation.

### Layers (top → bottom)

| Layer | Target path | Legacy path |
|-------|-------------|-------------|
| App | `app/`, `shell/`, `navigation/`, `store/` | Same |
| Screens | `features/<name>/ui/screens/` | `screens/stron/<domain>/` |
| Local components | `features/<name>/ui/components/` | `screens/stron/<domain>/components/` |
| Global components | `components/` | Same |
| Feature model | `features/<name>/model/` | `features/<name>/*.slice.ts` |
| Feature API | `features/<name>/api/` | `services/<domain>/` (transitional) |
| Shared core API | `services/core/` | Same |
| Shared utils | `utils/`, `models/`, `constants/` | Same |

### Data flow (new code)

`Screen → dispatch(thunk) → feature/api → services/core → backend`

Screens must not call `@/services/*` directly. Cross-feature access via `features/<name>/index.ts` only.

State management: Redux Toolkit. The root reducer intercepts a global `auth/clearAuth` action to reset the whole state tree on logout while preserving the `system` slice.

### Adding a new screen/route

Per FSD + `.agents/AGENTS.md`, every **new** screen must:
1. Live in `src/features/<feature>/ui/screens/` (not `src/screens/stron/`).
2. Use a thin `app/(app)/<kebab>.tsx` re-export only — no screen JSX in `app/`.
3. Be registered in `app/(app)/_layout.tsx` under `<Stack>` with matching `options` (e.g. `contentStyle` background).
4. Have a named path in `src/navigation/href.ts`; navigate via `href.*` only.
5. Have its path added to `src/navigation/statusBarChrome.ts` (`getSolidStatusBarColor`) or `isEdgeToEdgePath.ts`.
6. Keep sub-components in `features/<feature>/ui/components/`.
7. Use thunks + feature `api/` for data — no direct `@/services/*` in screens.
8. For a new feature: create `api/`, `model/`, `ui/`, and `index.ts`.

## Code conventions (enforced by ESLint / `.cursor/rules/`)

- **Arrow functions only** — no `function` declarations/expressions for components, utilities, or callbacks. Exceptions: `typeof x === 'function'` checks, TS function types in interfaces, CommonJS plugin/config entry points.
- **`CustomText` only** for user-visible text — never import `Text` from `react-native` (ESLint-blocked outside `src/components/CustomText.tsx`). `TextInput` is fine for actual inputs.
- **No raw typography literals** in `src/` style objects (`fontSize`, `fontFamily`, `fontWeight`, `lineHeight`, `letterSpacing` are ESLint-blocked) — use `fontTextStyles.*` / `headingTextStyles.*` from `src/utils/typography.ts`; override only `color` and layout in screen styles. Exceptions: `CustomText.tsx`, `utils/typography.ts`, `components/ui/**`, `screens/stron/home/v2/**`, `BottomTabBarV2.tsx`.
- **No dynamic `useSafeAreaInsets()` padding** on screen scroll/content containers — use fixed `paddingTop: 18`, `paddingBottom: 30`, `paddingHorizontal: 22` (or `screenContentContainerStyle` from `src/utils/screen-layout.ts`). Safe-area handling belongs in shell/chrome (`RootAppChrome`, tab bar), not per-screen. Auth screens are exempt.
- **No hardcoded box sizes** — prefer `width: 'N%'` and `flex`/`flexGrow` over fixed pixel widths; avoid `height`/`minHeight` except for hairlines, progress bars, `aspectRatio` pairs, and image/icon bounds — let padding define vertical size.
- **`activeOpacity={0.7}`** on all `TouchableOpacity` — do not omit or use other values; only `1` for disabled/locked controls or non-fading backdrops (ESLint-enforced). See `.cursor/rules/active-opacity.mdc`.
- **No new `require()`** in `src/` or `app/` — use ES `import` or `await import()` for lazy loading. Exceptions: bundled image/font assets (Metro requires static `require`), `src/provider/*Lazy.ts` (optional native modules — cache the module, return `null` under Expo Go), `src/store/getAppStore.ts` (breaks a store↔thunks import cycle), and `*.config.js` / `plugins/**/*.js`.
- Path alias `@/*` → `src/*` (tsconfig, `strict: true`).

## Knowledge graph MCP tools

This project has a knowledge graph (`code-review-graph` MCP server). Prefer it over Grep/Glob/Read for exploring code, tracing callers/impact, and code review — see the tool table surfaced in your system context. Fall back to Grep/Glob/Read only when the graph doesn't cover what's needed.
