import { useEffect, useRef, useState } from "react";
import { ArrowUp, LoaderCircle, MessageCircle, UserRound, X } from "lucide-react";
import { UserAvatar } from "@/components/home/UserAvatar";
import { communityGet, communityPost, communityError, communityFlag, communityTime, type CommunityComment, type CommunityPage } from "@/lib/community";
import { readCommentDraft, writeCommentDraft, scrollToCommunityElement } from "@/lib/community-state";

interface Props { postId: string; targetId?: string; enabled: boolean; onNotice: (text: string) => void; onAdded: () => void }
export function CommunityComments({ postId, targetId, enabled, onNotice, onAdded }: Props) {
  const [rows, setRows] = useState<CommunityComment[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft] = useState(() => readCommentDraft(postId));
  const [content, setContent] = useState(draft.content);
  const [replyTo, setReplyTo] = useState<CommunityComment | undefined>(draft.replyTo);
  const [context, setContext] = useState<{ root: CommunityComment; target: CommunityComment }>();
  const [contextError, setContextError] = useState("");
  const [contextReload, setContextReload] = useState(0);
  const [sending, setSending] = useState(false);
  const request = useRef({ signature: "", key: "" });
  const input = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const located = useRef("");
  useEffect(() => { writeCommentDraft(postId, { content, replyTo }); }, [postId, content, replyTo]);
  useEffect(() => {
    setContext(undefined); setContextError(""); located.current = "";
    if (!targetId || targetId === "all") return;
    const controller = new AbortController();
    void communityGet<{ root: CommunityComment; target: CommunityComment }>("comment/context", { postId, id: targetId }, controller.signal)
      .then(data => { if (!controller.signal.aborted) setContext(data); })
      .catch(e => { if (!controller.signal.aborted) setContextError(communityError(e)); });
    return () => controller.abort();
  }, [postId, targetId, contextReload]);
  useEffect(() => {
    if (!targetId || located.current === targetId || (targetId !== "all" && !context && !contextError)) return;
    const frame = requestAnimationFrame(() => {
      scrollToCommunityElement(context ? `community-comment-${targetId}` : "community-comments");
      located.current = targetId;
    });
    return () => cancelAnimationFrame(frame);
  }, [targetId, context, contextError]);

  async function load(current: number, signal?: AbortSignal) {
    setLoading(true); setError("");
    try {
      const data = await communityPost<CommunityPage<CommunityComment>>("comment/list/page", { postId, current, pageSize: 10 }, signal);
      if (signal?.aborted) return;
      setRows(previous => current === 1 ? data.records : [...previous, ...data.records.filter(row => !previous.some(item => item.id === row.id))]);
      setPage(current); setTotal(Number(data.total));
    } catch (e) { if (!signal?.aborted) setError(communityError(e)); }
    finally { if (!signal?.aborted) setLoading(false); }
  }
  useEffect(() => {
    const controller = new AbortController();
    void load(1, controller.signal);
    return () => controller.abort();
  }, [postId]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!content.trim() || busy.current || !enabled) return;
    busy.current = true; setSending(true);
    const signature = JSON.stringify([postId, replyTo?.id, content.trim()]);
    if (request.current.signature !== signature) request.current = { signature, key: crypto.randomUUID() };
    try {
      await communityPost<string>("comment/add", { postId, replyToId: replyTo?.id, content: content.trim(), requestKey: request.current.key });
      writeCommentDraft(postId, { content: "" });
      setContent(""); setReplyTo(undefined); request.current = { signature: "", key: "" };
      onNotice("评论已发送"); onAdded(); await load(1);
    } catch (e) { onNotice(communityError(e)); }
    finally { busy.current = false; setSending(false); }
  }
  function reply(comment: CommunityComment) { setReplyTo(comment); input.current?.focus(); }
  const visibleRows = context && !rows.some(row => row.id === context.root.id) ? [context.root, ...rows] : rows;
  return <section className="community-comments" aria-label="帖子评论" id="community-comments" tabIndex={-1}>
    <h2>参与讨论</h2>
    {enabled ? <form className="community-composer" data-unsaved={Boolean(content) || undefined} onSubmit={submit}>
      {replyTo && <div className="community-reply-target">回复 {replyTo.authorName}<button type="button" disabled={sending} onClick={() => setReplyTo(undefined)} aria-label="取消回复"><X size={14} /></button></div>}
      <label htmlFor="community-comment-input" className="sr-only">评论内容</label>
      <textarea id="community-comment-input" ref={input} placeholder={replyTo ? `回复 ${replyTo.authorName}…` : "分享你的想法，或聊聊使用体验…"} maxLength={2000} value={content} disabled={sending} onChange={event => setContent(event.target.value)} />
      <div className="community-composer-footer"><span>{content.length} / 2000{content && " · 草稿已保留"}</span><button type="submit" className="community-primary" disabled={!content.trim() || sending}>{sending ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowUp size={14} />}发送评论</button></div>
    </form> : <p className="community-muted">已关闭评论，仍可阅读历史讨论</p>}
    {contextError && <div className="community-inline-error" role="alert">无法定位这条讨论：{contextError}<button onClick={() => setContextReload(value => value + 1)}>重试</button></div>}
    {visibleRows.map(row => <CommentThread key={`${row.id}-${row.replyCount}`} row={row} target={context?.root.id === row.id ? context.target : undefined} enabled={enabled} onReply={reply} onNotice={onNotice} />)}
    {!loading && !error && !rows.length && <div className="community-empty community-empty-small"><MessageCircle /><p>{enabled ? "还没有评论，来聊聊你的想法" : "暂无历史评论"}</p></div>}
    {error && <div className="community-inline-error" role="alert">{error}<button type="button" onClick={() => void load(page ? page + 1 : 1)}>重试</button></div>}
    {loading ? <div className="community-loading" role="status"><LoaderCircle size={16} className="animate-spin" />加载评论中</div> : rows.length < total && !error && <button className="community-load-more" onClick={() => void load(page + 1)}>查看更多评论</button>}
  </section>;
}
function CommentThread({ row, target, enabled, onReply, onNotice }: { row: CommunityComment; target?: CommunityComment; enabled: boolean; onReply: (row: CommunityComment) => void; onNotice: (text: string) => void }) {
  const [replies, setReplies] = useState<CommunityComment[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(Number(row.replyCount));
  async function expand() {
    if (loading) return;
    setLoading(true);
    try {
      const data = await communityPost<CommunityPage<CommunityComment>>("comment/list/page", { postId: row.postId, rootId: row.id, current: page + 1, pageSize: 10 });
      setReplies(previous => [...previous, ...data.records.filter(item => !previous.some(old => old.id === item.id))]);
      setPage(current => current + 1); setTotal(Number(data.total));
    } catch (e) { onNotice(communityError(e)); }
    finally { setLoading(false); }
  }
  const render = (comment: CommunityComment) => <div className="community-comment-row" id={`community-comment-${comment.id}`} tabIndex={-1} data-target={comment.id === target?.id || undefined} key={comment.id}>
    <UserAvatar className="community-comment-avatar" src={comment.authorAvatar} alt={comment.authorName} fallback={<UserRound size={16} />} />
    <div className="community-comment-body"><div className="community-comment-meta"><strong>{comment.authorName}</strong>{communityFlag(comment.official) && <span className="community-official">官方</span>}<time dateTime={comment.createTime}>{communityTime(comment.createTime)}</time></div>
      <p>{comment.replyToId && <span className="community-muted">回复 {comment.replyToName}：</span>}{comment.content}</p>
      {enabled && <button className="community-text-action" onClick={() => onReply(comment)}>回复</button>}
    </div>
  </div>;
  const visibleReplies = target && target.id !== row.id && !replies.some(reply => reply.id === target.id) ? [target, ...replies] : replies;
  return <div className="community-thread">{render(row)}<div className="community-replies">{visibleReplies.map(render)}{visibleReplies.length < total && <button className="community-text-action" disabled={loading} onClick={() => void expand()}>{loading ? "加载中" : `展开 ${total - visibleReplies.length} 条回复`}</button>}</div></div>;
}
