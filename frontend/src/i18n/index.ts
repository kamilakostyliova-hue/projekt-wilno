import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import pl from "./locales/pl.json";

const detectInitialLanguage = () => {
  if (typeof window !== "undefined") {
    const saved = window.localStorage.getItem("rossa-language");
    if (saved === "en" || saved === "pl") return saved;
  }

  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en")) {
    return "en";
  }

  return "pl";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    pl: { translation: pl },
  },
  lng: detectInitialLanguage(),
  fallbackLng: "pl",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
