# Claude Code Review Process — Stron React Native

## Overview

Claude is used as an AI-assisted code review gate on every PR. It is **not a unit, integration, or functional test** — it is a structured code quality review that the developer runs manually after raising the PR. This gate must be passed before any PM review begins.

**Authoritative standards (mandatory — FSD + Cursor rules only):**

| Doc / rule | Role |
|------------|------|
| [`.cursor/docs/feature-sliced-architecture.md`](../.cursor/docs/feature-sliced-architecture.md) | Canonical FSD layering, data flow, feature anatomy, migration playbook |
| [`.cursor/docs/fsd-import-rules.md`](../.cursor/docs/fsd-import-rules.md) | Import matrix — what each layer may and must not import |
| [`.cursor/docs/fsd-architecture-complete.md`](../.cursor/docs/fsd-architecture-complete.md) | Consolidated FSD reference (layers + import rules + Cursor rules summary) |
| [`.cursor/docs/typography-system.md`](../.cursor/docs/typography-system.md) | Typography presets — no raw `fontSize` / `fontFamily` / `fontWeight` |
| [`CLAUDE.md`](../CLAUDE.md) | Project commands + UI contracts summary |
| `.cursor/rules/fsd-*.mdc` | Always-on / scoped FSD enforcement (see Cursor rules table below) |
| `.cursor/rules/*` UI contracts | `custom-text-only`, `arrow-functions`, `screen-padding`, `active-opacity`, `responsive-layout`, `no-require-imports` |

Do **not** use pre-FSD layering (`screens/stron` as the only UI home, `features/` as Redux-only, screens calling `services/` directly as “normal”) for new or changed code.

Area 1 (Code Quality & Standards) is incomplete unless the PR is checked against **FSD architecture docs**, **`.cursor/rules`**, **strict routing / folder structure**, and **UI contracts**.

---

## Strict routing & folder structure (mandatory)

New and changed routes/screens **must** follow the FSD target tree. Do not invent alternate folders. Legacy `src/screens/stron/` is for **existing** files only — never for new screens.

### Canonical tree (one feature)

```
app/(app)/<route>.tsx                 # thin re-export ONLY
app/(app)/_layout.tsx                 # Stack.Screen + contentStyle
src/navigation/href.ts                # named path (href.app.*)
src/navigation/statusBarChrome.ts     # OR isEdgeToEdgePath.ts

src/features/<feature>/
  index.ts                            # public barrel only
  api/
    <feature>.api.ts                  # domain facade
  model/
    <feature>.slice.ts
    <feature>.thunks.ts
    <feature>.selectors.ts
  ui/
    screens/
      <ScreenName>Screen.tsx          # route-level UI lives HERE
    components/                       # feature-local UI only
    hooks/                            # optional UI hooks
  lib/                                # optional pure helpers
```

### Routing chain (must be this order)

```
href.app.<name>
  → app/(app)/<kebab-route>.tsx          # export { default } from '@/features/<feature>/ui/screens/...'
    → features/<feature>/ui/screens/...  # screen composes UI, dispatches thunks
      → features/<feature>/model/        # thunks + selectors
        → features/<feature>/api/        # domain facade
          → services/core/               # apiClient / firebase / tokenStorage
```

### Allowed vs forbidden placement

| Kind of file | Required path | Forbidden |
|--------------|---------------|-----------|
| New route entry | `app/(app)/<kebab>.tsx` or `app/auth/...` — re-export only | JSX/business logic in `app/` |
| New screen | `src/features/<feature>/ui/screens/` | `src/screens/stron/**` for **new** screens |
| New local UI | `src/features/<feature>/ui/components/` | Global `components/` for feature-only UI; other features' folders |
| New shared UI | `src/components/` | Inside a feature if used by 2+ features |
| New Redux | `src/features/<feature>/model/` | Flat `features/<feature>/*.slice.ts` for **new** features |
| New domain API | `src/features/<feature>/api/` | New domain logic only under `services/<domain>/` |
| Shared infra | `src/services/core/` | Domain endpoints in core |
| Navigation | `href.*` + Stack + status-bar registration | Hardcoded `"/path"` strings in screens |

### Route file pattern (only form allowed for new routes)

```tsx
// app/(app)/my-feature.tsx
export { default } from "@/features/myFeature/ui/screens/MyFeatureScreen";
```

### New route checklist (all Critical)

