/**
 * Global Schema Registrations — ensures all Mongoose schemas are registered on app bootstrap.
 * Imports via public feature barrels instead of deep cross-module paths.
 */

// Identity & Auth
import "../features/identity-auth/index.js";

// Gym Business
import "../features/gym-business/index.js";

// Managed Events
import "../features/managed-events/index.js";

// Catalog Events & Registrations
import "../features/catalog-events/index.js";

// Payments & Payouts (Consumer)
import "../features/payments-payouts/index.js";

// Opinion Hub
import "../features/opinion-hub/index.js";

// STRON Connect
import "../features/stron-connect/index.js";

// Daily Reset
import "../features/daily-reset/index.js";

// Notifications
import "../features/notifications/index.js";

// Step Race
import "../features/step-race/index.js";

// User Engagement
import "../features/user-engagement/index.js";

// Standalone / not yet modularized
import "./interest.model.js";

export default {};
