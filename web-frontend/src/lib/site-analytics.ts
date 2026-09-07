import { postJson } from "@/lib/request";

const VISITOR_ID_STORAGE_KEY = "ownai-analytics-visitor-id";
const ATTRIBUTION_STORAGE_KEY = "ownai-analytics-attribution";
const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

interface Attribution {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

function createVisitorId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `visitor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

export function getOrCreateVisitorId() {
  const existing = localStorage.getItem(VISITOR_ID_STORAGE_KEY)?.trim();
  if (existing && VISITOR_ID_PATTERN.test(existing)) return existing;
  const next = createVisitorId();
  localStorage.setItem(VISITOR_ID_STORAGE_KEY, next);
  return next;
}

function readHashSearchParams() {
  const queryIndex = window.location.hash.indexOf("?");
  if (queryIndex < 0) return new URLSearchParams();
  return new URLSearchParams(window.location.hash.slice(queryIndex + 1));
}

function resolveReferrerDomain() {
  if (!document.referrer) return undefined;
  try {
    const url = new URL(document.referrer);
    if (url.origin === window.location.origin) return undefined;
    return url.hostname;
  } catch {
    return undefined;
  }
}

function getAttribution(): Attribution {
  const existing = sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY);
  if (existing) {
    try {
      return JSON.parse(existing) as Attribution;
    } catch {
      sessionStorage.removeItem(ATTRIBUTION_STORAGE_KEY);
    }
  }

  const regularParams = new URLSearchParams(window.location.search);
  const hashParams = readHashSearchParams();
  const readParam = (key: string) => regularParams.get(key) || hashParams.get(key) || undefined;
  const attribution: Attribution = {
    referrer: resolveReferrerDomain(),
    utmSource: readParam("utm_source"),
    utmMedium: readParam("utm_medium"),
    utmCampaign: readParam("utm_campaign"),
  };
  sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attribution));
  return attribution;
}

export async function trackPageView(pagePath: string) {
  try {
    const attribution = getAttribution();
    await postJson<boolean>("/site-analytics/track/page-view", {
      visitorId: getOrCreateVisitorId(),
      pagePath,
      ...attribution,
    });
  } catch {
    // Analytics must never interrupt the user-facing route.
  }
}