1. Screen file under `features/<feature>/ui/screens/`
2. Local pieces under `features/<feature>/ui/components/` (not one giant screen file)
3. Thin `app/(app)/<kebab-route>.tsx` re-export (no inline screen JSX)
4. `Stack.Screen` in `app/(app)/_layout.tsx` with matching `contentStyle`
5. Named entry in `src/navigation/href.ts`
6. Path in `statusBarChrome.ts` **or** `isEdgeToEdgePath.ts`
7. Data via thunk → `features/<feature>/api/` (no `@/services/*` in the screen)
8. Cross-feature exports only via `features/<feature>/index.ts`

**Legacy exception (narrow):** Editing an **existing** file already under `src/screens/stron/` does not require a full move in the same PR. Adding a **new** screen, route, or feature-local component under `screens/stron/` is **Critical**.

---

## Cursor rules (review checklist)

Apply every rule that matches changed files. Violations in **new or changed** code are Critical unless noted.

### FSD rules

| Rule file | Scope | Fail when |
|-----------|--------|-----------|
| [`fsd-architecture.mdc`](../.cursor/rules/fsd-architecture.mdc) | Always | Layer collapse; screens call services; missing feature `api/` for new endpoints |
| [`fsd-import-boundaries.mdc`](../.cursor/rules/fsd-import-boundaries.mdc) | Always | `@/services/*` in screens/components; cross-feature deep imports; slice→service; API/UI imports |
| [`fsd-feature-slice.mdc`](../.cursor/rules/fsd-feature-slice.mdc) | `src/features/**` | New feature missing `api/` / `model/` / `ui/` / `index.ts`; deep imports past barrel |
| [`fsd-ui-layers.mdc`](../.cursor/rules/fsd-ui-layers.mdc) | `src/**/*.tsx` | Global components import features/services; local UI imports other features or services |
| [`fsd-services.mdc`](../.cursor/rules/fsd-services.mdc) | `services/**`, `features/**/api/**` | React/UI in API layer; new domain logic only in `services/<domain>/` with no feature `api/` wrapper |

### UI / code-style rules

| Rule file | Scope | Fail when |
|-----------|--------|-----------|
| [`custom-text-only.mdc`](../.cursor/rules/custom-text-only.mdc) | `src/**` | `Text` from `react-native` outside `CustomText.tsx` |
| [`arrow-functions.mdc`](../.cursor/rules/arrow-functions.mdc) | Always | `function` declarations/expressions for components, utils, callbacks |
| [`screen-padding.mdc`](../.cursor/rules/screen-padding.mdc) | Screens | `useSafeAreaInsets` for content padding; non-`18/30/22` scroll padding |
| [`active-opacity.mdc`](../.cursor/rules/active-opacity.mdc) | Touch targets | `TouchableOpacity` without `activeOpacity={0.7}` (or `1` for disabled/backdrop) |
| [`responsive-layout.mdc`](../.cursor/rules/responsive-layout.mdc) | Layout | Hardcoded box widths/heights; raw typography literals; custom back buttons instead of `StronBackHeader` |
| [`no-require-imports.mdc`](../.cursor/rules/no-require-imports.mdc) | `src/`, `app/` | New `require()` outside allowed Metro / `*Lazy.ts` / `getAppStore` exceptions |

---

## Where This Fits in the Workflow

```
In Progress → PR Raised → Claude Review (Dev) → PM Review 1 → PM Review 2 → QA → Done
```

The Claude review is the **first gate after PR creation**. PM review cannot begin until the developer has completed Claude review and posted a clean passing summary on the PR.

---

## When It Runs

**Trigger:** Developer runs Claude manually **after the PR is raised**, before tagging any PM for review.

**Sequence:**

1. Developer raises PR with full description
2. Developer opens the feature branch code in Claude
3. Developer attaches or `@`-references **all authoritative docs** (see Overview)
4. Developer runs the review prompt (see below) across all 5 areas
5. Developer resolves all Critical issues found
6. Developer re-runs Claude to confirm clean
7. Developer posts the structured summary as a **PR comment**
8. Developer tags PM for review — only after step 7 is complete

---

## Claude Prompt to Use

Run this prompt in Claude on the feature code. **Require the model to load FSD docs and Cursor rules first:**

