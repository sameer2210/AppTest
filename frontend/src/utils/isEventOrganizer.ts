export const isEventOrganizer = (
  user:
    | {
        uid?: string | null;
        id?: string | null;
        phoneNumber?: string | null;
        contactNo?: string | null;
      }
    | null
    | undefined,
  organizerUid?: string | null,
): boolean => {
  if (!user || !organizerUid) return false;
  const target = String(organizerUid).trim().toLowerCase();
  if (!target) return false;

  const uUid = user.uid ? String(user.uid).trim().toLowerCase() : "";
  const uId = user.id ? String(user.id).trim().toLowerCase() : "";
  const uPhone = user.phoneNumber ? String(user.phoneNumber).trim().toLowerCase() : "";
  const uContact = user.contactNo ? String(user.contactNo).trim().toLowerCase() : "";

  return (
    (uUid.length > 0 && uUid === target) ||
    (uId.length > 0 && uId === target) ||
    (uPhone.length > 0 && uPhone === target) ||
    (uContact.length > 0 && uContact === target)
  );
};
