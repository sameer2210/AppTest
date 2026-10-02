import type { ExploreFilter } from "./components/ExploreFilterChips";

export type ExploreEventRecord = {
  _id: string;
  eventType: "self" | "external" | "face-off";
  eventTitle?: string;
  title?: string;
  banner?: string;
  date?: string | Date;
  time?: string;
  category?: string;
  venue?: string;
  tickets?: { price?: number; capacity?: number }[];
  ticket?: { price?: number; capacity?: number };
  status?: string;
  rating?: number | string;
};

export type ExploreEventCardModel = {
  id: string;
  eventType: "self" | "external" | "face-off";
  imageUrl?: string;
  title: string;
  date: string;
  price: string;
  category?: string;
  rating?: string;
};

export const mapExploreEventToCard = (event: ExploreEventRecord): ExploreEventCardModel => {
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  const ticketPrice =
    tickets[0]?.price ?? (event.ticket?.price != null ? Number(event.ticket.price) : undefined);
  const price =
    event.eventType === "external"
      ? "Register"
      : ticketPrice != null && Number.isFinite(Number(ticketPrice))
        ? Number(ticketPrice) === 0
          ? "Free"
          : `₹${ticketPrice}`
        : "Free";

  return {
    id: String(event._id),
    eventType: event.eventType,
    imageUrl: event.banner ? String(event.banner).trim() : undefined,
    title: String(event.eventTitle || event.title || "Upcoming Event"),
    date: event.date
      ? new Date(event.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
      : "TBA",
    price,
    category:
      event.eventType === "face-off"
        ? "Face-Off"
        : event.eventType === "external"
          ? "External"
          : event.category
            ? String(event.category)
            : undefined,
    rating: event.rating != null && String(event.rating).trim() ? String(event.rating) : undefined,
  };
};

export const formatEventStartTime = (event?: { time?: string; date?: string | Date }) => {
  const timeLabel = event?.time?.trim();
  if (timeLabel) {
    return timeLabel;
  }

  if (!event?.date) {
    return "TBA";
  }

  const parsed = new Date(event.date);
  if (Number.isNaN(parsed.getTime())) {
    return "TBA";
  }

  return parsed.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
};

const normalize = (value: string) => value.trim().toLowerCase();

const isChallengeEvent = (event: ExploreEventRecord) => {
  const category = normalize(String(event.category || ""));
  const title = normalize(String(event.eventTitle || event.title || ""));
  return (
    category.includes("marathon") ||
    title.includes("marathon") ||
    category.includes("step challenge") ||
    title.includes("step challenge") ||
    category.includes("challenge") ||
    title.includes("challenge")
  );
};

const isGameEvent = (event: ExploreEventRecord) => {
  const category = normalize(String(event.category || ""));
  const title = normalize(String(event.eventTitle || event.title || ""));
  const isFaceOff = event.eventType === "face-off" || category.includes("face");
  const isKingOfTheHill =
    category.includes("king") || title.includes("hill") || category.includes("king of the hill");
  return isFaceOff || isKingOfTheHill;
};

export const filterExploreEvents = (
  events: ExploreEventRecord[],
  filter: ExploreFilter,
): ExploreEventRecord[] => {
  if (filter === "All") {
    return events;
  }

  return events.filter((event) => {
    switch (filter) {
      case "Challenges":
        return isChallengeEvent(event);
      case "Events":
        return event.eventType === "external" || event.eventType === "self";
      case "Games":
        return isGameEvent(event);
      case "Trainers": {
        const category = normalize(String(event.category || ""));
        const title = normalize(String(event.eventTitle || event.title || ""));
        return (
          category.includes("trainer") || category.includes("coach") || title.includes("trainer")
        );
      }
      case "Gyms": {
        const category = normalize(String(event.category || ""));
        const title = normalize(String(event.eventTitle || event.title || ""));
        return (
          category.includes("gym") ||
          category.includes("hub") ||
          category.includes("center") ||
          title.includes("gym")
        );
      }
      default:
        return true;
    }
  });
};

export const searchExploreEvents = (
  events: ExploreEventRecord[],
  query: string,
): ExploreEventRecord[] => {
  const needle = normalize(query);
  if (!needle) {
    return events;
  }

  return events.filter((event) => {
    const haystack = [event.eventTitle, event.title, event.category, event.venue]
      .filter(Boolean)
      .map((part) => normalize(String(part)))
      .join(" ");

    return haystack.includes(needle);
  });
};
