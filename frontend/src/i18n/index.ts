import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import { en } from "./en";

const resources = {
  en: {
    translation: en,
  },
} as const;

const deviceLanguage = getLocales()[0]?.languageCode ?? "en";
const initialLanguage = deviceLanguage in resources ? deviceLanguage : "en";

if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member
  void i18n.use(initReactI18next).init({
    resources,
    lng: initialLanguage,
    fallbackLng: "en",
    supportedLngs: ["en"],
    defaultNS: "translation",
    compatibilityJSON: "v4",
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
}

export default i18n;
