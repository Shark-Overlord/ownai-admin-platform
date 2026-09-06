import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bell, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { dismissPopupAnnouncement, getPopupAnnouncement } from "@/lib/announcement";
import type { AnnouncementVO } from "@/lib/types";
import "./AnnouncementPopup.css";

const DISMISSED_KEY = "ownai-dismissed-news-popups";

function readDismissedIds() {
  try {
    const value = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
    return Array.isArray(value) ? value.map(String).slice(-100) : [];
  } catch {
    return [];
  }
}

export function AnnouncementPopup() {
  const navigate = useNavigate();
  const location = useLocation();
  const requested = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [announcement, setAnnouncement] = useState<AnnouncementVO | null>(null);
  const [eligible, setEligible] = useState(false);
  useEffect(() => {
    const check = () => {
      const blockedRoute = /^\/(auth|pricing|image-studio)(\/|-|$)/.test(location.pathname);
      const editing = document.activeElement?.matches("input, textarea, [contenteditable=true]") || document.querySelector('[data-unsaved="true"]');
      setEligible(!blockedRoute && !editing);
    };
    check();
    if (!announcement) return;
    const timer = window.setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [location.pathname, announcement]);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    void getPopupAnnouncement(readDismissedIds()).then(setAnnouncement).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!announcement || !eligible) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [announcement, eligible]);

  const dismiss = () => {
    if (!announcement) return;
    const ids = Array.from(new Set([...readDismissedIds(), String(announcement.id)])).slice(-100);
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids)); } catch { /* Dismiss remains usable without storage. */ }
    setAnnouncement(null);
    void dismissPopupAnnouncement([announcement.id]).catch(() => undefined);
  };

  const openDetail = () => {
    if (!announcement) return;
    const path = announcement.actionPath?.trim();
    dismiss();
    if (path?.startsWith("/") && !path.startsWith("//")) {
      navigate(path);
      return;
    }
    navigate(`/profile?tab=announcements&announcement=${encodeURIComponent(String(announcement.id))}`);
  };

  if (!announcement || !eligible) return null;

  return <dialog ref={dialogRef} className="announcement-popup" aria-labelledby="announcement-popup-title" aria-describedby={announcement.summary ? "announcement-popup-summary" : undefined} onCancel={(event) => { event.preventDefault(); dismiss(); }}>
    <div className="announcement-popup-icon"><Bell size={17} /></div>
    <div className="announcement-popup-copy">
      <span>系统动态</span>
      <h2 id="announcement-popup-title">{announcement.title}</h2>
      {announcement.summary && <p id="announcement-popup-summary">{announcement.summary}</p>}
      <div>
        <button type="button" className="announcement-popup-primary" onClick={openDetail}>{announcement.actionLabel || "查看详情"}<ArrowUpRight size={13} /></button>
        <button type="button" onClick={dismiss}>知道了</button>
      </div>
    </div>
    <button type="button" className="announcement-popup-close" aria-label="关闭公告" onClick={dismiss}><X size={15} /></button>
  </dialog>;
}
