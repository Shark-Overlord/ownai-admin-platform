import { useState, type ImgHTMLAttributes } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import "./news.css";

function NewsImage({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <span className="news-image-fallback">{alt || "图片暂时无法加载"}</span>;
  return <img {...props} src={src} alt={alt || "新闻配图"} loading="lazy" onError={() => setFailed(true)} />;
}

export function NewsMarkdown({ content }: { content: string }) {
  return <div className="news-markdown"><ReactMarkdown skipHtml
    urlTransform={(url) => {
      const safe = defaultUrlTransform(url);
      return /^(https?:\/\/|\/(?!\/)|#)/i.test(safe) ? safe : "";
    }}
    components={{
      img: ({ node: _node, ...props }) => <NewsImage key={props.src} {...props} />,
      a: ({ node: _node, ...props }) => <a {...props} rel="noopener noreferrer" />,
    }}
  >{content}</ReactMarkdown></div>;
}
