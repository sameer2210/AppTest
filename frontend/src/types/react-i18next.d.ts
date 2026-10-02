import "react-i18next";
import type { en } from "../i18n/en";

declare module "react-i18next" {
  // Make `t()` key types based on our English resource.
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
  }
}
