import { Redirect, useLocalSearchParams } from "expo-router";
import { href } from "@/navigation/href";

/** Catches stron://connect/[uid] and https://stron.in/connect/[uid]. */
const ConnectDeepLinkRedirect = () => {
  const { uid } = useLocalSearchParams<{ uid: string }>();

  if (!uid) {
    return <Redirect href={href.splash} />;
  }

  return (
    <Redirect href={{ pathname: href.app.connectWithStron, params: { targetUid: uid } } as never} />
  );
};

export default ConnectDeepLinkRedirect;
