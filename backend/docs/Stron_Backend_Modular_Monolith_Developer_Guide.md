# Stron Backend — Modular Monolith Developer Guide

**Version:** 2.2 · **Date:** September 2026  
**Project:** stepwars_backend (Node.js / Express / MongoDB)  
**Audience:** Backend developers, reviewers, and AI coding agents

---

## 1. Overview

Stron Backend is a **modular monolith**: one deployable Express application composed of independent domain modules. Each module owns its HTTP surface, business logic, and data models. Layers are strictly separated.

| Principle | What it means |
|-----------|---------------|
| Modular monolith | One app, many domain modules with clear boundaries |
| Vertical slices | Each domain owns routes + controllers + services + models + validators |
| Layer separation | Routes → controllers → services → models → shared utils |
| Public API | Cross-module access only via `features/<name>/index.ts` |
| Gradual migration | Legacy flat folders stay valid until touched |

**Docs & enforcement:**

| Document | Responsibility |
|----------|----------------|
| This developer guide | **How** layers behave (HTTP contracts, Zod, tenancy, checklists) + day-to-day patterns |
| `.cursor/docs/modular-monolith-architecture.md` | **Where** code lives and module anatomy |
| `.cursor/docs/module-import-rules.md` | Import Do/Don't cheat sheet |
| `.cursor/rules/mm-*.mdc` | Enforcement for all new and touched code |
| `docs/Claude_Code_Review_Process.md` | PR review gate against the modular monolith standard |

---

## 2. Architecture layers

Dependency flows **downward only**. Never import upward.

```
┌─────────────────────────────────────────────────────────────┐
│  APP LAYER          app.ts · server.ts · v1.route.ts        │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  HTTP LAYER         routes → middleware → controllers        │
│                     validators                               │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  APPLICATION        features/*/services                      │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  DATA               features/*/models (Mongoose)             │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  SHARED             config/ · middleware/ · utils/ · types/  │
│                     infra services (razorpay, r2, otp, cron) │
└─────────────────────────────────────────────────────────────┘
```

### Request data flow

```
HTTP request
  → route        (middleware chain + controller binding)
    → controller (read req, call service, send res)
      → service  (business logic, Mongoose queries)
        → model  (schema)
          → MongoDB
```

**Hard rules:**
- Routes: no business logic, no model imports
- Controllers: no Mongoose imports, no business rules
- Services: no `req`/`res`, no HTTP status codes
- Validators: Zod only, no DB lookups

---

## 3. Folder layout (strict)

New and touched domain code **must** use this tree. No alternate layouts (`src/modules/`, `src/domains/`, flat new files under `src/routes/`, etc.).

### Target (new code)

```
src/features/<domain>/
  index.ts                          # public API — cross-module exports only
  routes/<resource>.route.ts        # middleware + controller wiring only
  controllers/<resource>.controller.ts
  services/<resource>.service.ts
  models/<resource>.model.ts
  validators/<resource>.validator.ts
  types/                            # optional
```

One resource ≈ matching file set (`member.route.ts` + `member.controller.ts` + `member.service.ts` + `member.validator.ts` + model when owned).

### Routing mount (straightforward only)

```
app.ts
  → src/routes/v1.route.ts                    # /api/v1 aggregator
  → features/<domain>/routes/<resource>.route.ts
  → requireAuth → validateRequest → requireBusiness? → controller
```

Legacy domains already on `app.ts` (`/api/auth`, `/api/stron`, …) keep that mount until migrated. Do not invent a parallel URL tree for the same product surface.

### Legacy (OK until migrated)

| Layer | Legacy path |
|-------|-------------|
| Routes | `src/routes/<domain>.route.ts` |
| Controllers | `src/controllers/<domain>.controller.ts` |
| Services | `src/services/<domain>.service.ts` |
| Models | `src/models/<domain>.model.ts` |
| Validators | `src/validators/<domain>.validator.ts` |

### Shared (always global)

| Path | Purpose |
|------|---------|
| `src/config/` | DB, Firebase, auth config, remote config |
| `src/middleware/` | requireAuth, requireBusiness, validateRequest, errorHandler |
| `src/utils/` | stronHttpError, pagination, jwt, phone helpers |
| `src/services/razorpay.service.ts` | Payment gateway |
| `src/services/r2Upload.service.ts` | Cloudflare R2 storage |
| `src/services/otp/` | SMS OTP |
| `src/services/stronScheduler.service.ts` | Shared cron execution infra (`scheduleCron`); job registration wired in `app.ts` |

---

## 4. Domain registry

| Module folder | API mount | Notes |
|--------|-----------|-------|
| `identity-auth` | `/api/auth`, `/api/user` | Auth + user profile (guide names: auth, user) |
| `notifications` | `/api/notifications` | Push + inbox |
| `stron-connect` | `/api/v1/connect` | Canonical V1 mount (legacy `/api/stron/connect` removed) |
| `managed-events` | `/api/stron/*` | Face-Off, King-of-Hill, Marathon, Step Challenge |
| `step-race` | `/api/step-race` | 1v1 battles |
| `opinion-hub` | `/api/opinion` | Opinion polls |
| `payments-payouts` | `/api/payment` | Consumer Razorpay (event tickets) |
| `upload` | `/api/upload` | R2 image storage |
| `config` | `/api/config` | Remote config refresh |
| `user-engagement` | `/api/feedback` | User feedback |
| `daily-reset` | `/api/daily-reset` | Midnight IST archive |
| `catalog-events` | (internal) | Legacy catalog enrollments / registrations |

