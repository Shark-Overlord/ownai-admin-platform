import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getArtworkDeconstruction,
  getDeconstructionAssetFavoriteKeys,
  addDeconstructionAssetFavorite,
  cancelDeconstructionAssetFavorite,
} from '@/lib/artwork';
import type { ArtworkDeconstructionVO } from '@/lib/types';
import './index.css';

type TabKey = 'prompt' | 'parts' | 'assets' | 'code';
type DeviceKey = 'mobile' | 'tablet' | 'desktop';
type UnknownRecord = Record<string, unknown>;

type FavoriteItemParam = {
  assetType: 'prompt' | 'component' | 'icon';
  assetKey: string;
  title?: string;
  tag?: string;
  description?: string;
  content: string;
};

type ViewportSpec = { name: string; size: string; note?: string };
type PromptToken = { label?: string; role?: string; value?: string; note?: string };
type MotionSpec = { label?: string; desc?: string; token?: string };
type PromptData = {
  role?: string;
  layout?: string;
  customGuide?: UnknownRecord;
  viewports?: ViewportSpec[];
  colors?: PromptToken[];
  typography?: PromptToken[];
  motions?: MotionSpec[];
  rules?: { dos?: string[]; donts?: string[] };
  rawMarkdown?: string;
};
type PartData = { id: string; targetId?: string; title?: string; tag?: string; desc?: string; code?: string };
type IconAsset = { name?: string; library?: string; label?: string; desc?: string; code?: string; svg?: string };
type MediaAsset = { type?: string; title?: string; url?: string; desc?: string };
type AssetsData = { icons?: IconAsset[]; media?: MediaAsset[] };

const DEFAULT_SIZES: Record<DeviceKey, { width: number; height: number }> = {
  mobile: { width: 402, height: 874 },
  tablet: { width: 834, height: 1112 },
  desktop: { width: 1440, height: 820 },
};

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as UnknownRecord : {};
}

function parsePrompt(value: unknown): PromptData {
  return asRecord(value) as PromptData;
}

function buildFullPromptMarkdown(prompt: PromptData, fallback: string): string {
  if (prompt.rawMarkdown && prompt.rawMarkdown.trim().length > 30) {
    return prompt.rawMarkdown;
  }
  const sections: string[] = [];
  sections.push('# SYSTEM_PROMPT & 视觉设计规范\n');

  if (prompt.role) {
    sections.push(`## 角色与核心任务 (Role & Objective)\n${prompt.role}\n`);
  } else if (fallback) {
    sections.push(`## 角色与核心任务 (Role & Objective)\n${fallback}\n`);
  }

  if (prompt.layout) {
    sections.push(`## 01. 界面布局与视觉风格\n**整体布局**：${prompt.layout}\n`);
  }

  if (prompt.viewports && prompt.viewports.length > 0) {
    sections.push(`### 画板基准与设备视口 (Viewport Specs)`);
    prompt.viewports.forEach((v) => {
      sections.push(`- **${v.name}** (${v.size}): ${v.note || ''}`);
    });
    sections.push('');
  }

  if (prompt.colors && prompt.colors.length > 0) {
    sections.push(`### 色彩系统 (Color Palette)`);
    prompt.colors.forEach((c) => {
      sections.push(`- \`${c.value}\` **${c.label || ''}**: ${c.note || ''}`);
    });
    sections.push('');
  }

  if (prompt.typography && prompt.typography.length > 0) {
    sections.push(`### 文字排版与资产 (Typography)`);
    prompt.typography.forEach((t) => {
      sections.push(`- **${t.role || t.label || ''}**: \`${t.value || ''}\` (${t.note || ''})`);
    });
    sections.push('');
  }

  if (prompt.motions && prompt.motions.length > 0) {
    sections.push(`## 02. 交互控件与动效参数 (Motion Specs)`);
    prompt.motions.forEach((m) => {
      sections.push(`- **${m.label}**: ${m.desc || ''} (\`${m.token || ''}\`)`);
    });
    sections.push('');
  }

  if (prompt.rules) {
    sections.push(`## 03. 设计红线与约束 (Do's and Don'ts)`);
    if (prompt.rules.dos && prompt.rules.dos.length > 0) {
      sections.push(`### ✅ Do (必须执行)`);
      prompt.rules.dos.forEach((d) => sections.push(`- ${d}`));
      sections.push('');
    }
    if (prompt.rules.donts && prompt.rules.donts.length > 0) {
      sections.push(`### ❌ Don't (严禁行为)`);
      prompt.rules.donts.forEach((d) => sections.push(`- ${d}`));
      sections.push('');
    }
  }

  const result = sections.join('\n');
  return result.trim().length > 20 ? result : fallback;
}

function parseParts(value: unknown): PartData[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as PartData[] : [];
}

function parseAssets(value: unknown): AssetsData {
  return asRecord(value) as AssetsData;
}

function getDeviceSizes(viewports: ViewportSpec[] | undefined) {
  const result = {
    mobile: { ...DEFAULT_SIZES.mobile },
    tablet: { ...DEFAULT_SIZES.tablet },
    desktop: { ...DEFAULT_SIZES.desktop },
  };
  viewports?.forEach((viewport) => {
    const match = viewport.size?.match(/(\d+)\s*[×x*]\s*(\d+)/i);
    if (!match) return;
    const name = viewport.name?.toLowerCase() || '';
    const size = { width: Number(match[1]), height: Number(match[2]) };
    if (name.includes('mobile') || name.includes('手机')) result.mobile = size;
    if (name.includes('tablet') || name.includes('平板')) result.tablet = size;
    if (name.includes('desktop') || name.includes('桌面')) result.desktop = size;
  });
  return result;
}

