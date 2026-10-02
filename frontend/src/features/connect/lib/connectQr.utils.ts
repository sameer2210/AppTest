/**
 * Connect-with-Stron QR helpers (user identity display + payload builders).
 */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const ALPHABET_LEN = ALPHABET.length;

const hashUid = (uid: string): number => {
  let hash = 2166136261;
  const len = uid.length;
  for (let i = 0; i < len; i += 1) {
    hash ^= uid.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/** Human-readable 5-digit uppercase alphanumeric code shown under the QR (e.g. A7X9K). */
export const buildConnectDisplayCode = (uid: string): string => {
  const clean = uid.trim();
  if (!clean) return "─────";

  const baseHash = hashUid(clean);
  let n = baseHash;
  let code = "";

  for (let i = 0; i < 5; i += 1) {
    code += ALPHABET[n % ALPHABET_LEN];
    n = Math.floor(n / ALPHABET_LEN) ^ (hashUid(clean + i) % 997);
  }

  return code;
};

/** Payload encoded in the QR — stable user identity (no rotating code). */
export const buildConnectQrPayload = (uid: string): string => {
  const clean = uid.trim();
  return clean ? JSON.stringify({ t: "user", uid: clean }) : "";
};

export const parseConnectQrPayload = (raw: string): { uid: string } | null => {
  const value = raw.trim();
  if (!value) return null;

  // Fast path 1: JSON payload
  if (value.charCodeAt(0) === 123 /* '{' */) {
    try {
      const parsed = JSON.parse(value) as { type?: string; uid?: string };
      if (parsed?.uid) return { uid: String(parsed.uid) };
    } catch {
      // not JSON
    }
  }

  // Fast path 2: direct stron:// protocol
  if (value.startsWith("stron://user/")) {
    const rawUid = value.substring(13).split(/[/?#]/)[0];
    if (rawUid) {
      try {
        return { uid: decodeURIComponent(rawUid) };
      } catch {
        return { uid: rawUid };
      }
    }
  }

  // Fast path 3: HTTP user link
  if (value.toLowerCase().startsWith("http")) {
    const match = value.match(/^https?:\/\/[^/]+\/user\/([^/?#]+)/i);
    if (match?.[1]) {
      try {
        return { uid: decodeURIComponent(match[1]) };
      } catch {
        return { uid: match[1] };
      }
    }
  }

  const len = value.length;

  // 5-character alphanumeric code
  if (len === 5 && /^[A-Za-z0-9]{5}$/.test(value)) {
    return { uid: value.toUpperCase() };
  }

  // Plain Firebase-style uid (16 to 128 chars)
  if (len >= 16 && len <= 128 && /^[A-Za-z0-9_-]+$/.test(value)) {
    return { uid: value };
  }

  return null;
};
