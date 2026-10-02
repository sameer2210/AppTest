import { Redirect, useLocalSearchParams } from "expo-router";
import { href } from "@/navigation/href";

/** Catches stron://plan/[id] and https://stron.in/plan/[id]. */
const PlanDeepLinkRedirect = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return <Redirect href={href.splash} />;
  }

  return <Redirect href={{ pathname: href.app.planPreview, params: { planId: id } } as never} />;
};

export default PlanDeepLinkRedirect;
