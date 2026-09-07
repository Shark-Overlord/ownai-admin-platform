import { useEffect, useRef, useState } from "react";
import { CalendarCheck, Check, Coins, LoaderCircle, RefreshCw, X } from "lucide-react";
import { checkInToday, getCheckInStatus } from "@/lib/check-in";
import type { CheckInStatusResponse } from "@/lib/types";

export function ProfileCheckInPanel({ onPointBalanceChange }: { onPointBalanceChange: (balance: number) => void }) {
  const [status, setStatus] = useState<CheckInStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const active = useRef(false);
  const busy = useRef(false);
  const onBalance = useRef(onPointBalanceChange);
  onBalance.current = onPointBalanceChange;

  async function refresh() {
    const next = await getCheckInStatus();
    if (active.current) {
      setStatus(next);
      if (typeof next.pointBalance === "number") onBalance.current(next.pointBalance);
    }
    return next;
  }
  async function load() {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError("");
    try { await refresh(); }
    catch { if (active.current) setError("暂时无法获取签到状态"); }
    finally { busy.current = false; if (active.current) setLoading(false); }
  }
  useEffect(() => { active.current = true; void load(); return () => { active.current = false; }; }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function submit() {
    if (busy.current || !status || status.checkedInToday || Number(status.status) !== 1) return;
    busy.current = true; setSending(true); setNotice("");
    try {
      // Recheck before writing, since the same user may have checked in from another tab.
      const latest = await refresh();
      if (latest.checkedInToday) { if (active.current) setNotice("今天已经签到过了"); return; }
      if (Number(latest.status) !== 1) return;
      const result = await checkInToday();
      if (active.current) setStatus(current => current ? { ...current, checkedInToday: true } : current);
      try { await refresh(); }
      catch { if (active.current) { setError("签到已完成，积分状态待刷新"); } }
      if (active.current) setNotice(`签到成功${typeof result.rewardPoints === "number" ? `，获得 ${result.rewardPoints} 积分` : ""}`);
    } catch (e) {
      if (active.current) setNotice(e instanceof Error ? e.message : "签到失败，请重试");
      try { await refresh(); } catch { /* Preserve the existing status for retry. */ }
    } finally { busy.current = false; if (active.current) setSending(false); }
  }

  const checked = Boolean(status?.checkedInToday);
  const enabled = Number(status?.status) === 1;
  const lastDate = status?.lastCheckInDate ? new Date(status.lastCheckInDate) : null;
  return <section className="profile-settings-card profile-checkin" aria-labelledby="profile-checkin-title">
    <div className="profile-card-heading"><div><h2 id="profile-checkin-title">每日签到</h2><p>每天来看看，收获一点新灵感</p></div><CalendarCheck size={19} /></div>
    <div className="profile-checkin-reward"><span className="profile-checkin-symbol">{checked ? <Check size={24} /> : <Coins size={24} strokeWidth={1.5} />}</span><div><span>{checked ? "今日签到已完成" : "今日签到奖励"}</span><p>{loading || !status ? "—" : `+${status.rewardPoints ?? 0}`}<small>积分</small></p></div></div>
    <div className="profile-checkin-facts"><div><span>当前积分</span><strong>{status?.pointBalance?.toLocaleString("zh-CN") ?? "—"}</strong></div><div><span>最近签到</span><strong>{lastDate && !Number.isNaN(lastDate.getTime()) ? lastDate.toLocaleDateString("zh-CN", { month: "long", day: "numeric" }) : status ? "暂无记录" : "—"}</strong></div></div>
    {error && <div className="profile-checkin-error" role="alert"><span>{error}</span><button type="button" onClick={() => void load()} aria-label="刷新签到状态"><RefreshCw size={14} /></button></div>}
    <button type="button" className="profile-settings-primary profile-checkin-submit" onClick={() => void submit()} disabled={loading || sending || !status || checked || !enabled}>
      {loading || sending ? <LoaderCircle size={15} className="animate-spin" /> : checked ? <Check size={15} /> : <CalendarCheck size={15} />}
      {loading ? "加载签到状态" : sending ? "签到中" : checked ? "今日已签到" : !status ? "暂时无法签到" : !enabled ? "签到暂未开放" : "立即签到"}
    </button>
    <p className="profile-checkin-hint">{checked ? "今天的签到已完成，明天再来吧" : "每日可签到一次，积分自动计入账户"}</p>
    {notice && <div className="community-toast" role="status">{notice}<button aria-label="关闭签到提示" onClick={() => setNotice("")}><X size={14} /></button></div>}
  </section>;
}