**Gold standard:** Gym Business V1 (PR #21) — use as reference for layer responsibilities.

---

## 5. HTTP layer quick reference

### Middleware order (canonical)

1. `requireAuth`
2. `validateRequest(<zod schema>)`
3. `requireBusiness` (tenant guard, when applicable)
4. Controller handler

### Route — correct pattern

```ts
router.post(
  "/",
  requireAuth,
  validateRequest(createMemberSchema),
  requireBusiness,
  createMember,
);
```

### Controller — correct pattern

```ts
export const createMember = async (req: Request, res: Response) => {
  try {
    const data = await memberService.createMember({
      businessId: req.businessId!,
      memberData: req.body,
    });
    return res.status(201).json({ success: true, data });
  } catch (error) {
    return sendError(res, error);
  }
};
```

### Service — correct pattern

```ts
export async function createMember({ businessId, memberData }: CreateMemberArgs) {
  const existing = await Member.findOne({
    businessId, phone: memberData.phone, isDeleted: false,
  });
  if (existing) throw codedError("conflict", "Member with this phone already exists.");
  return Member.create({ ...memberData, businessId });
}
```

### Success / error JSON

```json
{ "success": true, "data": { } }
```

```json
{ "success": false, "code": "member_not_found", "message": "Member not found in this gym." }
```

Register new error codes in `src/utils/stronHttpError.util.ts`.

---

## 6. Import rules

| From | May import | Must NOT import |
|------|------------|-----------------|
| app.ts | route aggregators, middleware, config | services, models |
| Routes | middleware, same-module controllers/validators | services, models |
| Controllers | same-module services, sendError util | models, deep cross-module paths |
| Validators | Zod, shared validator helpers | services, models |
| Services | same-module models, utils, infra, other modules via index.ts | routes, controllers, req/res |
| Models | utils (pure helpers) | services, controllers, routes |
| Infra services | utils, config, SDKs | domain services, routes |

### Cross-module access

```ts
// GOOD
import { checkProAccess } from "../features/gym-business/index.js";

// BAD — deep import
import { checkProAccess } from "../features/gym-business/services/proSubscription.service.js";
```

### ESM convention

Always include `.js` extension in imports:

```ts
import memberService from "../services/member.service.js";
```

---

## 7. New endpoint checklist

1. Place code in `features/<domain>/` (target) with full anatomy
2. Mount under `/api/v1` via `v1.route.ts` (or `app.ts` for legacy domains)
3. Create matching route + controller + service + validator + model files
4. Apply middleware: requireAuth → validateRequest → tenant guard → controller
5. Register error codes in `stronHttpError.util.ts`
6. Add Vitest coverage in `tests/<domain>.test.ts`
7. Export cross-module functions from `features/<name>/index.ts`

---

## 8. Migration playbook

| When | Do this |
|------|---------|
| New domain | Full module under `src/features/<domain>/` |
| Touching legacy file | Migrate toward target paths when practical |
| Cross-module call needed | Import via `features/<name>/index.ts` |
| Helper used by 2+ modules | Move to `src/utils/` |
| New v1 endpoint | Modular monolith layer rules + target module layout |

**Legacy exceptions (tolerated until file is edited):**
- Flat folder layout for all existing domains
- Thicker controllers in `/api/stron` managed-events
- Direct cross-service imports without index.ts barrels

---

## 9. Cursor rules reference

| Rule file | Scope |
|-----------|-------|
| `mm-architecture.mdc` | Always apply — layer overview |
| `mm-feature-module.mdc` | `src/features/**` — module anatomy |
| `mm-http-layers.mdc` | routes, controllers, validators |
| `mm-services.mdc` | services — business logic, tenancy |
| `mm-import-boundaries.mdc` | Always apply — import directions |

---

## 10. Architectural Justifications & Warnings Registry

### 1. `src/features/catalog-events/` (Internal-Only Module Anatomy)
- **Status**: Justified internal-only domain slice.
- **Anatomy**: Owns `models/` and `services/` with public exports via `index.ts`. No `routes/`, `controllers/`, or `validators/`.
- **Justification**: Serves internal catalog and legacy enrollment data access required by `managed-events`, `stron-connect`, and `payments-payouts`. Direct HTTP routes are deliberately omitted to preserve canonical public API surfaces (`/api/v1/connect`, `/api/stron`). Documented in `src/features/catalog-events/README.md`.

### 2. Oversized Service Files (>300 Lines)
- **Status**: Migrated legacy modules; justified under the gradual migration policy.
- **Files**: `membership.service.ts`, `event.service.ts` (`catalog-events`), `opinion.service.ts`, `stepRace.service.ts`, `payment.service.ts`.
- **Justification**: These services represent core business domains relocated from flat `src/services/` during vertical slice migration. Splitting these files will be performed in subsequent, scoped refactoring PRs with dedicated regression test plans, in strict adherence to the gradual migration playbook.

---

## 11. Related resources

| Resource | Path |
|----------|------|
| Canonical architecture | `.cursor/docs/modular-monolith-architecture.md` |
| Full reference | `.cursor/docs/modular-monolith-architecture-complete.md` |
| Import cheat sheet | `.cursor/docs/module-import-rules.md` |
| Claude review process | `docs/Claude_Code_Review_Process.md` |
| Agent guidance | `AGENTS.md`, `CLAUDE.md` |
| Dev commands | `npm run dev`, `npm test`, `npm run typecheck`, `npm run lint:imports` |

---

*Stron Engineering · Modular Monolith Architecture · September 2026*
