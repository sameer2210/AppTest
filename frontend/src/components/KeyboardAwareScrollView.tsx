import { forwardRef } from "react";
import {
  KeyboardAwareScrollView as BaseKeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-aware-scroll-view";

import { SCROLL_PERFORMANCE_PROPS } from "@/components/ui/AppScrollView";

const KeyboardAwareScrollView = forwardRef<
  BaseKeyboardAwareScrollView,
  KeyboardAwareScrollViewProps
>(({ enableOnAndroid = true, keyboardShouldPersistTaps = "handled", ...props }, ref) => (
  <BaseKeyboardAwareScrollView
    ref={ref}
    {...SCROLL_PERFORMANCE_PROPS}
    enableOnAndroid={enableOnAndroid}
    enableAutomaticScroll
    keyboardShouldPersistTaps={keyboardShouldPersistTaps}
    extraScrollHeight={24}
    {...props}
  />
));

KeyboardAwareScrollView.displayName = "KeyboardAwareScrollView";

export default KeyboardAwareScrollView;
