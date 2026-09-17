import React, { useEffect, useState, useTransition } from "react";
import { Link } from "react-router-dom";
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  LoaderCircle,
  Search,
  Sparkles,
  Trash2,
  Layers,
} from "lucide-react";
import {
  cancelDeconstructionAssetFavorite,
  listMyDeconstructionAssetFavorites,
} from "@/lib/artwork";
import type { DeconstructionAssetFavoriteVO } from "@/lib/types";
import "./favorite-assets.css";

interface DeconstructionFavoriteViewProps {
  assetType: "prompt" | "component" | "icon";
  onMessage?: (message: string) => void;
}

function RenderAssetIcon({ content, name }: { content?: string; name?: string }) {
  const trimmed = (content || "").trim();
  if (
    trimmed.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i) ||
    (trimmed.startsWith("http") && !trimmed.includes("<") && !trimmed.match(/\.(mp4|webm)/i))
  ) {
    return (
      <img
        src={trimmed}
        alt={name || "素材"}
        className="h-full w-full rounded-[8px] object-cover"
        loading="lazy"
      />
    );
  }
  if (trimmed.match(/\.(mp4|webm|mov)(\?.*)?$/i)) {
    return (
      <div className="flex h-5 w-5 items-center justify-center text-[var(--chat-ink)]">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="6 3 20 12 6 21 6 3" />
        </svg>
      </div>
    );
  }
  if (trimmed.startsWith("<svg")) {
    return (
      <div
        className="flex h-5 w-5 items-center justify-center text-[var(--chat-ink)] [&>svg]:h-full [&>svg]:w-full [&>svg]:stroke-current"
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }

  let iconName = (name || "").toLowerCase().trim();
  const match = trimmed.match(/data-lucide=["']([^"']+)["']/i);
  if (match) {
    iconName = match[1].toLowerCase();
  }

  const common = {
    className: "h-5 w-5 text-[var(--chat-ink)]",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (iconName === "copy") {
    return (
      <svg {...common}>
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
    );
  }
  if (iconName === "play") {
    return (
      <svg {...common}>
        <polygon points="6 3 20 12 6 21 6 3" />
      </svg>
    );
  }
  if (iconName === "check") {
    return (
      <svg {...common}>
        <path d="m20 6-11 11-5-5" />
      </svg>
    );
  }
  if (iconName === "sparkles") {
    return (
      <svg {...common}>
        <path d="m12 3-1.7 4.3L6 9l4.3 1.7L12 15l1.7-4.3L18 9l-4.3-1.7L12 3ZM5 16l-.8 2.2L2 19l2.2.8L5 22l.8-2.2L8 19l-2.2-.8L5 16ZM19 13l-.8 2.2L16 16l2.2.8L19 19l.8-2.2L22 16l-2.2-.8L19 13Z" />
      </svg>
    );
  }
  if (iconName === "moon") {
    return (
      <svg {...common}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
      </svg>
    );
  }
  if (iconName === "sun") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
      </svg>
    );
  }
  if (iconName === "search") {
    return (
      <svg {...common}>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );
  }
  if (iconName === "heart") {
    return (
      <svg {...common}>
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

export function DeconstructionFavoriteView({
  assetType,
  onMessage,
}: DeconstructionFavoriteViewProps) {
  const [items, setItems] = useState<DeconstructionAssetFavoriteVO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const loadData = async (signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const res = await listMyDeconstructionAssetFavorites(
        {
          assetType,
          searchText: debouncedSearch || undefined,
          pageSize: 50,
          current: 1,
        },
        { signal }
      );
      setItems(res.records || []);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      onMessage?.(err instanceof Error ? err.message : "加载收藏资产失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadData(controller.signal);
    return () => controller.abort();
  }, [assetType, debouncedSearch]);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  const handleRemove = async (item: DeconstructionAssetFavoriteVO) => {
    if (!window.confirm(`确定取消收藏【${item.title || "该资产"}】吗？`)) return;
    try {
      await cancelDeconstructionAssetFavorite({
        artworkId: item.artworkId,
        assetType: item.assetType,
        assetKey: item.assetKey,
      });
      startTransition(() => {
        setItems((prev) => prev.filter((it) => it.id !== item.id));
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "取消收藏失败");
    }
  };

  const emptyDescriptions = {
    prompt: "还没有收藏解构提示词。在作品解构页的【提示词规范】面板点击 Save 即可收藏。",
    component: "还没有收藏解构零件组件。在作品解构页的【零件拆解】面板点击 Save 即可收藏。",
    icon: "还没有收藏解构素材。在作品解构页的【设计素材】面板点击 Save 即可收藏。",
  };

  const getCopyContent = (item: DeconstructionAssetFavoriteVO) => {
    if (assetType === "component") {
      const header = [item.title, item.tag ? `[${item.tag}]` : ""].filter(Boolean).join(" ");
      const desc = item.description ? item.description.trim() : "";
      const code = (item.content || "").trim();
      if (code.startsWith("<")) {
        return `<!--\n  组件：${header}\n  说明：${desc || "暂无说明"}\n-->\n${code}`;
      } else {
        return `/**\n * 组件：${header}\n * 说明：${desc || "暂无说明"}\n */\n${code}`;
      }
    }
    return item.content;
  };

  return (
    <div className="fav-assets-container">
      {/* 搜索与统计栏 */}
      <div className="fav-assets-filter-bar">
        <div className="fav-assets-search-input">
          <Search className="h-4 w-4 shrink-0 text-[var(--chat-muted)]" />
          <input
            type="text"
            placeholder={
              assetType === "prompt"
                ? "搜索已收藏提示词规范..."
                : assetType === "component"
                ? "搜索已收藏零件组件..."
                : "搜索已收藏图标与素材..."
            }
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <div className="text-[12px] text-[var(--chat-muted)]">
          共收录 {items.length} 项资产
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-[14px] text-[var(--chat-muted)]">
          <LoaderCircle className="h-6 w-6 animate-spin text-[var(--chat-ink)]" />
          <span>正在加载资产...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[var(--chat-border)] p-8 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--chat-control-soft)] text-[var(--chat-muted)]">
            {assetType === "prompt" ? (
              <Sparkles className="h-6 w-6" />
            ) : assetType === "component" ? (
              <Code2 className="h-6 w-6" />
            ) : (
              <Layers className="h-6 w-6" />
            )}
          </div>
          <p className="max-w-[420px] text-[13px] leading-relaxed text-[var(--chat-muted)]">
            {searchText ? "没有匹配的搜索结果，试试其他关键词" : emptyDescriptions[assetType]}
          </p>
        </div>
      ) : assetType === "icon" ? (
        /* 图标素材网格视图 */
        <div className="fav-icon-grid">
          {items.map((item) => {
            const isCopied = copiedId === item.id;
            const isSvg = item.content && item.content.trim().startsWith("<svg");
            return (
              <article className="fav-icon-card" key={item.id}>
                <div className="fav-icon-preview">
                  <RenderAssetIcon
                    content={item.content}
                    name={item.assetKey || item.title}
                  />
                </div>
                <h4 className="fav-icon-name" title={item.title}>
                  {item.title || item.assetKey}
                </h4>
                <span className="fav-icon-lib">{item.tag || "Lucide Icon"}</span>

                <div className="fav-icon-actions">
                  <button
                    type="button"
                    className="fav-btn"
                    onClick={() => handleCopy(item.id, item.content || item.title)}
                    title={isCopied ? "已复制" : "复制 SVG / 图标名"}
                  >
                    {isCopied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <Link
                    to={`/artwork/deconstruction/${item.artworkId}`}
                    className="fav-btn"
                    title="查看原作品解构"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                  <button
                    type="button"
                    className="fav-btn danger"
                    onClick={() => handleRemove(item)}
                    title="取消收藏"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* 提示词 & 组件：极简高效索引列表（无大块展开，专注快速复制与跳转） */
        <div className="fav-assets-list">
          {items.map((item, index) => {
            const isCopied = copiedId === item.id;
            const displayTitle =
              assetType === "prompt"
                ? `${item.artworkTitle || item.title || "作品"} · 设计规范`
                : item.title || item.assetKey;
            return (
              <article className="fav-list-item" key={item.id}>
                <div className="fav-list-row">
                  <div className="fav-list-left">
                    <div className="fav-index-badge">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div className="fav-list-meta">
                      <div className="fav-list-title-row">
                        <h4 className="fav-list-title">{displayTitle}</h4>
                      </div>
                      {item.description && (
                        <p className="fav-list-desc" title={item.description}>
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 右侧快捷操作区 */}
                  <div className="fav-list-right">
                    <span className="fav-list-date">
                      {item.createTime ? item.createTime.slice(0, 10) : ""}
                    </span>
                    <div className="fav-list-actions">
                      <button
                        type="button"
                        className="fav-btn"
                        onClick={() => handleCopy(item.id, getCopyContent(item))}
                        title={assetType === "prompt" ? "复制完整设计规范 Markdown" : "复制组件代码及说明"}
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span>已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>复制</span>
                          </>
                        )}
                      </button>
                      <Link
                        to={`/artwork/deconstruction/${item.artworkId}`}
                        className="fav-btn"
                        target="_blank"
                        rel="noreferrer"
                        title="在新窗口查看原作品解构"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>解构</span>
                      </Link>
                      <button
                        type="button"
                        className="fav-btn danger"
                        onClick={() => handleRemove(item)}
                        title="取消收藏"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
