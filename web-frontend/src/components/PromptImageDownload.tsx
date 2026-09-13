import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { getBlob, RequestError } from '@/lib/request';

export default function PromptImageDownload({ id, mediaId, onMessage }: { id: string; mediaId?: string; onMessage: (text: string) => void }) {
  const [loading, setLoading] = useState(false);
  const download = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { blob, contentDisposition } = await getBlob('/promptAsset/source/download', { query: { id, ...(mediaId ? { mediaId } : {}) } });
      const match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
      const filename = match ? decodeURIComponent(match[1]) : `prompt-image-${id}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = filename;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { onMessage(error instanceof RequestError ? (error.code === 40310 ? '下载受限，请联系管理员' : error.message) : '原图下载失败'); }
    finally { setLoading(false); }
  };
  return <button type="button" disabled={loading} onClick={() => void download()} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-[7px] border border-[var(--chat-border)] bg-[var(--chat-panel-bg)] px-3 text-[13px] text-[var(--chat-ink)] disabled:opacity-60">
    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} {loading ? '下载中' : '下载原图'}
  </button>;
}
