import { Redirect } from "expo-router";
import { href } from "@/navigation/href";

/** Legacy kingdom tab — hidden; redirects to event rewards. */
const KingdomTabRedirect = () => {
  return <Redirect href={href.app.eventRewards} />;
};

export default KingdomTabRedirect;
