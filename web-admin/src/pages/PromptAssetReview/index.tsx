import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Image,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { listCategory, type CategoryVO } from '../../api/category';
import {
  deletePromptAsset,
  listPromptAssetByPageForAdmin,
  updatePromptAsset,
  type PromptAssetVO,
} from '../../api/promptAsset';
import './index.css';

const { Paragraph, Text, Title } = Typography;
const PAGE_SIZE = 20;

type ReviewStats = {
  kept: number;
  deleted: number;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function getPrimaryImage(asset: PromptAssetVO | null) {
  if (!asset) return '';
  return asset.previewMediaUrl || asset.coverUrl || asset.mediaList?.[0]?.cloudUrl || asset.mediaList?.[0]?.localUrl || '';
}

export default function PromptAssetReview() {
  const navigate = useNavigate();
  const requestSequence = useRef(0);
  const operationLock = useRef(false);
  const [categories, setCategories] = useState<CategoryVO[]>([]);
  const [queue, setQueue] = useState<PromptAssetVO[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [operating, setOperating] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchText, setSearchText] = useState('');
  const [categoryId, setCategoryId] = useState<string | number | undefined>();
  const [status, setStatus] = useState<number | undefined>();
  const [stats, setStats] = useState<ReviewStats>({ kept: 0, deleted: 0 });

  const current = queue[0] || null;
  const primaryImage = getPrimaryImage(current);
  const categoryOptions = useMemo(
    () => categories.map((item) => ({ label: item.name, value: item.id })),
    [categories],
  );

  const loadQueue = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await listPromptAssetByPageForAdmin({
        current: 1,
        pageSize: PAGE_SIZE,
        assetType: 'image_prompt',
        selectionStatus: 'pending_review',
        listType: 'latest',
        categoryId,
        status,
        searchText: searchText || undefined,
      });
      if (sequence !== requestSequence.current) return;
      setQueue(res.data.records || []);
      setRemaining(Number(res.data.total || 0));
    } catch {
      if (sequence === requestSequence.current) {
        setQueue([]);
        setRemaining(0);
        setLoadError(true);
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [categoryId, searchText, status]);

  useEffect(() => {
    listCategory().then((res) => setCategories(res.data || []));
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const advanceQueue = useCallback(() => {
    setQueue((items) => items.slice(1));
    setRemaining((count) => Math.max(0, count - 1));
  }, []);

  useEffect(() => {
    if (!loading && queue.length === 0 && remaining > 0) {
      void loadQueue();
    }
  }, [loadQueue, loading, queue.length, remaining]);

  const keepCurrent = useCallback(async () => {
    if (!current || operationLock.current || deleteOpen) return;
    operationLock.current = true;
    setOperating(true);
    try {
      await updatePromptAsset({ id: current.id, selectionStatus: 'approved' });
      setStats((value) => ({ ...value, kept: value.kept + 1 }));
      advanceQueue();
      message.success({ content: '已保留，进入下一条', key: 'prompt-review-action', duration: 1 });
    } finally {
      operationLock.current = false;
      setOperating(false);
    }
  }, [advanceQueue, current, deleteOpen]);

  const confirmDelete = useCallback(async () => {
    if (!current || operationLock.current) return;
    operationLock.current = true;
    setOperating(true);
    try {
      await deletePromptAsset({ id: current.id });
      setStats((value) => ({ ...value, deleted: value.deleted + 1 }));
      setDeleteOpen(false);
      advanceQueue();
      message.success({ content: '已删除，进入下一条', key: 'prompt-review-action', duration: 1 });
    } finally {
      operationLock.current = false;
      setOperating(false);
    }
  }, [advanceQueue, current]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTypingTarget(event.target)) return;
      if (deleteOpen) {
        if (event.key === 'Enter') {
          event.preventDefault();
          void confirmDelete();
        } else if (event.key === 'Escape' && !operating) {
          event.preventDefault();
          setDeleteOpen(false);
        }
        return;
      }
      if (!current || operating || loading || imagePreviewOpen) return;
      if (event.key.toLowerCase() === 'k' || event.key === 'ArrowRight') {
        event.preventDefault();
        void keepCurrent();
      } else if (event.key.toLowerCase() === 'd' || event.key === 'Delete') {
        event.preventDefault();
        setDeleteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDelete, current, deleteOpen, imagePreviewOpen, keepCurrent, loading, operating]);

  const submitSearch = () => setSearchText(searchDraft.trim());

  return (
    <PageContainer
      title="图像提示词审核"
      className="prompt-review-page"
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate('/prompt-asset')}>
          返回资产库
        </Button>,
        <Button key="reload" icon={<ReloadOutlined />} loading={loading} onClick={() => void loadQueue()}>
          刷新队列
        </Button>,
      ]}
    >
      <section className="prompt-review-toolbar" aria-label="审核范围">
        <Input.Search
          allowClear
          value={searchDraft}
          placeholder="搜索标题、提示词或来源"
          onChange={(event) => setSearchDraft(event.target.value)}
          onSearch={submitSearch}
          className="prompt-review-search"
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          value={categoryId}
          options={categoryOptions}
          placeholder="全部分类"
          onChange={(value) => setCategoryId(value)}
          className="prompt-review-filter"
        />
        <Select
          allowClear
          value={status}
          placeholder="全部发布状态"
          onChange={(value) => setStatus(value)}
          className="prompt-review-filter"
          options={[
            { label: '草稿', value: 0 },
            { label: '已发布', value: 1 },
            { label: '已归档', value: 2 },
          ]}
        />
        <div className="prompt-review-progress" aria-live="polite">
          <span>待审核 <strong>{remaining}</strong></span>
          <span>本次保留 <strong>{stats.kept}</strong></span>
          <span>本次删除 <strong>{stats.deleted}</strong></span>
        </div>
      </section>

      <Alert
        showIcon
        type="info"
        className="prompt-review-help"
        message="队列只显示尚未审核的图像提示词。K 或 → 保留并标记为已审核；D 或 Delete 准备删除；删除后按 Enter 确认，Esc 取消。"
      />

      <Spin spinning={loading || operating} tip={operating ? '正在保存审核结果…' : '正在加载审核队列…'}>
        {current ? (
          <article className="prompt-review-workspace">
            <div className="prompt-review-media">
              {primaryImage ? (
                <Image
                  src={primaryImage}
                  alt={current.title || '图像提示词预览'}
                  preview={{ onVisibleChange: setImagePreviewOpen }}
                />
              ) : (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这条资产没有可用图片" />
              )}
              {current.mediaList && current.mediaList.length > 1 ? (
                <div className="prompt-review-media-count">共 {current.mediaList.length} 张图片</div>
              ) : null}
            </div>

            <div className="prompt-review-content">
              <div className="prompt-review-heading">
                <div>
                  <Text type="secondary">资产 #{current.id}</Text>
                  <Title level={3}>{current.title || '未命名提示词'}</Title>
                </div>
                <Space size={[6, 6]} wrap>
                  {current.category?.name ? <Tag color="blue">{current.category.name}</Tag> : <Tag>未分类</Tag>}
                  {current.status === 1 ? <Tag color="green">已发布</Tag> : current.status === 2 ? <Tag color="orange">已归档</Tag> : <Tag>草稿</Tag>}
                  {current.isFeatured === 1 ? <Tag color="gold">精选</Tag> : null}
                  {current.memberOnly === 1 ? <Tag color="purple">会员专享</Tag> : null}
                </Space>
              </div>

              {current.summary ? (
                <section className="prompt-review-copy-block">
                  <Text type="secondary">摘要</Text>
                  <Paragraph>{current.summary}</Paragraph>
                </section>
              ) : null}
              {current.promptCn ? (
                <section className="prompt-review-copy-block">
                  <Text type="secondary">中文提示词</Text>
                  <Paragraph copyable={{ text: current.promptCn }}>{current.promptCn}</Paragraph>
                </section>
              ) : null}
              <section className="prompt-review-copy-block prompt-review-original">
                <Text type="secondary">原始提示词</Text>
                <Paragraph copyable={{ text: current.promptContent || '' }}>
                  {current.promptContent || '暂无提示词内容'}
                </Paragraph>
              </section>

              <div className="prompt-review-meta">
                <span>来源：{current.sourceRepoName || current.sourceName || '未知'}</span>
                <span>创建：{current.createTime || '-'}</span>
                <span>队列预载：{queue.length} 条</span>
              </div>

              <div className="prompt-review-actions">
                <Button
                  danger
                  size="large"
                  icon={<DeleteOutlined />}
                  disabled={operating}
                  onClick={() => setDeleteOpen(true)}
                >
                  删除 <kbd>D</kbd>
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckOutlined />}
                  disabled={operating}
                  onClick={() => void keepCurrent()}
                >
                  保留 <kbd>K</kbd>
                </Button>
              </div>
            </div>
          </article>
        ) : !loading ? (
          <div className="prompt-review-finished">
            <Empty description={loadError ? '审核队列加载失败，请重试' : remaining === 0 ? '当前范围已全部审核完成' : '当前队列暂时没有可审核内容'}>
              <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadQueue()}>
                重新检查
              </Button>
            </Empty>
          </div>
        ) : (
          <div className="prompt-review-loading-placeholder" />
        )}
      </Spin>

      <Modal
        title="确认删除这条图像提示词？"
        open={deleteOpen}
        okText="删除并进入下一条"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: operating }}
        cancelButtonProps={{ disabled: operating }}
        maskClosable={!operating}
        keyboard={!operating}
        onOk={() => void confirmDelete()}
        onCancel={() => !operating && setDeleteOpen(false)}
      >
        <Paragraph>
          将删除 <Text strong>{current?.title || `资产 #${current?.id}`}</Text>。删除后它将从用户前台消失；资产主记录采用逻辑删除，标签和图片关联会清理，COS 原文件仍保留。
        </Paragraph>
        <Alert type="warning" showIcon message="按 Enter 确认删除，按 Esc 返回继续审核。" />
      </Modal>
    </PageContainer>
  );
}
