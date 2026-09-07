import { useEffect, useRef } from "react";
import { getOrCreateVisitorId } from "@/lib/site-analytics";
import {
  trackTutorialPostRead,
  type TutorialPostReadResult,
} from "@/lib/tutorial";
import { RequestError } from "@/lib/request";

export interface UseEffectiveArticleReadOptions {
  postId?: string;
  enabled: boolean;
  thresholdSeconds?: number;
  onTracked?: (result: TutorialPostReadResult) => void;
}

interface ReadSession {
  postId: string;
  elapsedVisibleMs: number;
  submitted: boolean;
}

const BIGINT_ID_PATTERN = /^\d+$/;

function debugReadTracking(message: string, error?: unknown) {
  if (!import.meta.env.DEV) return;
  if (error === undefined) console.debug(`[tutorial-read] ${message}`);
  else console.debug(`[tutorial-read] ${message}`, error);
}

function isRetryableNetworkError(error: unknown) {
  return !(error instanceof RequestError);
}

export function useEffectiveArticleRead({
  postId,
  enabled,
  thresholdSeconds = 10,
  onTracked,
}: UseEffectiveArticleReadOptions) {
  const onTrackedRef = useRef(onTracked);
  const sessionRef = useRef<ReadSession | null>(null);

  useEffect(() => {
    onTrackedRef.current = onTracked;
  }, [onTracked]);

  useEffect(() => {
    const normalizedPostId = postId?.trim() || "";
    const normalizedThresholdSeconds = Math.max(1, Math.ceil(thresholdSeconds));
    const thresholdMs = normalizedThresholdSeconds * 1_000;

    if (
      !enabled ||
      !BIGINT_ID_PATTERN.test(normalizedPostId) ||
      typeof document === "undefined" ||
      typeof window === "undefined"
    ) {
      return;
    }

    if (sessionRef.current?.postId !== normalizedPostId) {
      sessionRef.current = {
        postId: normalizedPostId,
        elapsedVisibleMs: 0,
        submitted: false,
      };
    }

    const session = sessionRef.current;
    if (session.submitted) return;

    const visitorId = getOrCreateVisitorId();
    let visibleStartedAt: number | null = null;
    let thresholdTimer: number | null = null;
    let retryTimer: number | null = null;
    let disposed = false;

    const clearThresholdTimer = () => {
      if (thresholdTimer === null) return;
      window.clearTimeout(thresholdTimer);
      thresholdTimer = null;
    };

    const pauseVisibleTime = () => {
      if (visibleStartedAt === null) return;
      session.elapsedVisibleMs += Math.max(0, performance.now() - visibleStartedAt);
      visibleStartedAt = null;
      clearThresholdTimer();
    };

    const submitRead = async (retryCount = 0): Promise<void> => {
      if (disposed) return;

      try {
        const result = await trackTutorialPostRead({
          postId: normalizedPostId,
          visitorId,
          durationSeconds: Math.max(
            normalizedThresholdSeconds,
            Math.ceil(session.elapsedVisibleMs / 1_000),
          ),
        });

        if (!disposed) onTrackedRef.current?.(result);
      } catch (error) {
        if (disposed) return;
        if (retryCount === 0 && isRetryableNetworkError(error)) {
          retryTimer = window.setTimeout(() => {
            retryTimer = null;
            void submitRead(1);
          }, 1_000);
          return;
        }
        debugReadTracking("上报失败，已静默结束", error);
      }
    };

    const reachThreshold = () => {
      pauseVisibleTime();
      if (session.submitted) return;
      if (session.elapsedVisibleMs < thresholdMs) {
        resumeVisibleTime();
        return;
      }
      session.submitted = true;
      void submitRead();
    };

    const resumeVisibleTime = () => {
      if (
        disposed ||
        session.submitted ||
        document.visibilityState !== "visible" ||
        visibleStartedAt !== null
      ) {
        return;
      }

      const remainingMs = thresholdMs - session.elapsedVisibleMs;
      if (remainingMs <= 0) {
        reachThreshold();
        return;
      }

      visibleStartedAt = performance.now();
      thresholdTimer = window.setTimeout(reachThreshold, remainingMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") resumeVisibleTime();
      else pauseVisibleTime();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    resumeVisibleTime();

    return () => {
      disposed = true;
      pauseVisibleTime();
      clearThresholdTimer();
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, postId, thresholdSeconds]);
}
