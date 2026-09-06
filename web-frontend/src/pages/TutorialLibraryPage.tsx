import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, Clock3, Eye, Heart, Library, Lock, Search, SlidersHorizontal, Users } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { TutorialWorkspaceShell, type TutorialSidebarItem } from "@/components/tutorial/TutorialWorkspaceShell";
import { RequestErrorToast } from "@/components/ui/RequestErrorToast";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { isAuthenticationError, RequestError } from "@/lib/request";
import {
  cancelFavoriteTutorialBook,
  cancelFavoriteTutorialPost,
  favoriteTutorialBook,
  favoriteTutorialPost,
  getTutorialFilters,
  getTutorialOverview,
  pageFavoriteTutorialBooks,
  pageFavoriteTutorialPosts,
  pageTutorialBooks,
  type TutorialAccessType,
  type TutorialBookListItem,
  type TutorialFilterItem,
  type TutorialOverview,
  type TutorialPostOutline,
} from "@/lib/tutorial";
import { cn } from "@/lib/utils";

type TutorialLibraryView = "books" | "favorites";
type FavoriteKind = "books" | "posts";

const PAGE_SIZE = 12;
const emptyOverview: TutorialOverview = {
  bookCount: "0",
  publishedPostCount: "0",
  freeBookCount: "0",
  memberBookCount: "0",
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" }).format(date);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") return null;
  return error instanceof RequestError ? error.message : fallback;
}

function AccessBadge({ memberOnly, kind = "book" }: { memberOnly: 0 | 1; kind?: "book" | "post" }) {
  const Icon = memberOnly === 1 ? Lock : BookOpen;
  const label = memberOnly === 1 ? "会员专享" : kind === "book" ? "免费教程" : "免费";
  return <span className="inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-control-bg)] px-2 text-[11px] font-semibold text-[var(--frontend-prompt-card-text)]"><Icon className="h-3 w-3" />{label}</span>;
}

function FavoriteButton({ favorited, favoriteCount, isLoading, onClick }: { favorited: boolean; favoriteCount: number; isLoading: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} disabled={isLoading} aria-label={favorited ? "取消收藏" : "加入收藏"} title={`${favorited ? "取消收藏" : "加入收藏"} · ${favoriteCount}`} className={cn("inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-[8px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-control-bg)] px-2 text-[11px] font-semibold transition-colors disabled:opacity-60", favorited ? "text-rose-500" : "text-[var(--frontend-prompt-card-muted)] hover:text-[var(--frontend-prompt-card-text)]")}><Heart className={cn("h-3.5 w-3.5", favorited && "fill-current")} /><span className="tabular-nums">{favoriteCount}</span></button>;
}

function Cover({ coverUrl, title }: { coverUrl?: string | null; title: string }) {
  return <div className="relative aspect-[4/3] overflow-hidden border-b border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-media-bg)]">{coverUrl ? <img src={coverUrl} alt={`${title}封面`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.015]" loading="lazy" decoding="async" /> : <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_70%_25%,rgba(118,109,255,0.12),transparent_42%)] text-[var(--chat-muted-2)]"><Library className="h-8 w-8" strokeWidth={1.35} /></div>}</div>;
}

function BookCard({ item, isFavoriteLoading, onToggleFavorite }: { item: TutorialBookListItem; isFavoriteLoading: boolean; onToggleFavorite: () => void }) {
  return <article className="group relative overflow-hidden rounded-[12px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-bg)] transition-colors hover:border-[var(--frontend-prompt-card-border-hover)]">
    <Link to={`/tutorials/books/${item.id}`} className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--chat-ink)]/20">
      <div className="relative"><Cover coverUrl={item.coverUrl} title={item.title} /><div className="absolute left-3 top-3"><AccessBadge memberOnly={item.memberOnly} /></div></div>
      <div className="p-4"><h2 className="line-clamp-2 text-[16px] font-semibold leading-6 tracking-[-0.02em] text-[var(--frontend-prompt-card-text)]">{item.title}</h2>{item.summary ? <p className="mt-2 line-clamp-2 min-h-10 text-[12px] leading-5 text-[var(--frontend-prompt-card-muted)]">{item.summary}</p> : null}<div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--frontend-prompt-card-border)] pt-3 text-[11px] text-[var(--frontend-prompt-card-muted)]"><span>{item.chapterCount} 章</span><span>{item.publishedPostCount} 篇</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDate(item.updateTime)}</span></div></div>
    </Link>
    <div className="absolute right-3 top-3 z-10"><FavoriteButton favorited={item.favorited} favoriteCount={item.favoriteCount} isLoading={isFavoriteLoading} onClick={onToggleFavorite} /></div>
  </article>;
}

