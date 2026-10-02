# Claude Code Review Process — Stron Backend

## Overview

Claude is used as an AI-assisted code review gate on every PR. It is **not a unit, integration, or functional test** — it is a structured code quality review that the developer runs manually after raising the PR. This gate must be passed before any PM review begins.

**Authoritative code standard (Modular Monolith):** All reviews must apply the modular monolith architecture and Cursor rules below. Area 1 (Code Quality & Standards) is incomplete unless the PR is checked against them.

| Document / rule | Role |
|---|---|
| [`docs/Stron_Backend_Modular_Monolith_Developer_Guide.md`](./Stron_Backend_Modular_Monolith_Developer_Guide.md) | Developer guide — layers, HTTP patterns, import matrix, checklists |
| [`.cursor/docs/modular-monolith-architecture.md`](../.cursor/docs/modular-monolith-architecture.md) | Canonical architecture — where code lives, module anatomy, migration |
| [`.cursor/docs/module-import-rules.md`](../.cursor/docs/module-import-rules.md) | Import Do/Don't cheat sheet |
| [`.cursor/rules/mm-*.mdc`](../.cursor/rules/) | Enforcement for new and touched code (`mm-architecture`, `mm-import-boundaries`, `mm-feature-module`, `mm-http-layers`, `mm-services`) |

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
2. Developer opens the feature branch code in Claude / Cursor
3. Developer ensures the model has loaded the **modular monolith** sources (attach or `@` each):
   - `docs/Stron_Backend_Modular_Monolith_Developer_Guide.md`
   - `.cursor/docs/modular-monolith-architecture.md`
   - `.cursor/docs/module-import-rules.md`
   - `.cursor/rules/mm-architecture.mdc`
   - `.cursor/rules/mm-import-boundaries.mdc`
   - `.cursor/rules/mm-feature-module.mdc`
   - `.cursor/rules/mm-http-layers.mdc`
   - `.cursor/rules/mm-services.mdc`
4. Developer runs the review prompt (see below) across all 5 areas
5. Developer resolves all Critical issues found
6. Developer re-runs Claude to confirm clean
7. Developer posts the structured summary as a **PR comment**
8. Developer tags PM for review — only after step 7 is complete

---

## Claude Prompt to Use

Run this prompt on the feature code. **Require the model to load the modular monolith docs and `mm-*.mdc` rules first** (e.g. `@docs/Stron_Backend_Modular_Monolith_Developer_Guide.md` plus the architecture/import docs and Cursor rules listed above).

