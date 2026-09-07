import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/site-analytics";

export function SiteAnalyticsTracker() {
  const location = useLocation();
  const lastTrackRef = useRef<{ key: string; time: number } | null>(null);

  useEffect(() => {
    const pagePath = `/#${location.pathname}`;
    const now = Date.now();
    const trackKey = pagePath;
    if (lastTrackRef.current?.key === trackKey && now - lastTrackRef.current.time < 1_000) return;
    lastTrackRef.current = { key: trackKey, time: now };
    void trackPageView(pagePath);
  }, [location.pathname]);

  return null;
}
