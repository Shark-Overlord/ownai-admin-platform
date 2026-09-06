import { useEffect } from "react";

export interface DocumentMetaOptions {
  canonical?: string | null;
  image?: string | null;
  robots?: string | null;
  structuredData?: Record<string, unknown> | Record<string, unknown>[] | null;
  type?: "article" | "website";
}

function getOrCreateMeta(selector: string, attributes: Record<string, string>) {
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const element = existing ?? document.createElement("meta");
  if (!existing) {
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    document.head.appendChild(element);
  }
  return { element, existing };
}

export function useRobotsMeta(robots: string | null) {
  useEffect(() => {
    if (!robots) return undefined;
    const { element, existing } = getOrCreateMeta('meta[name="robots"]', { name: "robots" });
    const previous = element.content;
    element.content = robots;
    return () => {
      if (existing) element.content = previous;
      else element.remove();
    };
  }, [robots]);
}

export function useDocumentMeta(
  title: string,
  description?: string | null,
  options: DocumentMetaOptions = {},
) {
  const structuredDataJson = options.structuredData
    ? JSON.stringify(options.structuredData)
    : null;

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    const previousTitle = document.title;
    document.title = title;
    cleanups.push(() => { document.title = previousTitle; });

    const setMeta = (
      selector: string,
      attributes: Record<string, string>,
      content: string | null | undefined,
    ) => {
      if (!content) return;
      const { element, existing } = getOrCreateMeta(selector, attributes);
      const previous = element.content;
      element.content = content;
      cleanups.push(() => {
        if (existing) element.content = previous;
        else element.remove();
      });
    };

    setMeta('meta[name="description"]', { name: "description" }, description);
    setMeta('meta[name="robots"]', { name: "robots" }, options.robots);
    setMeta('meta[property="og:title"]', { property: "og:title" }, title);
    setMeta('meta[property="og:description"]', { property: "og:description" }, description);
    setMeta('meta[property="og:type"]', { property: "og:type" }, options.type ?? "website");
    setMeta('meta[property="og:url"]', { property: "og:url" }, options.canonical);
    setMeta('meta[property="og:image"]', { property: "og:image" }, options.image);
    setMeta('meta[name="twitter:card"]', { name: "twitter:card" }, options.image ? "summary_large_image" : null);
    setMeta('meta[name="twitter:title"]', { name: "twitter:title" }, title);
    setMeta('meta[name="twitter:description"]', { name: "twitter:description" }, description);
    setMeta('meta[name="twitter:image"]', { name: "twitter:image" }, options.image);

    if (options.canonical) {
      const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      const link = existing ?? document.createElement("link");
      const previous = link.href;
      if (!existing) {
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = options.canonical;
      cleanups.push(() => {
        if (existing) link.href = previous;
        else link.remove();
      });
    }

    if (structuredDataJson) {
      const existing = document.head.querySelector<HTMLScriptElement>("#site-structured-data");
      const script = existing ?? document.createElement("script");
      const previous = script.textContent;
      if (!existing) {
        script.id = "site-structured-data";
        script.type = "application/ld+json";
        document.head.appendChild(script);
      }
      script.textContent = structuredDataJson;
      cleanups.push(() => {
        if (existing) script.textContent = previous;
        else script.remove();
      });
    }

    return () => cleanups.reverse().forEach((cleanup) => cleanup());
  }, [description, options.canonical, options.image, options.robots, options.type, structuredDataJson, title]);
}
