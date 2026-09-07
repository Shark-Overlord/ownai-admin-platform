import { useEffect, useState } from "react";

function getIsDarkTheme() {
  if (typeof document === "undefined") {
    return false;
  }

  return document.documentElement.classList.contains("dark");
}

export function useIsDarkTheme() {
  const [isDarkTheme, setIsDarkTheme] = useState(() => getIsDarkTheme());

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const syncTheme = () => {
      setIsDarkTheme(root.classList.contains("dark"));
    };

    syncTheme();

    // Observe html class changes so menu theme toggles update the hero immediately.
    const observer = new MutationObserver(syncTheme);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return isDarkTheme;
}
