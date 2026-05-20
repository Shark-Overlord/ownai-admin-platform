import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Empty } from 'antd';

export default function ArtworkPreview() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    fetch(`/api/artwork/preview/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.text();
      })
      .then((html) => {
        setHtmlContent(html);
        setLoading(false);
      })
      .catch(() => {
        setHtmlContent('');
        setLoading(false);
      });
  }, [id]);

  const blobUrl = htmlContent
    ? URL.createObjectURL(new Blob([htmlContent], { type: 'text/html; charset=utf-8' }))
    : '';

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  if (loading) return <Spin style={{ marginTop: 200, display: 'block' }} tip="加载中..." />;
  if (!htmlContent) return <Empty description="作品不存在或暂无预览内容" style={{ marginTop: 200 }} />;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        borderRadius: 0,
      }}
    >
      <iframe
        src={blobUrl}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: 0,
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