function PostCard({ item, isFavoriteLoading, onToggleFavorite }: { item: TutorialPostOutline; isFavoriteLoading: boolean; onToggleFavorite: () => void }) {
  return <article className="group flex min-h-[76px] items-center overflow-hidden rounded-[10px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-bg)] transition-colors hover:border-[var(--frontend-prompt-card-border-hover)]">
    <Link to={`/tutorials/posts/${item.id}`} className="min-w-0 flex-1 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--chat-ink)]/20">
      <h2 className="truncate text-[14px] font-semibold leading-5 tracking-[-0.015em] text-[var(--frontend-prompt-card-text)]">{item.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--frontend-prompt-card-muted)]"><span className="inline-flex items-center gap-1">{item.memberOnly === 1 ? <Lock className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}{item.memberOnly === 1 ? "会员专享" : "免费"}</span>{item.bookTitle ? <span className="max-w-[220px] truncate">{item.bookTitle}</span> : null}<span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />有效阅读 {item.readCount}</span><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />独立读者 {item.uniqueReaderCount}</span><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />{formatDate(item.publishedAt)}</span></div>
    </Link>
    <div className="shrink-0 pr-3"><FavoriteButton favorited={item.favorited} favoriteCount={item.favoriteCount} isLoading={isFavoriteLoading} onClick={onToggleFavorite} /></div>
  </article>;
}

function SkeletonCard() {
  return <div className="overflow-hidden rounded-[12px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-bg)]"><div className="frontend-prompt-skeleton aspect-[4/3]" /><div className="space-y-3 p-4"><div className="frontend-prompt-skeleton h-5 w-3/4 rounded-[4px]" /><div className="frontend-prompt-skeleton h-10 w-full rounded-[4px]" /></div></div>;
}

function PostSkeletonRow() {
  return <div className="flex min-h-[76px] items-center rounded-[10px] border border-[var(--frontend-prompt-card-border)] bg-[var(--frontend-prompt-card-bg)] px-4"><div className="min-w-0 flex-1 space-y-2"><div className="frontend-prompt-skeleton h-4 w-48 rounded-[4px]" /><div className="frontend-prompt-skeleton h-3 w-64 max-w-full rounded-[4px]" /></div><div className="frontend-prompt-skeleton ml-4 h-8 w-12 rounded-[8px]" /></div>;
}

