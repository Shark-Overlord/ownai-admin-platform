import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  DeleteOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Alert, Button, Empty, Input, Modal, Select, Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { listCategory, type CategoryVO } from '../../api/category';
import {
  listPromptAssetByPageForAdmin,
  reviewPromptAssetBatch,
  type PromptAssetVO,
} from '../../api/promptAsset';
import './index.css';

const PAGE_SIZE_OPTIONS = [20, 50, 100].map((value) => ({ label: `${value} 张`, value }));

type ReviewStats = {
  kept: number;
  deleted: number;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function getPrimaryImage(asset: PromptAssetVO) {
  return asset.previewMediaUrl || asset.coverUrl || asset.mediaList?.[0]?.cloudUrl || asset.mediaList?.[0]?.localUrl || '';
}

export default function PromptAssetReview() {
  const navigate = useNavigate();
  const requestSequence = useRef(0);
  const operationLock = useRef(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [categories, setCategories] = useState<CategoryVO[]>([]);
  const [queue, setQueue] = useState<PromptAssetVO[]>([]);
  const [remaining, setRemaining] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [operating, setOperating] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchText, setSearchText] = useState('');
  const [categoryId, setCategoryId] = useState<string | number | undefined>();
  const [status, setStatus] = useState<number | undefined>();
  const [stats, setStats] = useState<ReviewStats>({ kept: 0, deleted: 0 });

  const categoryOptions = useMemo(
    () => categories.map((item) => ({ label: item.name, value: item.id })),
    [categories],
  );
  const selectedCount = selectedIds.size;
  const keptCount = Math.max(0, queue.length - selectedCount);

  const loadQueue = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setLoadError(false);
    try {
      const res = await listPromptAssetByPageForAdmin({
        current: 1,
        pageSize,
        assetType: 'image_prompt',
        imageOnly: true,
        selectionStatus: 'pending_review',
        listType: 'latest',
        categoryId,
        status,
        searchText: searchText || undefined,
      });
      if (sequence !== requestSequence.current) return;
      setQueue(res.data.records || []);
      setRemaining(Number(res.data.total || 0));
      setSelectedIds(new Set());
      setFocusedIndex(0);
    } catch {
      if (sequence === requestSequence.current) {
        setQueue([]);
        setRemaining(0);
        setLoadError(true);
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [categoryId, pageSize, searchText, status]);

  useEffect(() => {
    listCategory().then((res) => setCategories(res.data || []));
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const toggleSelection = useCallback((id: number) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(queue.map((item) => item.id)));
  }, [queue]);

  const moveFocus = useCallback((nextIndex: number) => {
    const bounded = Math.max(0, Math.min(queue.length - 1, nextIndex));
    setFocusedIndex(bounded);
    requestAnimationFrame(() => {
      gridRef.current?.querySelector<HTMLElement>(`[data-review-index="${bounded}"]`)?.focus();
    });
  }, [queue.length]);

  const submitBatch = useCallback(async () => {
    if (queue.length === 0 || operationLock.current) return;
    operationLock.current = true;
    setOperating(true);
    const deleteIds = queue.filter((item) => selectedIds.has(item.id)).map((item) => item.id);
    const approveIds = queue.filter((item) => !selectedIds.has(item.id)).map((item) => item.id);
    try {
      await reviewPromptAssetBatch({ approveIds, deleteIds });
      setStats((value) => ({
        kept: value.kept + approveIds.length,
        deleted: value.deleted + deleteIds.length,
      }));
      setConfirmOpen(false);
      message.success(
        deleteIds.length > 0
          ? `本批完成：保留 ${approveIds.length} 张，删除 ${deleteIds.length} 张`
          : `本批 ${approveIds.length} 张已全部保留`,
      );
      await loadQueue();
    } finally {
      operationLock.current = false;
      setOperating(false);
    }
  }, [loadQueue, queue, selectedIds]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || isTypingTarget(event.target)) return;
      if (confirmOpen) {
        if (event.key === 'Enter') {
          event.preventDefault();
          void submitBatch();
        } else if (event.key === 'Escape' && !operating) {
          event.preventDefault();
          setConfirmOpen(false);
        }
        return;
      }
      if (queue.length === 0 || operating || loading) return;
      const columns = gridRef.current
        ? getComputedStyle(gridRef.current).gridTemplateColumns.split(' ').length
        : 1;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveFocus(focusedIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveFocus(focusedIndex - 1);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveFocus(focusedIndex + columns);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveFocus(focusedIndex - columns);
      } else if (event.key === ' ' || event.key.toLowerCase() === 'd') {
        event.preventDefault();
        toggleSelection(queue[focusedIndex].id);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        selectAll();
      } else if (event.key === 'Delete' || event.key === 'Enter') {
        event.preventDefault();
        setConfirmOpen(true);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        setSelectedIds(new Set());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmOpen, focusedIndex, loading, moveFocus, operating, queue, selectAll, submitBatch, toggleSelection]);

  return (
    <PageContainer
      title="图像提示词批量审核"
      className="prompt-review-page"
      extra={[
        <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => navigate('/prompt-asset')}>
          返回资产库
        </Button>,
        <Button key="reload" icon={<ReloadOutlined />} loading={loading} onClick={() => void loadQueue()}>
          刷新
        </Button>,
      ]}
    >
      <section className="prompt-review-toolbar" aria-label="审核范围">
        <Input.Search
          allowClear
          value={searchDraft}
          placeholder="搜索后筛选图片"
          onChange={(event) => setSearchDraft(event.target.value)}
          onSearch={() => setSearchText(searchDraft.trim())}
          className="prompt-review-search"
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          value={categoryId}
          options={categoryOptions}
          placeholder="全部分类"
          onChange={setCategoryId}
          className="prompt-review-filter"
        />
        <Select
          allowClear
          value={status}
          placeholder="全部发布状态"
          onChange={setStatus}
          className="prompt-review-filter"
          options={[
            { label: '草稿', value: 0 },
            { label: '已发布', value: 1 },
            { label: '已归档', value: 2 },
          ]}
        />
        <Select value={pageSize} options={PAGE_SIZE_OPTIONS} onChange={setPageSize} className="prompt-review-size" />
      </section>

      <section className="prompt-review-batchbar">
        <div className="prompt-review-progress" aria-live="polite">
          <span>待审核 <strong>{remaining}</strong></span>
          <span>本批 <strong>{queue.length}</strong></span>
          <span className="prompt-review-delete-count">待删除 <strong>{selectedCount}</strong></span>
          <span>本次已保留 <strong>{stats.kept}</strong></span>
          <span>本次已删除 <strong>{stats.deleted}</strong></span>
        </div>
        <div className="prompt-review-batch-actions">
          <Button disabled={queue.length === 0 || selectedCount === queue.length} onClick={selectAll}>全选</Button>
          <Button disabled={selectedCount === 0} onClick={() => setSelectedIds(new Set())}>清空选择</Button>
          <Button
            danger={selectedCount > 0}
            type="primary"
            icon={selectedCount > 0 ? <DeleteOutlined /> : <CheckOutlined />}
            disabled={queue.length === 0}
            onClick={() => setConfirmOpen(true)}
          >
            {selectedCount > 0 ? `删除 ${selectedCount} 张并完成本批` : '保留本批并继续'}
          </Button>
        </div>
      </section>

      <Alert
        showIcon
        type="info"
        className="prompt-review-help"
        message="只需选中要删除的图片。方向键移动，空格或 D 选择，Ctrl/⌘ + A 全选，Esc 清空，Enter 或 Delete 提交本批。未选中的图片会标记为已审核保留。"
      />

      <Spin spinning={loading || operating} tip={operating ? '正在提交本批审核结果…' : '正在加载图片…'}>
        {queue.length > 0 ? (
          <div ref={gridRef} className="prompt-review-grid" role="listbox" aria-label="待审核图片" aria-multiselectable="true">
            {queue.map((asset, index) => {
              const selected = selectedIds.has(asset.id);
              const imageUrl = getPrimaryImage(asset);
              return (
                <button
                  type="button"
                  key={String(asset.id)}
                  data-review-index={index}
                  className={`prompt-review-card${selected ? ' is-selected' : ''}${focusedIndex === index ? ' is-focused' : ''}`}
                  role="option"
                  aria-selected={selected}
                  aria-label={selected ? `取消删除第 ${index + 1} 张图片` : `选择删除第 ${index + 1} 张图片`}
                  onFocus={() => setFocusedIndex(index)}
                  onClick={() => toggleSelection(asset.id)}
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt="" loading="lazy" draggable={false} />
                  ) : (
                    <span className="prompt-review-no-image">无图片</span>
                  )}
                  {selected ? (
                    <span className="prompt-review-selected-mark" aria-hidden="true"><DeleteOutlined /></span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : !loading ? (
          <div className="prompt-review-finished">
            <Empty description={loadError ? '审核队列加载失败，请重试' : '当前范围已全部审核完成'}>
              <Button type="primary" icon={<ReloadOutlined />} onClick={() => void loadQueue()}>重新检查</Button>
            </Empty>
          </div>
        ) : (
          <div className="prompt-review-loading-placeholder" />
        )}
      </Spin>

      <Modal
        title={selectedCount > 0 ? `确认删除选中的 ${selectedCount} 张图片？` : '确认保留本批全部图片？'}
        open={confirmOpen}
        okText={selectedCount > 0 ? '确认并进入下一批' : '保留并进入下一批'}
        cancelText="取消"
        okButtonProps={{ danger: selectedCount > 0, loading: operating }}
        cancelButtonProps={{ disabled: operating }}
        maskClosable={!operating}
        keyboard={!operating}
        onOk={() => void submitBatch()}
        onCancel={() => !operating && setConfirmOpen(false)}
      >
        <p>
          本批共 {queue.length} 张，将保留 {keptCount} 张、删除 {selectedCount} 张。未选中的图片会标记为已审核，提交后自动加载下一批。
        </p>
        {selectedCount > 0 ? (
          <Alert type="warning" showIcon message="删除会清理资产的标签和图片关联，COS 原文件仍保留。" />
        ) : null}
      </Modal>
    </PageContainer>
  );
}