```
@.cursor/docs/feature-sliced-architecture.md
@.cursor/docs/fsd-import-rules.md
@.cursor/docs/fsd-architecture-complete.md
@.cursor/docs/typography-system.md
@CLAUDE.md
@.cursor/rules/fsd-architecture.mdc
@.cursor/rules/fsd-import-boundaries.mdc
@.cursor/rules/fsd-feature-slice.mdc
@.cursor/rules/fsd-ui-layers.mdc
@.cursor/rules/fsd-services.mdc
@.cursor/rules/custom-text-only.mdc
@.cursor/rules/arrow-functions.mdc
@.cursor/rules/screen-padding.mdc
@.cursor/rules/active-opacity.mdc
@.cursor/rules/responsive-layout.mdc
@.cursor/rules/no-require-imports.mdc

Review this PR as a strict FSD (Feature-Sliced Design) gate for the Stron Expo / React Native app.

Apply feature-sliced-architecture.md, fsd-import-rules.md, and fsd-architecture-complete.md for all layer and import checks.
Apply every matching .cursor/rules/*.mdc file for FSD and UI contracts.
Apply CLAUDE.md and typography-system.md for UI/typography contracts.

Review across the following five areas and return a structured summary.
Flag any FSD layer/import violation or Cursor-rule / CLAUDE.md UI contract breach under area 1 as Critical
unless explicitly marked Warning-level below.

1. Code Quality & Standards (FSD + Cursor rules + UI contracts)

   A. Routing & folder structure (strict — Critical for new files)
   - New screens MUST live in features/<feature>/ui/screens/ — never new files under screens/stron/
   - New local UI MUST live in features/<feature>/ui/components/
   - New state MUST live in features/<feature>/model/ (not flat feature root for new features)
   - New domain API MUST live in features/<feature>/api/
   - Public exports ONLY via features/<feature>/index.ts
   - app/(app)/<route>.tsx MUST be a thin re-export only:
       export { default } from '@/features/<feature>/ui/screens/...'
   - No JSX, hooks, API calls, or business rules inside app/ route files (layouts excepted)
   - Every new route MUST have: Stack registration + href.ts name + statusBarChrome OR isEdgeToEdgePath
   - Navigate only via href.* — no hardcoded route path strings in screens
   - Routing chain must be:
       href → app/ re-export → features/*/ui/screens → model thunks → api → services/core

   B. FSD architecture (strict — every changed file)
   - Layer split (Critical if collapsed or violated in touched code):
       app/           → thin re-export + Stack/href/status-bar registration only
       ui/screens     → UI composition; dispatch thunks; read selectors; NO @/services/*
       features/model → slices, thunks, selectors; NO JSX; NO direct HTTP in reducers
       features/api   → domain facades wrapping services/core or legacy services
       services/core  → shared infra (apiClient, firebase, tokenStorage); NO React UI
       components/    → global UI; NO features/, NO services/, NO screens/
   - Data flow (Critical if bypassed in new/changed code):
       Screen → dispatch(thunk) → feature/api → services/core → backend
   - Import boundaries (Critical — cite fsd-import-rules.md / fsd-import-boundaries.mdc):
       Screens must NOT import @/services/*
       Screens must NOT deep-import other features' ui/ paths
       Cross-feature access ONLY via features/<name>/index.ts public barrels
       Global components must NOT import features/ or services/
       Feature model must NOT import React, components, or screens
       Feature api must NOT import React or UI
       New API endpoints MUST go in features/<name>/api/ (wrapper over core or legacy service)
   - Legacy migration (Critical when file is touched):
       Do NOT add new @/services/* imports in screens
       Do NOT add new cross-feature screen imports
       Do NOT add new screens/components under screens/stron/
       Replace direct service calls in changed screen code with thunks + feature api when practical
       Extract shared code used by 2+ features to components/ or utils/

   C. Naming & file conventions
   - camelCase vars/functions, PascalCase components/types, UPPER_SNAKE_CASE constants
   - kebab-case Expo Router files; *.slice.ts / *.thunks.ts / *.api.ts / *.service.ts

   D. UI contracts (from .cursor/rules + CLAUDE.md + typography-system.md — Critical)
   - Arrow functions only (no function declarations) — arrow-functions.mdc
   - CustomText for user-visible text — custom-text-only.mdc
   - fontTextStyles / headingTextStyles only — no raw fontSize/fontFamily/fontWeight/lineHeight/letterSpacing
   - fontFamily global only — never in screen/component StyleSheets or inline styles
   - Screen padding: paddingTop 18 / paddingBottom 30 / paddingHorizontal 22 — no useSafeAreaInsets for content padding (auth exempt)
   - Prefer width: 'N%' and padding-driven height — responsive-layout.mdc (no hardcoded layout boxes)
   - Dark-screen backs via StronBackHeader (auth exempt)
   - TouchableOpacity activeOpacity={0.7} (or 1 for disabled/backdrop) — active-opacity.mdc
   - No new require() in src/ or app/ except *Lazy.ts, getAppStore, Metro assets — no-require-imports.mdc
   - Navigate via src/navigation/href.ts — no hardcoded route strings
   - ESLint/Prettier; single responsibility; deep nesting (4+); ~300-line files

2. Logic Errors & Edge Cases
   - Unhandled null or undefined values
   - Missing error handling on async calls (no try/catch or .catch)
   - Edge cases listed in the ClickUp task that are not handled in code
   - Loading / empty / error UI when the task requires them
   - Auth/session edges (guest vs signed-in) when in scope

3. Security Issues
   - Hardcoded API keys or secrets
   - Tokens logged or stored in Redux
   - User PII (names, emails, phones, bank details) logged
   - Ad-hoc HTTP clients that skip apiClient auth interceptors
   - Unvalidated URLs opened in WebView
   - Payment verification skipped in Razorpay / RevenueCat flows

4. Performance Issues
   - Unnecessary re-renders (inline objects/callbacks in lists, missing keys)
   - Heavy sync work on the JS thread
   - Large uncompressed assets or payloads
   - API calls inside loops or unbounded list fetches
   - Native modules imported statically where *Lazy.ts is required (Expo Go crash)

5. Dead Code & Debug Logs
   - console.log or any debug statements
   - Commented-out code blocks
   - Unused variables and imports (if not already caught by ESLint)
   - Unreachable code
   - Scratch/debug scripts committed with the PR

For each issue found, provide:
- Area (from the 5 above)
- Severity: Critical or Warning
- File and line number
- Description of the issue (cite feature-sliced-architecture.md, fsd-import-rules.md, a .cursor/rules/*.mdc file, CLAUDE.md, or typography-system.md)
- Suggested fix

If no issues are found in an area, state "No issues found."
In the summary, explicitly state:
  "Reviewed against FSD architecture: Yes"
  "Reviewed against .cursor/rules (FSD + UI): Yes"
  "Reviewed against CLAUDE.md UI contracts: Yes"
```

