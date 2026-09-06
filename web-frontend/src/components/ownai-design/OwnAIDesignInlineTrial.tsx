import { MousePointer2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RequestErrorToast, type RequestToastTone } from "@/components/ui/RequestErrorToast";

type InlineTrialProps = {
  active: boolean;
  onActiveChange: (active: boolean) => void;
};

type CaptureResult = {
  label: string;
  prompt: string;
  nodeCount: number;
};

type HoverTarget = {
  label: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

const STYLE_PROPERTIES = [
  "display",
  "position",
  "box-sizing",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "margin",
  "padding",
  "gap",
  "grid-template-columns",
  "grid-template-rows",
  "flex",
  "flex-direction",
  "flex-wrap",
  "align-items",
  "justify-content",
  "overflow",
  "background",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "line-height",
  "letter-spacing",
  "text-align",
  "text-decoration",
  "text-transform",
  "white-space",
  "border",
  "border-radius",
  "box-shadow",
  "opacity",
  "object-fit",
  "transform",
] as const;

function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
  return Promise.resolve();
}

function serializeElement(element: HTMLElement) {
  const originals = [element, ...Array.from(element.querySelectorAll<HTMLElement>("*"))];
  const clone = element.cloneNode(true) as HTMLElement;
  const clones = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];

  originals.forEach((original, index) => {
    const target = clones[index];
    if (!target) return;
    const computed = window.getComputedStyle(original);
    const declarations = STYLE_PROPERTIES.map((property) => {
      const value = computed.getPropertyValue(property).trim();
      return value ? `${property}:${value}` : "";
    }).filter(Boolean);

    target.setAttribute("style", declarations.join(";"));
    target.removeAttribute("data-ownai-trial-selectable");
    target.removeAttribute("data-ownai-trial-name");
    target.removeAttribute("data-ownai-trial-hovered");
    Array.from(target.attributes).forEach((attribute) => {
      if (/^on/i.test(attribute.name)) target.removeAttribute(attribute.name);
    });
  });

  clone.querySelectorAll("script, style, link, noscript").forEach((node) => node.remove());
  return { html: clone.outerHTML, nodeCount: originals.length };
}

function buildPrompt(element: HTMLElement): CaptureResult {
  const serialized = serializeElement(element);
  const rect = element.getBoundingClientRect();
  const label = element.dataset.ownaiTrialName || element.tagName.toLowerCase();

  return {
    label,
    nodeCount: serialized.nodeCount,
    prompt: `[OWNAI COMPONENT REPLICATION TASK]\n\n请在当前项目中高保真实现下面提取的网页组件。\n\n要求：\n- 沿用当前项目的框架、组件体系、样式方案和设计令牌。\n- 保留布局、层级、尺寸比例、间距、字体、颜色、圆角、阴影与交互状态。\n- 整理为语义清晰、可维护、响应式的组件。\n- 不引入来源网页的脚本、跟踪代码、登录态或敏感数据。\n- 检查桌面端与移动端溢出，不修改无关区域。\n\n选择范围：${label}\n当前尺寸：${Math.round(rect.width)} × ${Math.round(rect.height)} px\n节点数量：${serialized.nodeCount}\n\n\`\`\`html\n${serialized.html}\n\`\`\``,
  };
}

export function OwnAIDesignInlineTrial({ active, onActiveChange }: InlineTrialProps) {
  const hoveredRef = useRef<HTMLElement | null>(null);
  const [hoverTarget, setHoverTarget] = useState<HoverTarget | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: RequestToastTone } | null>(null);

  const clearHovered = () => {
    hoveredRef.current?.removeAttribute("data-ownai-trial-hovered");
    hoveredRef.current = null;
    setHoverTarget(null);
  };

  useEffect(() => {
    if (!active) {
      clearHovered();
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const source = event.target;
      if (!(source instanceof HTMLElement) || source.closest("[data-ownai-trial-ui]")) {
        clearHovered();
        return;
      }
      const target = source.closest<HTMLElement>("[data-ownai-trial-selectable]");
      if (target === hoveredRef.current) return;
      clearHovered();
      if (!target) return;

      const rect = target.getBoundingClientRect();
      target.setAttribute("data-ownai-trial-hovered", "true");
      hoveredRef.current = target;
      setHoverTarget({
        label: target.dataset.ownaiTrialName || "界面组件",
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };

    const handleClick = (event: MouseEvent) => {
      const source = event.target;
      if (!(source instanceof HTMLElement) || source.closest("[data-ownai-trial-ui]")) return;
      const target = source.closest<HTMLElement>("[data-ownai-trial-selectable]");
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      const result = buildPrompt(target);
      void copyToClipboard(result.prompt)
        .then(() => setToast({ message: "复制成功", tone: "success" }))
        .catch(() => setToast({ message: "复制失败，请重试", tone: "error" }));
      clearHovered();
      onActiveChange(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      clearHovered();
      onActiveChange(false);
    };

    window.addEventListener("pointermove", handlePointerMove, true);
    window.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove, true);
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("keydown", handleKeyDown);
      clearHovered();
    };
  }, [active, onActiveChange]);

  const closeTrial = () => {
    clearHovered();
    onActiveChange(false);
  };

  return (
    <>
      <style>{`[data-ownai-trial-hovered="true"]{outline:2px solid #4f8cff!important;outline-offset:4px;cursor:crosshair!important}`}</style>

      {active && (
        <div data-ownai-trial-ui className="fixed left-1/2 top-11 z-[160] flex -translate-x-1/2 items-center gap-3 rounded-full border border-[#6aa8ff]/60 bg-[#0b1019]/94 px-4 py-2 text-[12px] text-white shadow-[0_18px_54px_rgba(0,0,0,0.48)] backdrop-blur-xl">
          <MousePointer2 className="h-4 w-4 text-[#75adff]" aria-hidden="true" />
          <span className="whitespace-nowrap font-medium">移动鼠标选择组件，单击确认</span>
          <span className="hidden text-white/38 sm:inline">Esc 退出</span>
          <button type="button" onClick={closeTrial} className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/58 transition-colors hover:bg-white/10 hover:text-white" aria-label="退出试用">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {active && hoverTarget && (
        <div
          data-ownai-trial-ui
          className="pointer-events-none fixed z-[155] rounded-[5px] bg-[#2479e8] px-2 py-1 text-[10px] font-semibold text-white shadow-lg"
          style={{ left: Math.max(8, hoverTarget.left), top: Math.max(8, hoverTarget.top - 30) }}
        >
          {hoverTarget.label} · {Math.round(hoverTarget.width)} × {Math.round(hoverTarget.height)}
        </div>
      )}

      {toast ? (
        <RequestErrorToast
          message={toast.message}
          tone={toast.tone}
          variant="chat"
          autoCloseMs={1800}
          onClose={() => setToast(null)}
        />
      ) : null}
    </>
  );
}
