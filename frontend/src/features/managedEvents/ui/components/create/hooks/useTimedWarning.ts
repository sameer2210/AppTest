import { useCallback, useEffect, useRef, useState } from "react";

export type RegistrationDateField = "regStart" | "reg";

type FieldWarning<T extends string> = {
  field: T;
  message: string;
};

/** Shows a short warning line on a specific field, then clears it after `durationMs`. */
export const useTimedWarning = <T extends string = string>(durationMs = 6000) => {
  const [warning, setWarning] = useState<FieldWarning<T> | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearWarning = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setWarning(null);
  }, []);

  const showWarning = useCallback(
    (field: T, message: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setWarning({ field, message });
      timerRef.current = setTimeout(() => {
        setWarning(null);
        timerRef.current = null;
      }, durationMs);
    },
    [durationMs],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { warning, showWarning, clearWarning };
};

export const registrationDateWarning = (
  which: RegistrationDateField,
  clamped: "min" | "max",
): string => {
  if (which === "regStart") {
    return clamped === "min"
      ? "Registration start date cannot be before today."
      : "Registration start date cannot be after the closing date.";
  }
  return clamped === "min"
    ? "Registration closing date cannot be before the start date."
    : "Registration closing date cannot be after the event end date.";
};
