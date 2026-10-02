import { Redirect } from "expo-router";
import { href } from "@/navigation/href";

/** Legacy route — explore catalog opens STRON participant screens. */
const FaceOffDetailsRedirect = () => <Redirect href={href.app.explore as never} />;

export default FaceOffDetailsRedirect;