```
Read and apply the Stron Backend modular monolith standard as mandatory for this review:

- docs/Stron_Backend_Modular_Monolith_Developer_Guide.md
- .cursor/docs/modular-monolith-architecture.md
- .cursor/docs/module-import-rules.md
- .cursor/rules/mm-architecture.mdc
- .cursor/rules/mm-import-boundaries.mdc
- .cursor/rules/mm-feature-module.mdc
- .cursor/rules/mm-http-layers.mdc
- .cursor/rules/mm-services.mdc

Do NOT invent alternate folder trees or parallel URL mounts.

Review this PR across the following five areas and return a structured summary.
Flag any modular-monolith / mm-*.mdc violation under area 1 as Critical unless the
docs mark it as Warning-level or an explicit legacy exception for untouched files.

1. Code Quality & Standards
   - MUST follow modular monolith end-to-end (developer guide + architecture + import rules + mm-*.mdc)
   - STRICT folder structure (Critical if wrong for new/touched domain code) — one domain,
     one tree, no invented layouts:
       src/features/<domain>/
         index.ts
         routes/          # only *.route.ts
         controllers/     # only *.controller.ts
         services/        # only *.service.ts
         models/          # only *.model.ts
         validators/      # only *.validator.ts
         types/           # optional
   - Do NOT put new domain files in flat src/routes|controllers|services|models|validators
   - Do NOT invent alternate trees (src/modules/, src/domains/, nested ad-hoc folders,
     mixing layers in one file/folder)
   - STRICT routing (straightforward mount chain only):
       app.ts → routes/v1.route.ts (or legacy mount in app.ts) → features/<domain>/routes/*.route.ts
       → middleware → controller
     Route files wire middleware + controller only — no inline handlers, no service/model calls
   - New gym/business APIs: /api/v1/<kebab-resource> via v1.route.ts; one router per resource
   - File naming: <resource>.route|controller|service|validator|model.ts (matching set per resource)
   - Naming: camelCase vars/functions, PascalCase models, UPPER_SNAKE_CASE enums,
     snake_case error codes, kebab-case URL paths (ESM imports with .js extension)
   - Layer split (Critical if collapsed):
       routes → middleware wiring + controller only; no services/models/business logic
       controllers → extract req → call services → { success } / sendError; NO model imports
       services → all business logic + Mongoose; plain args; codedError; NO req/res
       validators → Zod only; wired via validateRequest; no DB lookups
       models → schema + indexes only
   - Import boundaries (Critical if violated in new/touched code):
       higher → lower only; no deep cross-module imports (use features/<name>/index.ts);
       infra services must not import domain services
   - Middleware order: requireAuth → validateRequest → requireBusiness → controller
   - Success/error JSON shapes and STATUS_BY_CODE registration for new error codes
   - ESLint/Prettier compliance; single responsibility; deep nesting (4+); ~300-line files
   - Magic numbers/strings that should be constants or config
   - Legacy flat folders are OK only for untouched legacy files; new code and edited
     files must not add new modular-monolith violations

2. Logic Errors & Edge Cases
   - Unhandled null or undefined values
   - Missing error handling on async calls (no try/catch or .catch)
   - Edge cases listed in the ClickUp task that are not handled in code
   - Domain conflicts the modular monolith standard requires (duplicates → conflict/409,
     IST day rules, tenant scoping, etc.) when those behaviors are in scope for the task

3. Security Issues
   - Hardcoded API keys or secrets
   - Missing input sanitisation or Zod validation on mutating/parameterized routes
   - Injection risks (SQL, XSS, unescaped $regex)
   - User PII (names, emails, phones, account numbers) being logged or returned unmasked
     when the standard requires masking
   - Missing requireAuth / businessId scoping; client-controlled privileged fields (e.g. status)

4. Performance Issues
   - Unoptimised DB queries (N+1, missing index — especially missing businessId-leading indexes)
   - Unnecessary re-renders in UI components
   - Heavy sync operations blocking the main thread
   - Large uncompressed assets or payloads
   - API calls inside loops or missing pagination on large datasets

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
- Description of the issue (cite the modular monolith doc or mm-*.mdc rule when
  area 1 / security / tenancy / imports)
- Suggested fix

If no issues are found in an area, state "No issues found."
In the summary, explicitly state:
"Reviewed against modular monolith docs + .cursor/rules/mm-*.mdc: Yes"
```

---

## Area Rules & Severity

### 1. Code Quality & Standards

**Primary source of truth:** the modular monolith developer guide, architecture doc, import rules, and `.cursor/rules/mm-*.mdc`. The summary below is a short reminder only — when this process and those docs disagree, **follow the modular monolith docs and Cursor rules**.

### Strict folder structure (mandatory for new / touched domain code)

One domain = one vertical slice. No alternate layouts.

```
src/features/<domain>/
  index.ts                 # public API only (services/types) — never export routes/controllers/validators
  routes/<resource>.route.ts
  controllers/<resource>.controller.ts
  services/<resource>.service.ts
  models/<resource>.model.ts
  validators/<resource>.validator.ts
  types/                   # optional only
```

| Allowed | Forbidden (Critical) |
|---|---|
| Exact folders above under `src/features/<domain>/` | New domain files in flat `src/routes/`, `src/controllers/`, `src/services/`, `src/models/`, `src/validators/` |
| Matching `<resource>.*` file set per resource | Invented trees (`src/modules/`, `src/domains/`, `src/api/`, random nesting) |
| Shared cross-cutting only in `src/middleware/`, `src/config/`, `src/utils/`, `src/types/`, infra under `src/services/` (razorpay, r2, otp, scheduler) | Mixing layers in one folder/file (e.g. service logic inside a route file, model next to a controller outside `models/`) |
| Tests in `tests/<domain>.test.ts` | Ad-hoc scratch scripts or domain code under `scripts/` as the feature |

### Strict routing (straightforward mount chain only)

```
app.ts
  → src/routes/v1.route.ts          # aggregate domain routers for /api/v1
  → features/<domain>/routes/*.route.ts
      → requireAuth → validateRequest → requireBusiness (if tenant) → controller
```

Legacy domains already mounted from `app.ts` (`/api/auth`, `/api/stron`, …) stay on that mount until migrated — do not invent a third mount tree for the same surface.

