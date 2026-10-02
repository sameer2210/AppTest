import { ConnectQrService } from "@/services/stron/connectQr.service";
import { ConnectCheckInCatalogStore } from "@/services/stron/connectCheckInCatalog.store";

export const ConnectApi = {
  qr: ConnectQrService,
  catalog: ConnectCheckInCatalogStore,
};

export { ConnectQrService, ConnectCheckInCatalogStore };
export type { ConnectScanItem } from "@/services/stron/connectQr.service";
export type { ConnectCheckInPlan, ConnectCheckInCatalog } from "@/services/stron/connectCheckInCatalog.store";
export type { ConnectQrMe } from "@/services/stron/connectQr.service";
export default ConnectApi;
