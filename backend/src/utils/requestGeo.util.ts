import type { Request } from "express";
import type { ServiceParams } from "../types/service.util.js";
import { logger } from "./logger.util.js";

const COUNTRY_CODE_HEADER_CANDIDATES = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-geo-country-code",
];

const REQUEST_IP_HEADER_CANDIDATES = [
  "cf-connecting-ip",
  "x-real-ip",
  "x-forwarded-for",
];

type CountryCacheEntry = { countryCode: string; expiresAt: number };

const countryCache = new Map<string, CountryCacheEntry>();
const COUNTRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const normalizeCountryCode = (value: unknown = "") => {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
};

const normalizeIp = (value: unknown = "") => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const first = raw.split(",")[0].trim();
  if (!first) return null;
  return first.replace(/^::ffff:/i, "").replace(/^\[(.*)\]$/, "$1");
};

const isPrivateOrLocalIp = (ip = "") => {
  const normalized = String(ip || "").trim().toLowerCase();
  if (!normalized) return true;

  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)
  );
};

const fetchJsonWithTimeout = async (url: string, timeoutMs = 1800) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "StepWars/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (_) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const lookupCountryByIp = async (ip: string) => {
  const cached = countryCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) {
    logger.debug("[GEO] IP lookup cache hit:", { ip, countryCode: cached.countryCode });
    return cached.countryCode;
  }

  const sources = [
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`,
    `https://ipwho.is/${encodeURIComponent(ip)}`,
  ];

  for (const url of sources) {
    logger.debug("[GEO] Attempting IP lookup:", { ip, url });
    const data = (await fetchJsonWithTimeout(url)) as ServiceParams | null;
    logger.debug("[GEO] IP lookup response:", { ip, url, data });
    const countryCode = normalizeCountryCode(
      data?.country_code || data?.countryCode || data?.country || "",
    );

    if (countryCode) {
      countryCache.set(ip, {
        countryCode,
        expiresAt: Date.now() + COUNTRY_CACHE_TTL_MS,
      });
      logger.debug("[GEO] IP lookup success:", { ip, countryCode });
      return countryCode;
    }
  }

  logger.debug("[GEO] IP lookup failed for all sources:", { ip });
  return null;
};

export const extractClientIp = (req: Request) => {
  for (const headerName of REQUEST_IP_HEADER_CANDIDATES) {
    const ip = normalizeIp(req?.headers?.[headerName]);
    if (ip) return ip;
  }

  const socketIp = normalizeIp(req?.socket?.remoteAddress);
  if (socketIp) return socketIp;

  return normalizeIp(req?.ip);
};

export const resolveRequestCountryCode = async (req: Request) => {
  const debugInfo = {
    headers: {} as Record<string, unknown>,
    ip: null as string | null,
    lookupResult: null as string | null,
  };

  // Check header candidates
  for (const headerName of COUNTRY_CODE_HEADER_CANDIDATES) {
    const headerValue = req?.headers?.[headerName];
    (debugInfo.headers as Record<string, unknown>)[headerName] = headerValue;
    const countryCode = normalizeCountryCode(headerValue);
    if (countryCode) {
      logger.debug("[GEO] Country detected from header:", {
        header: headerName,
        value: headerValue,
        countryCode,
      });
      return { countryCode, source: `header:${headerName}` };
    }
  }

  // Extract IP
  const ip = extractClientIp(req);
  debugInfo.ip = ip;

  logger.debug("[GEO] IP extraction result:", {
    ip,
    isPrivateOrLocal: isPrivateOrLocalIp(ip ?? undefined),
    requestIpHeaders: {
      "cf-connecting-ip": req?.headers?.["cf-connecting-ip"],
      "x-real-ip": req?.headers?.["x-real-ip"],
      "x-forwarded-for": req?.headers?.["x-forwarded-for"],
    },
    requestIp: req?.ip,
    socketRemoteAddress: req?.socket?.remoteAddress,
  });

  if (!ip || isPrivateOrLocalIp(ip)) {
    logger.debug("[GEO] IP is null or private/local, skipping lookup:", { ip });
    return { countryCode: null, source: null, ip };
  }

  const countryCode = await lookupCountryByIp(ip);
  debugInfo.lookupResult = countryCode;

  logger.debug("[GEO] IP lookup result:", {
    ip,
    countryCode,
  });

  return {
    countryCode,
    source: countryCode ? "ip-lookup" : null,
    ip,
  };
};

export const isIndiaCountryCode = (value: unknown) => normalizeCountryCode(value) === "IN";

export default {
  extractClientIp,
  resolveRequestCountryCode,
  isIndiaCountryCode,
};
