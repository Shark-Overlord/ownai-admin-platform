import { getAuthSessionEventName, getPersistedLoginUser } from "./auth-session";
import type { CommunityComment } from "./community";

const views = new Map<string, { value: unknown; time: number }>();
const drafts = new Map<string, CommentDraft>();
let owner = String(getPersistedLoginUser()?.id || "guest");
if (typeof window !== "undefined") window.addEventListener(getAuthSessionEventName(), () => {
  const next = String(getPersistedLoginUser()?.id || "guest");
  if (next !== owner) { views.clear(); drafts.clear(); }
  owner = next;
});
export function patchCommunityViews(postId: string, patch: Record<string, unknown>) {
  for (const [key, entry] of views) {
    if (key.startsWith(`community-session:${owner}:interactions:`)) { views.delete(key); continue; }
    if (!key.startsWith(`community-session:${owner}:feed:`)) continue;
    const value = entry.value as { rows: { id: string }[] };
    value.rows = value.rows.map(row => row.id === postId ? { ...row, ...patch } : row);
  }
}
export function communitySessionKey(key: string) {
  return `community-session:${getPersistedLoginUser()?.id || "guest"}:${key}`;
}
export function readCommunityView<T>(key: string): T | undefined {
  const entry = views.get(communitySessionKey(key));
  return entry && Date.now() - entry.time < 5 * 60_000 ? entry.value as T : undefined;
}
export function writeCommunityView<T>(key: string, value: T) {
  if (views.size >= 30) views.delete(views.keys().next().value!);
  views.set(communitySessionKey(key), { value, time: Date.now() });
}
export interface CommentDraft { content: string; replyTo?: CommunityComment }
export function readCommentDraft(postId: string): CommentDraft {
  const key = communitySessionKey(`draft:${postId}`);
  try {
    const draft = JSON.parse(sessionStorage.getItem(key) || "null");
    return draft && typeof draft.content === "string" ? draft : drafts.get(key) || { content: "" };
  } catch { return drafts.get(key) || { content: "" }; }
}
export function writeCommentDraft(postId: string, draft: CommentDraft) {
  const key = communitySessionKey(`draft:${postId}`);
  if (!draft.content && !draft.replyTo) drafts.delete(key);
  else drafts.set(key, draft);
  try {
    if (!draft.content && !draft.replyTo) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(draft));
  } catch { /* Keep an in-memory fallback when session storage is disabled. */ }
}
export function scrollToCommunityElement(id: string) {
  const node = document.getElementById(id);
  if (!node) return;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth";
  const main = node.closest("main");
  if (main) {
    const bounds = main.getBoundingClientRect();
    const scale = bounds.height / main.clientHeight || 1;
    const header = main.querySelector(".workspace-header");
    const inset = (header?.getBoundingClientRect().height || 0) / scale + 20;
    main.scrollTo({ top: main.scrollTop + (node.getBoundingClientRect().top - bounds.top) / scale - inset, behavior });
  } else node.scrollIntoView({ behavior, block: "start" });
  node.focus({ preventScroll: true });
}
