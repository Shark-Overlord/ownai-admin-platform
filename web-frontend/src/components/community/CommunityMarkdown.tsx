import { useState } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import { ImageOff } from "lucide-react";
import { safeCommunityMedia } from "@/lib/community";

export function CommunityImage({ src, alt }: { src?: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  const safe = safeCommunityMedia(src);
  if (!safe || failed) return <span className="community-media-fallback"><ImageOff size={20} />配图暂时无法加载</span>;
  return <img src={safe} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} />;
}
export function CommunityVideo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <a href={src} target="_blank" rel="noopener noreferrer">视频暂时无法播放，打开原视频</a>
    : <video src={src} controls playsInline preload="metadata" aria-label="帖子视频" onError={() => setFailed(true)} />;
}
export function CommunityMarkdown({ content, title }: { content: string; title?: string }) {
  // Remove only a duplicate opening H1; never strip headings elsewhere in the document.
  const opening = content.match(/^\s*#\s+(.+?)\s*#*\s*(?:\r?\n|$)/);
  if (title && opening && opening[1].trim() === title.trim()) content = content.slice(opening[0].length);
  return <div className="community-markdown"><ReactMarkdown skipHtml urlTransform={(value) => {
    const url = defaultUrlTransform(value);
    return /^(https:\/\/|\/(?!\/)|#)/i.test(url) && !/[\s\\]/.test(url) ? url : "";
  }} components={{
    img: ({ src, alt }) => <CommunityImage key={src} src={src} alt={alt || "帖子配图"} />,
    a: ({ href, children }) => <a href={href} rel="noopener noreferrer" target={href?.startsWith("https://") ? "_blank" : undefined}>{children}</a>,
    pre: ({ node, children }) => {
      const code = node?.children[0];
      if (code?.type === "element" && code.tagName === "code" && Array.isArray(code.properties?.className) && code.properties.className.includes("language-video")) {
        const value = code.children.map(child => child.type === "text" ? child.value : "").join("").trim();
        const src = safeCommunityMedia(value);
        return src && !/\s/.test(value) ? <CommunityVideo key={src} src={src} /> : <p>视频暂时无法播放</p>;
      }
      return <pre>{children}</pre>;
    },
  }}>{content}</ReactMarkdown></div>;
}