---

## Area Rules & Severity

### 1. Code Quality & Standards

**Primary sources of truth (in order):**

1. [`.cursor/docs/feature-sliced-architecture.md`](../.cursor/docs/feature-sliced-architecture.md)
2. [`.cursor/docs/fsd-import-rules.md`](../.cursor/docs/fsd-import-rules.md)
3. [`.cursor/docs/fsd-architecture-complete.md`](../.cursor/docs/fsd-architecture-complete.md)
4. `.cursor/rules/fsd-*.mdc` and UI `.cursor/rules/*.mdc` listed above
5. [`CLAUDE.md`](../CLAUDE.md) + [`.cursor/docs/typography-system.md`](../.cursor/docs/typography-system.md)

When this process and those docs disagree, **follow the FSD docs + Cursor rules + CLAUDE.md**.

#### FSD layer model (Critical if violated in changed code)

```
app/                       Expo Router — thin re-export + layout registration ONLY
features/*/ui/screens/     Route-level UI — REQUIRED for all new screens
features/*/ui/components/  Feature-local UI — REQUIRED for new local components
components/                Global shared UI — no domain imports
features/*/model/          Redux slices, thunks, selectors — no JSX, no HTTP in reducers
features/*/api/            Domain facades — wraps services/core or legacy services
services/core/             Shared infra (apiClient, firebase, tokenStorage)
services/<domain>/         Legacy domain services — transitional; new endpoints need features/*/api/
models/ utils/ constants/  Shared types and pure helpers
navigation/ store/ shell/  App chrome (href, status bar, store)
```

**Legacy path (existing only):** `src/screens/stron/<domain>/` — OK to edit in place; **Critical** to add new screens/components there.

**Strict rule:** A PR that collapses layers, puts new UI outside the FSD tree, or adds **new** boundary violations is Critical — not an acceptable stylistic variation. Pre-existing legacy violations in **untouched** files are out of scope; violations in **changed or new** files are always in scope.

