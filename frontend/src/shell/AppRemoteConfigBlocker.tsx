import { useCallback, useEffect, useState } from "react";
import MaintenanceBlockerModal from "../components/blockers/MaintenanceBlockerModal";
import UpdateBlockerModal from "../components/blockers/UpdateBlockerModal";
import {
  evaluateAppBlocker,
  initializeRemoteConfig,
  subscribeRemoteConfigUpdates,
  type AppBlockerState,
} from "@/features/core";

/**
 * Set to "maintenance" or "update" to preview screens in DEV mode.
 * Set to null for normal Remote Config evaluation.
 */
const DEV_PREVIEW_BLOCKER: "maintenance" | "update" | null = null;

export const AppRemoteConfigBlocker = () => {
  const [blocker, setBlocker] = useState<AppBlockerState>({ type: null });

  const activeType = __DEV__ && DEV_PREVIEW_BLOCKER ? DEV_PREVIEW_BLOCKER : blocker.type;

  const refreshBlocker = useCallback(() => {
    setBlocker(evaluateAppBlocker());
  }, []);

  useEffect(() => {
    void initializeRemoteConfig().finally(refreshBlocker);
    return subscribeRemoteConfigUpdates(refreshBlocker);
  }, [refreshBlocker]);

  if (activeType === "maintenance") {
    return (
      <MaintenanceBlockerModal
        estimatedTime={blocker.maintenanceEstimatedTime ?? "~1 hour"}
        onCheckAgain={refreshBlocker}
      />
    );
  }

  if (activeType === "update") {
    return <UpdateBlockerModal />;
  }

  return null;
};
