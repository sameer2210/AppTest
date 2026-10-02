import { admin } from "./firebase.js";

type RemoteConfigCache = Record<string, string>;

type MultiplierCosts = {
  "1_5x": number;
  "2x": number;
  "3x": number;
};

type MysteryBoxCosts = {
  bronze: number;
  silver: number;
  gold: number;
};

let configCache: RemoteConfigCache = {};

const defaultMultiplierCosts: MultiplierCosts = {
  "1_5x": 100,
  "2x": 200,
  "3x": 300,
};

const defaultMysteryBoxCosts: MysteryBoxCosts = {
  bronze: 1000,
  silver: 5000,
  gold: 10000,
};

const readParameterValue = (
  parameters: admin.remoteConfig.RemoteConfigTemplate["parameters"],
  key: string,
): string | undefined => {
  const param = parameters[key];
  const defaultValue = param?.defaultValue;
  if (!defaultValue || !("value" in defaultValue)) return undefined;
  return String(defaultValue.value ?? "");
};

export const getWinSteps = (): number => {
  const winSteps = parseInt(configCache["win_steps"] ?? "", 10);
  if (Number.isNaN(winSteps) || winSteps <= 0) {
    return 1000;
  }
  return winSteps;
};

const fetchAndCacheConfig = async (isInitial = false): Promise<void> => {
  try {
    const remoteConfig = admin.remoteConfig();
    const template = await remoteConfig.getTemplate();
    const newCache: RemoteConfigCache = {};

    for (const key of Object.keys(template.parameters)) {
      const value = readParameterValue(template.parameters, key);
      if (value !== undefined) {
        newCache[key] = value;
      }
    }

    configCache = newCache;

    if (isInitial) {
      console.log("✅ Remote Config fetched and cached on startup.");
    } else {
      console.log("🔄 Remote Config cache REFRESHED on demand.");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `❌ Failed to ${isInitial ? "init" : "refresh"} Remote Config:`,
      message,
    );
    if (isInitial) {
      console.log("Falling back to default multiplier costs.");
    }
  }
};

export const initializeRemoteConfig = async (): Promise<void> => {
  await fetchAndCacheConfig(true);
};

export const refreshRemoteConfig = async (): Promise<void> => {
  console.log(
    "[Remote Config] Manual refresh signal received. Fetching config...",
  );
  await fetchAndCacheConfig(false);
};

export const getMultiplierCosts = (): MultiplierCosts => {
  const price1_5x = parseInt(configCache["multiplier_1_5x_price"] ?? "", 10);
  const price2x = parseInt(configCache["multiplier_2x_price"] ?? "", 10);
  const price3x = parseInt(configCache["multiplier_3x_price"] ?? "", 10);

  if (Number.isNaN(price1_5x) || Number.isNaN(price2x) || Number.isNaN(price3x)) {
    return defaultMultiplierCosts;
  }

  return {
    "1_5x": price1_5x,
    "2x": price2x,
    "3x": price3x,
  };
};

export const getMysteryBoxCosts = (): MysteryBoxCosts => {
  const bronze = parseInt(configCache["bronze_box_price"] ?? "", 10);
  const silver = parseInt(configCache["silver_box_price"] ?? "", 10);
  const gold = parseInt(configCache["gold_box_price"] ?? "", 10);

  if (Number.isNaN(bronze) || Number.isNaN(silver) || Number.isNaN(gold)) {
    return defaultMysteryBoxCosts;
  }

  return { bronze, silver, gold };
};

export const getAdminEmails = (): string[] => {
  const adminEmailsString = configCache["admin_emails"] ?? "";
  if (!adminEmailsString || typeof adminEmailsString !== "string") {
    return [];
  }
  return adminEmailsString
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
};

export const isUserAdmin = (userEmail: string | null | undefined): boolean => {
  if (!userEmail) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(userEmail.toLowerCase());
};
