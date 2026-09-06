import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";

export interface TutorialContentOutlineItem {
  id: string;
  label: string;
  level: 1 | 2 | 3;
  index: number;
}

interface TutorialContentProps {
  contentHtml: string;
  className?: string;
  onImageOpen?: (url: string) => void;
  onMessage?: (message: string) => void;
  onOutlineChange?: (items: TutorialContentOutlineItem[]) => void;
}

let tutorialHighlighterPromise: Promise<typeof import("highlight.js/lib/core").default> | null = null;

function getTutorialHighlighter() {
  if (!tutorialHighlighterPromise) {
    tutorialHighlighterPromise = Promise.all([
      import("highlight.js/lib/core"),
      import("highlight.js/lib/languages/bash"),
      import("highlight.js/lib/languages/css"),
      import("highlight.js/lib/languages/java"),
      import("highlight.js/lib/languages/javascript"),
      import("highlight.js/lib/languages/json"),
      import("highlight.js/lib/languages/python"),
      import("highlight.js/lib/languages/sql"),
      import("highlight.js/lib/languages/typescript"),
      import("highlight.js/lib/languages/xml"),
    ]).then(([core, bash, css, java, javascript, json, python, sql, typescript, xml]) => {
      const highlighter = core.default;
      highlighter.registerLanguage("bash", bash.default);
      highlighter.registerLanguage("css", css.default);
      highlighter.registerLanguage("html", xml.default);
      highlighter.registerLanguage("java", java.default);
      highlighter.registerLanguage("javascript", javascript.default);
      highlighter.registerLanguage("js", javascript.default);
      highlighter.registerLanguage("json", json.default);
      highlighter.registerLanguage("python", python.default);
      highlighter.registerLanguage("py", python.default);
      highlighter.registerLanguage("sql", sql.default);
      highlighter.registerLanguage("typescript", typescript.default);
      highlighter.registerLanguage("ts", typescript.default);
      highlighter.registerLanguage("xml", xml.default);
      return highlighter;
    });
  }

  return tutorialHighlighterPromise;
}

function createHeadingId(label: string, index: number, slugCounts: Map<string, number>) {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "") || `section-${index + 1}`;
  const count = (slugCounts.get(base) || 0) + 1;
  slugCounts.set(base, count);
  return count > 1 ? `${base}-${count}` : base;
}

function prepareTutorialContent(contentHtml: string): {
  html: string;
  outline: TutorialContentOutlineItem[];
} {
  if (!contentHtml || typeof document === "undefined") {
    return { html: contentHtml, outline: [] };
  }

  const htmlDocument = document.implementation.createHTMLDocument("tutorial-content");
  const container = htmlDocument.createElement("div");
  container.innerHTML = contentHtml;

  const slugCounts = new Map<string, number>();
  const outline = Array.from(container.querySelectorAll<HTMLHeadingElement>("h1, h2, h3")).map(
    (heading, index) => {
      const label = heading.textContent?.replace(/#$/, "").trim() || `章节 ${index + 1}`;
      const id = heading.id || createHeadingId(label, index, slugCounts);
      heading.id = id;
      heading.classList.add("tutorial-anchor-heading");
      heading.querySelectorAll(".tutorial-heading-anchor").forEach((node) => node.remove());

      const anchor = htmlDocument.createElement("button");
      anchor.type = "button";
      anchor.className = "tutorial-heading-anchor";
      anchor.textContent = "#";
      anchor.dataset.headingAnchor = id;
      anchor.setAttribute("aria-label", `复制${label}链接`);
      heading.appendChild(anchor);

      return {
        id,
        label,
        index,
        level: Number(heading.tagName.slice(1)) as 1 | 2 | 3,
      };
    },
  );

  container.querySelectorAll<HTMLPreElement>("pre").forEach((pre) => {
    pre.querySelectorAll(".tutorial-code-copy").forEach((node) => node.remove());
    const button = htmlDocument.createElement("button");
    button.type = "button";
    button.className = "tutorial-code-copy";
    button.textContent = "复制";
    button.setAttribute("aria-label", "复制代码");
    pre.appendChild(button);
  });

  container.querySelectorAll<HTMLImageElement>("img").forEach((image) => {
    image.loading = "lazy";
    image.decoding = "async";
    image.tabIndex = 0;
  });

  container.querySelectorAll<HTMLVideoElement>("video").forEach((video) => {
    video.preload = "metadata";
    video.controls = true;
    video.playsInline = true;
  });

  container.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
    if (table.parentElement?.classList.contains("tutorial-table-wrap")) return;
    const wrapper = htmlDocument.createElement("div");
    wrapper.className = "tutorial-table-wrap";
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "可横向滚动的数据表格");
    wrapper.tabIndex = 0;
    table.parentNode?.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });

  return { html: container.innerHTML, outline };
}

