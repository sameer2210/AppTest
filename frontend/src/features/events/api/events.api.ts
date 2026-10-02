import { apiClient } from "@/services/core/apiClient.service";
import { EventService } from "@/services/event/event.service";

export const EventsApi = {
  event: EventService,
  apiClient,
};

export default EventsApi;
