import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { recordAppOpenAndShouldShowPrompt } from "@/utils/ratingPromptStorage";

export const useHomeRatingPrompt = (uid: string | undefined) => {
  const [visible, setVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!uid) {
        return undefined;
      }

      void (async () => {
        const shouldShow = await recordAppOpenAndShouldShowPrompt();
        if (shouldShow) {
          setVisible(true);
        }
      })();

      return undefined;
    }, [uid]),
  );

  const closePrompt = useCallback(() => {
    setVisible(false);
  }, []);

  return { visible, closePrompt };
};
