# Catalog Events Feature Slice

## Architectural Role: Internal Domain Module

`src/features/catalog-events` is **intentionally internal-only** by architectural design.

### Anatomy Justification
- **Models**: `EventCatalogItem`, `EventEnrollment`, `Registration`
- **Services**: `event.service.ts`, `eventCatalog.service.ts`
- **Public API**: Exported via `index.ts`
- **Routes / Controllers / Validators**: **None**.

### Rationale
This module serves as the internal persistence and business logic provider for legacy event enrollments, user event registrations, and catalog definitions. All client-facing HTTP interactions for events and enrollments are mediated through higher-level boundary domains:
- `src/features/managed-events/`: Handles organizer workflows, ticketing, and event lifecycle.
- `src/features/stron-connect/`: Handles QR scans, check-ins, and participant validation.
- `src/features/payments-payouts/`: Handles consumer Razorpay transactions.

Direct exposure of routes, controllers, or validators on `catalog-events` is deliberately omitted to maintain a single canonical public API surface for clients.