function preparePreviewHtml(source: string) {
  const listener = `<style id="ownai-part-highlight">.part-highlight-active{outline:2.5px solid #3b82f6!important;outline-offset:-3px!important;box-shadow:inset 0 0 50px rgba(59,130,246,.35)!important}</style><script data-ownai-preview-bridge>(function(){if(window.__ownaiPreviewBridgeInstalled)return;window.__ownaiPreviewBridgeInstalled=true;function clear(){document.querySelectorAll('.part-highlight-active').forEach(function(el){el.classList.remove('part-highlight-active')})}function find(id){if(!id)return null;var direct=document.getElementById(id);if(direct)return direct;var nodes=document.querySelectorAll('[data-part-target]');for(var i=0;i<nodes.length;i++){if(nodes[i].getAttribute('data-part-target')===id)return nodes[i]}return null}window.addEventListener('message',function(event){if(event.source!==window.parent)return;var data=event.data||{};if(data.type==='CLEAR_HIGHLIGHTS'){clear();return}if(data.type==='HIGHLIGHT_PART'){clear();var el=find(data.targetId)||find(data.partId);if(el){el.classList.add('part-highlight-active');el.scrollIntoView({behavior:'smooth',block:'center',inline:'center'})}}});if(window.lucide&&typeof window.lucide.createIcons==='function')window.lucide.createIcons();window.parent.postMessage({type:'OWNAI_PREVIEW_READY'},'*')})();<\/script>`;
  const trimmed = source.trim();
  if (!trimmed) {
    return `<!doctype html><html><body style="margin:0;font-family:Inter,sans-serif;display:grid;place-items:center;min-height:100vh;color:#64748b">暂无独立 HTML 源码${listener}</body></html>`;
  }
  if (/<html[\s>]/i.test(trimmed) || /<!doctype/i.test(trimmed)) {
    return /<\/body>/i.test(trimmed) ? trimmed.replace(/<\/body>/i, `${listener}</body>`) : `${trimmed}${listener}`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://cdn.tailwindcss.com"><\/script><script src="https://unpkg.com/lucide@latest"><\/script><style>html,body{margin:0;min-height:100%;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif}</style></head><body>${trimmed}${listener}</body></html>`;
}

function SvgIcon({ name, size = 15 }: { name: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (name === 'moon') return <svg {...common}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" /></svg>;
  if (name === 'sun') return <svg {...common}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" /></svg>;
  if (name === 'smartphone') return <svg {...common}><rect width="14" height="20" x="5" y="2" rx="2" /><path d="M12 18h.01" /></svg>;
  if (name === 'tablet') return <svg {...common}><rect width="16" height="20" x="4" y="2" rx="2" /><path d="M12 18h.01" /></svg>;
  if (name === 'monitor') return <svg {...common}><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8M12 17v4" /></svg>;
  if (name === 'check') return <svg {...common}><path d="m20 6-11 11-5-5" /></svg>;
  if (name === 'sparkles') return <svg {...common}><path d="m12 3-1.7 4.3L6 9l4.3 1.7L12 15l1.7-4.3L18 9l-4.3-1.7L12 3ZM5 16l-.8 2.2L2 19l2.2.8L5 22l.8-2.2L8 19l-2.2-.8L5 16ZM19 13l-.8 2.2L16 16l2.2.8L19 19l.8-2.2L22 16l-2.2-.8L19 13Z" /></svg>;
  return <svg {...common}><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
}

function CopyButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
  }, []);

  const writeToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text || '');
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text || '';
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      textArea.style.top = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      textArea.remove();
    }
  };

  const copy = async (event: React.MouseEvent) => {
    event.stopPropagation();
    await writeToClipboard();
    setCopied(true);
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => setCopied(false), 1500);
  };
  const iconSize = compact ? 12 : 14;
  return <button type="button" className={`dc-copy-button${compact ? ' is-compact' : ''}${copied ? ' copied' : ''}`} onClick={copy}>
    <span className="dc-copy-icon" style={{ width: iconSize, height: iconSize }} aria-hidden="true">
      <svg className="dc-copy-icon-default" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
      <svg className="dc-copy-icon-success" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
    </span>
    <span>Copy</span>
  </button>;
}

