import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, Heart, LoaderCircle, MessageCircle, Newspaper, Pin, Search, Share2, UserRound, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { communityError, communityFlag, communityGet, communityPost, communityTime, type CommunityPage, type CommunityPost, type CommunityTerm } from "@/lib/community";
import { CommunityImage, CommunityMarkdown, CommunityVideo } from "./CommunityMarkdown";
import { CommunityComments } from "./CommunityComments";
import { UserAvatar } from "@/components/home/UserAvatar";
import { readCommunityView, writeCommunityView, patchCommunityViews, scrollToCommunityElement } from "@/lib/community-state";

type PostPatch = Partial<Pick<CommunityPost, "liked" | "likeCount" | "commentCount">>;
type FeedSnapshot = { rows: CommunityPost[]; page: number; total: number; scroll: number };
export function CommunityFeed() {
  const [params, setParams] = useSearchParams();
  const categoryId = params.get("category") || "";
  const sort = params.get("sort") === "popular" ? "popular" : "latest";
  const keyword = params.get("q") || "";
  const selected = params.get("post");
  const viewKey = `feed:${sort}:${categoryId}:${keyword}`;
  const initial = readCommunityView<FeedSnapshot>(viewKey);
  const [search, setSearch] = useState(keyword);
  const [searchOpen, setSearchOpen] = useState(Boolean(keyword));
  const [categories, setCategories] = useState<CommunityTerm[]>([]);
  const [categoryError, setCategoryError] = useState(false);
  const [rows, setRows] = useState<CommunityPost[]>(initial?.rows || []);
  const [page, setPage] = useState(initial?.page || 0);
  const [total, setTotal] = useState(initial?.total || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [notice, setNotice] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const scroll = useRef(initial?.scroll || 0);
  const activeView = useRef(viewKey);
  const [loadedView, setLoadedView] = useState(initial ? viewKey : "");
  const snapshot = useRef({ rows, page, total, scroll: scroll.current });
  snapshot.current = { rows, page, total, scroll: scroll.current };
  const inFlight = useRef(false);
  const generation = useRef(0);
  const requestAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => { setSearch(keyword); }, [keyword]);
  useEffect(() => {
    const controller = new AbortController();
    setCategoryError(false);
    void communityGet<CommunityTerm[]>("taxonomy/category", undefined, controller.signal)
      .then(data => setCategories(data || []))
      .catch(() => { if (!controller.signal.aborted) setCategoryError(true); });
    return () => controller.abort();
  }, [reload]);

  const load = useCallback(async (current: number, epoch: number) => {
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true); setError("");
    const controller = new AbortController(); requestAbort.current = controller;
    try {
      const data = await communityPost<CommunityPage<CommunityPost>>("post/list/page", { current, pageSize: 10, sort, categoryId: categoryId || undefined, keyword: keyword || undefined }, controller.signal);
      if (epoch !== generation.current) return;
      setRows(previous => current === 1 ? data.records : [...previous, ...data.records.filter(row => !previous.some(old => old.id === row.id))]);
      setPage(current); setTotal(Number(data.total)); setLoadedView(viewKey);
    } catch (e) { if (!controller.signal.aborted && epoch === generation.current) setError(communityError(e)); }
    finally { if (epoch === generation.current) { inFlight.current = false; setLoading(false); } }
  }, [categoryId, keyword, sort]);

  useEffect(() => {
    requestAbort.current?.abort();
    const epoch = ++generation.current;
    inFlight.current = false;
    const cached = readCommunityView<FeedSnapshot>(viewKey);
    activeView.current = viewKey;
    setPage(cached?.page || 0); setTotal(cached?.total || 0);
    scroll.current = cached?.scroll || 0;
    if (cached) { setRows(cached.rows); setLoadedView(viewKey); setLoading(false); setError(""); }
    else setLoadedView("");
    // Keep the last list visible while fetching an uncached filter.
    if (cached && !reload) return () => requestAbort.current?.abort();
    void load(1, epoch);
    return () => requestAbort.current?.abort();
  }, [load, reload]);

  useEffect(() => {
    if (page && loadedView === viewKey && !loading && !error) writeCommunityView(viewKey, snapshot.current);
  }, [rows, page, total, loading, error, viewKey, loadedView]);
  useEffect(() => {
    const main = root.current?.closest("main");
    const remember = () => {
      if (!selected && activeView.current === viewKey && snapshot.current.page) {
        scroll.current = main?.scrollTop || 0;
        writeCommunityView(viewKey, { ...snapshot.current, scroll: scroll.current });
      }
    };
    main?.addEventListener("scroll", remember, { passive: true });
    return () => { main?.removeEventListener("scroll", remember); };
  }, [selected, viewKey]);

  useEffect(() => {
    if (selected || loading || error || !page || rows.length >= total || !sentinel.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) void load(page + 1, generation.current);
    }, { root: root.current?.closest("main"), rootMargin: "200px" });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [selected, loading, error, page, rows.length, total, load]);

  const filter = (key: string, value: string) => setParams(current => {
    const next = new URLSearchParams(current); next.set("tab", "news"); next.delete("post"); next.delete("comment"); next.delete("from");
    if (value) next.set(key, value); else next.delete(key);
    return next;
  });
  function openPost(id: string, comments = false) {
    scroll.current = root.current?.closest("main")?.scrollTop || 0;
    setParams(current => { const next = new URLSearchParams(current); next.set("tab", "news"); next.set("post", id); next.delete("from"); if (comments) next.set("comment", "all"); else next.delete("comment"); return next; });
  }
  function closePost() {
    setParams(current => { const next = new URLSearchParams(current); if (next.get("from") === "interactions") next.set("tab", "interactions"); next.delete("post"); next.delete("comment"); next.delete("from"); return next; });
  }
  useEffect(() => {
    const main = root.current?.closest("main");
    const target = selected ? 0 : scroll.current;
    const frame = requestAnimationFrame(() => { if (main) main.scrollTop = target; });
    return () => cancelAnimationFrame(frame);
  }, [selected, viewKey]);
  const patch = (id: string, data: PostPatch) => { patchCommunityViews(id, data); setRows(previous => previous.map(row => row.id === id ? { ...row, ...data } : row)); };
  return <div className="community-feed" ref={root}>
    {selected && <PostDetail key={selected} id={selected} comment={params.get("comment")} fromInteractions={params.get("from") === "interactions"} onBack={closePost} onNotice={setNotice} onPatch={patch} />}
    <div hidden={Boolean(selected)}>
      <div className="community-filter-bar" role="region" aria-label="帖子筛选">
      <div className="community-feed-tools">
        <div className="community-sort" role="group" aria-label="帖子排序">
          <button aria-pressed={sort === "latest"} onClick={() => filter("sort", "")}>最新</button>
          <button aria-pressed={sort === "popular"} onClick={() => filter("sort", "popular")}>最受欢迎</button>
        </div>
        <nav className="community-categories" aria-label="帖子分类"><button aria-current={!categoryId ? "true" : undefined} onClick={() => filter("category", "")}>全部</button>{categories.map(category => <button key={category.id} aria-current={categoryId === category.id ? "true" : undefined} onClick={() => filter("category", category.id)}>{category.name}</button>)}{categoryError && <button onClick={() => setReload(value => value + 1)}>重试加载分类</button>}</nav>
        <button className="community-icon-button" aria-label={searchOpen ? "关闭帖子搜索" : "搜索帖子"} aria-expanded={searchOpen} onClick={() => setSearchOpen(value => !value)}>{searchOpen ? <X size={18} /> : <Search size={18} />}</button>
      </div>
      {searchOpen && <form className="community-search" onSubmit={event => { event.preventDefault(); filter("q", search.trim()); }}><Search size={16} /><input autoFocus aria-label="搜索帖子标题" placeholder="搜索帖子标题" value={search} maxLength={150} onChange={event => setSearch(event.target.value)} /><button type="submit">搜索</button>{keyword && <button type="button" aria-label="清除搜索" onClick={() => filter("q", "")}><X size={14} /></button>}</form>}
      </div>
      {keyword && <div className="community-search-caption">“{keyword}”的搜索结果</div>}
      {loading && rows.length > 0 && page === 0 && <div className="community-update-status" role="status"><LoaderCircle size={14} className="animate-spin" />正在更新帖子</div>}
      <div aria-busy={loading} aria-label="帖子列表">{rows.map(row => <PostCard key={row.id} post={row} onOpen={() => openPost(row.id)} onComment={() => openPost(row.id, true)} onNotice={setNotice} onPatch={data => patch(row.id, data)} />)}</div>
      {loading && !rows.length && <div className="community-skeleton" role="status" aria-label="正在加载帖子">{[0, 1, 2].map(index => <div key={index}><span /><div><i /><i /><i /></div></div>)}</div>}
      {!loading && !error && !rows.length && <div className="community-empty"><Newspaper size={30} /><h2>{keyword || categoryId ? "没有找到相关帖子" : "这里的故事，即将开始"}</h2><p>{keyword || categoryId ? "换个关键词或分类再看看" : "新内容发布后，会在这里与你见面"}</p>{(keyword || categoryId) && <button onClick={() => setParams({ tab: "news" })}>查看全部帖子</button>}</div>}
      {error && <div className="community-empty" role="alert"><p>{error}</p><button onClick={() => void load(page + 1, generation.current)}>重新加载</button></div>}
      {rows.length > 0 && <div ref={sentinel} className="community-feed-end">{loading ? <span role="status"><LoaderCircle size={16} className="animate-spin" />正在加载</span> : rows.length < total ? <button onClick={() => void load(page + 1, generation.current)}>加载更多</button> : <span>你已经看完了，过会儿再来看看</span>}</div>}
    </div>
    {notice && <div className="community-toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="关闭提示"><X size={14} /></button></div>}
  </div>;
}