export const TutorialContent = forwardRef<HTMLElement, TutorialContentProps>(function TutorialContent(
  { contentHtml, className, onImageOpen, onMessage, onOutlineChange },
  forwardedRef,
) {
  const preparedContent = useMemo(() => prepareTutorialContent(contentHtml), [contentHtml]);
  const contentRef = useRef<HTMLElement | null>(null);

  const setContentRef = useCallback((node: HTMLElement | null) => {
    contentRef.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  }, [forwardedRef]);

  useEffect(() => {
    onOutlineChange?.(preparedContent.outline);
  }, [onOutlineChange, preparedContent.outline]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const codeBlocks = Array.from(root.querySelectorAll<HTMLPreElement>("pre"));
    void getTutorialHighlighter().then((highlighter) => {
      codeBlocks.forEach((pre) => {
        const code = pre.querySelector<HTMLElement>("code");
        if (code && !code.dataset.highlighted) {
          try {
            highlighter.highlightElement(code);
          } catch {
            // Keep malformed snippets readable as plain text.
          }
        }
      });
    });
  }, [preparedContent.html]);

  const handleClick = useCallback(async (event: ReactMouseEvent<HTMLElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (!target) return;

    const headingAnchor = target.closest<HTMLButtonElement>(".tutorial-heading-anchor");
    if (headingAnchor) {
      event.preventDefault();
      event.stopPropagation();
      const id = headingAnchor.dataset.headingAnchor || headingAnchor.closest<HTMLElement>("h1, h2, h3")?.id;
      if (!id) return;
      const baseHash = window.location.hash.split("#")[0] || window.location.hash;
      const url = `${window.location.origin}${window.location.pathname}${baseHash}#${id}`;
      try {
        await navigator.clipboard.writeText(url);
        onMessage?.("标题链接已复制");
      } catch {
        onMessage?.("链接复制失败");
      }
      return;
    }

    const copyButton = target.closest<HTMLButtonElement>(".tutorial-code-copy");
    if (copyButton) {
      event.preventDefault();
      event.stopPropagation();
      const pre = copyButton.closest("pre");
      const code = pre?.querySelector<HTMLElement>("code");
      try {
        await navigator.clipboard.writeText(
          code?.textContent || pre?.textContent?.replace(copyButton.textContent || "", "") || "",
        );
        copyButton.textContent = "已复制";
        window.setTimeout(() => {
          copyButton.textContent = "复制";
        }, 1400);
      } catch {
        onMessage?.("代码复制失败");
      }
      return;
    }

    const image = target.closest<HTMLImageElement>("img");
    if (image && onImageOpen) {
      onImageOpen(image.currentSrc || image.src);
    }
  }, [onImageOpen, onMessage]);

  if (!contentHtml.trim()) return null;

  return (
    <article
      ref={setContentRef}
      className={cn("tutorial-article tutorial-article__content", className)}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: preparedContent.html }}
    />
  );
});