| Routing rule | Severity |
|---|---|
| Route file does anything except middleware wiring + controller binding | Critical |
| New gym/business route not registered through `v1.route.ts` under `/api/v1` | Critical |
| Parallel URL tree for an existing product surface (e.g. `/api/gym/...` beside `/api/v1/...`) | Critical |
| Inline `async (req, res) => { ... }` handler with business logic or DB in the route file | Critical |
| Resource URL not kebab-case, or router not 1:1 with a resource route file | Critical |

**Layering inside the module** (Critical if collapsed):

```
routes/        Wire middleware + controller only — no services, models, or business logic
controllers/   Thin HTTP adapters — call same-module services; no model imports
services/      All business logic + persistence; plain args; codedError; no req/res
models/        Schema + indexes only
validators/    Zod only via validateRequest; no DB lookups
index.ts       Cross-module public API only
```

**Import direction:** `app` → routes → controllers → services → models → utils/config. Never reverse. No deep imports across modules.

A PR that collapses layers, places new domain code outside the strict `features/<domain>/` tree, invents a parallel routing layout, uses a deep cross-module import, or puts logic in a route file is flagged under this area — not an acceptable stylistic variation.

| Rule | Severity |
|---|---|
| Violation of modular monolith layer, folder structure, mount, import-boundary, contract, or anti-pattern rules | Critical |
| New/touched code violates `.cursor/rules/mm-*.mdc` | Critical |
| New domain code not under exact `src/features/<domain>/{routes,controllers,services,models,validators}/` | Critical |
| New domain files added to legacy flat folders without written PR justification | Critical |
| Routing mount chain not `app → v1.route (or justified legacy app mount) → feature route → middleware → controller` | Critical |
| Naming convention violated — wrong case for variables, functions, models, enums, error codes, or files | Critical |
| Component or module violating single responsibility (doing too many things) | Critical |
| Deep nesting — 4+ levels of if/else or callbacks | Critical |
| ESLint / Prettier violation | Critical |
| Layer violation — controller contains business logic or direct model/DB queries; route contains logic beyond middleware wiring + delegation; service reads/writes `req`/`res`; validator does DB lookups | Critical |
| Deep cross-module import bypassing `features/<name>/index.ts` (new/touched code) | Critical |
| New gym/business API outside `/api/v1` without written justification in the PR summary | Critical |
| New coded error not registered in `stronHttpError.util.ts` `STATUS_BY_CODE` | Critical |
| Missing `.js` extension on ESM relative imports in new/touched TS | Critical |
| Function length is excessive — no hard limit but flagged if notably long | Warning |
| File exceeds ~300 lines | Warning |
| Hardcoded magic numbers or strings that should be constants or config values | Warning |
| Tests missing for new domain rules when the task includes test coverage | Warning — justify or add |
| Untouched legacy flat-folder code left as-is (known exception) | Not a failure — do not invent big-bang migration scope |

**No documentation enforcement** — comments and JSDoc are not required and will not be flagged.

---

### 2. Logic Errors & Edge Cases

| Rule | Severity |
|---|---|
| Unhandled null or undefined value | Critical |
| Missing try/catch or .catch on async calls | Critical |
| Edge case listed in the ClickUp task is not handled in the code | Critical |

**Scope:** Claude checks only against edge cases explicitly listed in the ClickUp task description. It does not infer or add new edge cases beyond what the task defines.

---

### 3. Security Issues

All security issues are **Critical** — no exceptions. Every security flag must be resolved before PM review. Align with tenancy/security guidance in the modular monolith developer guide and `mm-services.mdc` (businessId scoping, Zod validation, no PII logging).

| Rule | Severity |
|---|---|
| Hardcoded API key, secret, or token in code | Critical — hard block |
| Missing input sanitisation or Zod validation on mutating/parameterized routes | Critical — hard block |
| Injection risk (SQL, XSS, unescaped `$regex`, etc.) | Critical — hard block |
| User PII (names, emails, phones, account numbers) being logged or returned unmasked when masking is required | Critical |
| Improper auth, missing `requireBusiness` / `businessId` scope, or client-controlled privileged fields | Critical |

---

### 4. Performance Issues

| Rule | Severity |
|---|---|
| Unoptimised DB query — N+1, missing index | Critical |
| Unnecessary re-renders in UI components | Critical |
| Heavy sync operation blocking the main thread | Critical |
| Large uncompressed assets or payloads | Critical |
| API call inside a loop | Warning — dev must justify |
| Missing pagination on a large dataset | Warning — dev must justify |

