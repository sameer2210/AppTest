import { UniversalCheckin, getISTDateString, type IUniversalCheckin } from "../../gym-business/index.js";
import { getErrorMessage, isMongoDuplicateKeyError } from "../../../types/mongo.util.js";
import type { ServiceParams } from "../../../types/service.util.js";
import { codedError } from "../../../utils/stronHttpError.util.js";

/**
 * Generic / non-gym station QR → UniversalCheckin ledger.
 * Gym business ObjectIds are handled by the Attendance path in scanConnectQr.
 */
export const checkInWithStationQr = async ({
  scannerUid,
  findLiveUser,
  rotateConnectCode,
  recordConnectScan,
  entityType = "general",
  entityId,
  entityName = "STRON Station",
  rawPayload,
}: ServiceParams) => {
  const today = getISTDateString();
  const checkinDoc = {
    uid: scannerUid,
    entityType,
    entityId,
    entityName,
    checkedInDate: today,
    checkedInAt: new Date(),
  };

  const [scanner, created] = await Promise.all([
    findLiveUser(scannerUid),
    UniversalCheckin.create(checkinDoc).catch((err: unknown): null => {
      if (isMongoDuplicateKeyError(err)) return null;
      throw err;
    }),
  ]);

  if (!scanner) throw codedError("user_not_found", "User not found.");

  if (!created) {
    const existing = await UniversalCheckin.findOne({
      uid: scannerUid,
      entityType,
      entityId,
      checkedInDate: today,
    })
      .select("entityName checkedInAt")
      .lean();
    return {
      kind: "station_check_in",
      alreadyCheckedIn: true,
      entityType,
      entityId,
      entityName: existing?.entityName || entityName,
      checkedInAt: existing?.checkedInAt,
      message: `Already checked into ${existing?.entityName || entityName} today.`,
    };
  }

  await Promise.all([
    recordConnectScan({ scannerUid, kind: "station_check_in", rawPayload }),
    rotateConnectCode(scanner),
  ]);

  return {
    kind: "station_check_in",
    alreadyCheckedIn: false,
    entityType,
    entityId,
    entityName,
    checkedInAt: created.checkedInAt,
    message: `Checked into ${entityName} successfully!`,
  };
};

export default { checkInWithStationQr };
