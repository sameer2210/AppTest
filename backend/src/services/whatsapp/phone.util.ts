const IN_COUNTRY_CODE = "91";

/** Normalize an India phone to digits-only E.164 without plus: 91XXXXXXXXXX. */
export const toWhatsappE164 = (raw: string | null | undefined): string | null => {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;
  if (local.startsWith("0") && local.length === 11) {
    local = local.slice(1);
  }
  if (local.startsWith(IN_COUNTRY_CODE) && local.length === 12) {
    local = local.slice(2);
  }
  if (local.length !== 10) return null;
  if (!/^[6-9]/.test(local)) return null;
  return `${IN_COUNTRY_CODE}${local}`;
};
