import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { compactButtonBase, compactButtonPrimary } from "@/lib/buttonStyles";
import { cn } from "@/lib/utils";
import type { SiteItem } from "../../lib/types";
import { SiteCard, SiteCardSkeleton } from "./SiteCard";

interface SiteGridProps {
  sites: SiteItem[];
  isLoading?: boolean;
  skeletonCount?: number;
  errorMessage?: string | null;
  onRetry?: () => void;
}

const DEFAULT_SKELETON_CARD_COUNT = 16;

function splitIntoColumns<T>(items: T[], columns: number) {
  const colArrays: T[][] = Array.from({ length: columns }, () => []);

  items.forEach((item, index) => {
    colArrays[index % columns].push(item);
  });

  return colArrays;
}

export function SiteGrid({
  sites,
  isLoading = false,
  skeletonCount = DEFAULT_SKELETON_CARD_COUNT,
  errorMessage = null,
  onRetry,
}: SiteGridProps) {
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth < 640) setColumns(1);
      else if (window.innerWidth < 1024) setColumns(2);
      else setColumns(3);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  if (isLoading) {
    const skeletons = splitIntoColumns(
      Array.from({ length: skeletonCount }, (_, index) => index + 1),
      columns,
    );

    return (
      <div
        className="flex w-full gap-2.5 sm:gap-3.5"
        role="status"
        aria-live="polite"
        aria-label="Loading references"
      >
        {skeletons.map((column, colIndex) => (
          <div
            key={colIndex}
            className="flex flex-1 flex-col gap-2.5 sm:gap-3.5"
          >
            {column.map((item) => (
              <SiteCardSkeleton key={item} index={item} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        className="rounded-[32px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)]/62 px-6 py-14 text-center shadow-[0_24px_80px_rgba(17,17,17,0.06)]"
        role="alert"
      >
        <p className="text-sm uppercase tracking-[0.18em] text-[var(--hero-muted)]">
          Request failed
        </p>
        <h3 className="hero-display mt-4 text-[20px] tracking-[-0.03em] text-[var(--hero-ink)]">
          We couldn&apos;t load the references right now.
        </h3>
        <p className="mx-auto mt-3 max-w-xl text-[13px] leading-5 text-[var(--hero-muted)]">
          {errorMessage}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className={cn(compactButtonBase, compactButtonPrimary, "mt-6")}
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  if (!sites.length) {
    return (
      <div
        className="flex min-h-[360px] flex-col items-center justify-center px-6 py-16 text-center"
        aria-live="polite"
      >
        <div className="inline-flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[var(--hero-ink)]/[0.045] text-[var(--hero-muted)]">
          <Search className="h-8 w-8" strokeWidth={1.9} />
        </div>
        <h3 className="mt-6 text-[18px] font-semibold tracking-[-0.03em] text-[var(--hero-ink)]">
          No templates found
        </h3>
        <p className="mt-2.5 text-[13px] leading-5 text-[var(--hero-muted)]">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  const colArrays = splitIntoColumns(sites, columns);

  return (
    <div className="flex w-full gap-2.5 sm:gap-3.5">
      {colArrays.map((column, colIndex) => (
        <div
          key={colIndex}
          className="flex flex-1 flex-col gap-2.5 sm:gap-3.5"
        >
          {column.map((site) => (
            <SiteCard key={site.id} site={site} />
          ))}
        </div>
      ))}
    </div>
  );
}
