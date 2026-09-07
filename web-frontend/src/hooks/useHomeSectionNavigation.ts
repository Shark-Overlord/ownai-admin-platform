import { useLocation, useNavigate } from "react-router-dom";

export type HomeSectionId = "home" | "collections" | "categories" | "about";

export interface HomeScrollState {
  scrollTo?: HomeSectionId;
}

export function scrollToHomeSection(sectionId: HomeSectionId) {
  if (typeof window === "undefined") {
    return;
  }

  const section = document.getElementById(sectionId);

  if (!section) {
    return;
  }

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  section.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });
}

export function useHomeSectionNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomeRoute = location.pathname === "/";

  const navigateToSection = (sectionId: HomeSectionId) => {
    if (isHomeRoute) {
      scrollToHomeSection(sectionId);
      return;
    }

    navigate("/", {
      state: { scrollTo: sectionId } satisfies HomeScrollState,
    });
  };

  return {
    isHomeRoute,
    navigateToSection,
  };
}