function Author({ post }: { post: CommunityPost }) {
  const name = post.authorName?.trim() || "用户";
  return <div className="community-author"><UserAvatar className="community-author-avatar" src={post.authorAvatar} alt={name} fallback={<UserRound size={17} />} /><div><div><strong>{name}</strong>{communityFlag(post.official) && <span className="community-official">官方</span>}{communityFlag(post.pinned) && <span className="community-pinned"><Pin size={10} />置顶</span>}<time dateTime={post.firstPublishedAt}>{communityTime(post.firstPublishedAt)}</time></div></div></div>;
}
function PostActions({ post, onComment, onNotice, onPatch }: { post: CommunityPost; onComment: () => void; onNotice: (text: string) => void; onPatch: (patch: PostPatch) => void }) {
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  async function like() {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    const previous = { liked: Boolean(post.liked), likeCount: post.likeCount };
    const liked = !previous.liked;
    onPatch({ liked, likeCount: Math.max(0, Number(post.likeCount) + (liked ? 1 : -1)) });
    try {
      const data = await communityPost<{ liked: boolean; likeCount: number | string }>("like", { postId: post.id, liked });
      onPatch(data);
    } catch (e) { onPatch(previous); onNotice(communityError(e)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function share() {
    const url = new URL(window.location.href);
    const postQuery = `tab=news&post=${encodeURIComponent(post.id)}`;
    if (url.pathname === "/") url.hash = `/profile?${postQuery}`;
    else { url.pathname = "/profile"; url.search = postQuery; url.hash = ""; }
    try { await navigator.clipboard.writeText(url.href); onNotice("帖子链接已复制"); }
    catch { onNotice("链接复制失败，请从地址栏复制帖子链接"); }
  }
  return <div className="community-post-actions">
    <button onClick={onComment} aria-label={`查看评论 ${post.commentCount}`}><MessageCircle size={18} /><span>{post.commentCount}</span></button>
    <button className="community-like-action" disabled={busy} aria-busy={busy} onClick={() => void like()} aria-label={post.liked ? "取消点赞" : "点赞帖子"} aria-pressed={Boolean(post.liked)}><Heart size={18} fill={post.liked ? "currentColor" : "none"} /><span>{post.likeCount}</span></button>
    <button onClick={() => void share()} aria-label="复制帖子链接"><Share2 size={17} /></button>
  </div>;
}
function PostCard({ post, onOpen, onComment, onNotice, onPatch }: { post: CommunityPost; onOpen: () => void; onComment: () => void; onNotice: (text: string) => void; onPatch: (patch: PostPatch) => void }) {
  return <article className="community-post"><Author post={post} /><div className="community-post-body">
    <button className="community-post-link" onClick={onOpen}><h2>{post.title}</h2>{(post.excerpt || post.summary) && <p>{post.excerpt || post.summary}</p>}</button>
    {post.previewMediaUrl && (post.previewMediaType === "video"
      ? <div className="community-post-cover is-video"><CommunityVideo key={post.previewMediaUrl} src={post.previewMediaUrl} /></div>
      : <button className="community-post-cover" onClick={onOpen} aria-label={`阅读 ${post.title}`}><CommunityImage key={post.previewMediaUrl} src={post.previewMediaUrl} alt={post.title} /></button>)}
    <div className="community-post-tags">{post.categoryName && <span>{post.categoryName}</span>}{post.tags?.slice(0, 3).map(tag => <span key={tag.id}>#{tag.name}</span>)}</div>
    <PostActions post={post} onComment={onComment} onNotice={onNotice} onPatch={onPatch} />
    <button className="community-read-more" onClick={Number(post.commentCount) ? onComment : onOpen}>{Number(post.commentCount) ? `查看全部 ${post.commentCount} 条评论` : "阅读帖子，参与讨论"}<ArrowUpRight size={13} /></button>
  </div></article>;
}
function PostDetail({ id, comment, fromInteractions, onBack, onNotice, onPatch }: { id: string; comment: string | null; fromInteractions: boolean; onBack: () => void; onNotice: (text: string) => void; onPatch: (id: string, patch: PostPatch) => void }) {
  const [post, setPost] = useState<CommunityPost>();
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setError("");
    void communityGet<CommunityPost>("post/get", { id }, controller.signal).then(data => { if (!controller.signal.aborted) setPost(data); }).catch(e => { if (!controller.signal.aborted) setError(communityError(e)); });
    return () => controller.abort();
  }, [id, reload]);
  const patch = (data: PostPatch) => { setPost(current => current ? { ...current, ...data } : current); onPatch(id, data); };
  return <div className="community-detail"><button className="community-back" onClick={onBack}><ArrowLeft size={17} />{fromInteractions ? "返回我的互动" : "返回帖子列表"}</button>
    {error ? <div className="community-empty" role="alert"><p>{error}</p><button onClick={() => setReload(value => value + 1)}>重试</button></div> : !post ? <div className="community-loading" role="status"><LoaderCircle className="animate-spin" size={18} />加载帖子中</div> : <>
      <div className="community-detail-content"><Author post={post} /><h2 className="community-detail-title">{post.title}</h2><div className="community-post-tags"><span>{post.categoryName}</span>{post.tags?.map(tag => <span key={tag.id}>#{tag.name}</span>)}</div>
        <CommunityMarkdown content={post.markdown || post.summary || ""} title={post.title} />
        <PostActions post={post} onNotice={onNotice} onPatch={patch} onComment={() => scrollToCommunityElement("community-comments")} />
      </div>
      <CommunityComments postId={id} targetId={comment || undefined} enabled={post.commentsEnabled === true || post.commentsEnabled === 1} onNotice={onNotice} onAdded={() => {
        void communityGet<CommunityPost>("post/get", { id }).then(data => { setPost(data); onPatch(id, data); }).catch(e => onNotice(communityError(e)));
      }} />
    </>}
  </div>;
}
