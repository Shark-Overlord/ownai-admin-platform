import type { SiteItem } from "../../lib/types";
import { MouseEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, LoaderCircle, Star } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPersistedLoginUser } from "@/lib/auth";
import {
  addPromptAssetFavorite,
  cancelPromptAssetFavorite,
  checkPromptAssetFavorite,
  notifyPromptAssetFavoriteChange,
  subscribePromptAssetFavoriteChange,
} from "@/lib/favorite";
import { isAuthenticationError } from "@/lib/request";
import { cn } from "@/lib/utils";
import SearchOverlay from "./SearchOverlay";

interface SiteCardProps {
  site: SiteItem;
}

interface SiteCardSkeletonProps {
  index: number;
}

function getFallbackAspectRatio(seed: number | string) {
  const normalizedSeed =
    typeof seed === "number"
      ? Math.abs(seed)
      : Array.from(seed).reduce(
          (hash, char) => hash + char.charCodeAt(0),
          0,
        );
  const pattern = normalizedSeed % 4;

  if (pattern === 1) {
    return 4 / 3;
  }

  if (pattern === 2) {
    return 3 / 2;
  }

  if (pattern === 3) {
    return 16 / 10;
  }

  return 16 / 9;
}

function clampAspectRatio(value: number | undefined) {
  if (!value || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  return Math.min(Math.max(value, 0.56), 1.85);
}

export function SiteCard({ site }: SiteCardProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showSearch, setShowSearch] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [measuredAspectRatio, setMeasuredAspectRatio] = useState<number | null>(null);
  const shouldShowCardTitle = site.sourceType !== "promptAsset";
  const shouldShowFavorite = site.sourceType === "promptAsset";
  const resolvedAspectRatio = useMemo(() => {
    return (
      clampAspectRatio(site.imageAspectRatio) ||
      clampAspectRatio(
        site.imageWidth && site.imageHeight
          ? site.imageWidth / site.imageHeight
          : undefined,
      ) ||
      clampAspectRatio(measuredAspectRatio ?? undefined) ||
      getFallbackAspectRatio(site.id)
    );
  }, [measuredAspectRatio, site.id, site.imageAspectRatio, site.imageHeight, site.imageWidth]);

  useEffect(() => {
    if (!shouldShowFavorite || !getPersistedLoginUser()) {
      setIsFavorited(false);
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    void checkPromptAssetFavorite(site.id, { signal: controller.signal })
      .then((nextIsFavorited) => {
        if (isActive) {
          setIsFavorited(nextIsFavorited);
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [shouldShowFavorite, site.id]);

  useEffect(() => {
    if (!shouldShowFavorite) {
      return;
    }

    return subscribePromptAssetFavoriteChange((change) => {
      if (String(change.promptAssetId) === String(site.id)) {
        setIsFavorited(change.isFavorited);
      }
    });
  }, [shouldShowFavorite, site.id]);

  const redirectToLogin = () => {
    navigate("/auth/login", {
      state: {
        redirectTo: `${location.pathname}${location.search}`,
      },
    });
  };

  const handleFavoriteClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!shouldShowFavorite || isFavoriteLoading) {
      return;
    }

    if (!getPersistedLoginUser()) {
      redirectToLogin();
      return;
    }

    const previousValue = isFavorited;
    const nextValue = !previousValue;

    setIsFavorited(nextValue);
    setIsFavoriteLoading(true);
    notifyPromptAssetFavoriteChange({
      promptAssetId: String(site.id),
      isFavorited: nextValue,
    });

    try {
      if (nextValue) {
        await addPromptAssetFavorite(site.id);
      } else {
        await cancelPromptAssetFavorite(site.id);
      }
    } catch (error) {
      if (isAuthenticationError(error)) {
        redirectToLogin();
        return;
      }

      setIsFavorited(previousValue);
      notifyPromptAssetFavoriteChange({
        promptAssetId: String(site.id),
        isFavorited: previousValue,
      });
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    setShowSearch(true);
  };

  const content = (
    <>
      <div className="card-masonry__shell relative z-[1] w-full rounded-[22px] border border-[var(--hero-ink)]/[0.08] bg-[var(--hero-surface)] p-1.5 shadow-[0_8px_24px_rgba(17,17,17,0.05)] origin-bottom transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:-translate-y-2 group-hover:bg-[var(--hero-ink)]/[0.025] group-hover:border-[var(--hero-ink)]/[0.12] group-hover:shadow-[0_32px_64px_rgba(17,17,17,0.12)]">
        <div
          className="card-masonry__frame relative w-full overflow-hidden rounded-[16px] bg-[#f4f5f7]"
          style={{
            aspectRatio: String(resolvedAspectRatio),
          }}
        >
          <img
            src={site.image}
            alt={`${site.title} thumbnail`}
            loading="lazy"
            decoding="async"
            draggable={false}
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;

              if (naturalWidth > 0 && naturalHeight > 0) {
                setMeasuredAspectRatio(naturalWidth / naturalHeight);
              }
            }}
            className="card-masonry__image absolute inset-0 h-full w-full object-contain transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.04]"
          />

          {shouldShowFavorite ? (
            <button
              type="button"
              onClick={handleFavoriteClick}
              disabled={isFavoriteLoading}
              className={cn(
                "absolute right-2.5 top-2.5 z-10 inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-white/45 bg-white/88 text-[var(--hero-ink)] shadow-[0_8px_18px_rgba(17,17,17,0.12)] backdrop-blur-md transition-[transform,background-color,color,opacity] hover:-translate-y-[0.5px] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 disabled:cursor-not-allowed disabled:opacity-70",
                isFavorited ? "text-amber-700" : "text-[#171717]",
              )}
              aria-label={isFavorited ? "Cancel favorite" : "Save favorite"}
              aria-pressed={isFavorited}
            >
              {isFavoriteLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Star
                  className="h-4 w-4"
                  fill={isFavorited ? "currentColor" : "none"}
                  strokeWidth={1.8}
                />
              )}
            </button>
          ) : null}

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(0,0,0,0.5)_100%)] opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100" />

          <div className="card-masonry__overlay pointer-events-none absolute inset-0 flex translate-y-6 flex-col justify-end p-4 opacity-0 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:translate-y-0 group-hover:opacity-100 sm:p-5">
            <p className="max-w-[95%] overflow-hidden text-[0.88rem] font-medium leading-[1.4] tracking-[-0.01em] text-white/95 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {site.description || "Explore this reference."}
            </p>
            {site.url ? (
              <div className="mt-3 flex items-center">
                <span className="pointer-events-auto inline-flex h-7 overflow-hidden rounded-[8px] bg-[var(--hero-surface)]/95 text-[12px] font-semibold tracking-[-0.01em] text-[var(--hero-ink)] shadow-[0_8px_16px_rgba(0,0,0,0.12)] backdrop-blur-md transition-transform hover:scale-[1.03] active:scale-95">
                  <span className="inline-flex h-7 min-w-[89px] items-center justify-center px-3">
                    Use prompt
                  </span>
                  <span className="inline-flex h-7 w-7 items-center justify-center border-l border-[var(--hero-ink)]/10">
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.9} />
                  </span>
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {shouldShowCardTitle ? (
        <div className="px-1">
          <h3 className="text-[0.84rem] font-bold leading-snug tracking-[0.01em] text-[var(--hero-ink)]/80">
            {site.title}
          </h3>
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setShowSearch(true)}
        onKeyDown={handleCardKeyDown}
        className="group card-masonry relative flex w-full flex-col gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/15 focus-visible:ring-offset-4 focus-visible:ring-offset-[var(--hero-bg)]"
        aria-label={site.title}
      >
        {content}
      </div>
      {showSearch && (
        <SearchOverlay site={site} onClose={() => setShowSearch(false)} />
      )}
    </>
  );
}

export function SiteCardSkeleton({ index }: SiteCardSkeletonProps) {
  const skeletonAspectRatio = getFallbackAspectRatio(index);

  return (
    <div
      className="card-masonry relative flex w-full flex-col gap-1.5"
      aria-hidden="true"
    >
      <div className="card-masonry__shell relative z-[1] w-full rounded-[22px] border border-[var(--hero-ink)]/[0.05] bg-[var(--hero-surface)]/85 p-1.5 shadow-[0_8px_24px_rgba(17,17,17,0.04)]">
        <div
          className="relative w-full overflow-hidden rounded-[16px] bg-[var(--hero-ink)]/[0.04] animate-pulse"
          style={{
            aspectRatio: String(skeletonAspectRatio),
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(17,17,17,0.06)_100%)]" />
        </div>
      </div>
      <div className="space-y-2 px-1">
        <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-[var(--hero-ink)]/[0.08]" />
        <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-[var(--hero-ink)]/[0.05]" />
      </div>
    </div>
  );
}