function FilterSelect({ ariaLabel, value, onChange, children }: { ariaLabel: string; value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <select aria-label={ariaLabel} value={value} onChange={(event) => onChange(event.target.value)} className="h-8 rounded-[7px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-2.5 text-[12px] text-[var(--chat-control-text)] focus:outline-none focus:ring-2 focus:ring-[var(--chat-ink)]/10">{children}</select>;
}

export function TutorialLibraryPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view: TutorialLibraryView = searchParams.get("view") === "favorites" ? "favorites" : "books";
  const favoriteKind: FavoriteKind = searchParams.get("type") === "posts" ? "posts" : "books";
  const [overview, setOverview] = useState<TutorialOverview>(emptyOverview);
  const [categories, setCategories] = useState<TutorialFilterItem[]>([]);
  const [tags, setTags] = useState<TutorialFilterItem[]>([]);
  const [books, setBooks] = useState<TutorialBookListItem[]>([]);
  const [posts, setPosts] = useState<TutorialPostOutline[]>([]);
  const [draftKeyword, setDraftKeyword] = useState("");
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [tagId, setTagId] = useState("");
  const [accessFilter, setAccessFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [favoriteBusyIds, setFavoriteBusyIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const isPublicView = view === "books";
  useDocumentMeta(
    isPublicView ? "OwnAI 系统教程｜前端开发与 Vibe Coding 实战" : "我的教程收藏 · OwnAI",
    isPublicView
      ? "浏览 OwnAI 系统教程、免费文章与章节目录，学习前端开发、智能体构建和 Vibe Coding 实战方法。"
      : "查看你收藏的 OwnAI 教程与文章。",
    {
      canonical: "https://ownai.icu/tutorials",
      image: "https://ownai.icu/images/design-everything-dark-bg.png",
      robots: isPublicView ? "index, follow" : "noindex, nofollow",
      structuredData: isPublicView ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "OwnAI 系统教程",
        url: "https://ownai.icu/tutorials",
        description: "前端开发、智能体构建和 Vibe Coding 系统教程与文章。",
        inLanguage: "zh-CN",
        isPartOf: { "@id": "https://ownai.icu/#website" },
      } : null,
    },
  );

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([getTutorialOverview(controller.signal), getTutorialFilters(controller.signal)]).then(([nextOverview, nextFilters]) => { setOverview(nextOverview); setCategories(nextFilters.categories); setTags(nextFilters.tags); }).catch((error) => { const nextMessage = getErrorMessage(error, "教程信息加载失败"); if (nextMessage) setMessage(nextMessage); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true); setPage(1); setPages(0); setBooks([]); setPosts([]); setMessage(null);
    const request = view === "books"
      ? pageTutorialBooks({ current: 1, pageSize: PAGE_SIZE, keyword: keyword || undefined, categoryId: categoryId || undefined, tagId: tagId || undefined, accessType: accessFilter === "all" ? undefined : accessFilter as TutorialAccessType, sort: "default" }, controller.signal).then((result) => { setBooks(result.records); setPages(Number(result.pages) || 0); })
      : favoriteKind === "books"
        ? pageFavoriteTutorialBooks({ current: 1, pageSize: PAGE_SIZE, keyword: keyword || undefined, sort: "latest" }, controller.signal).then((result) => { setBooks(result.records); setPages(Number(result.pages) || 0); })
        : pageFavoriteTutorialPosts({ current: 1, pageSize: PAGE_SIZE, keyword: keyword || undefined, sort: "latest" }, controller.signal).then((result) => { setPosts(result.records); setPages(Number(result.pages) || 0); });
    request.catch((error) => {
      if (isAuthenticationError(error)) { navigate("/auth/login", { replace: true, state: { redirectTo: "/tutorials?view=favorites" } }); return; }
      const nextMessage = getErrorMessage(error, "教程内容加载失败"); if (nextMessage) setMessage(nextMessage);
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [accessFilter, categoryId, favoriteKind, keyword, navigate, tagId, view]);

  const setFavoriteBusy = (id: string, busy: boolean) => setFavoriteBusyIds((current) => { const next = new Set(current); if (busy) next.add(id); else next.delete(id); return next; });
  const handleFavoriteError = (error: unknown) => {
    if (isAuthenticationError(error)) { navigate("/auth/login", { state: { redirectTo: "/tutorials" } }); return; }
    setMessage(getErrorMessage(error, "收藏操作失败"));
  };

  const handleToggleBookFavorite = async (item: TutorialBookListItem) => {
    if (favoriteBusyIds.has(item.id)) return;
    const nextFavorited = !item.favorited;
    const optimisticItem = { ...item, favorited: nextFavorited, favoriteCount: Math.max(0, item.favoriteCount + (nextFavorited ? 1 : -1)) };
    setFavoriteBusy(item.id, true); setBooks((current) => current.map((entry) => entry.id === item.id ? optimisticItem : entry));
    try {
      if (nextFavorited) await favoriteTutorialBook(item.id); else await cancelFavoriteTutorialBook(item.id);
      if (view === "favorites" && !nextFavorited) setBooks((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) { setBooks((current) => current.map((entry) => entry.id === item.id ? item : entry)); handleFavoriteError(error); }
    finally { setFavoriteBusy(item.id, false); }
  };

  const handleTogglePostFavorite = async (item: TutorialPostOutline) => {
    if (favoriteBusyIds.has(item.id)) return;
    const nextFavorited = !item.favorited;
    const optimisticItem = { ...item, favorited: nextFavorited, favoriteCount: Math.max(0, item.favoriteCount + (nextFavorited ? 1 : -1)) };
    setFavoriteBusy(item.id, true); setPosts((current) => current.map((entry) => entry.id === item.id ? optimisticItem : entry));
    try {
      if (nextFavorited) await favoriteTutorialPost(item.id); else await cancelFavoriteTutorialPost(item.id);
      if (view === "favorites" && !nextFavorited) setPosts((current) => current.filter((entry) => entry.id !== item.id));
    } catch (error) { setPosts((current) => current.map((entry) => entry.id === item.id ? item : entry)); handleFavoriteError(error); }
    finally { setFavoriteBusy(item.id, false); }
  };

  const handleViewChange = (nextView: TutorialLibraryView) => {
    setAccessFilter("all"); setCategoryId(""); setTagId("");
    const next = new URLSearchParams(searchParams);
    if (nextView === "favorites") next.set("view", "favorites"); else { next.delete("view"); next.delete("type"); }
    setSearchParams(next, { replace: true });
  };
  const handleFavoriteKindChange = (nextKind: FavoriteKind) => {
    const next = new URLSearchParams(searchParams); next.set("view", "favorites");
    if (nextKind === "posts") next.set("type", "posts"); else next.delete("type");
    setSearchParams(next, { replace: true });
  };

  const handleLoadMore = async () => {
    if (page >= pages || isLoadingMore) return;
    const nextPage = page + 1; setIsLoadingMore(true);
    try {
      if (view === "books") {
        const result = await pageTutorialBooks({ current: nextPage, pageSize: PAGE_SIZE, keyword: keyword || undefined, categoryId: categoryId || undefined, tagId: tagId || undefined, accessType: accessFilter === "all" ? undefined : accessFilter as TutorialAccessType, sort: "default" }); setBooks((current) => [...current, ...result.records]);
      } else if (favoriteKind === "books") {
        const result = await pageFavoriteTutorialBooks({ current: nextPage, pageSize: PAGE_SIZE, keyword: keyword || undefined, sort: "latest" }); setBooks((current) => [...current, ...result.records]);
      } else {
        const result = await pageFavoriteTutorialPosts({ current: nextPage, pageSize: PAGE_SIZE, keyword: keyword || undefined, sort: "latest" }); setPosts((current) => [...current, ...result.records]);
      }
      setPage(nextPage);
    } catch (error) { handleFavoriteError(error); }
    finally { setIsLoadingMore(false); }
  };

  const categoryItems: TutorialSidebarItem[] = categories.map((item) => ({ id: item.id, label: item.name, count: item.count, kind: "category" as const, active: categoryId === item.id && view === "books", onClick: () => { setCategoryId(item.id); setTagId(""); const next = new URLSearchParams(searchParams); next.delete("view"); next.delete("type"); setSearchParams(next, { replace: true }); } }));
  const topItems: TutorialSidebarItem[] = [
    { id: "books", label: "全部教程", count: overview.bookCount, active: view === "books" && !categoryId, onClick: () => handleViewChange("books") },
    { id: "favorites", label: "我的收藏", kind: "category", active: view === "favorites", onClick: () => handleViewChange("favorites") },
  ];
  const itemsLength = view === "favorites" && favoriteKind === "posts" ? posts.length : books.length;

  return <TutorialWorkspaceShell sidebarHeading="教程分类" items={categoryItems} topItems={topItems} header={<><div className="min-w-0 flex-1"><h1 className="truncate text-[16px] font-semibold text-[var(--chat-ink)]">{view === "books" ? "教程" : "我的收藏"}</h1></div><form onSubmit={(event: FormEvent) => { event.preventDefault(); setKeyword(draftKeyword.trim()); }} className="flex h-9 min-w-0 flex-[1.4] items-center gap-2 rounded-[9px] bg-[var(--chat-control-soft)] px-3 text-[var(--chat-muted)] sm:max-w-[380px]"><Search className="h-4 w-4 shrink-0" /><input value={draftKeyword} onChange={(event) => setDraftKeyword(event.target.value)} placeholder={view === "books" ? "搜索教程" : "搜索收藏"} className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--chat-ink)] placeholder:text-[var(--chat-input-placeholder)] focus:outline-none" /></form></>}>
    {view === "books" ? <div className="flex flex-wrap items-center gap-2 border-b border-[var(--chat-border)] px-4 py-2.5 sm:px-5"><span className="inline-flex items-center gap-1.5 text-[12px] text-[var(--chat-muted)]"><SlidersHorizontal className="h-3.5 w-3.5" />筛选</span><button type="button" onClick={() => setAccessFilter("all")} className={cn("inline-flex h-8 items-center rounded-[7px] px-2.5 text-[12px] font-medium transition-colors", accessFilter === "all" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-ink)]" : "text-[var(--chat-muted)] hover:bg-[var(--chat-control-soft)]")}>全部</button><button type="button" onClick={() => setAccessFilter("member")} className={cn("inline-flex h-8 items-center rounded-[7px] px-2.5 text-[12px] font-medium transition-colors", accessFilter === "member" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-ink)]" : "text-[var(--chat-muted)] hover:bg-[var(--chat-control-soft)]")}>会员专享</button>{tags.length ? <FilterSelect ariaLabel="标签" value={tagId} onChange={setTagId}><option value="">全部标签</option>{tags.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.count}</option>)}</FilterSelect> : null}</div> : <div className="flex items-center gap-2 border-b border-[var(--chat-border)] px-4 py-2.5 sm:px-5"><button type="button" onClick={() => handleFavoriteKindChange("books")} className={cn("inline-flex h-8 items-center rounded-[7px] px-2.5 text-[12px] font-medium transition-colors", favoriteKind === "books" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-ink)]" : "text-[var(--chat-muted)] hover:bg-[var(--chat-control-soft)]")}>教程书</button><button type="button" onClick={() => handleFavoriteKindChange("posts")} className={cn("inline-flex h-8 items-center rounded-[7px] px-2.5 text-[12px] font-medium transition-colors", favoriteKind === "posts" ? "bg-[var(--chat-sidebar-active)] text-[var(--chat-ink)]" : "text-[var(--chat-muted)] hover:bg-[var(--chat-control-soft)]")}>教程文章</button></div>}
    <div className="px-4 py-4 sm:px-5">{isLoading ? view === "favorites" && favoriteKind === "posts" ? <div className="space-y-2">{Array.from({ length: 6 }).map((_, index) => <PostSkeletonRow key={index} />)}</div> : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />)}</div> : itemsLength > 0 ? <><div className={cn(view === "favorites" && favoriteKind === "posts" ? "space-y-2" : "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")}>{view === "favorites" && favoriteKind === "posts" ? posts.map((item) => <PostCard key={item.id} item={item} isFavoriteLoading={favoriteBusyIds.has(item.id)} onToggleFavorite={() => void handleTogglePostFavorite(item)} />) : books.map((item) => <BookCard key={item.id} item={item} isFavoriteLoading={favoriteBusyIds.has(item.id)} onToggleFavorite={() => void handleToggleBookFavorite(item)} />)}</div>{page < pages ? <div className="mt-6 flex justify-center"><button type="button" disabled={isLoadingMore} onClick={() => void handleLoadMore()} className="inline-flex h-9 items-center rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 text-[12px] font-semibold text-[var(--chat-control-text)] disabled:opacity-60">{isLoadingMore ? "正在加载" : "加载更多"}</button></div> : null}</> : <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">{view === "books" ? <Library className="h-6 w-6 text-[var(--chat-muted-2)]" /> : <Heart className="h-6 w-6 text-[var(--chat-muted-2)]" />}<p className="mt-3 text-[14px] font-semibold text-[var(--chat-ink)]">{view === "favorites" ? favoriteKind === "books" ? "还没有收藏教程书" : "还没有收藏教程文章" : keyword || categoryId || tagId || accessFilter !== "all" ? "没有找到匹配内容" : "教程正在整理中"}</p><p className="mt-1 text-[12px] text-[var(--chat-muted)]">{view === "favorites" ? "收藏内容后会显示在这里" : keyword || categoryId || tagId || accessFilter !== "all" ? "调整筛选条件或搜索词后再试" : "后台发布内容后会自动出现在这里"}</p></div>}</div>
    {message ? <RequestErrorToast message={message} variant="chat" onClose={() => setMessage(null)} /> : null}
  </TutorialWorkspaceShell>;
}
