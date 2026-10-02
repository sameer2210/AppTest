/**
 * Step Race Service
 * Handles all step race API calls and business logic
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "../core/apiClient.service";
import type {
  StepRace,
  StepRaceStats,
  StepRaceSearchResult,
  StepRaceOpponent,
  CreateStepRaceRequest,
  UpdateStepRaceRequest,
  StepRaceLeaderboard,
} from "@/models/stepRace";
import { calculateDecayedSteps } from "@/models/stepRace";
import { resolveStepRaceOpponentAvatarUrl } from "./stepRaceOpponentImages";
import { captureEvent } from "@/analytics/posthog/events";

import { STRON_BACKEND_URL } from "@/constants/stron";

const STEP_RACE_WINS_STORAGE_KEY = "stron_step_race_wins_count";
const STEP_RACE_SUGGESTIONS_CACHE_KEY = "stron_cached_shadow_opponents";

const getShadowAthleteImageUrl = (uid: string) =>
  `${(STRON_BACKEND_URL || "https://apidev.stron.in").replace(/\/$/, "")}/api/upload/public/athletes%2F${encodeURIComponent(uid)}.jpg`;


// Starting Bots & Celebrity Athletes for Step Race
// bestPaceSeconds = seconds to complete 1000 steps at given cadence
const MOCK_SHADOW_OPPONENTS: StepRaceOpponent[] = [
  {
    uid: "bot_roshni",
    username: "Roshni Bansal",
    profession: "Daily Walker",
    bio: "Steady & Consistent Pace",
    profileImageUrl: getShadowAthleteImageUrl("bot_roshni"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "bot_roshni",
      username: "Roshni Bansal",
      profession: "Daily Walker",
      bio: "Steady & Consistent Pace",
      profileImageUrl: getShadowAthleteImageUrl("bot_roshni"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 1200, // 50 steps/min
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "bot_amit",
    username: "Amit Nayak",
    profession: "Fitness Enthusiast",
    bio: "5K Daily Runner",
    profileImageUrl: getShadowAthleteImageUrl("bot_amit"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "bot_amit",
      username: "Amit Nayak",
      profession: "Fitness Enthusiast",
      bio: "5K Daily Runner",
      profileImageUrl: getShadowAthleteImageUrl("bot_amit"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 1000, // 60 steps/min
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "bot_sarthak",
    username: "Sarthak Trivedi",
    profession: "Speed Walker",
    bio: "High Cadence Specialist",
    profileImageUrl: getShadowAthleteImageUrl("bot_sarthak"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "bot_sarthak",
      username: "Sarthak Trivedi",
      profession: "Speed Walker",
      bio: "High Cadence Specialist",
      profileImageUrl: getShadowAthleteImageUrl("bot_sarthak"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 857, // 70 steps/min
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "athlete_bolt",
    username: "Usain Bolt",
    profession: "Sprinter",
    bio: "8x Olympic Gold • 100m World Record Holder",
    profileImageUrl: getShadowAthleteImageUrl("athlete_bolt"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "athlete_bolt",
      username: "Usain Bolt",
      profession: "Sprinter",
      bio: "8x Olympic Gold • 100m World Record Holder",
      profileImageUrl: getShadowAthleteImageUrl("athlete_bolt"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 480, // 8:00 — brisk walk (~125 spm)
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "athlete_ronaldo",
    username: "Cristiano Ronaldo",
    profession: "Footballer",
    bio: "5x Ballon d'Or • Relentless Athletic Stamina",
    profileImageUrl: getShadowAthleteImageUrl("athlete_ronaldo"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "athlete_ronaldo",
      username: "Cristiano Ronaldo",
      profession: "Footballer",
      bio: "5x Ballon d'Or • Relentless Athletic Stamina",
      profileImageUrl: getShadowAthleteImageUrl("athlete_ronaldo"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 510, // 8:30
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "athlete_kohli",
    username: "Virat Kohli",
    profession: "Cricketer",
    bio: "World Champion • Elite Fitness & Running Cadence",
    profileImageUrl: getShadowAthleteImageUrl("athlete_kohli"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "athlete_kohli",
      username: "Virat Kohli",
      profession: "Cricketer",
      bio: "World Champion • Elite Fitness & Running Cadence",
      profileImageUrl: getShadowAthleteImageUrl("athlete_kohli"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 540, // 9:00
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "athlete_messi",
    username: "Lionel Messi",
    profession: "Footballer",
    bio: "World Cup Winner • High Acceleration & Agility",
    profileImageUrl: getShadowAthleteImageUrl("athlete_messi"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "athlete_messi",
      username: "Lionel Messi",
      profession: "Footballer",
      bio: "World Cup Winner • High Acceleration & Agility",
      profileImageUrl: getShadowAthleteImageUrl("athlete_messi"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 570, // 9:30
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "athlete_kipchoge",
    username: "Eliud Kipchoge",
    profession: "Marathoner",
    bio: "Sub-2 Hour Marathon Legend • Unmatched Endurance",
    profileImageUrl: getShadowAthleteImageUrl("athlete_kipchoge"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "athlete_kipchoge",
      username: "Eliud Kipchoge",
      profession: "Marathoner",
      bio: "Sub-2 Hour Marathon Legend • Unmatched Endurance",
      profileImageUrl: getShadowAthleteImageUrl("athlete_kipchoge"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 600, // 10:00 — average walk (~100 spm)
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "athlete_goggins",
    username: "David Goggins",
    profession: "Ultra Runner",
    bio: "Navy SEAL • 100-Mile Ultra Endurance Master",
    profileImageUrl: getShadowAthleteImageUrl("athlete_goggins"),
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "athlete_goggins",
      username: "David Goggins",
      profession: "Ultra Runner",
      bio: "Navy SEAL • 100-Mile Ultra Endurance Master",
      profileImageUrl: getShadowAthleteImageUrl("athlete_goggins"),
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 660, // 11:00
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "athlete_soman",
    username: "Milind Soman",
    profession: "Ultramarathoner",
    bio: "Ironman Triathlon Champion • Barefoot Fitness Icon",
    profileImageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Milind_Soman_at_the_NDTV_Marks_for_Sports_event_12.jpg/400px-Milind_Soman_at_the_NDTV_Marks_for_Sports_event_12.jpg",
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "athlete_soman",
      username: "Milind Soman",
      profession: "Ultramarathoner",
      bio: "Ironman Triathlon Champion • Barefoot Fitness Icon",
      profileImageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Milind_Soman_at_the_NDTV_Marks_for_Sports_event_12.jpg/400px-Milind_Soman_at_the_NDTV_Marks_for_Sports_event_12.jpg",
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 720, // 12:00
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
  {
    uid: "athlete_singh",
    username: "Fauja Singh",
    profession: "Marathon Runner",
    bio: "100+ Year Old Marathoner • Turbaned Tornado",
    profileImageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Fauja_Singh_in_2007.jpg/400px-Fauja_Singh_in_2007.jpg",
    type: "shadow",
    currentSteps: 1000,
    shadowData: {
      uid: "athlete_singh",
      username: "Fauja Singh",
      profession: "Marathon Runner",
      bio: "100+ Year Old Marathoner • Turbaned Tornado",
      profileImageUrl:
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Fauja_Singh_in_2007.jpg/400px-Fauja_Singh_in_2007.jpg",
      bestStepCount: 1000,
      originalBestStepCount: 1000,
      bestPaceSeconds: 900, // 15:00 — leisurely walk
      lastActiveDate: new Date().toISOString(),
      decayRate: 0.05,
      isOnline: true,
    },
  },
];

for (const opponent of MOCK_SHADOW_OPPONENTS) {
  const avatarUrl = resolveStepRaceOpponentAvatarUrl(opponent.uid, opponent.profileImageUrl);
  opponent.profileImageUrl = avatarUrl;
  if (opponent.shadowData) {
    opponent.shadowData.profileImageUrl = avatarUrl;
  }
}

const MOCK_SEARCH_RESULTS: StepRaceSearchResult[] = [
  {
    uid: "user_1",
    username: "JohnDoe",
    profileImageUrl: undefined,
    bestStepCount: 10000,
    isOnline: true,
    lastActiveDate: new Date().toISOString(),
  },
  {
    uid: "user_2",
    username: "JaneSmith",
    profileImageUrl: undefined,
    bestStepCount: 8500,
    isOnline: false,
    lastActiveDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let useMockData = false; // Set to false when backend is ready

// Store for mock active race (in-memory for testing)
let mockActiveRace: StepRace | null = null;
let inMemoryCachedOpponents: StepRaceOpponent[] | null = null;
let cachedWinsCount: number | null = null;

export const StepRaceService = {
  /**
   * Get current step race statistics for the user
   */
  async getStepRaceStats(userId: string): Promise<StepRaceStats> {
    if (useMockData) {
      // Return mock stats for testing
      return {
        racesToday: 3,
        wins: 2,
        losses: 1,
        streak: 2,
        totalRaces: 15,
      };
    }

    try {
      const response = await apiClient.get<Record<string, unknown>>(
        `/api/step-race/stats/${userId}`,
        { validateStatus: (status) => (status >= 200 && status < 300) || status === 404 },
      );
      if (response.status === 404 || !response.data) {
        return {
          racesToday: 0,
          wins: 0,
          losses: 0,
          streak: 0,
          totalRaces: 0,
        };
      }
      const data = response.data;
      return {
        racesToday: (data.racesToday as number) ?? 0,
        wins: (data.wins as number) ?? 0,
        losses: (data.losses as number) ?? 0,
        streak: (data.streak as number) ?? 0,
        totalRaces: (data.totalRaces as number) ?? 0,
        bestPaceSeconds: (data.bestPaceSeconds as number) ?? undefined,
        shadowRacesAway: (data.shadowRacesAway as number) ?? 0,
        currentRace: data.currentRace
          ? this.parseStepRace(data.currentRace as Record<string, unknown>)
          : undefined,
      };
    } catch {
      return {
        racesToday: 0,
        wins: 0,
        losses: 0,
        streak: 0,
        totalRaces: 0,
      };
    }
  },

  /**
   * Search for opponents by username
   */
  async searchOpponents(query: string): Promise<StepRaceSearchResult[]> {
    if (useMockData) {
      // Return mock search results for testing
      return MOCK_SEARCH_RESULTS.filter((result) =>
        result.username.toLowerCase().includes(query.toLowerCase()),
      );
    }

    try {
      const { data } = await apiClient.get<Record<string, unknown>[]>(
        `/api/step-race/search?q=${encodeURIComponent(query)}`,
      );
      const apiResults = (data ?? []).map((item) => ({
        uid: (item.uid as string) ?? "",
        username: (item.username as string) ?? "",
        profileImageUrl: resolveStepRaceOpponentAvatarUrl(
          item.uid as string,
          item.profileImageUrl as string,
        ),
        bestStepCount: (item.bestStepCount as number) ?? 0,
        bestPaceSeconds: (item.bestPaceSeconds as number) ?? undefined,
        isOnline: (item.isOnline as boolean) ?? false,
        lastActiveDate: (item.lastActiveDate as string) ?? new Date().toISOString(),
        bio: ((item.bio as string) || (item.shortBio as string) || "").trim() || undefined,
        shortBio: ((item.shortBio as string) || (item.bio as string) || "").trim() || undefined,
      }));

      const shadowMatches: StepRaceSearchResult[] = MOCK_SHADOW_OPPONENTS.filter((s) =>
        s.username.toLowerCase().includes(query.toLowerCase()),
      ).map((s) => ({
        uid: s.uid,
        username: s.username,
        profileImageUrl: resolveStepRaceOpponentAvatarUrl(s.uid, s.profileImageUrl),
        bestStepCount: s.shadowData?.bestStepCount || 200,
        bestPaceSeconds: s.shadowData?.bestPaceSeconds || 600,
        isOnline: true,
        lastActiveDate: new Date().toISOString(),
        bio: s.bio || s.profession,
        shortBio: s.bio || s.profession,
      }));

      const seen = new Set(shadowMatches.map((s) => s.uid));
      const results = [...shadowMatches, ...apiResults.filter((result) => !seen.has(result.uid))];
      captureEvent("race_opponent_searched", {
        query_length: query.length,
        result_count: results.length,
      });
      return results;
    } catch (error) {
      console.error("Failed to search opponents:", error);
      return MOCK_SHADOW_OPPONENTS.filter((s) =>
        s.username.toLowerCase().includes(query.toLowerCase()),
      ).map((s) => ({
        uid: s.uid,
        username: s.username,
        profileImageUrl: resolveStepRaceOpponentAvatarUrl(s.uid, s.profileImageUrl),
        bestStepCount: s.shadowData?.bestStepCount || 200,
        bestPaceSeconds: s.shadowData?.bestPaceSeconds || 600,
        isOnline: true,
        lastActiveDate: new Date().toISOString(),
      }));
    }
  },

  /**
   * Synchronous warm opponents for 0ms initial render
   */
  getInitialShadowOpponents(knownWins?: number): StepRaceOpponent[] {
    const wins = knownWins ?? cachedWinsCount ?? 0;
    if (wins < 3) {
      return MOCK_SHADOW_OPPONENTS.filter((o) => o.uid.startsWith("bot_"));
    }
    if (inMemoryCachedOpponents && inMemoryCachedOpponents.length > 0) {
      return inMemoryCachedOpponents;
    }
    return MOCK_SHADOW_OPPONENTS.slice(0, 8);
  },

  /**
   * Get random shadow opponents with multi-layer caching (0ms warm, SWR)
   */
  async getRandomShadowOpponents(
    count: number = 8,
    knownWins?: number,
  ): Promise<StepRaceOpponent[]> {
    const userWins = knownWins !== undefined ? knownWins : await this.getUserWinsCount();
    // If user has won fewer than 3 races, return ONLY the 3 starting bots
    if (userWins < 3) {
      return MOCK_SHADOW_OPPONENTS.filter((o) => o.uid.startsWith("bot_"));
    }

    if (useMockData) {
      return MOCK_SHADOW_OPPONENTS.slice(0, count);
    }

    if (inMemoryCachedOpponents && inMemoryCachedOpponents.length > 0) {
      void this.refreshShadowOpponentsInBackground(count);
      return inMemoryCachedOpponents.slice(0, count);
    }

    try {
      const stored = await AsyncStorage.getItem(STEP_RACE_SUGGESTIONS_CACHE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StepRaceOpponent[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemoryCachedOpponents = parsed;
          void this.refreshShadowOpponentsInBackground(count);
          return parsed.slice(0, count);
        }
      }
    } catch {
      // ignore
    }

    return this.refreshShadowOpponents(count);
  },

  /**
   * Network fetch for fresh shadow opponents + cache persistence
   */
  async refreshShadowOpponents(count: number = 8): Promise<StepRaceOpponent[]> {
    try {
      const { data } = await apiClient.get<Record<string, unknown>[]>(
        `/api/step-race/shadows?count=${count}`,
      );
      const parsed = (data ?? []).map((item) => this.parseShadowOpponent(item));
      if (parsed.length > 0) {
        inMemoryCachedOpponents = parsed;
        void AsyncStorage.setItem(STEP_RACE_SUGGESTIONS_CACHE_KEY, JSON.stringify(parsed));
        return parsed.slice(0, count);
      }
    } catch (error) {
      console.error("Failed to fetch random shadow opponents:", error);
    }

    const fallback = MOCK_SHADOW_OPPONENTS.slice(0, count);
    inMemoryCachedOpponents = fallback;
    return fallback;
  },

  /**
   * Background cache revalidation
   */
  async refreshShadowOpponentsInBackground(count: number = 8): Promise<void> {
    try {
      const { data } = await apiClient.get<Record<string, unknown>[]>(
        `/api/step-race/shadows?count=${count}`,
      );
      const parsed = (data ?? []).map((item) => this.parseShadowOpponent(item));
      if (parsed.length > 0) {
        inMemoryCachedOpponents = parsed;
        void AsyncStorage.setItem(STEP_RACE_SUGGESTIONS_CACHE_KEY, JSON.stringify(parsed));
      }
    } catch {
      // Silent in background
    }
  },

  /**
   * Create a new step race
   */
  async createStepRace(request: CreateStepRaceRequest): Promise<StepRace | null> {
    if (useMockData) {
      // Return mock race for testing
      const opponent =
        MOCK_SHADOW_OPPONENTS.find((o) => o.uid === request.opponentUid) ||
        MOCK_SHADOW_OPPONENTS[0];
      const now = new Date();
      const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const race: StepRace = {
        raceId: `race_${Date.now()}`,
        userId: "current_user",
        opponent,
        userSteps: 500, // Start with some steps for testing
        opponentSteps: opponent.currentSteps,
        status: "active",
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        duration: 24,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      // Store the race for retrieval
      const withStart =
        race.startSteps && race.startSteps > 0
          ? race
          : { ...race, startSteps: request.startSteps ?? 0 };
      mockActiveRace = withStart;
      void import("./stepRaceSync.service").then((m) => {
        m.rememberActiveRace(withStart, request.startSteps ?? 0);
      });
      void import("./stepRaceLiveNotification.service").then((m) =>
        m.syncStepRaceLiveNotification({ race: withStart, todaySteps: request.startSteps ?? 0 }),
      );
      return withStart;
    }

    try {
      const { data } = await apiClient.post<Record<string, unknown>>(
        "/api/step-race/create",
        request,
      );
      const parsed = this.parseStepRace(data);
      const withStart: typeof parsed =
        parsed.startSteps && parsed.startSteps > 0
          ? parsed
          : {
            ...parsed,
            startSteps:
              request.startSteps !== undefined && request.startSteps > 0
                ? request.startSteps
                : parsed.startSteps,
          };
      if (withStart.status === "active") {
        mockActiveRace = withStart;
      }
      void import("./stepRaceSync.service").then((m) => {
        m.rememberActiveRace(
          withStart.status === "active" ? withStart : null,
          request.startSteps ?? 0,
        );
      });
      void import("./stepRaceLiveNotification.service").then((m) =>
        m.syncStepRaceLiveNotification({
          race: withStart.status === "active" ? withStart : null,
          todaySteps: request.startSteps ?? 0,
        }),
      );
      captureEvent("race_created", {
        opponent_type: request.opponentType === "shadow" ? "shadow" : "friend",
        is_rematch: Boolean((request as any).isRematch),
        duration: request.duration || 24,
      });
      return withStart;
    } catch (error) {
      console.error("Failed to create step race via API, attempting shadow fallback:", error);
      const shadowOpponent = MOCK_SHADOW_OPPONENTS.find((o) => o.uid === request.opponentUid);
      if (
        shadowOpponent ||
        request.opponentType === "shadow" ||
        request.opponentUid?.startsWith("bot_") ||
        request.opponentUid?.startsWith("athlete_")
      ) {
        const opponent = shadowOpponent || {
          uid: request.opponentUid || "bot_roshni",
          username: "Runner Opponent",
          type: "shadow" as const,
          currentSteps: 1000,
          shadowData: {
            uid: request.opponentUid || "bot_roshni",
            username: "Runner Opponent",
            bestStepCount: 1000,
            originalBestStepCount: 1000,
            bestPaceSeconds: 1000,
            lastActiveDate: new Date().toISOString(),
            decayRate: 0.05,
            isOnline: true,
          },
        };
        const now = new Date();
        const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const fallbackRace: StepRace = {
          raceId: `race_${Date.now()}`,
          userId: request.userId || "current_user",
          opponent,
          userSteps: 0,
          opponentSteps: opponent.currentSteps,
          status: "active",
          startTime: now.toISOString(),
          endTime: endTime.toISOString(),
          duration: 24,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
          startSteps: request.startSteps ?? 0,
        };
        mockActiveRace = fallbackRace;
        void import("./stepRaceSync.service").then((m) => {
          m.rememberActiveRace(fallbackRace, request.startSteps ?? 0);
        });
        void import("./stepRaceLiveNotification.service").then((m) =>
          m.syncStepRaceLiveNotification({
            race: fallbackRace,
            todaySteps: request.startSteps ?? 0,
          }),
        );
        return fallbackRace;
      }
      return null;
    }
  },

  /**
   * Get current active race
   */
  async getActiveRace(userId: string): Promise<StepRace | null> {
    if (useMockData) {
      // Return stored mock race for testing
      return mockActiveRace;
    }

    try {
      const response = await apiClient.get<Record<string, unknown>>(
        `/api/step-race/active/${userId}`,
        { validateStatus: (status) => (status >= 200 && status < 300) || status === 404 },
      );
      if (
        response.status === 404 ||
        !response.data ||
        (response.data as { error?: string }).error
      ) {
        mockActiveRace = null;
        void import("./stepRaceSync.service").then((m) => m.clearActiveRaceSyncCache());
        return null;
      }
      const data = response.data;
      const parsed = this.parseStepRace(data);
      if (parsed.status === "active" && parsed.raceId) {
        // Preserve immutable startSteps from in-memory race if API omits it.
        const withStart =
          parsed.startSteps && parsed.startSteps > 0
            ? parsed
            : mockActiveRace?.raceId === parsed.raceId &&
              mockActiveRace.startSteps &&
              mockActiveRace.startSteps > 0
              ? { ...parsed, startSteps: mockActiveRace.startSteps }
              : parsed;
        mockActiveRace = withStart;
        void import("./stepRaceSync.service").then((m) => {
          m.rememberActiveRace(withStart, withStart.startSteps ?? 0);
        });
        return withStart;
      }
      mockActiveRace = null;
      void import("./stepRaceSync.service").then((m) => m.clearActiveRaceSyncCache());
      return null;
    } catch {
      mockActiveRace = null;
      void import("./stepRaceSync.service").then((m) => m.clearActiveRaceSyncCache());
      return null;
    }
  },

  /**
   * Update race progress with current steps.
   * Server may auto-complete the race when target steps are reached.
   */
  async updateRaceProgress(
    request: UpdateStepRaceRequest,
  ): Promise<
    | { status: "ok" }
    | { status: "completed"; race: StepRace }
    | { status: "not_active" }
    | { status: "error" }
  > {
    if (useMockData) {
      // Mock update for testing - also simulate opponent progress
      if (mockActiveRace) {
        mockActiveRace.userSteps = request.userSteps;
        // Simulate opponent gaining steps slowly
        mockActiveRace.opponentSteps += Math.floor(Math.random() * 10);
        mockActiveRace.updatedAt = new Date().toISOString();
      }
      return { status: "ok" };
    }

    try {
      const { data } = await apiClient.post<{
        success?: boolean;
        race?: Record<string, unknown>;
      }>("/api/step-race/update", request);
      const parsed = data?.race ? this.parseStepRace(data.race) : null;
      if (parsed?.status === "completed") {
        mockActiveRace = null;
        void import("./stepRaceLiveNotification.service").then((m) =>
          m.clearStepRaceLiveNotification(),
        );
        void import("./stepRaceSync.service").then((m) => m.markRaceCompleted(request.raceId));
        return { status: "completed", race: parsed };
      }
      return { status: "ok" };
    } catch (error) {
      const axiosErr = error as { response?: { status?: number; data?: { error?: string } } };
      const isNotActive =
        axiosErr?.response?.status === 400 &&
        axiosErr?.response?.data?.error === "Race is not active";
      if (isNotActive) {
        mockActiveRace = null;
        return { status: "not_active" };
      }
      console.error("Failed to update race progress:", error);
      return { status: "error" };
    }
  },

  /**
   * Complete a race (called when race duration ends)
   */
  async completeRace(
    raceId: string,
    userSteps?: number,
    userTimeSeconds?: number,
  ): Promise<StepRace | null> {
    if (useMockData) {
      // Mock completion for testing - clear the stored race
      const completedRace = mockActiveRace;
      mockActiveRace = null;
      void import("./stepRaceLiveNotification.service").then((m) =>
        m.clearStepRaceLiveNotification(),
      );
      void import("./stepRaceSync.service").then((m) => m.markRaceCompleted(raceId));
      return completedRace;
    }

    try {
      const { data } = await apiClient.post<Record<string, unknown>>("/api/step-race/complete", {
        raceId,
        userSteps,
        userTimeSeconds,
      });
      mockActiveRace = null;
      void import("./stepRaceLiveNotification.service").then((m) =>
        m.clearStepRaceLiveNotification(),
      );
      void import("./stepRaceSync.service").then((m) => m.markRaceCompleted(raceId));
      return this.parseStepRace(data);
    } catch (error) {
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr?.response?.status === 404) {
        mockActiveRace = null;
        void import("./stepRaceLiveNotification.service").then((m) =>
          m.clearStepRaceLiveNotification(),
        );
        void import("./stepRaceSync.service").then((m) => m.markRaceCompleted(raceId));
        return null;
      }
      console.error("Failed to complete race:", error);
      return null;
    }
  },

  /**
   * Get rivalry history against specific opponent
   */
  async getRivalryHistory(
    opponentUid: string,
  ): Promise<{ wins: number; losses: number; history: ("win" | "loss")[] }> {
    if (useMockData) {
      return { wins: 4, losses: 3, history: ["win", "win", "win", "loss", "loss", "win", "loss"] };
    }

    try {
      const { data } = await apiClient.get<{
        wins: number;
        losses: number;
        history: ("win" | "loss")[];
      }>(`/api/step-race/rivalry?opponentUid=${encodeURIComponent(opponentUid)}`);
      return {
        wins: data?.wins ?? 0,
        losses: data?.losses ?? 0,
        history: data?.history ?? [],
      };
    } catch (error) {
      console.error("Failed to fetch rivalry history:", error);
      return { wins: 0, losses: 0, history: [] };
    }
  },

  /**
   * Get match history for My Races screen (real user history only)
   */
  async getMatchHistory(userId: string): Promise<
    {
      id: string;
      opponentUid: string;
      opponentName: string;
      opponentAvatar?: string;
      isWin: boolean;
      stepDiff: number;
      completedAt: string;
      finalPace?: string;
      paceDiff?: string;
      paceSeconds?: number;
    }[]
  > {
    try {
      const { data } = await apiClient.get<
        {
          id: string;
          opponentUid: string;
          opponentName: string;
          opponentAvatar?: string;
          isWin: boolean;
          stepDiff: number;
          completedAt: string;
          finalPace?: string;
          paceDiff?: string;
          paceSeconds?: number;
        }[]
      >(`/api/step-race/history/${userId}`);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {
      // ignore
    }

    try {
      const raw = await AsyncStorage.getItem("stron_step_race_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }

    return [];
  },

  /**
   * Save a completed match to local history
   */
  async saveMatchHistory(match: {
    id: string;
    opponentUid: string;
    opponentName: string;
    opponentAvatar?: string;
    isWin: boolean;
    stepDiff: number;
    completedAt: string;
    finalPace?: string;
    paceDiff?: string;
    paceSeconds?: number;
  }): Promise<void> {
    try {
      const existing = await this.getMatchHistory("local");
      // Prevent duplicates
      const filtered = existing.filter((m) => m.id !== match.id);
      const updated = [match, ...filtered];
      await AsyncStorage.setItem("stron_step_race_history", JSON.stringify(updated));
    } catch {
      // ignore
    }
  },

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 10): Promise<StepRaceLeaderboard[]> {
    if (useMockData) {
      // Return mock leaderboard for testing
      return [
        {
          uid: "user_1",
          username: "ChampionRunner",
          profileImageUrl: undefined,
          totalWins: 45,
          currentStreak: 8,
          bestStepCount: 25000,
        },
        {
          uid: "user_2",
          username: "SpeedDemon",
          profileImageUrl: undefined,
          totalWins: 38,
          currentStreak: 3,
          bestStepCount: 22000,
        },
      ];
    }

    try {
      const { data } = await apiClient.get<Record<string, unknown>[]>(
        `/api/step-race/leaderboard?limit=${limit}`,
      );
      return (data ?? []).map((item) => ({
        uid: (item.uid as string) ?? "",
        username: (item.username as string) ?? "",
        profileImageUrl: (item.profileImageUrl as string) ?? undefined,
        totalWins: (item.totalWins as number) ?? 0,
        currentStreak: (item.currentStreak as number) ?? 0,
        bestStepCount: (item.bestStepCount as number) ?? 0,
      }));
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
      return [];
    }
  },

  /**
   * Clear active race (for testing purposes)
   */
  clearActiveRace(): void {
    mockActiveRace = null;
  },

  /**
   * Parse step race from API response
   */
  parseStepRace(data: Record<string, unknown>): StepRace {
    const opponent = data.opponent as Record<string, unknown> | undefined;

    return {
      raceId: (data.raceId as string) ?? "",
      userId: (data.userId as string) ?? "",
      opponent: opponent ? this.parseOpponent(opponent) : this.createDefaultOpponent(),
      targetSteps: (data.targetSteps as number) ?? 1000,
      opponentPaceSeconds:
        (data.opponentPaceSeconds as number) ||
        (data.opponent as any)?.shadowData?.bestPaceSeconds ||
        600,
      userTimeSeconds: (data.userTimeSeconds as number) ?? undefined,
      startSteps: (data.startSteps as number) ?? undefined,
      userSteps: (data.userSteps as number) ?? 0,
      opponentSteps: (data.opponentSteps as number) ?? 0,
      status: (data.status as StepRace["status"]) ?? "lobby",
      startTime: (data.startTime as string) ?? new Date().toISOString(),
      endTime: (data.endTime as string) ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration: (data.duration as number) ?? 24,
      winner: (data.winner as StepRace["winner"]) ?? undefined,
      createdAt: (data.createdAt as string) ?? new Date().toISOString(),
      updatedAt: (data.updatedAt as string) ?? new Date().toISOString(),
    };
  },

  /**
   * Parse opponent from API response
   */
  parseOpponent(data: Record<string, unknown>): StepRaceOpponent {
    const shadowData = data.shadowData as Record<string, unknown> | undefined;
    const mockMatch = MOCK_SHADOW_OPPONENTS.find((m) => m.uid === data.uid);

    return {
      uid: (data.uid as string) ?? "",
      username: (data.username as string) ?? "Unknown",
      profileImageUrl: resolveStepRaceOpponentAvatarUrl(
        data.uid as string,
        (data.profileImageUrl as string) ?? mockMatch?.profileImageUrl,
      ),
      profession: (data.profession as string) ?? mockMatch?.profession,
      bio: (data.bio as string) ?? mockMatch?.bio,
      type: (data.type as StepRaceOpponent["type"]) ?? "shadow",
      currentSteps: (data.currentSteps as number) ?? 0,
      shadowData: shadowData ? this.parseShadowData(shadowData) : undefined,
    };
  },

  /**
   * Parse shadow opponent from API response
   */
  parseShadowOpponent(data: Record<string, unknown>): StepRaceOpponent {
    const mockMatch = MOCK_SHADOW_OPPONENTS.find((m) => m.uid === (data.uid as string));
    const shadowData = {
      uid: (data.uid as string) ?? "",
      username: (data.username as string) ?? "Unknown",
      profileImageUrl: resolveStepRaceOpponentAvatarUrl(
        data.uid as string,
        (data.profileImageUrl as string) ?? mockMatch?.profileImageUrl,
      ),
      profession: (data.profession as string) ?? mockMatch?.profession,
      bio: (data.bio as string) ?? mockMatch?.bio,
      bestStepCount: (data.bestStepCount as number) ?? 0,
      originalBestStepCount:
        (data.originalBestStepCount as number) ?? (data.bestStepCount as number) ?? 0,
      bestPaceSeconds: (data.bestPaceSeconds as number) ?? 600,
      lastActiveDate: (data.lastActiveDate as string) ?? new Date().toISOString(),
      decayRate: (data.decayRate as number) ?? 0.1,
      isOnline: (data.isOnline as boolean) ?? false,
    };

    // Calculate current decayed steps
    const currentSteps = calculateDecayedSteps(
      shadowData.bestStepCount,
      shadowData.lastActiveDate,
      shadowData.decayRate,
    );

    return {
      uid: shadowData.uid,
      username: shadowData.username,
      profileImageUrl: shadowData.profileImageUrl,
      profession: shadowData.profession,
      bio: shadowData.bio,
      type: "shadow",
      currentSteps,
      shadowData,
    };
  },

  /**
   * Parse shadow data from API response
   */
  parseShadowData(data: Record<string, unknown>): NonNullable<StepRaceOpponent["shadowData"]> {
    const mockMatch = MOCK_SHADOW_OPPONENTS.find((m) => m.uid === (data.uid as string));
    return {
      uid: (data.uid as string) ?? "",
      username: (data.username as string) ?? "Unknown",
      profileImageUrl: resolveStepRaceOpponentAvatarUrl(
        data.uid as string,
        (data.profileImageUrl as string) ?? mockMatch?.profileImageUrl,
      ),
      profession: (data.profession as string) ?? mockMatch?.profession,
      bio: (data.bio as string) ?? mockMatch?.bio,
      bestStepCount: (data.bestStepCount as number) ?? 0,
      originalBestStepCount: (data.originalBestStepCount as number) ?? 0,
      bestPaceSeconds: (data.bestPaceSeconds as number) ?? 600,
      lastActiveDate: (data.lastActiveDate as string) ?? new Date().toISOString(),
      decayRate: (data.decayRate as number) ?? 0.1,
      isOnline: (data.isOnline as boolean) ?? false,
    };
  },

  /**
   * Create default opponent for fallback
   */
  createDefaultOpponent(): StepRaceOpponent {
    return {
      uid: "",
      username: "Unknown",
      type: "shadow",
      currentSteps: 0,
    };
  },

  /**
   * Get total step race wins count (cumulative lifetime wins)
   */
  async getUserWinsCount(userId?: string): Promise<number> {
    if (cachedWinsCount !== null) return cachedWinsCount;

    let counterWins = 0;
    let historyWins = 0;

    try {
      const val = await AsyncStorage.getItem(STEP_RACE_WINS_STORAGE_KEY);
      if (val) counterWins = parseInt(val, 10) || 0;
    } catch {
      // ignore
    }

    try {
      const raw = await AsyncStorage.getItem("stron_step_race_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          historyWins = parsed.filter((m) => m && m.isWin).length;
        }
      }
    } catch {
      // ignore
    }

    const localWins = Math.max(counterWins, historyWins);
    if (localWins > 0) {
      cachedWinsCount = localWins;
      return localWins;
    }

    let statsWins = 0;
    try {
      const targetUid = userId || "current_user";
      const stats = await this.getStepRaceStats(targetUid);
      if (stats && typeof stats.wins === "number") {
        statsWins = stats.wins;
      }
    } catch {
      // ignore
    }

    const finalWins = Math.max(localWins, statsWins);
    cachedWinsCount = finalWins;
    return finalWins;
  },

  /**
   * Increment total step race wins count
   */
  async incrementUserWinsCount(): Promise<number> {
    try {
      const current = await this.getUserWinsCount();
      const next = current + 1;
      cachedWinsCount = next;
      await AsyncStorage.setItem(STEP_RACE_WINS_STORAGE_KEY, String(next));
      return next;
    } catch {
      return 1;
    }
  },
};
