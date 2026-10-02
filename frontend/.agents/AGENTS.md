# Project Rules & Architecture Conventions

## Feature-Sliced Design (FSD)

Stron follows **Feature-Sliced Design** as a modular monolith. Full reference:

- [`.cursor/docs/feature-sliced-architecture.md`](../.cursor/docs/feature-sliced-architecture.md)
- [`.cursor/docs/fsd-import-rules.md`](../.cursor/docs/fsd-import-rules.md)
- Cursor rules: `.cursor/rules/fsd-*.mdc`

**Key rules for new code:**
- Screens dispatch thunks — do not import `@/services/*` directly
- Domain API in `features/<name>/api/`; core infra in `services/core/`
- Cross-feature access via `features/<name>/index.ts` public API only
- Global components in `src/components/`; feature UI in `features/<name>/ui/components/`

Legacy paths (`screens/stron/`, flat feature folders, direct service calls) are OK until the file is touched.

## Status Bar & Navigation Setup for New Screens

Whenever creating or configuring a new screen/route in this React Native app:

1. **Expo Router Stack**: Register the screen in `app/(app)/_layout.tsx` under `<Stack>` with appropriate `options` (e.g. `contentStyle: { backgroundColor: "transparent" }` or solid matching color).
2. **Status Bar Overlay**: Register the screen path in `src/navigation/statusBarChrome.ts` under `getSolidStatusBarColor` with its matching background color (or `isEdgeToEdgePath.ts` if edge-to-edge layout is needed) so the status bar overlay color matches the screen background seamlessly.
3. **Component Architecture**: Keep screen components modular by extracting sub-components into dedicated `components/` subfolders within the feature directory.
4. **FSD Placement**: Prefer `features/<name>/ui/screens/` for new screens. Add thunks + `features/<name>/api/` wrapper for any new API calls.