#### Routing & folder structure (Critical)

See **Strict routing & folder structure** above. Short severity table:

| Rule | Severity |
|------|----------|
| New screen under `src/screens/stron/` instead of `features/*/ui/screens/` | Critical |
| New feature-local component outside `features/*/ui/components/` | Critical |
| `app/` route file contains screen JSX, hooks, or business logic | Critical |
| New route missing Stack / `href` / status-bar or edge-to-edge registration | Critical |
| Hardcoded route path string instead of `href.*` | Critical |
| New feature without `api/` + `model/` + `ui/` + `index.ts` anatomy | Critical |
| Flat `*.slice.ts` at feature root in **new** feature code | Critical — use `model/` |
| New endpoint only in `services/<domain>/` without `features/*/api/` wrapper | Critical |

#### FSD import matrix (short reminder)

| From | Must NOT import |
|------|-----------------|
| Screens (changed/new) | `@/services/*`, other features' `ui/` |
| Local components | `@/services/*`, other features |
| Global components | `features/`, `services/`, `screens/` |
| Feature model | React, components, screens |
| Feature api | React, components, feature model UI |

Cross-feature: **only** via `features/<name>/index.ts`.

#### Data flow (Critical if bypassed)

```
Screen → dispatch(thunk) → features/*/api/ → services/core → backend
```

Screens must not call `@/services/*` directly in new or changed code. Thunks must call feature `api/`, not `apiClient` directly (unless adding the facade in the same PR).

| Rule | Severity |
|------|----------|
| FSD layer collapse — screen does HTTP, route has screen JSX, slice does I/O, service renders UI | Critical |
| New/changed screen imports `@/services/*` | Critical |
| New/changed cross-feature deep import (bypasses `features/*/index.ts`) | Critical |
| Global component imports feature or service | Critical |
| Thunk or slice imports React / UI component | Critical |
| Shared helper duplicated across features instead of `components/` or `utils/` | Warning |

#### UI contracts (from Cursor rules + CLAUDE.md)

| Rule | Severity |
|------|----------|
| Violation of any matching `.cursor/rules/*.mdc` or CLAUDE.md UI contract | Critical |
| Naming convention violated — wrong case for variables, functions, components, files | Critical |
| Component or module violating single responsibility | Critical |
| Deep nesting — 4+ levels of if/else or callbacks | Critical |
| ESLint / Prettier violation | Critical |
| New screen missing Stack / `href` / status-bar or edge-to-edge registration | Critical |
| New screen or local UI placed under `src/screens/stron/` | Critical |
| `function` declaration for a component or util | Critical |
| `useSafeAreaInsets` used for screen content padding | Critical |
| Local `fontFamily` / raw typography in StyleSheet or inline style | Critical |
| Hardcoded layout box (`width: 264`, fixed button `height`) where `%` / padding applies | Critical |
| Thick `app/` route file with business logic | Critical |
| Hardcoded route string instead of `href.*` | Critical |
| Function length notably long | Warning |
| File exceeds ~300 lines (extract `ui/components/`) | Warning |
| Hardcoded magic numbers or strings that should be tokens, `href`, or config | Warning |
| Shared state kept only in a viewmodel when a second screen already needs it | Warning — promote to feature slice |

**No documentation enforcement** — comments and JSDoc are not required and will not be flagged.

This repo has **no** unit-test runner. Do not fail Area 1 for missing Jest tests. TypeScript (`npm run check-types`) and ESLint (`npm run lint`) are the automated checks.

---

### 2. Logic Errors & Edge Cases

| Rule | Severity |
|------|----------|
| Unhandled null or undefined value | Critical |
| Missing try/catch or .catch on async calls | Critical |
| Edge case listed in the ClickUp task is not handled in the code | Critical |

**Scope:** Claude checks only against edge cases explicitly listed in the ClickUp task description. It does not infer or add new edge cases beyond what the task defines.

---

### 3. Security Issues

All security issues are **Critical** — no exceptions. Every security flag must be resolved before PM review. Align with security guidance in `CLAUDE.md` / project conventions.

| Rule | Severity |
|------|----------|
| Hardcoded API key, secret, or token in code | Critical — hard block |
| Access/refresh tokens in Redux, logs, or screen props | Critical — hard block |
| User PII logged (names, emails, phones, bank details) | Critical |
| HTTP that skips `apiClient` auth for a protected Stron endpoint | Critical |
| Payment purchase/signature checks skipped | Critical |

