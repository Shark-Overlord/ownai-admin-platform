import { useMemo, useState } from "react";
import {
  AppWindow,
  BriefcaseBusiness,
  FileText,
  LayoutGrid,
  Palette,
  Search,
  ShoppingBag,
  Sparkles,
  X,
  Layout,
  Component,
  Zap,
  Image,
} from "lucide-react";
import { usePreferredLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import type {
  HomeCategoryOption,
  HomeTagOption,
} from "../../lib/types";

interface FilterBarProps {
  searchValue: string;
  activeCategory: string;
  categories: HomeCategoryOption[];
  tags: HomeTagOption[];
  activeTagIds: string[];
  isTagLoading?: boolean;
  onSearchChange: (value: string) => void;
  onCategoryChange: (category: string) => void;
  onTagToggle: (tag: HomeTagOption) => void;
  onTagClear: () => void;
}

const categoryIcons: Record<string, typeof LayoutGrid> = {
  All: LayoutGrid,
  "布局": Layout,
  "组件": Component,
  "动效": Zap,
  "样式/主题": Palette,
  "落地页": FileText,
  "图像提示词": Image,
  "image2.0提示词": Image,
  // 兼容老数据英文
  SaaS: AppWindow,
  Portfolio: Palette,
  Agency: BriefcaseBusiness,
  Ecommerce: ShoppingBag,
  AI: Sparkles,
  "Landing Page": FileText,
};

const FILTER_BAR_COPY = {
  "en-US": {
    title: "Discover design references",
    subtitle:
      "Scan categories, jump into focused topics, and narrow the library fast.",
    searchPlaceholder: "Search references...",
    clear: "Clear",
    clearAriaLabel: "Clear selected tags",
    moreTags: "More",
    collapseTags: "Collapse",
    categoryLabels: {
      All: "All",
    },
  },
  "zh-CN": {
    title: "发现设计参考",
    subtitle: "浏览分类，快速进入聚焦主题，更高效地筛选整个灵感库。",
    searchPlaceholder: "搜索设计参考...",
    clear: "清空",
    clearAriaLabel: "清空已选标签",
    moreTags: "更多",
    collapseTags: "收起",
    categoryLabels: {
      All: "全部",
    },
  },
} as const;

const COLLAPSED_TAG_LIMIT = 12;

export function FilterBar({
  searchValue,
  activeCategory,
  categories,
  tags,
  activeTagIds,
  isTagLoading = false,
  onSearchChange,
  onCategoryChange,
  onTagToggle,
  onTagClear,
}: FilterBarProps) {
  const { locale } = usePreferredLocale();
  const copy = FILTER_BAR_COPY[locale];
  const [isTagExpanded, setIsTagExpanded] = useState(false);
  const tagSkeletonWidths = [78, 96, 88, 84, 92, 74];
  const hasActiveTags = activeTagIds.length > 0;
  const shouldShowTagRow = isTagLoading || tags.length > 0 || hasActiveTags;
  const hasHiddenTags = tags.length > COLLAPSED_TAG_LIMIT;
  const visibleTags = useMemo(() => {
    if (isTagExpanded || !hasHiddenTags) {
      return tags;
    }

    const pinnedActiveTags = tags.filter((tag) => activeTagIds.includes(tag.id));
    const compactTags = tags.slice(0, COLLAPSED_TAG_LIMIT);
    const compactTagIds = new Set(compactTags.map((tag) => tag.id));

    return [
      ...compactTags,
      ...pinnedActiveTags.filter((tag) => !compactTagIds.has(tag.id)),
    ];
  }, [activeTagIds, hasHiddenTags, isTagExpanded, tags]);
  const hiddenTagCount = Math.max(tags.length - COLLAPSED_TAG_LIMIT, 0);
  const tagRowMaxHeight = isTagExpanded ? 148 : 40;

  return (
    <div className="px-1 py-1 text-[var(--hero-ink)]">
      <div className="flex flex-col gap-5 lg:gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-[1.75rem] font-medium tracking-[-0.04em] text-[var(--hero-ink)] sm:text-[2.1rem]">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--hero-muted)] sm:text-[0.96rem]">
              {copy.subtitle}
            </p>
          </div>

          <div className="w-full lg:w-auto lg:shrink-0">
            <label className="group relative block w-full transition-transform duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:-translate-y-0.5 sm:w-[256px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--hero-ink)]/34 transition-colors duration-200 group-hover:text-[var(--hero-ink)]/54" />
              <input
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={copy.searchPlaceholder}
                className="h-[36px] w-full rounded-[12px] border border-[var(--hero-ink)]/8 bg-[var(--hero-surface)]/76 px-3 pl-9 text-[14px] font-medium tracking-[-0.02em] text-[var(--hero-ink)] shadow-[0_4px_12px_rgba(17,17,17,0.02)] outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-[var(--hero-muted)] hover:border-[var(--hero-ink)]/14 hover:bg-[var(--hero-surface)] hover:shadow-[0_8px_20px_rgba(17,17,17,0.05)] focus:border-[var(--hero-ink)]/16 focus:bg-[var(--hero-surface)] focus:shadow-[0_10px_24px_rgba(17,17,17,0.06)] focus:ring-2 focus:ring-[var(--hero-ink)]/8"
              />
            </label>
          </div>
        </div>

        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          {categories.map((category) => {
            const Icon = categoryIcons[category.name] ?? LayoutGrid;
            const isActive = category.name === activeCategory;
            const localizedCategoryName =
              category.name === "All"
                ? (locale === "zh-CN" ? "全部" : "All")
                : category.name;

            return (
              <button
                key={category.id}
                type="button"
                title={category.description || localizedCategoryName}
                onClick={() => onCategoryChange(category.name)}
                aria-pressed={isActive}
                className={cn(
                  "filter-category-pill inline-flex h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-[8px] px-4 text-[14px] font-medium tracking-[-0.02em] transition-[background-color,color,border-color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/12",
                  isActive
                    ? "bg-[var(--hero-ink)] text-[var(--hero-bg)]"
                    : "bg-[var(--hero-surface)]/60 text-[var(--hero-muted)] hover:bg-[var(--hero-ink)]/[0.035] hover:text-[var(--hero-ink)]",
                )}
              >
                <Icon className="h-[13px] w-[13px]" />
                <span>{localizedCategoryName}</span>
              </button>
            );
          })}
        </div>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            shouldShowTagRow
              ? "mt-0 grid-rows-[1fr] opacity-100"
              : "-mt-4 grid-rows-[0fr] opacity-0",
          )}
        >
          <div
            className={cn(
              "hide-scrollbar min-h-0 overflow-hidden transition-[max-height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              isTagExpanded ? "overflow-y-auto" : "overflow-x-auto",
            )}
            style={{ maxHeight: shouldShowTagRow ? tagRowMaxHeight : 0 }}
          >
            <div
              className={cn(
                "flex gap-2 pb-1 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                isTagExpanded
                  ? "flex-wrap items-start opacity-100 translate-y-0"
                  : "items-center overflow-x-auto opacity-100 translate-y-0",
              )}
            >
            {isTagLoading && !tags.length
              ? tagSkeletonWidths.map((width, index) => (
                  <span
                    key={index}
                    aria-hidden="true"
                    className="inline-flex h-[34px] shrink-0 animate-pulse rounded-full bg-[var(--hero-ink)]/[0.06]"
                    style={{ width }}
                  />
                ))
              : visibleTags.map((tag) => {
                  const isActive = activeTagIds.includes(tag.id);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      title={tag.description || tag.name}
                      onClick={() => onTagToggle(tag)}
                      aria-pressed={isActive}
                      className={cn(
                        "filter-topic-pill inline-flex h-[34px] shrink-0 items-center justify-center rounded-full px-4 font-medium tracking-[-0.02em] transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/12 sm:px-[18px]",
                        isActive
                          ? "bg-[var(--hero-ink)] text-[var(--hero-bg)]"
                          : "bg-[var(--hero-ink)]/[0.055] text-[var(--hero-muted)] hover:bg-[var(--hero-ink)]/[0.09] hover:text-[var(--hero-ink)]",
                      )}
                    >
                      {tag.name}
                    </button>
                  );
                })}

            {hasHiddenTags ? (
              <button
                type="button"
                onClick={() => setIsTagExpanded((value) => !value)}
                className="inline-flex h-[34px] shrink-0 items-center justify-center rounded-full border border-[var(--hero-ink)]/10 bg-[var(--hero-surface)]/82 px-3 text-[13px] font-medium tracking-[-0.02em] text-[var(--hero-ink)] shadow-[0_6px_18px_rgba(17,17,17,0.04)] transition-[background-color,border-color,color] hover:border-[var(--hero-ink)]/16 hover:bg-[var(--hero-surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/12"
                aria-expanded={isTagExpanded}
              >
                {isTagExpanded
                  ? copy.collapseTags
                  : `${copy.moreTags} ${hiddenTagCount}`}
              </button>
            ) : null}

            {hasActiveTags ? (
              <button
                type="button"
                onClick={onTagClear}
                className="inline-flex h-[34px] shrink-0 items-center justify-center gap-2 rounded-full px-2.5 text-[0.94rem] font-medium tracking-[-0.02em] text-[var(--hero-muted)] transition-colors hover:text-[var(--hero-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--hero-ink)]/12"
                aria-label={copy.clearAriaLabel}
              >
                <X className="h-4 w-4" />
                <span>{copy.clear}</span>
              </button>
            ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