---

### 5. Dead Code & Debug Logs

| Rule | Severity |
|---|---|
| console.log or any debug statement | Critical |
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
**Reviewed against modular monolith docs + .cursor/rules/mm-*.mdc:** Yes
**Overall result:** PASS ✅ / FAIL ❌
*(FAIL ❌ only if any Critical issue remains unresolved. Warnings only, all justified or fixed → still PASS ✅.)*

---

### 1. Code Quality & Standards
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; Warnings alone → PASS ✅)*
- Modular monolith check: strict `features/<domain>/{routes,controllers,services,models,validators}` layout / mount `app→v1.route→feature.route→middleware→controller` / routes thin / controllers thin / services own logic+DB / Zod validators / models schema-only / import boundaries / public index.ts — Pass / Fail
- Issues:
  - [Critical/Warning] `file.ts:42` — Description — Fix applied: Yes / No
  - [Warning] `file.ts:110` — Description — Justification: [reason if not fixed]

### 2. Logic Errors & Edge Cases
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; Warnings alone → PASS ✅)*
- Issues:
  - [Critical/Warning] `file.ts:87` — Description — Fix applied: Yes / No

### 3. Security Issues
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; all security flags are Critical)*
- Issues:
  - [Critical] `file.ts:15` — Description — Fix applied: Yes / No

### 4. Performance Issues
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; Warnings alone → PASS ✅)*
- Issues:
  - [Critical/Warning] `file.ts:103` — Description — Fix applied: Yes / No

### 5. Dead Code & Debug Logs
- Status: PASS ✅ / FAIL ❌ *(FAIL only for unresolved Critical; Warnings alone → PASS ✅)*
- Issues:
  - [Critical/Warning] `file.ts:58` — Description — Fix applied: Yes / No

---

### Summary Table

| Area | Status | Critical Issues | Warnings | All Fixed? |
|---|---|---|---|---|
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
- Summary explicitly states **Reviewed against modular monolith docs + .cursor/rules/mm-*.mdc: Yes**
- Area 1 includes the **Modular monolith check** line
- All **Critical** issues resolved — "Fix applied: Yes" for every one
- All **Warnings** either fixed or have a written justification in the comment
- Per-area **Status** and the summary table **Status** column use **✅** when there are no open Critical issues in that area — Warnings alone (fixed or justified) still count as **✅**, not ❌
- Overall result marked `PASS ✅`
- Summary comment posted on the PR

### FAIL — PR is hard-blocked from PM review

| Blocking condition |
|---|
| Claude summary comment not posted on the PR |
| Summary does not confirm review against modular monolith docs + `mm-*.mdc` |
| Any Critical issue with "Fix applied: No" |
| Any Critical issue with no entry in the summary |
| Any of the 5 areas missing from the summary |
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
- If summary does **not** state `Reviewed against modular monolith docs + .cursor/rules/mm-*.mdc: Yes` → send back to developer
- If a Warning has **no justification** → comment on the PR asking for justification before proceeding
- If PM reviews despite a missing or failed summary → penalty applies to the PM

---

## Rewards & Penalties Integration

| Event | Points | Logged by |
|---|---|---|
| Claude summary missing when PM is tagged for review | -2 | Reviewing PM |
| Critical issue present in summary with Fix applied: No | -2 | Reviewing PM |
| Warning skipped with no justification | -2 | Reviewing PM |
| PM begins review despite missing or failed Claude summary | -2 | Other PM |
| Clean Claude pass on first run — zero Critical issues | +1 | Reviewing PM |

---

## Rules

- Claude review is mandatory on every PR — features, bugs, and tech debt
- Every Claude run **must** use the modular monolith developer guide, architecture/import docs, and `.cursor/rules/mm-*.mdc` as the coding-standard checklist (attach/`@` those files with the prompt)
- Developer runs it — PM only verifies the summary is present, confirms modular monolith standards were applied, and that the result is passing before starting review
- PM review **cannot begin** if the summary is absent, missing the modular monolith confirmation, or marked FAIL
- All 5 areas must be covered in the summary — no partial submissions
- Warnings without fixes require a written justification — silent skips are penalised
- On any new commit pushed to the PR after the summary is posted, developer must re-run Claude and update the comment
- The summary comment is on the PR only — no separate ClickUp logging required
