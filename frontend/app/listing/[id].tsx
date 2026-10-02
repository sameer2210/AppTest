import { Redirect, useLocalSearchParams } from "expo-router";
import { href } from "@/navigation/href";

/** Catches stron://listing/[id] and https://stron.in/listing/[id]. */
const ListingDeepLinkRedirect = () => {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return <Redirect href={href.splash} />;
  }

  return <Redirect href={{ pathname: href.app.plans, params: { businessId: id } } as never} />;
};

export default ListingDeepLinkRedirect;
