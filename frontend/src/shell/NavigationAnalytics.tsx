import { useEffect, useRef } from "react";
import { usePathname, useSegments } from "expo-router";
import { logScreenViewForAnalytics } from "../utils/navigationUtils";
import { initDeepLinkListeners } from "../utils/deeplinkingUtils";
import { initializeClarity } from "../analytics/clarity";

export const NavigationAnalytics = () => {
  const pathname = usePathname();
  const segments = useSegments();
  const routeNameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    initializeClarity();
  }, []);

  useEffect(() => {
    const name = segments.length > 0 ? segments.join("/") : pathname || undefined;
    if (!name || routeNameRef.current === name) {
      return;
    }
    routeNameRef.current = name;
    void logScreenViewForAnalytics(name);
  }, [pathname, segments]);

  useEffect(() => {
    return initDeepLinkListeners();
  }, []);

  return null;
};