---

### 4. Performance Issues

| Rule | Severity |
|------|----------|
| List without stable `key`; new object/inline handler causing list thrash | Critical |
| Heavy sync operation blocking the JS thread | Critical |
| Large uncompressed assets or payloads | Critical |
| Static import of a native module that must be `*Lazy.ts` | Critical |
| API call inside a loop | Warning — dev must justify |
| Unbounded fetch with no pagination/limit where the API supports it | Warning — dev must justify |

---

### 5. Dead Code & Debug Logs

| Rule | Severity |
|------|----------|
| `console.log` or any debug statement | Critical |
| Commented-out code blocks | Critical |
| Unused variables or imports (if not caught by ESLint) | Warning |
| Unreachable code | Warning |

---

## Structured Summary Format

After running Claude, the developer posts this as a **comment on the PR**. Every field is mandatory. If Claude is re-run after fixes, the developer **edits this same comment** — the edit history is the audit trail.

**Status icons (per area and in the summary table):** Use **PASS ✅** whenever that area has **no unresolved Critical issues** — including when Warnings were found but each is fixed or has a written justification. Use **FAIL ❌** only when at least one **Critical** issue is still open (`Fix applied: No`). **Do not use ❌ for Warnings alone**; Warnings are tracked in the list and justification fields, not as a failing cross on the area row.

```
## Claude Code Review — [Task ID] [Feature Name]

**Date:** YYYY-MM-DD
**Branch:** feature/[task-id]-name
**Reviewed by:** [Developer name]
**Run #:** 1 (increment on each re-run)
**Reviewed against FSD architecture:** Yes
**Reviewed against .cursor/rules (FSD + UI):** Yes
**Reviewed against CLAUDE.md UI contracts:** Yes
**Overall result:** PASS ✅ / FAIL ❌
*(FAIL ❌ only if any Critical issue remains unresolved. Warnings only, all justified or fixed → still PASS ✅.)*

---

### 1. Code Quality & Standards
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; Warnings alone → PASS ✅)*
- FSD layering check:
  - app/ thin re-export only — Pass / Fail
  - New UI under features/*/ui/screens|components — Pass / Fail / N/A
  - Screen → thunk → feature api → services/core — Pass / Fail
  - No new @/services/* in screens — Pass / Fail
  - Cross-feature via index.ts only — Pass / Fail
  - Route registration (Stack / href / status-bar) — Pass / Fail / N/A
  - Navigation via href.* only — Pass / Fail / N/A
- Cursor rules check:
  - fsd-*.mdc — Pass / Fail
  - custom-text / arrow-functions / padding / activeOpacity / responsive-layout / no-require — Pass / Fail
- Issues:
  - [Critical/Warning] `file.tsx:42` — Description — Fix applied: Yes / No
  - [Warning] `file.tsx:110` — Description — Justification: [reason if not fixed]

### 2. Logic Errors & Edge Cases
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; Warnings alone → PASS ✅)*
- Issues:
  - [Critical/Warning] `file.tsx:87` — Description — Fix applied: Yes / No

### 3. Security Issues
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; all security flags are Critical)*
- Issues:
  - [Critical] `file.ts:15` — Description — Fix applied: Yes / No

### 4. Performance Issues
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; Warnings alone → PASS ✅)*
- Issues:
  - [Critical/Warning] `file.tsx:103` — Description — Fix applied: Yes / No

### 5. Dead Code & Debug Logs
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; Warnings alone → PASS ✅)*
- Issues:
  - [Critical/Warning] `file.tsx:58` — Description — Fix applied: Yes / No

---

### Summary Table

| Area | Status | Critical Issues | Warnings | All Fixed? |
|------|--------|-----------------|----------|------------|
| Code Quality & Standards | ✅ pass / ❌ fail | 0 | 0 | Yes / No |
| Logic Errors & Edge Cases | ✅ pass / ❌ fail | 0 | 0 | Yes / No |
| Security | ✅ pass / ❌ fail | 0 | 0 | Yes / No |
| Performance | ✅ pass / ❌ fail | 0 | 0 | Yes / No |
| Dead Code & Debug Logs | ✅ pass / ❌ fail | 0 | 0 | Yes / No |

*Status column: **✅** = no open Critical issues in that area (Warnings allowed with justification). **❌** = at least one Critical still open.*

**All Critical issues resolved:** Yes / No
**Warnings with open justification:** [list or "None"]
**Ready for PM review:** Yes / No
```

