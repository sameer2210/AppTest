/**
 * Catalog Events — legacy catalog enrollments, registrations, and catalog items.
 */

export { default as Registration } from "./models/registration.model.js";
export { default as EventEnrollment } from "./models/eventEnrollment.model.js";
export { default as EventCatalogItem } from "./models/eventCatalogItem.model.js";

export * as catalogEventService from "./services/event.service.js";
export * as eventCatalogService from "./services/eventCatalog.service.js";

export {
  getActiveEnrollment,
  enrollUserInEvent,
  normalizePlanIdForEvent,
} from "./services/event.service.js";
export {
  getEventDefinitionByKey,
  listCatalogEvents,
  saveMarathonPhysicalEvent,
} from "./services/eventCatalog.service.js";

export * from "./types/index.js";
