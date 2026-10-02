/**
 * Strip a leading +91 from a phone string (aggregation-safe helper input).
 */
const stripIndiaPrefixExpr = (fieldExpr: string) => ({
  $replaceOne: {
    input: { $ifNull: [fieldExpr, ""] },
    find: "+91",
    replacement: "",
  },
});

/**
 * MongoDB $expr branch: true when user.contactNo matches a member phone in any
 * common Indian format (exact, +91-prefixed, or 10-digit digits-only).
 */
export const buildContactNoMemberPhoneMatchExpr = (
  contactNoField = "$contactNo",
  memberPhoneVar = "$$mPhone",
) => ({
  $or: [
    { $eq: [contactNoField, memberPhoneVar] },
    {
      $eq: [
        contactNoField,
        { $concat: ["+91", stripIndiaPrefixExpr(memberPhoneVar)] },
      ],
    },
    {
      $eq: [
        { $concat: ["+91", stripIndiaPrefixExpr(contactNoField)] },
        memberPhoneVar,
      ],
    },
    {
      $eq: [
        stripIndiaPrefixExpr(contactNoField),
        stripIndiaPrefixExpr(memberPhoneVar),
      ],
    },
  ],
});

/** JS equivalent for unit tests and non-aggregation callers. */
export const indianPhonesEquivalent = (left: unknown, right: unknown) => {
  const strip = (value: unknown) => String(value ?? "").trim().replace(/^\+91/, "");
  const a = strip(left);
  const b = strip(right);
  if (!a || !b) return false;
  if (left === right) return true;
  if (a === b) return true;
  if (`+91${a}` === String(right).trim()) return true;
  if (`+91${b}` === String(left).trim()) return true;
  return false;
};