---

## Pass & Fail Criteria

### PASS — PR is eligible for PM review

- All 5 areas reviewed and present in the summary
- Summary explicitly states:
  - **Reviewed against FSD architecture: Yes**
  - **Reviewed against .cursor/rules (FSD + UI): Yes**
  - **Reviewed against CLAUDE.md UI contracts: Yes**
- Area 1 includes the **FSD layering check** and **Cursor rules check** blocks (all sub-lines filled)
- All **Critical** issues resolved — "Fix applied: Yes" for every one
- All **Warnings** either fixed or have a written justification in the comment
- Per-area **Status** and the summary table **Status** column use **✅** when there are no open Critical issues in that area — Warnings alone (fixed or justified) still count as **✅**, not ❌
- Overall result marked `PASS ✅`
- Summary comment posted on the PR

### FAIL — PR is hard-blocked from PM review

| Blocking condition |
|--------------------|
| Claude summary comment not posted on the PR |
| Summary does not confirm review against FSD architecture, Cursor rules, **and** CLAUDE.md UI contracts |
| Any Critical issue with "Fix applied: No" |
| Any Critical issue with no entry in the summary |
| Any of the 5 areas missing from the summary |
| FSD layering check or Cursor rules check missing, or any sub-line marked Fail with open Critical |
| Overall result marked `FAIL ❌` |
| Summary posted but Claude not re-run after fixes were applied |
| Warning skipped with no written justification |

---

## Re-Run Rule

If Claude flags issues and the developer fixes them, Claude **must be re-run** before tagging the PM. The developer updates the existing PR comment (not a new one) with the new results and increments the Run # field. The comment edit history serves as the full audit trail.

---

## PM Responsibility

PM must check for the Claude summary before beginning any review.

- If summary is **missing** → comment on the PR tagging the developer, do not begin review
- If summary is marked **FAIL** → comment on the PR tagging the developer, do not begin review
- If summary does **not** state FSD architecture, Cursor rules, and CLAUDE.md confirmations → send back to developer
- If FSD layering check or Cursor rules check has any **Fail** with unresolved Critical → send back to developer
- If a Warning has **no justification** → comment on the PR asking for justification before proceeding
- If PM reviews despite a missing or failed summary → penalty applies to the PM

---

## Rewards & Penalties Integration

| Event | Points | Logged by |
|-------|--------|-----------|
| Claude summary missing when PM is tagged for review | -2 | Reviewing PM |
| Critical issue present in summary with Fix applied: No | -2 | Reviewing PM |
| Warning skipped with no justification | -2 | Reviewing PM |
| PM begins review despite missing or failed Claude summary | -2 | Other PM |
| Clean Claude pass on first run — zero Critical issues | +1 | Reviewing PM |

---

## Rules

- Claude review is mandatory on every PR — features, bugs, and tech debt
- Every Claude run **must** attach/`@` the FSD docs, Cursor rules, and `CLAUDE.md` (see Overview)
- Developer runs it — PM only verifies the summary is present, confirms FSD + Cursor rules were applied, and that the result is passing before starting review
- PM review **cannot begin** if the summary is absent, missing the standards confirmation, or marked FAIL
- All 5 areas must be covered in the summary — no partial submissions
- Warnings without fixes require a written justification — silent skips are penalised
- On any new commit pushed to the PR after the summary is posted, developer must re-run Claude and update the comment
- The summary comment is on the PR only — no separate ClickUp logging required

---

## FSD migration policy (legacy code)

| Situation | Review expectation |
|-----------|-------------------|
| File **not changed** in PR | Pre-existing FSD / Cursor-rule violations are not flagged |
| File **changed** under `screens/stron/` | No **new** FSD violations; do not add new sibling screens there — put new screens in `features/*/ui/screens/` |
| **New** screen / local component / feature | **Must** use `features/<name>/ui/`, `model/`, `api/`, `index.ts` — no exceptions |
| **New** route | Thin `app/` re-export → feature screen + Stack + `href` + status-bar |
| **New** API endpoint | Must land in `features/<name>/api/` with thunk wiring |
| Cross-feature need | Export via `features/<name>/index.ts` or move to shared `components/` / `utils/` |

Cite FSD doc section names or `.cursor/rules/<file>.mdc` when flagging architecture issues.
