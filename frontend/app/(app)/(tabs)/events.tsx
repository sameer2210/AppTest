import { Redirect } from "expo-router";
import { href } from "../../../src/navigation/href";

/** Old createEvents hub removed — send organize traffic to managed create. */
const EventsTabRedirect = () => {
  return <Redirect href={href.app.organizeCreate as never} />;
};

export default EventsTabRedirect;
