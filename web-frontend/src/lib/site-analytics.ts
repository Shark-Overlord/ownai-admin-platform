import { postJson } from "@/lib/request";

const VISITOR_ID_STORAGE_KEY = "ownai-analytics-visitor-id";
const ATTRIBUTION_STORAGE_KEY = "ownai-analytics-attribution";
const VISITOR_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const BOT_USER_AGENT_PATTERN =
  /bot|spider|crawler|slurp|headless|phantomjs|puppeteer|playwright|selenium|curl\/|wget\/|python-requests|python-urllib|go-http-client|apache-httpclient|okhttp|scrapy|lighthouse|pagespeed|gtmetrix|facebookexternalhit|embedly|quora link preview|outbrain|pinterest|slackbot|vkshare|w3c_validator|whatsapp|telegrambot|discordbot|applebot|bingpreview|mediapartners-google|adsbot-google|apis-google|google-extended|gptbot|oai-searchbot|chatgpt-user|claudebot|claude-searchbot|perplexitybot|bytespider|petalbot|semrush|ahrefs|mj12bot|dotbot|seranking|censys|zgrab|masscan|nmap/i;
const DEEP_SEO_LANDING_PATTERN = /^(\/#)?\/(prompts|tutorials\/(posts|books))\/\d+/;

interface Attribution {
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const HAD_PERSISTED_VISITOR_ID = (() => {
  try {
    const existing = localStorage.getItem(VISITOR_ID_STORAGE_KEY)?.trim();
    return Boolean(existing && VISITOR_ID_PATTERN.test(existing));
  } catch {
    return false;
  }
})();

let humanInteracted = HAD_PERSISTED_VISITOR_ID;
let interactionPromise: Promise<void> | null = null;

function waitForFirstHumanInteraction(): Promise<void> {
  if (humanInteracted || typeof window === "undefined") {
    return Promise.resolve();
  }
  if (!interactionPromise) {
    interactionPromise = new Promise<void>((resolve) => {
      const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
      const onInteract = () => {
        humanInteracted = true;
        for (const eventName of events) {
          window.removeEventListener(eventName, onInteract);
        }
        resolve();
      };
      for (const eventName of events) {
        window.addEventListener(eventName, onInteract, { passive: true, once: true });
      }
    });
  }
  return interactionPromise;
}

export function isAutomatedBrowser(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return true;
  }
  if (navigator.webdriver) {
    return true;
  }
  const ua = navigator.userAgent || "";
  if (ua.length < 12 || BOT_USER_AGENT_PATTERN.test(ua)) {
    return true;
  }
  if (window.outerWidth === 0 && window.outerHeight === 0) {
    return true;
  }
  if (Array.isArray(navigator.languages) && navigator.languages.length === 0) {
    return true;
  }
  return false;
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

export async function waitForAnalyticsEligibility(targetPath?: string): Promise<boolean> {
  if (isAutomatedBrowser()) {
    return false;
  }
  if (humanInteracted) {
    return true;
  }
  const attribution = getAttribution();
  if (attribution.referrer || attribution.utmSource) {
    humanInteracted = true;
    return true;
  }
  const currentPath = targetPath || `${window.location.pathname}${window.location.hash}`;
  if (!DEEP_SEO_LANDING_PATTERN.test(currentPath)) {
    humanInteracted = true;
    return true;
  }
  await waitForFirstHumanInteraction();
  return true;
}

export async function trackPageView(pagePath: string) {
  try {
    const eligible = await waitForAnalyticsEligibility(pagePath);
    if (!eligible) return;
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
