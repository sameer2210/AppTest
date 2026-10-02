import { apiClient } from "../core/apiClient.service";

export const InterestService = {
  async fetchInterests(): Promise<string[]> {
    try {
      const { data } = await apiClient.get<{ success?: boolean; interests?: { name?: string }[] }>(
        "/api/interests",
      );
      if (data.success !== true) return [];
      return (data.interests ?? []).map((entry) => String(entry.name ?? "").trim()).filter(Boolean);
    } catch {
      return [];
    }
  },
};