function FavoriteButton({
  favorited,
  onToggle,
  compact = false,
}: {
  favorited: boolean;
  onToggle: (event: React.MouseEvent) => void;
  compact?: boolean;
}) {
  const iconSize = compact ? 12 : 14;
  return (
    <button
      type="button"
      className={`dc-favorite-button${compact ? ' is-compact' : ''}${favorited ? ' is-favorited' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(e);
      }}
      title={favorited ? '已收藏，点击取消收藏' : '收藏到我的资产库 (可供 Cursor/Agent 调用)'}
    >
      <span className="dc-fav-icon" style={{ width: iconSize, height: iconSize }} aria-hidden="true">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={favorited ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </span>
      <span>{favorited ? 'Saved' : 'Save'}</span>
    </button>
  );
}

const AI_TOOL_NAMES = ['Cursor', 'Claude', 'Antigravity', 'Lovable', 'Codex', 'Copilot'] as const;

function AiToolIcon({ name }: { name: typeof AI_TOOL_NAMES[number] }) {
  const common = { className: 'dc-ai-tool-icon', viewBox: '0 0 24 24', 'aria-hidden': true };
  if (name === 'Cursor') return <svg {...common} fill="currentColor"><path fillRule="evenodd" d="M20.632 5.679 11.026.134a1 1 0 0 0-.998 0L.419 5.679A.84.84 0 0 0 0 6.405V17.59c0 .3.16.577.42.727l9.607 5.547a1 1 0 0 0 .998 0l9.608-5.547a.84.84 0 0 0 .42-.727V6.406a.84.84 0 0 0-.42-.726zm-.603 1.176-9.275 16.064c-.063.108-.228.064-.228-.061v-10.52a.59.59 0 0 0-.295-.51l-9.11-5.26c-.107-.061-.063-.227.062-.227h18.55c.264 0 .428.286.296.514" clipRule="evenodd" /></svg>;
  if (name === 'Claude') return <svg {...common} fill="#d97757"><path d="m4.715 15.956 4.717-2.648.079-.23-.079-.128h-.23l-.79-.048-2.696-.073-2.337-.097-2.265-.122-.57-.121-.535-.705.055-.352.48-.322.686.061 1.517.104 2.277.157 1.652.098 2.446.255h.389l.055-.158-.134-.098-.103-.097-2.356-1.596-2.55-1.688-1.335-.972-.723-.492-.364-.46-.158-1.009.656-.722.88.06.225.061.892.686 1.906 1.476 2.49 1.833.364.304.146-.104.018-.072-.164-.274-1.354-2.446-1.445-2.49-.643-1.032-.17-.619a3 3 0 0 1-.104-.728L6.287.133 6.7 0l.996.134.419.364.619 1.415L9.736 4.14l1.554 3.03.455.898.243.832.091.255h.158V9.01l.127-1.706.237-2.095.231-2.695.079-.76.376-.91.747-.492.583.28.48.685-.067.444-.285 1.851-.56 2.903-.363 1.942h.212l.243-.243.984-1.305 1.65-2.064.73-.82.85-.904.546-.431h1.032l.759 1.129-.34 1.166-1.062 1.347-.88 1.142-1.264 1.7-.789 1.36.073.11.188-.02 2.854-.606 1.542-.28 1.84-.315.831.388.091.395-.328.807-1.967.486-2.307.461-3.436.814-.043.03.049.061 1.548.146.662.036h1.62l3.018.225.79.522.473.638-.079.485-1.214.62-1.64-.389-3.824-.91-1.312-.329h-.182v.11l1.093 1.068 2.004 1.81 2.507 2.33.127.578-.321.455-.34-.049-2.204-1.657-.85-.747-1.925-1.62h-.127v.17l.443.649 2.344 3.521.12 1.08-.17.353-.606.212-.668-.12-1.372-1.925-1.415-2.168-1.141-1.943-.14.08-.674 7.254-.316.37-.728.28-.607-.461-.322-.747.322-1.476.388-1.924.316-1.53.285-1.9.17-.632-.012-.042-.14.018-1.432 1.967-2.18 2.945-1.724 1.845-.413.164-.716-.37.066-.662.401-.589L8.17 17.57l1.44-1.882.928-1.086-.006-.158h-.055L4.138 18.56l-1.13.146-.485-.456.06-.746.231-.243 1.907-1.312z" /></svg>;
  if (name === 'Antigravity') return <svg {...common} fill="currentColor"><path d="M21.751 22.607c1.34 1.005 3.35.335 1.508-1.508C17.73 15.74 18.904 1 12.037 1S6.342 15.74.815 21.1c-2.01 2.009.167 2.511 1.507 1.506 5.192-3.517 4.857-9.714 9.715-9.714s4.522 6.197 9.714 9.715Z" /></svg>;
  if (name === 'Lovable') return <svg {...common} fill="none"><path fillRule="evenodd" d="M7.082 0C10.992 0 14.163 3.179 14.163 7.1V9.8H16.52C20.43 9.8 23.602 12.978 23.602 16.9 23.602 20.823 20.432 24 16.52 24H0V7.1C0 3.18 3.17 0 7.082 0Z" fill="url(#dc-lovable-grad)" /><defs><radialGradient id="dc-lovable-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(14 3) rotate(92.545) scale(22.522 30.484)"><stop offset="0.25" stopColor="#FE7B02" /><stop offset="0.433" stopColor="#FE4230" /><stop offset="0.548" stopColor="#FE529A" /><stop offset="0.654" stopColor="#DD67EE" /><stop offset="0.95" stopColor="#4B73FF" /></radialGradient></defs></svg>;
  if (name === 'Codex') return <svg {...common} fill="none"><path d="M8.085 0.459c.964-.396 2.012-.54 3.047-.416 1.333.153 2.521.72 3.564 1.7.013.013.032.023.049.028a.4.4 0 0 0 .057 0c1.356-.35 2.79-.22 4.062.367l.062.029.155.076c1.33.674 2.368 1.812 2.917 3.199.279.68.417 1.388.42 2.126.02.55-.04 1.099-.179 1.631a.4.4 0 0 0 .04.154c.792.81 1.317 1.773 1.577 2.893.386 1.9-.009 3.613-1.183 5.138l-.181.222a5.84 5.84 0 0 1-2.935 1.85.4.4 0 0 0-.108.102c-.255.735-.511 1.364-.987 1.992-1.2 1.583-2.963 2.461-4.948 2.451-1.583-.008-2.985-.587-4.21-1.736a.4.4 0 0 0-.14-.033c-.517.167-1.04.191-1.605.184a7.3 7.3 0 0 1-2.593-.621 6.6 6.6 0 0 1-2.147-1.78 8 8 0 0 1-.552-1.105 8.6 8.6 0 0 1-.493-1.281c-.267-1.003-.273-2.058-.019-3.064a.4.4 0 0 0-.036-.139A5.9 5.9 0 0 1 .35 12.507C.156 12 .043 11.462.016 10.918a5.9 5.9 0 0 1 .188-2.133C.653 7.302 1.513 6.138 2.781 5.294c.283-.188.551-.335.801-.44.287-.119.574-.219.862-.303a.4.4 0 0 0 .086-.088C4.75 3.678 5.125 2.945 5.636 2.31A7.1 7.1 0 0 1 8.085.459ZM12.728 14.546a.72.72 0 0 0-.57.264.72.72 0 0 0 .57.847h4.848a.72.72 0 0 0 .897-.848.72.72 0 0 0-.897-.263h-4.848ZM7.282 8.307a.72.72 0 0 0-1.475.841L7.504 12.114 5.816 14.961a.72.72 0 0 0 1.46.865L9.214 12.553a.72.72 0 0 0 .007-.853L7.282 8.307Z" fill="url(#dc-codex-grad)" /><defs><linearGradient id="dc-codex-grad" x1="12" y1="0" x2="12" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#7A9DFF" /><stop offset="1" stopColor="#3941FF" /></linearGradient></defs></svg>;
  return <svg {...common} fill="currentColor"><path fillRule="evenodd" d="M19.245 5.364C20.567 6.724 21.122 8.58 21.355 11.181C21.977 11.181 22.555 11.316 22.947 11.835L23.677 12.799C23.887 13.077 24 13.409 24 13.754V16.374C24 16.713 23.827 17.043 23.547 17.242C20.239 19.602 16.157 21.5 12 21.5C7.4 21.5 2.795 18.917 0.453 17.242C0.173 17.042 0.001 16.712 0 16.374V13.754C0 13.409 0.113 13.075 0.321 12.798L1.051 11.835C1.443 11.318 2.025 11.181 2.644 11.181L2.673 10.884C2.923 8.438 3.483 6.671 4.755 5.364C7.216 2.824 10.465 2.513 11.901 2.5H12.099C13.535 2.513 16.784 2.823 19.245 5.364ZM12.001 9.692C11.717 9.692 11.388 9.708 11.039 9.742C10.916 10.189 10.734 10.592 10.469 10.85C9.419 11.873 8.153 12.03 7.475 12.03C6.837 12.03 6.169 11.9 5.624 11.566C5.108 11.731 4.612 11.969 4.58 12.562C4.538 13.523 4.517 14.484 4.517 15.446L4.515 15.926C4.513 16.489 4.51 17.052 4.502 17.616C4.504 17.942 4.706 18.246 5.012 18.381C7.494 19.483 9.842 20.038 12.002 20.038C14.158 20.038 16.506 19.483 18.987 18.381C19.136 18.315 19.264 18.208 19.354 18.073C19.444 17.937 19.494 17.778 19.497 17.615C19.527 15.933 19.503 14.243 19.421 12.562C19.39 11.966 18.893 11.732 18.375 11.566C17.829 11.899 17.163 12.03 16.525 12.03C15.848 12.03 14.583 11.873 13.532 10.85C13.266 10.592 13.085 10.189 12.962 9.742C12.642 9.71 12.321 9.693 12.001 9.692ZM9.476 13.705C10.015 13.705 10.452 14.131 10.452 14.655V16.408C10.452 16.933 10.015 17.358 9.476 17.358C9.221 17.361 8.974 17.263 8.792 17.085C8.609 16.907 8.504 16.663 8.5 16.408V14.656C8.5 14.131 8.937 13.705 9.476 13.705ZM14.476 13.705C15.015 13.705 15.452 14.131 15.452 14.655V16.408C15.452 16.933 15.015 17.358 14.476 17.358C14.221 17.361 13.974 17.263 13.792 17.085C13.609 16.907 13.504 16.663 13.5 16.408V14.656C13.5 14.131 13.937 13.705 14.476 13.705ZM7.635 5.087C6.585 5.189 5.7 5.525 5.25 5.993C4.275 7.03 4.485 9.661 5.04 10.217C5.445 10.611 6.21 10.874 7.035 10.874H7.125C7.774 10.861 8.91 10.698 9.855 9.764C10.29 9.354 10.56 8.331 10.53 7.294C10.5 6.46 10.26 5.774 9.9 5.481C9.51 5.145 8.625 4.999 7.635 5.087ZM14.1 5.481C13.74 5.773 13.5 6.461 13.47 7.294C13.44 8.331 13.71 9.354 14.145 9.764C15.113 10.721 16.281 10.868 16.921 10.874H16.965C17.79 10.874 18.555 10.611 18.96 10.217C19.515 9.661 19.725 7.03 18.75 5.993C18.3 5.525 17.415 5.189 16.365 5.087C15.375 4.999 14.49 5.145 14.1 5.481ZM12 7.615C11.76 7.615 11.475 7.63 11.16 7.659C11.19 7.819 11.205 7.995 11.22 8.185L11.219 8.344C11.218 8.427 11.213 8.511 11.205 8.594C11.43 8.572 11.63 8.567 11.817 8.566H12.183C12.37 8.566 12.57 8.572 12.795 8.594C12.78 8.448 12.78 8.317 12.78 8.185C12.795 7.995 12.81 7.82 12.84 7.659C12.561 7.632 12.28 7.617 12 7.615Z" clipRule="evenodd" /></svg>;
}

function AiBadges() {
  return <div className="dc-ai-badges">
    {AI_TOOL_NAMES.map((name) => <span className="dc-ai-badge" key={name}><AiToolIcon name={name} />{name}</span>)}
  </div>;
}

function RecommendedUsage({ mode, guide = {} }: { mode: 'prompt' | 'parts' | 'code'; guide?: UnknownRecord }) {
  const isPrompt = mode === 'prompt';
  const isParts = mode === 'parts';
  return <section className={`dc-recommended${isParts ? ' with-border' : ''}`}>
    <h3>🚀 <span>推荐用法</span></h3>
    <div className="dc-step"><b>1</b><p>点击右上角 <strong>Copy</strong> 按钮将{isPrompt ? '完整 System Prompt 与设计规范' : isParts ? '独立切片代码' : '完整单文件组件代码'}复制到剪贴板。</p></div>
    <div className="dc-step"><b>2</b><div><p>直接粘贴至任意主流 AI 编辑器或全栈生成工具：</p><AiBadges />
      {isPrompt ? <div className="dc-guide"><p>配合定制指令：<strong>“请严格按照该设计规范与视觉拓扑生成组件”</strong>，并附带业务改造需求：</p><ul><li><strong>替换品牌名称</strong>：将 <code>{String(guide.brand || 'YourBrand')}</code> 替换为你的产品名。</li><li><strong>替换主题光晕</strong>：将 <code>{String(guide.glow || 'amber-600/rose-700')}</code> 替换为品牌色。</li><li><strong>替换核心演示区</strong>：替换为产品的核心功能交互卡片。</li></ul></div> : <p className="dc-guide">配合改造指令：<strong>“请帮我把这段代码改造成符合我业务风格的组件”</strong></p>}
    </div></div>
    <div className="dc-step"><b>3</b><p>{isPrompt ? '附带你现有的 HTML 骨架或直接输入业务字段，由 AI 参考本套设计规范快速生成高保真前端代码。' : <>或新建本地 <code>index.html</code> 文件直接粘贴，使用浏览器双击打开即可预览。</>}</p></div>
  </section>;
}

function PromptPane({
  prompt,
  fallback,
  favoritedKeys,
  onToggleFavorite,
}: {
  prompt: PromptData;
  fallback: string;
  favoritedKeys: Set<string>;
  onToggleFavorite: (item: FavoriteItemParam) => void;
}) {
  const rawPrompt = buildFullPromptMarkdown(prompt, fallback);
  const layout = (prompt.layout || '').replace(/^整体布局[：:]\s*/, '');
  const isFavorited = favoritedKeys.has('prompt:full');
  return <div className="dc-pane dc-prompt-pane">
    <div className="dc-pane-title">
      <div className="dc-code-title"><span># SYSTEM_PROMPT.md</span><small>Markdown</small></div>
      <div className="dc-pane-actions">
        <FavoriteButton
          favorited={isFavorited}
          onToggle={() => onToggleFavorite({
            assetType: 'prompt',
            assetKey: 'full',
            title: 'System Prompt & 设计规范',
            tag: 'Design Specs',
            description: prompt.role || '完整解构 System Prompt 与视觉规范',
            content: rawPrompt,
          })}
        />
        <CopyButton text={rawPrompt} />
      </div>
    </div>
    <section className="dc-role"><h1>角色与核心任务 (Role &amp; Objective)</h1><p>{prompt.role || '暂无角色与核心任务说明'}</p></section>
    <RecommendedUsage mode="prompt" guide={asRecord(prompt.customGuide)} />
    <hr />
    <section className="dc-section"><h2>01. 界面布局与视觉风格</h2>{layout && <p><strong>整体布局</strong>：{layout}</p>}
      <h3>画板基准与设备视口 (Viewport Specs)</h3>
      <div className="dc-viewports">{(prompt.viewports || []).map((viewport) => <article key={`${viewport.name}-${viewport.size}`}><small>{viewport.name}</small><b>{viewport.size}</b><em>{viewport.note || ''}</em></article>)}</div>
      <div className="dc-spec-groups">
        <div className="dc-spec-group"><h3>色彩系统 (Color Palette)</h3><div className="dc-token-list">{(prompt.colors || []).map((token, index) => <article className="dc-token" key={`${token.label}-${index}`}><div>{token.value && <i style={{ background: token.value }} />}<span><b>{token.label}</b>{token.note && <p><em>用在:</em> {token.note.replace(/^(用在|应用位置|应用)[：:]\s*/, '')}</p>}</span></div><code>{token.value}</code></article>)}</div></div>
        <div className="dc-spec-group"><h3>文字排版与资产 (Typography &amp; Assets)</h3><div className="dc-token-list">{(prompt.typography || []).map((token, index) => <article className="dc-token" key={`${token.role}-${index}`}><div><span><b>{token.role || token.label}</b>{token.note && <p><em>用在:</em> {token.note}</p>}</span></div><code>{token.value}</code></article>)}</div></div>
      </div>
    </section>
    <hr />
    <section className="dc-section"><h2>02. 交互控件与动效参数 (Motion Specs)</h2><div className="dc-motion-list">{(prompt.motions || []).map((motion, index) => <article key={`${motion.label}-${index}`}><i /><p><strong>{motion.label}</strong>：{motion.desc} (<code>{motion.token}</code>)。</p></article>)}</div></section>
    <hr />
    <section className="dc-section dc-rules"><h2>03. 设计红线与约束 (Do's and Don'ts)</h2><h3 className="do">✅ Do (必须执行)</h3>{(prompt.rules?.dos || []).map((item) => <p key={item}><i className="do" />{item}</p>)}<h3 className="dont">❌ Don't (严禁行为)</h3>{(prompt.rules?.donts || []).map((item) => <p key={item}><i className="dont" />{item}</p>)}</section>
  </div>;
}

function PartsPane({
  parts,
  selected,
  onSelect,
  favoritedKeys,
  onToggleFavorite,
}: {
  parts: PartData[];
  selected: string | null;
  onSelect: (part: PartData) => void;
  favoritedKeys: Set<string>;
  onToggleFavorite: (item: FavoriteItemParam) => void;
}) {
  return <div className="dc-pane"><div className="dc-pane-title"><div><span className="dc-overline"># UI PARTS · 核心结构零件</span><p>点击结构块在右侧即时动态高亮对应区域，点击 Save 收藏至资产库，点击 Copy 复制代码</p></div></div>
    <div className="dc-parts-list">{parts.length ? parts.map((part) => {
      const isFav = favoritedKeys.has(`component:${part.id}`);
          const componentCopyText = (() => {
            const header = [part.title || part.id, part.tag ? `[${part.tag}]` : ''].filter(Boolean).join(' ');
            const desc = part.desc ? part.desc.trim() : '';
            const code = (part.code || '').trim();
            if (code.startsWith('<')) {
              return `<!--\n  组件：${header}\n  说明：${desc || '暂无说明'}\n-->\n${code}`;
            } else {
              return `/**\n * 组件：${header}\n * 说明：${desc || '暂无说明'}\n */\n${code}`;
            }
          })();
          return <article className={`dc-part-card${selected === part.id ? ' active' : ''}`} key={part.id} onClick={() => onSelect(part)}>
            <div><h3>{part.title || part.id}<span>{part.tag || 'Part'}</span></h3><p>{part.desc}</p></div>
            <div className="dc-card-actions" onClick={(e) => e.stopPropagation()}>
              <FavoriteButton
                compact
                favorited={isFav}
                onToggle={() => onToggleFavorite({
                  assetType: 'component',
                  assetKey: part.id,
                  title: part.title || part.id,
                  tag: part.tag || 'Part',
                  description: part.desc || '',
                  content: part.code || '',
                })}
              />
              <CopyButton compact text={componentCopyText} />
            </div>
          </article>;
    }) : <div className="dc-empty">暂无零件切片数据</div>}</div>
    <RecommendedUsage mode="parts" />
  </div>;
}

function AssetsPane({
  assets,
  favoritedKeys,
  onToggleFavorite,
}: {
  assets: AssetsData;
  favoritedKeys: Set<string>;
  onToggleFavorite: (item: FavoriteItemParam) => void;
}) {
  const icons = Array.isArray(assets.icons) ? assets.icons : [];
  const media = Array.isArray(assets.media) ? assets.media : [];
  const [mediaFilter, setMediaFilter] = useState<'all' | 'video' | 'image'>('all');

  const mediaWithIndex = useMemo(() => {
    const list = media.map((item, originalIndex) => ({
      ...item,
      originalIndex,
      assetKey: `media-${originalIndex}`,
    }));
    return list.slice().sort((a, b) => {
      const aIsVideo = a.type === 'video' ? 1 : 0;
      const bIsVideo = b.type === 'video' ? 1 : 0;
      return bIsVideo - aIsVideo;
    });
  }, [media]);

  const videoCount = useMemo(() => mediaWithIndex.filter((m) => m.type === 'video').length, [mediaWithIndex]);
  const imageCount = useMemo(() => mediaWithIndex.filter((m) => m.type !== 'video').length, [mediaWithIndex]);

  const filteredMedia = useMemo(() => {
    if (mediaFilter === 'video') return mediaWithIndex.filter((m) => m.type === 'video');
    if (mediaFilter === 'image') return mediaWithIndex.filter((m) => m.type !== 'video');
    return mediaWithIndex;
  }, [mediaWithIndex, mediaFilter]);

  return (
    <div className="dc-pane">
      <div className="dc-pane-title">
        <div>
          <span className="dc-overline"># UI ASSETS · 设计素材库</span>
          <p>展示右侧界面调用的全部矢量图标与图片视频资产，可一键收藏供 Agent 编码调用</p>
        </div>
      </div>
      <section className="dc-assets-section">
        <div className="dc-subtitle">
          <b>01. 矢量图标 (Icons · {icons.length})</b>
          <small>点击 Save 收藏，点击 Copy 获取代码</small>
        </div>
        <div className="dc-icon-grid">
          {icons.length ? (
            icons.map((icon, index) => {
              const iconKey = icon.name || `icon-${index}`;
              const isFav = favoritedKeys.has(`icon:${iconKey}`);
              return (
                <article key={`${icon.name}-${index}`}>
                  <div className="dc-icon-preview">
                    <SvgIcon name={icon.name || 'copy'} size={16} />
                  </div>
                  <div className="dc-asset-text">
                    <h3>
                      {icon.name}
                      <span>{icon.library || 'Lucide'}</span>
                    </h3>
                    <p>{icon.label || icon.desc}</p>
                  </div>
                  <div className="dc-card-actions" onClick={(e) => e.stopPropagation()}>
                    <FavoriteButton
                      compact
                      favorited={isFav}
                      onToggle={() =>
                        onToggleFavorite({
                          assetType: 'icon',
                          assetKey: iconKey,
                          title: icon.name || 'Icon',
                          tag: icon.library || 'Lucide',
                          description: icon.label || icon.desc || '',
                          content: icon.code || icon.svg || icon.name || '',
                        })
                      }
                    />
                    <CopyButton compact text={icon.code || icon.name || ''} />
                  </div>
                </article>
              );
            })
          ) : (
            <p className="dc-muted">暂无独立声明图标</p>
          )}
        </div>
      </section>
      <hr />
      <section className="dc-assets-section">
        <div className="dc-subtitle dc-media-header">
          <b>02. 视频与图片素材 (Media · {media.length || 0})</b>
          <small>支持大图检视、网格浏览与直链获取</small>
        </div>

        {media.length > 0 && (
          <div className="dc-media-filter-bar">
            <div className="dc-media-pills">
              <button
                type="button"
                className={`dc-media-pill${mediaFilter === 'all' ? ' active' : ''}`}
                onClick={() => setMediaFilter('all')}
              >
                <span>全部</span>
                <span className="dc-pill-num">{media.length}</span>
              </button>
              <button
                type="button"
                className={`dc-media-pill${mediaFilter === 'video' ? ' active' : ''}`}
                onClick={() => setMediaFilter('video')}
              >
                <span>视频</span>
                <span className="dc-pill-num">{videoCount}</span>
              </button>
              <button
                type="button"
                className={`dc-media-pill${mediaFilter === 'image' ? ' active' : ''}`}
                onClick={() => setMediaFilter('image')}
              >
                <span>图片</span>
                <span className="dc-pill-num">{imageCount}</span>
              </button>
            </div>
          </div>
        )}

        {filteredMedia.length ? (
          <div className="dc-media-grid">
            {filteredMedia.map((item) => {
              const isVideo = item.type === 'video';
              const isFav = favoritedKeys.has(`icon:${item.assetKey}`);
              return (
                <article className="dc-media-card" key={item.assetKey}>
                  <div className="dc-media-card-actions" onClick={(e) => e.stopPropagation()}>
                    <FavoriteButton
                      compact
                      favorited={isFav}
                      onToggle={() =>
                        onToggleFavorite({
                          assetType: 'icon',
                          assetKey: item.assetKey,
                          title: item.title || (isVideo ? '视频素材' : '图片素材'),
                          tag: isVideo ? 'Video' : 'Image',
                          description: item.desc || '',
                          content: item.url || '',
                        })
                      }
                    />
                    <CopyButton compact text={item.url || ''} />
                  </div>
                  <div className="dc-media-card-content">
                    {isVideo ? (
                      <video
                        src={item.url}
                        controls
                        preload="metadata"
                        playsInline
                        className="dc-media-video-element"
                      />
                    ) : (
                      <>
                        <img
                          src={item.url}
                          alt={item.title || '设计素材'}
                          className="dc-media-image-element"
                          loading="lazy"
                        />
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="dc-media-preview-overlay"
                          title="在新标签页中查看原尺寸大图"
                        >
                          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                            <path d="M11 8v6M8 11h6" />
                          </svg>
                          <span>查看原图</span>
                        </a>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="dc-no-media">
            <span>{media.length ? '暂无符合当前类型的素材' : '外部视频与图片素材'}</span>
            <b>{media.length ? '0' : '无'}</b>
          </div>
        )}
      </section>
    </div>
  );
}

function CodePane({ code }: { code: string }) {
  return <div className="dc-pane"><div className="dc-pane-title"><div className="dc-code-title"><span># COMPONENT.html</span><small>HTML / Tailwind</small></div><CopyButton text={code} /></div><RecommendedUsage mode="code" /></div>;
}

export default function ArtworkDeconstruction() {
  const { id } = useParams();
  const [data, setData] = useState<ArtworkDeconstructionVO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<TabKey>('prompt');
  const [device, setDevice] = useState<DeviceKey>('desktop');
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [favoritedKeys, setFavoritedKeys] = useState<Set<string>>(new Set());
  const [dark, setDark] = useState(() => {
    const queryTheme = new URLSearchParams(window.location.search).get('theme');
    return queryTheme ? queryTheme === 'dark' : localStorage.getItem('public_deconstruct_theme') === 'dark';
  });
  const [scale, setScale] = useState(1);
  const stageRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const deviceSwitcherRef = useRef<HTMLDivElement>(null);
  const deviceIndicatorRef = useRef<HTMLSpanElement>(null);
  const deviceButtonRefs = useRef<Record<DeviceKey, HTMLButtonElement | null>>({ mobile: null, tablet: null, desktop: null });

  useEffect(() => {
    if (!id || !/^\d+$/.test(id) || /^0+$/.test(id)) {
      setError('作品 ID 无效');
      setLoading(false);
      return;
    }
    getArtworkDeconstruction(id).then(setData).catch((reason: unknown) => setError(reason instanceof Error ? reason.message : '解构数据加载失败')).finally(() => setLoading(false));
    getDeconstructionAssetFavoriteKeys(id).then((keys) => {
      setFavoritedKeys(new Set(keys));
    }).catch(() => {
      // 未登录时静默
    });
  }, [id]);

  const handleToggleFavorite = async (param: FavoriteItemParam) => {
    if (!id) return;
    const itemKey = `${param.assetType}:${param.assetKey}`;
    const currentlyFavorited = favoritedKeys.has(itemKey);
    // 乐观更新
    setFavoritedKeys((prev) => {
      const next = new Set(prev);
      if (currentlyFavorited) {
        next.delete(itemKey);
      } else {
        next.add(itemKey);
      }
      return next;
    });

    try {
      if (currentlyFavorited) {
        await cancelDeconstructionAssetFavorite({
          artworkId: id,
          assetType: param.assetType,
          assetKey: param.assetKey,
        });
      } else {
        await addDeconstructionAssetFavorite({
          artworkId: id,
          assetType: param.assetType,
          assetKey: param.assetKey,
          title: param.title,
          tag: param.tag,
          description: param.description,
          content: param.content,
        });
      }
    } catch (err: unknown) {
      // 失败回滚
      setFavoritedKeys((prev) => {
        const next = new Set(prev);
        if (currentlyFavorited) {
          next.add(itemKey);
        } else {
          next.delete(itemKey);
        }
        return next;
      });
      const message = err instanceof Error ? err.message : '操作失败，请先登录';
      alert(message);
    }
  };

  const prompt = useMemo(() => parsePrompt(data?.promptData), [data?.promptData]);
  const parts = useMemo(() => parseParts(data?.partsData), [data?.partsData]);
  const assets = useMemo(() => parseAssets(data?.assetsData), [data?.assetsData]);
  const deviceSizes = useMemo(() => getDeviceSizes(prompt.viewports), [prompt.viewports]);
  const size = deviceSizes[device];
  const showTitlebar = data?.deviceFrame !== 'none' && data?.deviceFrame !== 'app';
  const frameHeight = size.height + (showTitlebar ? 36 : 0);
  const previewUrl = useMemo(
    () => data?.htmlUrl && data?.id ? `/api/artwork/preview/${encodeURIComponent(data.id)}` : '',
    [data?.htmlUrl, data?.id]
  );
  const previewHtml = useMemo(() => preparePreviewHtml(data?.standaloneHtml || ''), [data?.standaloneHtml]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const resize = () => {
      const availableWidth = Math.max(stage.clientWidth - 32, 100);
      const availableHeight = Math.max(stage.clientHeight - 20, 100);
      const nextScale = Math.min(availableWidth / size.width, availableHeight / frameHeight, 1);
      setScale((current) => Math.abs(current - nextScale) < 0.0001 ? current : nextScale);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [data?.id, frameHeight, size.width]);

  useLayoutEffect(() => {
    const switcher = deviceSwitcherRef.current;
    const indicator = deviceIndicatorRef.current;
    const activeButton = deviceButtonRefs.current[device];
    if (!switcher || !indicator || !activeButton) return;

    const updateIndicator = () => {
      const buttonRect = activeButton.getBoundingClientRect();
      const switcherRect = switcher.getBoundingClientRect();
      indicator.style.width = `${buttonRect.width}px`;
      indicator.style.height = `${buttonRect.height}px`;
      indicator.style.transform = `translate(${buttonRect.left - switcherRect.left}px, ${buttonRect.top - switcherRect.top}px)`;
    };

    updateIndicator();
    let disposed = false;
    const settleTimer = window.setTimeout(updateIndicator, 60);
    void document.fonts.ready.then(() => {
      if (!disposed) updateIndicator();
    });
    window.addEventListener('resize', updateIndicator);
    return () => {
      disposed = true;
      window.clearTimeout(settleTimer);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [data?.id, device]);

  useEffect(() => {
    document.title = `${data?.title || '作品'} - 网页解构工作台`;
  }, [data?.title]);

  const toggleTheme = () => setDark((current) => {
    localStorage.setItem('public_deconstruct_theme', current ? 'light' : 'dark');
    return !current;
  });

  const selectPart = (part: PartData) => {
    setSelectedPart(part.id);
    iframeRef.current?.contentWindow?.postMessage({ type: 'HIGHLIGHT_PART', partId: part.id, targetId: part.targetId, label: part.title }, '*');
  };

  const handlePreviewLoad = () => {
    if (!selectedPart) return;
    const part = parts.find((item) => item.id === selectedPart);
    if (part) iframeRef.current?.contentWindow?.postMessage({ type: 'HIGHLIGHT_PART', partId: part.id, targetId: part.targetId, label: part.title }, '*');
  };

  const changeTab = (nextTab: TabKey) => {
    setTab(nextTab);
    if (nextTab !== 'parts') {
      setSelectedPart(null);
      iframeRef.current?.contentWindow?.postMessage({ type: 'CLEAR_HIGHLIGHTS' }, '*');
    } else if (parts[0]) {
      window.setTimeout(() => selectPart(parts[0]), 0);
    }
  };

  if (loading || error || !data) return <div className={`dc-status-page${dark ? ' dark' : ''}`}><div className="dc-status-card">{loading ? <><span className="dc-spinner" />正在加载解构工作台…</> : <><strong>无法打开解构工作台</strong><p>{error || '作品不存在'}</p><a href="/frontend-prompts">返回前端提示词</a></>}</div></div>;

  return <div className={`dc-workbench${dark ? ' dark' : ''}`}>
    <header className="dc-header"><a className="dc-brand" href="/frontend-prompts" title="返回前端提示词"><img src="/images/deconstruction-logo.png" alt="Ownai Logo" /><span>ownai</span></a><button className={`dc-theme-switch${dark ? ' active' : ''}`} type="button" role="switch" aria-checked={dark} onClick={toggleTheme} title={dark ? '当前为暗色主题，点击切换浅色主题' : '当前为浅色主题，点击切换暗色主题'}><i><SvgIcon name={dark ? 'moon' : 'sun'} size={12} /></i></button></header>
    <div className="dc-main">
      <aside className="dc-sidebar"><nav className="dc-tabs">{(['prompt', 'parts', 'assets', 'code'] as TabKey[]).map((key) => <button type="button" className={tab === key ? 'active' : ''} onClick={() => changeTab(key)} key={key}>{key.toUpperCase()}</button>)}</nav><div className="dc-sidebar-scroll">{tab === 'prompt' && <PromptPane prompt={prompt} fallback={data.deconstructedPrompt || ''} favoritedKeys={favoritedKeys} onToggleFavorite={handleToggleFavorite} />}{tab === 'parts' && <PartsPane parts={parts} selected={selectedPart} onSelect={selectPart} favoritedKeys={favoritedKeys} onToggleFavorite={handleToggleFavorite} />}{tab === 'assets' && <AssetsPane assets={assets} favoritedKeys={favoritedKeys} onToggleFavorite={handleToggleFavorite} />}{tab === 'code' && <CodePane code={data.standaloneHtml || ''} />}</div></aside>
      <main className="dc-canvas"><div className="dc-canvas-toolbar"><div className="dc-device-switcher" ref={deviceSwitcherRef}><span className="dc-device-indicator" ref={deviceIndicatorRef} aria-hidden="true" />{(['mobile', 'tablet', 'desktop'] as DeviceKey[]).map((key) => <button ref={(node) => { deviceButtonRefs.current[key] = node; }} type="button" className={device === key ? 'active' : ''} onClick={() => setDevice(key)} key={key}><SvgIcon name={key === 'desktop' ? 'monitor' : key} /><span>{key[0].toUpperCase() + key.slice(1)}</span></button>)}</div></div>
        <div className="dc-stage" ref={stageRef}><div className="dc-scaled-box" style={{ width: size.width, height: frameHeight, transform: `scale(${scale})` }}><div className={`dc-window-frame frame-${data.deviceFrame || 'website'}`} style={{ width: size.width, height: frameHeight }}>{showTitlebar && <div className="dc-titlebar"><div className="dc-traffic"><i /><i /><i /></div><span>ownai.icu</span><b /></div>}<iframe ref={iframeRef} src={previewUrl || undefined} srcDoc={previewUrl ? undefined : previewHtml} onLoad={handlePreviewLoad} referrerPolicy="no-referrer" title={`${data.title} 实机预览`} sandbox="allow-scripts allow-forms allow-modals" /></div></div></div>
      </main>
    </div>
  </div>;
}
