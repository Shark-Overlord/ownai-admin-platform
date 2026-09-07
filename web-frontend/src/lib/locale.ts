import { useEffect, useState } from "react";

export type AppLocale = "en-US" | "zh-CN";

function detectBrowserLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en-US";
  }

  const languages = Array.isArray(window.navigator.languages)
    ? window.navigator.languages
    : [window.navigator.language];

  const matchedLocale = languages.find((language) =>
    language.toLowerCase().startsWith("zh"),
  );

  return matchedLocale ? "zh-CN" : "en-US";
}

export function getPreferredLocale(): AppLocale {
  return detectBrowserLocale();
}

export function usePreferredLocale() {
  const [locale, setLocale] = useState<AppLocale>(() => getPreferredLocale());

  useEffect(() => {
    const syncLocale = () => {
      setLocale(detectBrowserLocale());
    };

    window.addEventListener("languagechange", syncLocale);

    return () => {
      window.removeEventListener("languagechange", syncLocale);
    };
  }, []);

  return { locale };
}
