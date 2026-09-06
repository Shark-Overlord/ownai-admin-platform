import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Crown, Eye, FileQuestion, Heart, List, Lock, LogIn, Users, X } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { TutorialContent, type TutorialContentOutlineItem } from "@/components/tutorial/TutorialContent";
import { TutorialWorkspaceShell, type TutorialSidebarItem } from "@/components/tutorial/TutorialWorkspaceShell";
import { RequestErrorToast } from "@/components/ui/RequestErrorToast";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { useEffectiveArticleRead } from "@/hooks/useEffectiveArticleRead";
import { getPersistedLoginUser } from "@/lib/auth";
import { isAuthenticationError, RequestError } from "@/lib/request";
import { cancelFavoriteTutorialPost, favoriteTutorialPost, getTutorialBook, getTutorialPost, type TutorialBookDetail, type TutorialPostDetail, type TutorialPostNav } from "@/lib/tutorial";
import { cn } from "@/lib/utils";

type TutorialPostState = "loading" | "ready" | "login" | "member" | "not-found" | "error";
type OutlineItem = TutorialContentOutlineItem;

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function PostNavigationCard({ direction, post, onClick }: { direction: "previous" | "next"; post: TutorialPostNav; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="group flex min-h-20 w-full items-center gap-3 rounded-[10px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 py-3 text-left transition-colors hover:border-[var(--chat-border-strong)] hover:bg-[var(--chat-control-hover)]">{direction === "previous" ? <ArrowLeft className="h-4 w-4 shrink-0 text-[var(--chat-muted)] transition-transform group-hover:-translate-x-0.5" /> : null}<span className="min-w-0 flex-1"><span className="block text-[10px] font-semibold text-[var(--chat-muted)]">{direction === "previous" ? "上一篇" : "下一篇"}</span><span className="mt-1 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--chat-ink)]"><span className="truncate">{post.title}</span>{!post.canAccess ? <Lock className="h-3 w-3 shrink-0 text-[var(--chat-muted)]" /> : null}</span></span>{direction === "next" ? <ArrowRight className="h-4 w-4 shrink-0 text-[var(--chat-muted)] transition-transform group-hover:translate-x-0.5" /> : null}</button>;
}

function ArticleOutline({ items, activeId, onSelect }: { items: OutlineItem[]; activeId: string; onSelect: (id: string) => void }) {
  return <nav aria-label="本文目录" role="tree" className="border-l border-[var(--chat-border)]">{items.map((item) => <button key={item.id} type="button" role="treeitem" aria-level={item.level} aria-controls="tutorial-article-viewport" aria-current={activeId === item.id ? "location" : undefined} onClick={() => onSelect(item.id)} className={cn("relative block w-full cursor-pointer truncate py-1.5 pr-2 text-left text-[12px] leading-5 transition-colors before:absolute before:-left-px before:top-1.5 before:h-5 before:w-px before:bg-transparent", item.level === 3 ? "pl-9" : item.level === 2 ? "pl-6" : "pl-3", activeId === item.id ? "font-semibold text-[var(--tutorial-toc-active)] before:bg-[var(--tutorial-toc-active)]" : "text-[var(--tutorial-navigation)] hover:text-[var(--tutorial-toc-active)]")}>{item.label}</button>)}</nav>;
}

export function TutorialPostPage() {
  const { postId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const articleRef = useRef<HTMLElement | null>(null);
  const articleScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingOutlineScrollRef = useRef<string | null>(null);
  const programmaticHeadingRef = useRef<string | null>(null);
  const programmaticScrollTimerRef = useRef<number | null>(null);
  const [post, setPost] = useState<TutorialPostDetail | null>(null);
  const [book, setBook] = useState<TutorialBookDetail | null>(null);
  const [state, setState] = useState<TutorialPostState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const postCanonical = `https://ownai.icu/tutorials/posts/${postId}`;
  const isPublicPost = Boolean(
    post &&
    post.memberOnly === 0 &&
    (!post.bookId || (book && book.memberOnly === 0)),
  );
  useDocumentMeta(
    `${post?.seoTitle || post?.title || "教程文章"} · OwnAI 教程`,
    post?.seoDescription || post?.summary || "OwnAI 教程文章",
    {
      canonical: postCanonical,
      image: post?.coverUrl || "https://ownai.icu/images/design-everything-dark-bg.png",
      robots: isPublicPost ? "index, follow" : "noindex, nofollow",
      type: "article",
      structuredData: isPublicPost && post ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.seoDescription || post.summary || post.title,
        image: post.coverUrl || undefined,
        datePublished: post.publishedAt,
        inLanguage: "zh-CN",
        mainEntityOfPage: postCanonical,
        author: { "@type": "Organization", name: "OwnAI", url: "https://ownai.icu/" },
        publisher: {
          "@type": "Organization",
          name: "OwnAI",
          url: "https://ownai.icu/",
          logo: { "@type": "ImageObject", url: "https://ownai.icu/images/ownai-logo.png" },
        },
      } : null,
    },
  );

  const handleOutlineChange = useCallback((items: TutorialContentOutlineItem[]) => {
    setOutline(items);
    setActiveHeadingId(items[0]?.id || "");
  }, []);

  const handleReadTracked = useCallback((result: { readCount: string; uniqueReaderCount: string }) => {
    setPost((previous) => previous ? {
      ...previous,
      readCount: result.readCount,
      uniqueReaderCount: result.uniqueReaderCount,
    } : previous);
  }, []);

  useEffectiveArticleRead({
    postId: post?.id,
    enabled:
      state === "ready" &&
      Boolean(post?.canAccess) &&
      Boolean(post?.contentHtml.trim()) &&
      post?.id === postId,
    thresholdSeconds: 10,
    onTracked: handleReadTracked,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState("loading"); setPost(null); setBook(null); setMessage(null); setOutline([]); setReadingProgress(0); setIsOutlineOpen(false);
    getTutorialPost(postId, controller.signal).then(async (nextPost) => {
      setPost(nextPost); setState("ready");
      if (nextPost.bookId) {
        try { setBook(await getTutorialBook(nextPost.bookId, controller.signal)); } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setBook(null); }
      }
    }).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof RequestError) {
        if (error.code === 40100 || error.status === 401) { setState("login"); return; }
        if (error.code === 40300 || error.code === 40101 || error.status === 403) { setState(getPersistedLoginUser() ? "member" : "login"); return; }
        if (error.code === 40400 || error.status === 404) { setState("not-found"); return; }
        setMessage(error.message);
      } else setMessage("文章加载失败");
      setState("error");
    });
    return () => controller.abort();
  }, [postId]);

  useEffect(() => {
    const root = articleRef.current;
    if (!root || !post) return;
    const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h1[id], h2[id], h3[id]"));

    const scrollRoot = articleScrollRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (programmaticHeadingRef.current) return;
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActiveHeadingId(visible.target.id);
    }, { root: scrollRoot, rootMargin: "-15% 0px -70% 0px", threshold: 0 });
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [post?.contentHtml, post?.id]);

  useEffect(() => {
    const scrollRoot = articleScrollRef.current;
    if (!scrollRoot || state !== "ready") return;
    const update = () => { const max = scrollRoot.scrollHeight - scrollRoot.clientHeight; setReadingProgress(max > 0 ? Math.min(100, Math.max(0, (scrollRoot.scrollTop / max) * 100)) : 100); };
    update(); scrollRoot.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update);
    return () => { scrollRoot.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [state, post?.id]);

  useEffect(() => {
    if (state === "ready" && post?.id) articleScrollRef.current?.scrollTo({ top: 0 });
  }, [post?.id, state]);

  useEffect(() => () => {
    if (programmaticScrollTimerRef.current) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
  }, []);

  const directoryItems = useMemo<TutorialSidebarItem[]>(() => book ? book.chapters.flatMap((chapter) => [
    { id: `chapter-${chapter.id}`, label: chapter.title, count: chapter.postCount, kind: "chapter" as const, onClick: () => undefined },
    ...chapter.posts.map((item) => ({ id: item.id, parentId: `chapter-${chapter.id}`, label: item.title, kind: "post" as const, active: item.id === postId, locked: !item.canAccess, onClick: () => navigate(`/tutorials/posts/${item.id}`) })),
  ]) : [], [book, navigate, postId]);
  const handleBack = () => navigate(post?.bookId ? `/tutorials/books/${post.bookId}` : "/tutorials");
  const scrollToHeading = useCallback((id: string) => {
    const scroller = articleScrollRef.current;
    const headings = Array.from(articleRef.current?.querySelectorAll<HTMLHeadingElement>("h1, h2, h3") || []);
    const target = headings.find((heading) => heading.id === id) || headings[outline.find((item) => item.id === id)?.index ?? -1];
    if (!target || !scroller) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scale = scroller.offsetHeight > 0 ? scrollerRect.height / scroller.offsetHeight : 1;
    const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    const nextTop = scroller.scrollTop + ((targetRect.top - scrollerRect.top) / normalizedScale) - 18;
    programmaticHeadingRef.current = id;
    setActiveHeadingId(id);
    scroller.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    if (programmaticScrollTimerRef.current) {
      window.clearTimeout(programmaticScrollTimerRef.current);
    }
    programmaticScrollTimerRef.current = window.setTimeout(() => {
      programmaticHeadingRef.current = null;
      programmaticScrollTimerRef.current = null;
    }, 900);
  }, [outline]);
  const handleOutlineSelect = useCallback((id: string, closeOutline = false) => {
    if (closeOutline) {
      pendingOutlineScrollRef.current = id;
      setActiveHeadingId(id);
      setIsOutlineOpen(false);
      return;
    }
    scrollToHeading(id);
  }, [scrollToHeading]);
  const handleToggleFavorite = async () => {
    if (!post || isFavoriteLoading) return;
    const previous = post;
    const nextFavorited = !post.favorited;
    setPost({
      ...post,
      favorited: nextFavorited,
      favoriteCount: Math.max(0, post.favoriteCount + (nextFavorited ? 1 : -1)),
    });
    setIsFavoriteLoading(true);
    try {
      if (nextFavorited) await favoriteTutorialPost(post.id);
      else await cancelFavoriteTutorialPost(post.id);
    } catch (error) {
      setPost(previous);
      if (isAuthenticationError(error)) {
        navigate("/auth/login", { state: { redirectTo: `/tutorials/posts/${post.id}` } });
      } else {
        setMessage(error instanceof Error ? error.message : "收藏操作失败");
      }
    } finally {
      setIsFavoriteLoading(false);
    }
  };
  return <TutorialWorkspaceShell
    sidebarHeading={book?.title || post?.bookTitle || "文章目录"}
    sidebarDescription={book ? `${book.chapterCount} 章 · ${book.publishedPostCount} 篇文章` : "独立文章"}
    items={directoryItems}
    topItems={[{ id: "back", label: post?.bookId ? "返回教程概览" : "返回全部教程", kind: "category", onClick: handleBack }]}
    mainClassName="overflow-hidden"
    sectionClassName="tutorial-reading-page h-full min-h-0"
    header={<><div className="min-w-0 flex-1"><h1 className="truncate text-[16px] font-semibold text-[var(--tutorial-title)]">{post?.bookTitle || "教程阅读"}</h1><p className="mt-0.5 hidden truncate text-[12px] text-[var(--tutorial-description)] sm:block">{post?.title || "正在加载文章"}</p></div>{outline.length && !isOutlineOpen ? <button type="button" onClick={() => setIsOutlineOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-3 text-[12px] font-semibold text-[var(--chat-control-text)] xl:hidden"><List className="h-3.5 w-3.5" />本文目录</button> : null}</>}
    aside={state === "ready" && post ? <aside className="tutorial-post-scroll hidden min-h-0 overflow-y-auto overscroll-contain border-l border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-7 py-10 xl:block"><div className="mb-4 flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--tutorial-description)]">本文目录</p><span className="text-[10px] tabular-nums text-[var(--tutorial-weak)]">{Math.round(readingProgress)}%</span></div>{outline.length ? <ArticleOutline items={outline} activeId={activeHeadingId} onSelect={handleOutlineSelect} /> : <p className="border-l border-[var(--chat-border)] py-2 pl-3 text-[12px] text-[var(--tutorial-navigation)]">正文暂无标题</p>}</aside> : null}
  >
    <div className="h-px shrink-0 bg-[var(--chat-control-soft)]"><div className="h-full bg-[var(--chat-muted-2)] opacity-55 transition-[width] duration-150" style={{ width: `${readingProgress}%` }} /></div>
    {state === "loading" ? <div className="mx-auto min-h-0 w-full max-w-[820px] flex-1 space-y-5 overflow-y-auto px-6 py-12"><div className="frontend-prompt-skeleton h-4 w-36 rounded-[4px]" /><div className="frontend-prompt-skeleton h-12 w-4/5 rounded-[6px]" /><div className="frontend-prompt-skeleton h-20 w-full rounded-[8px]" /><div className="frontend-prompt-skeleton mt-10 h-[420px] w-full rounded-[12px]" /></div> : state === "ready" && post ? <div ref={articleScrollRef} id="tutorial-article-viewport" className="tutorial-post-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto w-full max-w-[860px] px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
        <header className="border-b border-[var(--chat-border)] pb-8"><h1 className="text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[var(--tutorial-title)] sm:text-[40px]">{post.title}</h1>{post.summary ? <p className="mt-4 text-[16px] leading-8 text-[var(--tutorial-description)]">{post.summary}</p> : null}<div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--tutorial-weak)]"><span>{formatDate(post.publishedAt)}</span><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" />有效阅读 {post.readCount}</span><span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />独立读者 {post.uniqueReaderCount}</span>{post.tags.map((tag) => <span key={tag.id} className="rounded-[5px] bg-[var(--chat-control-soft)] px-2 py-1">{tag.name}</span>)}<button type="button" onClick={() => void handleToggleFavorite()} disabled={isFavoriteLoading} className={cn("inline-flex h-7 items-center gap-1.5 rounded-[7px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-2 text-[11px] font-semibold transition-colors disabled:opacity-60", post.favorited ? "text-rose-500" : "text-[var(--tutorial-navigation)] hover:text-[var(--tutorial-toc-active)]")}><Heart className={cn("h-3 w-3", post.favorited && "fill-current")} />{post.favorited ? "已收藏" : "收藏"}<span className="tabular-nums">{post.favoriteCount}</span></button></div></header>
        {post.coverUrl ? <button type="button" onClick={() => setLightboxUrl(post.coverUrl || null)} className="mt-8 block w-full overflow-hidden rounded-[12px] border border-[var(--chat-border)] bg-[var(--chat-control-soft)]"><img src={post.coverUrl} alt={`${post.title}封面`} className="max-h-[520px] w-full object-cover" decoding="async" /></button> : null}
        <TutorialContent
          ref={articleRef}
          contentHtml={post.contentHtml}
          className="mt-10"
          onImageOpen={setLightboxUrl}
          onMessage={setMessage}
          onOutlineChange={handleOutlineChange}
        />
        {post.previousPost || post.nextPost ? <nav aria-label="教程文章导航" className="mt-12 grid gap-3 border-t border-[var(--chat-border)] pt-6 sm:grid-cols-2"><div>{post.previousPost ? <PostNavigationCard direction="previous" post={post.previousPost} onClick={() => navigate(`/tutorials/posts/${post.previousPost?.id}`)} /> : null}</div><div>{post.nextPost ? <PostNavigationCard direction="next" post={post.nextPost} onClick={() => navigate(`/tutorials/posts/${post.nextPost?.id}`)} /> : null}</div></nav> : null}
      </div>
    </div> : <section className="mx-auto my-10 flex min-h-0 flex-1 max-w-[720px] flex-col items-center justify-center overflow-y-auto px-6 text-center">{state === "login" ? <LogIn className="h-8 w-8 text-[var(--chat-muted-2)]" /> : state === "member" ? <Crown className="h-8 w-8 text-[var(--chat-muted-2)]" /> : <FileQuestion className="h-8 w-8 text-[var(--chat-muted-2)]" />}<h1 className="mt-4 text-[20px] font-semibold text-[var(--chat-ink)]">{state === "login" ? "登录后继续阅读" : state === "member" ? "这篇文章为会员专享" : state === "not-found" ? "文章不存在或已下线" : "文章暂时无法打开"}</h1><p className="mt-2 max-w-[440px] text-[13px] leading-6 text-[var(--chat-muted)]">{state === "login" ? "登录后会回到当前文章，并由详情接口重新确认阅读权限" : state === "member" ? "开通有效会员后即可阅读完整正文" : "返回教程首页查看其他已发布内容"}</p><div className="mt-6 flex gap-2">{state === "login" ? <button type="button" onClick={() => navigate("/auth/login", { state: { redirectTo: `${location.pathname}${location.search}` } })} className="inline-flex h-9 items-center rounded-[8px] bg-[var(--chat-primary-bg)] px-4 text-[12px] font-semibold text-[var(--chat-primary-text)]">去登录</button> : state === "member" ? <button type="button" onClick={() => navigate(`/pricing?returnTo=${encodeURIComponent(`${location.pathname}${location.search}`)}`)} className="inline-flex h-9 items-center rounded-[8px] bg-[var(--chat-primary-bg)] px-4 text-[12px] font-semibold text-[var(--chat-primary-text)]">查看会员方案</button> : null}<button type="button" onClick={() => navigate("/tutorials")} className="inline-flex h-9 items-center rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 text-[12px] font-semibold text-[var(--chat-ink)]">返回教程</button></div></section>}
    <Sheet open={isOutlineOpen} onOpenChange={setIsOutlineOpen}><SheetContent side="right" onCloseAutoFocus={(event) => { const id = pendingOutlineScrollRef.current; if (!id) return; event.preventDefault(); pendingOutlineScrollRef.current = null; window.requestAnimationFrame(() => scrollToHeading(id)); }} className="tutorial-reading-page image-studio-chat-sheet image-studio-chat-sidebar w-[min(88vw,320px)] border-[var(--chat-sidebar-border)] bg-[var(--chat-sidebar-bg)] p-0 text-[var(--chat-sidebar-text)] [&>button]:hidden"><SheetTitle className="sr-only">本文目录</SheetTitle><SheetDescription className="sr-only">选择文章中的标题</SheetDescription><div className="p-4"><div className="flex items-center justify-between"><p className="text-[15px] font-semibold">本文目录</p><button type="button" onClick={() => setIsOutlineOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] hover:bg-[var(--chat-sidebar-hover)]" aria-label="关闭本文目录"><X className="h-4 w-4" /></button></div><div className="mt-4"><ArticleOutline items={outline} activeId={activeHeadingId} onSelect={(id) => handleOutlineSelect(id, true)} /></div></div></SheetContent></Sheet>
    {lightboxUrl ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="图片预览" onClick={() => setLightboxUrl(null)}><button type="button" onClick={() => setLightboxUrl(null)} className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/15" aria-label="关闭图片预览"><X className="h-5 w-5" /></button><img src={lightboxUrl} alt="文章图片预览" className="max-h-[92vh] max-w-[92vw] object-contain" onClick={(event) => event.stopPropagation()} /></div> : null}
    {message ? <RequestErrorToast message={message} variant="chat" onClose={() => setMessage(null)} /> : null}
  </TutorialWorkspaceShell>;
}
