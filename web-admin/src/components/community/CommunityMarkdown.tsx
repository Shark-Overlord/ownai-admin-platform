import { useState } from 'react';
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import { safeMediaUrl } from '../../utils/communityMedia';
import '../news/news.css';

function MediaImage({ src, alt }: { src?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const safe = safeMediaUrl(src || '');
  return !safe || failed ? <span role="img" aria-label={alt || '图片加载失败'} className="news-image-fallback">{alt || '图片暂时无法加载'}</span>
    : <img src={safe} alt={alt || '帖子配图'} loading="lazy" onError={() => setFailed(true)} />;
}
function MediaVideo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <a href={src} target="_blank" rel="noopener noreferrer">视频暂时无法播放，打开原视频</a>
    : <video aria-label="帖子视频" src={src} controls playsInline preload="metadata" onError={() => setFailed(true)} style={{ maxWidth: '100%', maxHeight: 500 }} />;
}
export function CommunityMarkdown({ content }: { content: string }) {
  return <div className="news-markdown"><ReactMarkdown skipHtml urlTransform={(value) => {
    const url = defaultUrlTransform(value);
    return /^(https:\/\/|\/(?!\/)|#)/i.test(url) && !Array.from(url).some(ch => ch.charCodeAt(0) <= 32 || ch === '\\') ? url : '';
  }} components={{
    img: ({ src, alt }) => <MediaImage key={src} src={src} alt={alt} />,
    a: ({ children, ...props }) => <a href={props.href} rel="noopener noreferrer">{children}</a>,
    pre: ({ node, children }) => {
      const code = node?.children[0];
      if (code?.type === 'element' && code.tagName === 'code' && Array.isArray(code.properties?.className)
        && code.properties.className.includes('language-video')) {
        const value = code.children.map(child => child.type === 'text' ? child.value : '').join('').trim();
        const src = safeMediaUrl(value);
        return src && !/\s/.test(value) ? <MediaVideo key={src} src={src} /> : <p>视频地址无效，请使用单个 HTTPS 视频地址。</p>;
      }
      return <pre>{children}</pre>;
    },
  }}>{content}</ReactMarkdown></div>;
}
