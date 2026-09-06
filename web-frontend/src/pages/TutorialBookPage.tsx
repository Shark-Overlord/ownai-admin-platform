import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Crown, FileText, Heart, Lock } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { TutorialContent } from "@/components/tutorial/TutorialContent";
import { TutorialWorkspaceShell, type TutorialSidebarItem } from "@/components/tutorial/TutorialWorkspaceShell";
import { RequestErrorToast } from "@/components/ui/RequestErrorToast";
import { useDocumentMeta } from "@/hooks/useDocumentMeta";
import { isAuthenticationError, RequestError } from "@/lib/request";
import { cancelFavoriteTutorialBook, favoriteTutorialBook, getTutorialBook, type TutorialBookDetail } from "@/lib/tutorial";
import { cn } from "@/lib/utils";

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function TutorialBookPage() {
  const navigate = useNavigate();
  const { bookId = "" } = useParams();
  const [book, setBook] = useState<TutorialBookDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const bookCanonical = `https://ownai.icu/tutorials/books/${bookId}`;
  useDocumentMeta(
    `${book?.seoTitle || book?.title || "教程目录"} · OwnAI 教程`,
    book?.seoDescription || book?.summary || "OwnAI 系统教程目录",
    {
      canonical: bookCanonical,
      image: book?.coverUrl || "https://ownai.icu/images/design-everything-dark-bg.png",
      robots: book && book.memberOnly === 0 ? "index, follow" : "noindex, nofollow",
      structuredData: book && book.memberOnly === 0 ? {
        "@context": "https://schema.org",
        "@type": "Course",
        name: book.title,
        description: book.seoDescription || book.summary || book.title,
        url: bookCanonical,
        image: book.coverUrl || undefined,
        provider: { "@type": "Organization", name: "OwnAI", url: "https://ownai.icu/" },
        inLanguage: "zh-CN",
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "online",
          courseWorkload: `${book.chapterCount} 章，${book.publishedPostCount} 篇文章`,
        },
      } : null,
    },
  );

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true); setBook(null); setErrorCode(null); setMessage(null);
    getTutorialBook(bookId, controller.signal).then(setBook).catch((error) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      if (error instanceof RequestError) {
        const code = error.code ?? error.status ?? null;
        const isExpectedAccessError = code === 40100 || code === 40101 || code === 40300 || code === 401 || code === 403;
        setErrorCode(code);
        if (code !== 40400 && code !== 404 && !isExpectedAccessError) setMessage(error.message);
      }
      else setMessage("教程目录加载失败");
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [bookId]);

  const directoryItems = useMemo<TutorialSidebarItem[]>(() => book ? book.chapters.flatMap((chapter) => [
    { id: `chapter-${chapter.id}`, label: chapter.title, count: chapter.postCount, kind: "chapter" as const, onClick: () => undefined },
    ...chapter.posts.map((post) => ({ id: post.id, parentId: `chapter-${chapter.id}`, label: post.title, kind: "post" as const, locked: !post.canAccess, onClick: () => navigate(`/tutorials/posts/${post.id}`) })),
  ]) : [], [book, navigate]);
  const firstPost = book?.chapters.flatMap((chapter) => chapter.posts)[0];
  const requiresLogin = errorCode === 40100 || errorCode === 401;
  const requiresMembership = errorCode === 40101 || errorCode === 40300 || errorCode === 403;

  const handleToggleFavorite = async () => {
    if (!book || isFavoriteLoading) return;
    const previous = book;
    const nextFavorited = !book.favorited;
    setBook({
      ...book,
      favorited: nextFavorited,
      favoriteCount: Math.max(0, book.favoriteCount + (nextFavorited ? 1 : -1)),
    });
    setIsFavoriteLoading(true);
    try {
      if (nextFavorited) await favoriteTutorialBook(book.id);
      else await cancelFavoriteTutorialBook(book.id);
    } catch (error) {
      setBook(previous);
      if (isAuthenticationError(error)) {
        navigate("/auth/login", { state: { redirectTo: `/tutorials/books/${book.id}` } });
      } else {
        setMessage(error instanceof Error ? error.message : "收藏操作失败");
      }
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  return <TutorialWorkspaceShell
    sidebarHeading={book?.title || "教程目录"}
    sidebarDescription={book ? `${book.chapterCount} 章 · ${book.publishedPostCount} 篇文章` : "正在加载目录"}
    items={directoryItems}
    topItems={[{ id: "back", label: "返回全部教程", kind: "category", onClick: () => navigate("/tutorials") }]}
    header={<div className="min-w-0 flex-1"><h1 className="truncate text-[16px] font-semibold text-[var(--chat-ink)]">{book?.title || "教程"}</h1><p className="mt-0.5 hidden text-[12px] text-[var(--chat-muted)] sm:block">教程概览与章节目录</p></div>}
  >
    <div className="tutorial-reading-page mx-auto w-full max-w-[1040px] px-5 py-8 sm:px-8 lg:py-12">
      {isLoading ? <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]"><div className="space-y-4"><div className="frontend-prompt-skeleton h-5 w-28 rounded-[5px]" /><div className="frontend-prompt-skeleton h-12 w-3/4 rounded-[6px]" /><div className="frontend-prompt-skeleton h-20 w-full rounded-[8px]" /></div><div className="frontend-prompt-skeleton h-52 w-full rounded-[12px]" /></div> : book ? <>
        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="pt-2">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[var(--chat-muted)]"><span>{book.category?.name || "教程"}</span><span aria-hidden="true">·</span><span>更新于 {formatDate(book.updateTime)}</span></div>
            <h1 className="mt-3 max-w-[720px] text-[30px] font-semibold leading-tight tracking-[-0.04em] text-[var(--chat-ink)] sm:text-[38px]">{book.title}</h1>
            {book.introductionHtml ? (
              <TutorialContent
                contentHtml={book.introductionHtml}
                className="mt-5 max-w-[720px]"
                onMessage={setMessage}
              />
            ) : book.summary ? <p className="mt-4 max-w-[720px] text-[15px] leading-7 text-[var(--tutorial-body)]">{book.summary}</p> : null}
            {book.tags.length ? <div className="mt-5 flex flex-wrap gap-2">{book.tags.map((tag) => <span key={tag.id} className="rounded-[6px] bg-[var(--chat-control-soft)] px-2.5 py-1 text-[11px] text-[var(--chat-muted)]">{tag.name}</span>)}</div> : null}
          </div>
          <div className="space-y-4">
            <aside className="overflow-hidden rounded-[12px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)]">
              {book.coverUrl ? <div className="aspect-[16/9] border-b border-[var(--chat-border)] bg-[var(--chat-control-soft)]"><img src={book.coverUrl} alt={`${book.title}封面`} className="h-full w-full object-cover" decoding="async" /></div> : <div className="flex aspect-[16/9] items-center justify-center border-b border-[var(--chat-border)] text-[var(--chat-muted-2)]"><BookOpen className="h-9 w-9" strokeWidth={1.4} /></div>}
              <dl className="grid grid-cols-2 gap-4 p-4 text-[12px]"><div><dt className="text-[var(--chat-muted)]">章节</dt><dd className="mt-1 font-semibold text-[var(--chat-ink)]">{book.chapterCount} 章</dd></div><div><dt className="text-[var(--chat-muted)]">文章</dt><dd className="mt-1 font-semibold text-[var(--chat-ink)]">{book.publishedPostCount} 篇</dd></div><div><dt className="text-[var(--chat-muted)]">免费阅读</dt><dd className="mt-1 font-semibold text-[var(--chat-ink)]">{book.freePostCount} 篇</dd></div><div><dt className="text-[var(--chat-muted)]">会员内容</dt><dd className="mt-1 font-semibold text-[var(--chat-ink)]">{book.memberPostCount} 篇</dd></div></dl>
            </aside>
            <div className="flex flex-wrap items-center gap-2">
              {firstPost ? <Link
                to={`/tutorials/posts/${firstPost.id}`}
                className="inline-flex h-9 items-center gap-2 rounded-[8px] px-4 text-[12px] font-semibold"
                style={{ backgroundColor: "var(--chat-primary-bg)", color: "var(--chat-primary-text)" }}
              >
                开始阅读
                <ArrowRight className="h-3.5 w-3.5" />
              </Link> : null}
              <button type="button" onClick={() => void handleToggleFavorite()} disabled={isFavoriteLoading} className={cn("inline-flex h-9 items-center gap-2 rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-3 text-[12px] font-semibold transition-colors disabled:opacity-60", book.favorited ? "text-rose-500" : "text-[var(--chat-ink)]")}><Heart className={cn("h-3.5 w-3.5", book.favorited && "fill-current")} />{book.favorited ? "已收藏" : "收藏"}<span className="tabular-nums text-[var(--chat-muted)]">{book.favoriteCount}</span></button>
            </div>
          </div>
        </section>
        {!book.canAccessAll && book.memberPostCount > 0 ? <div className="mt-8 flex flex-col gap-3 rounded-[10px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><Crown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--chat-muted)]" /><div><p className="text-[13px] font-semibold text-[var(--chat-ink)]">这套教程包含会员文章</p><p className="mt-1 text-[12px] leading-5 text-[var(--chat-muted)]">会员文章开通会员后即可访问</p></div></div><button type="button" onClick={() => navigate("/pricing")} className="inline-flex h-8 shrink-0 items-center justify-center rounded-[7px] border border-[var(--chat-border)] bg-[var(--chat-control-soft)] px-3 text-[12px] font-semibold text-[var(--chat-ink)]">查看会员方案</button></div> : null}
        <section className="mt-10 border-t border-[var(--chat-border)] pt-7 lg:hidden"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-[var(--chat-muted)]" /><h2 className="text-[16px] font-semibold text-[var(--chat-ink)]">章节目录</h2></div><div className="mt-4 space-y-2">{book.chapters.flatMap((chapter) => chapter.posts).map((post) => <Link key={post.id} to={`/tutorials/posts/${post.id}`} className="flex min-h-10 w-full items-center gap-2 rounded-[8px] border border-[var(--chat-border)] px-3 text-left text-[13px] text-[var(--chat-ink)]"><span className="min-w-0 flex-1 truncate">{post.title}</span>{!post.canAccess ? <Lock className="h-3.5 w-3.5 text-[var(--chat-muted)]" /> : null}</Link>)}</div></section>
      </> : <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
        {requiresMembership ? <Crown className="h-8 w-8 text-[var(--chat-muted-2)]" /> : <BookOpen className="h-8 w-8 text-[var(--chat-muted-2)]" />}
        <h1 className="mt-4 text-[18px] font-semibold text-[var(--chat-ink)]">
          {requiresLogin ? "登录后查看教程" : requiresMembership ? "这套教程为会员专享" : errorCode === 40400 || errorCode === 404 ? "教程不存在或已下线" : "教程暂时无法打开"}
        </h1>
        {requiresLogin || requiresMembership ? <p className="mt-2 max-w-[420px] text-[13px] leading-6 text-[var(--chat-muted)]">{requiresLogin ? "登录后将返回当前教程并重新确认阅读权限" : "开通有效会员后即可阅读教程内容"}</p> : null}
        <div className="mt-5 flex items-center gap-2">
          {requiresLogin ? <button type="button" onClick={() => navigate("/auth/login", { state: { redirectTo: `/tutorials/books/${bookId}` } })} className="inline-flex h-9 items-center rounded-[8px] bg-[var(--chat-primary-bg)] px-4 text-[12px] font-semibold text-[var(--chat-primary-text)]">去登录</button> : null}
          {requiresMembership ? <button type="button" onClick={() => navigate(`/pricing?returnTo=${encodeURIComponent(`/tutorials/books/${bookId}`)}`)} className="inline-flex h-9 items-center rounded-[8px] bg-[var(--chat-primary-bg)] px-4 text-[12px] font-semibold text-[var(--chat-primary-text)]">查看会员方案</button> : null}
          <button type="button" onClick={() => navigate("/tutorials")} className="inline-flex h-9 items-center rounded-[8px] border border-[var(--chat-border)] bg-[var(--chat-control-bg)] px-4 text-[12px] font-semibold text-[var(--chat-ink)]">返回教程</button>
        </div>
      </div>}
    </div>
    {message ? <RequestErrorToast message={message} variant="chat" onClose={() => setMessage(null)} /> : null}
  </TutorialWorkspaceShell>;
}
