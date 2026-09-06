import { useEffect, useRef, useState } from "react";
import { readCommunityView, writeCommunityView } from "@/lib/community-state";
import { ArrowUpRight, Heart, LoaderCircle, MessageCircle, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  communityError,
  communityPost,
  communityTime,
  type CommunityInteractionComment,
  type CommunityInteractionLike,
  type CommunityPage,
} from "@/lib/community";

type InteractionKind = "comments" | "likes";
type InteractionRow = CommunityInteractionComment | CommunityInteractionLike;
type ActivitySnapshot = { rows: InteractionRow[]; page: number; total: number; scroll: number };

export function CommunityInteractions() {
  const [params, setParams] = useSearchParams();
  const kind: InteractionKind = params.get("activity") === "likes" ? "likes" : "comments";
  const root = useRef<HTMLElement>(null);
  const setKind = (value: InteractionKind) => setParams(current => { const next = new URLSearchParams(current); next.set("activity", value); return next; });
  const [rows, setRows] = useState<InteractionRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const request = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    request.current?.abort(); request.current = controller;
    const cached = readCommunityView<ActivitySnapshot>(`interactions:${kind}`);
    if (cached && !reload) {
      setRows(cached.rows); setPage(cached.page); setTotal(cached.total); setLoading(false); setError("");
      requestAnimationFrame(() => { const main = root.current?.closest("main"); if (main && !controller.signal.aborted) main.scrollTop = cached.scroll; });
      return () => { controller.abort(); request.current?.abort(); };
    }
    setLoading(true); setError(""); setRows([]); setPage(1); setTotal(0);
    void communityPost<CommunityPage<InteractionRow>>(`me/${kind}/list/page`, { current: 1, pageSize: 20 }, controller.signal)
      .then(data => { if (!controller.signal.aborted) { setRows(data.records || []); setTotal(Number(data.total)); requestAnimationFrame(() => { const main = root.current?.closest("main"); if (main) main.scrollTop = readCommunityView<number>(`interactions-scroll:${kind}`) || 0; }); } })
      .catch(reason => { if (!controller.signal.aborted) setError(communityError(reason)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); request.current?.abort(); };
  }, [kind, reload]);

  function openPost(postId: string, commentId?: string) {
    writeCommunityView(`interactions-scroll:${kind}`, root.current?.closest("main")?.scrollTop || 0);
    writeCommunityView(`interactions:${kind}`, { rows, page, total, scroll: root.current?.closest("main")?.scrollTop || 0 });
    setParams({ tab: "news", post: postId, from: "interactions", activity: kind, ...(commentId ? { comment: commentId } : {}) });
  }
  async function loadMore() {
    if (loading) return;
    const controller = new AbortController(); request.current = controller;
    const next = page + 1; setLoading(true); setError("");
    try {
      const data = await communityPost<CommunityPage<InteractionRow>>(`me/${kind}/list/page`, { current: next, pageSize: 20 }, controller.signal);
      if (controller.signal.aborted) return;
      setRows(current => [...current, ...(data.records || [])]); setPage(next); setTotal(Number(data.total));
    } catch (reason) { if (!controller.signal.aborted) setError(communityError(reason)); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }

  return <section className="community-interactions" ref={root}>
    <div className="community-interaction-tabs" role="tablist" aria-label="互动类型">
      <button role="tab" aria-selected={kind === "comments"} onClick={() => setKind("comments")}><MessageCircle size={15} />评论与回复</button>
      <button role="tab" aria-selected={kind === "likes"} onClick={() => setKind("likes")}><Heart size={15} />赞过的帖子</button>
    </div>
    {loading && !rows.length ? <InteractionLoading /> : error && !rows.length ? <InteractionError message={error} onRetry={() => setReload(value => value + 1)} /> : !rows.length ? <InteractionEmpty kind={kind} onExplore={() => setParams({ tab: "news" })} /> : <>
      <div className="community-interaction-list" role="tabpanel">
        {kind === "comments" ? (rows as CommunityInteractionComment[]).map(row => <CommentActivity key={row.id} row={row} onOpen={() => openPost(row.postId, row.id)} />) : (rows as CommunityInteractionLike[]).map(row => <LikeActivity key={row.postId} row={row} onOpen={() => openPost(row.postId)} />)}
      </div>
      <div className="community-interaction-end">
        {error && <span role="alert">{error}</span>}
        {rows.length < total ? <button disabled={loading} onClick={() => void loadMore()}>{loading && <LoaderCircle size={14} className="animate-spin" />}加载更多</button> : <span>已显示全部互动</span>}
      </div>
    </>}
  </section>;
}

function CommentActivity({ row, onOpen }: { row: CommunityInteractionComment; onOpen: () => void }) {
  return <article className="community-interaction-row">
    <span className="community-interaction-symbol"><MessageCircle size={17} /></span>
    <div className="community-interaction-content">
      <div className="community-interaction-meta"><strong>{row.replyToId ? `回复了 ${row.replyToName || "用户"}` : "发表了评论"}</strong><time dateTime={row.createTime}>{communityTime(row.createTime)}</time></div>
      <button className="community-interaction-post" onClick={onOpen}>在《{row.postTitle}》中<ArrowUpRight size={13} /></button>
      <p className="community-interaction-quote">{row.content}</p>
      <button className="community-interaction-stats community-text-action" onClick={onOpen}>{Number(row.replyCount) > 0 ? `${row.replyCount} 条回复` : "查看讨论"}<ArrowUpRight size={13} /></button>
    </div>
  </article>;
}

function LikeActivity({ row, onOpen }: { row: CommunityInteractionLike; onOpen: () => void }) {
  return <article className="community-interaction-row">
    <span className="community-interaction-symbol is-like"><Heart size={17} fill="currentColor" /></span>
    <div className="community-interaction-content">
      <div className="community-interaction-meta"><strong>赞了这篇帖子</strong><time dateTime={row.createTime}>{communityTime(row.createTime)}</time></div>
      <button className="community-interaction-like-card" onClick={onOpen}><span>{row.categoryName || "社区帖子"}</span><h2>{row.postTitle}</h2>{(row.excerpt || row.summary) && <p>{row.excerpt || row.summary}</p>}<div><span><MessageCircle size={14} />{row.commentCount}</span><span><Heart size={14} />{row.likeCount}</span><ArrowUpRight size={15} /></div></button>
    </div>
  </article>;
}

function InteractionLoading() {
  return <div className="community-interaction-loading" role="status"><LoaderCircle size={19} className="animate-spin" />正在加载互动记录</div>;
}
function InteractionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="community-empty" role="alert"><X size={28} /><h2>互动记录加载失败</h2><p>{message}</p><button onClick={onRetry}>重新加载</button></div>;
}
function InteractionEmpty({ kind, onExplore }: { kind: InteractionKind; onExplore: () => void }) {
  return <div className="community-empty">{kind === "comments" ? <MessageCircle size={30} /> : <Heart size={30} />}<h2>{kind === "comments" ? "还没有评论或回复" : "还没有赞过帖子"}</h2><p>{kind === "comments" ? "参与讨论后，记录会出现在这里" : "遇到喜欢的内容，可以点一下爱心"}</p><button onClick={onExplore}>浏览社区帖子<ArrowUpRight size={14} /></button></div>;
}
