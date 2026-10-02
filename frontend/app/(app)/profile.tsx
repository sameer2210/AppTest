import { Redirect } from "expo-router";
import { href } from "@/navigation/href";

const ProfileRedirect = () => <Redirect href={href.app.profile as never} />;

export default ProfileRedirect;
