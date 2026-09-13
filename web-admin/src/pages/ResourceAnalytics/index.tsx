import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, DatePicker, Drawer, Input, Modal, Select, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import request from '../../api/request';

type Row = Record<string, string | number | null>;
type Result = { records?: Row[]; total?: number; types?: Row[]; daily?: Row[]; updatedAt?: string; collectedFrom?: string };
const names: Record<string, string> = { artwork: '作品', video_background: '视频素材', image_prompt: '图片 Prompt' };
const bytes = (value: unknown) => {
  const n = Number(value || 0);
  return n >= 1073741824 ? `${(n / 1073741824).toFixed(2)} GiB` : n >= 1048576 ? `${(n / 1048576).toFixed(2)} MiB` : `${n.toLocaleString()} B`;
};
const time = (value: unknown) => value ? dayjs(String(value)).format('YYYY-MM-DD HH:mm:ss') : '尚未汇总';

export default function ResourceAnalytics() {
  const [tab, setTab] = useState('resources');
  const [dates, setDates] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(6, 'day'), dayjs()]);
  const [type, setType] = useState<string>();
  const [sort, setSort] = useState('hotScore');
  const [keyword, setKeyword] = useState('');
  const [userId, setUserId] = useState<string>();
  const [resourceId, setResourceId] = useState<string>();
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Result>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [target, setTarget] = useState<Row | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [audit, setAudit] = useState<Row[] | null>(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true); setError(false);
    try {
      const response = await request.get(`/resource-analytics/admin/${tab}`, { params: {
        startDate: dates[0].format('YYYY-MM-DD'), endDate: dates[1].format('YYYY-MM-DD'),
        resourceType: type, sort, keyword, userId, resourceId, page, pageSize: 20,
      } }) as unknown as { data: Result };
      if (sequence.current === seq) setResult(response.data);
    } catch { if (sequence.current === seq) { setError(true); setResult({}); } }
    finally { if (sequence.current === seq) setLoading(false); }
  }, [tab, dates, type, sort, keyword, userId, resourceId, page]);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 300000); return () => { sequence.current++; window.clearInterval(timer); }; }, [load]);
  const openDownloads = (row: Row, account = false) => {
    setUserId(account ? String(row.userId) : undefined);
    setResourceId(account ? undefined : String(row.id));
    setType(account ? undefined : String(row.resourceType)); setPage(1); setTab('downloads');
  };
  const field = (title: string, dataIndex: string, width = 110): ColumnsType<Row>[number] => ({ title, dataIndex, width });
  const typeColumn: ColumnsType<Row>[number] = { title: '类型', dataIndex: 'resourceType', width: 120, render: (v) => names[v] || v };
  const flowColumn: ColumnsType<Row>[number] = { title: '传输流量', dataIndex: 'transferredBytes', width: 130, render: bytes };
  const accountColumns: ColumnsType<Row> = [field('账户 ID', 'userId', 190), field('昵称', 'userName', 140), field('请求次数', 'requests'), field('完成次数', 'downloads'), field('请求资源数', 'uniqueResources'), { title: '重复请求数', width: 110, render: (_, row) => Math.max(0, Number(row.requests) - Number(row.uniqueResources)) }, flowColumn,
    { title: '下载权限', dataIndex: 'restricted', width: 100, render: (v) => <Tag color={Number(v) ? 'red' : 'green'}>{Number(v) ? '下载受限' : '允许下载'}</Tag> },
    { title: '操作', width: 265, fixed: 'right', render: (_, row) => <Space size={4}>
      <Button size="small" type="link" onClick={() => openDownloads(row, true)}>明细</Button>
      <Button size="small" type="link" danger={!Number(row.restricted)} onClick={() => { setTarget(row); setReason(''); }}>{Number(row.restricted) ? '恢复下载' : '禁止下载'}</Button>
      <Button size="small" type="link" onClick={async () => { try { const r = await request.get('/resource-analytics/admin/download-permission/audit', { params: { userId: row.userId } }); setAudit(r.data); } catch { /* interceptor displays error */ } }}>操作记录</Button>
    </Space> },
  ];
  const resourceColumns: ColumnsType<Row> = [typeColumn, field('资源标题', 'title', 230), field('热度', 'hotScore'), field('有效浏览', 'views'), field('当前收藏人数', 'favorites', 130), field('新增收藏人数', 'newFavorites', 130), field('下载请求', 'requests'), field('完成下载', 'downloads'), field('下载人数', 'downloadUsers'), field('复制次数', 'copies'), flowColumn,
    { title: '操作', width: 90, fixed: 'right', render: (_, row) => <Button type="link" size="small" onClick={() => openDownloads(row)}>下载明细</Button> },
  ];
  const downloadColumns: ColumnsType<Row> = [field('记录 ID', 'id', 190), field('账户 ID', 'userId', 190), field('昵称', 'userName', 130), typeColumn, field('资源标题', 'title', 220), field('资源 ID', 'resourceId', 190),
    { title: '状态', dataIndex: 'status', width: 100, render: (v) => ({ started: '传输中', completed: '完成', failed: '失败' }[v as string] || v) }, flowColumn,
    { title: '开始时间', dataIndex: 'startedAt', width: 180, render: time }, { title: '结束时间', dataIndex: 'finishedAt', width: 180, render: (v) => v ? time(v) : '—' }, field('失败原因', 'failureCode', 160),
  ];
  const save = async () => {
    if (!target || !reason.trim()) { message.warning('请填写原因'); return; }
    setSaving(true);
    try {
      await request.post('/resource-analytics/admin/download-permission', { userId: target.userId, restricted: !Number(target.restricted), reason: reason.trim() });
      message.success(Number(target.restricted) ? '已恢复下载' : '已禁止下载'); setTarget(null); void load();
    } catch { /* interceptor displays error */ } finally { setSaving(false); }
  };
  const sorts = tab === 'accounts' ? [['transferredBytes', '按流量'], ['requests', '按请求次数'], ['downloads', '按完成次数'], ['uniqueResources', '按不同资源数']]
    : [['hotScore', '按热度'], ['downloads', '按下载次数'], ['downloadUsers', '按下载人数'], ['favorites', '按收藏'], ['newFavorites', '按新增收藏'], ['views', '按浏览'], ['copies', '按复制'], ['transferredBytes', '按流量']];
  return <div style={{ padding: 20 }}>
    <Typography.Title level={4}>资源统计</Typography.Title>
    <Typography.Paragraph type="secondary">统计作品、视频素材和图片 Prompt。流量为后端记录的传输字节，不是云厂商账单；预览和存储直链不计入。账户限制由管理员手动设置。</Typography.Paragraph>
    <Space wrap style={{ marginBottom: 16 }}>
      <DatePicker.RangePicker value={dates} allowClear={false} onChange={(v) => { if (v?.[0] && v[1]) { setDates([v[0], v[1]]); setPage(1); } }} />
      {[['今天', 0], ['近7天', 6], ['近30天', 29]].map(([label, days]) => <Button key={label} onClick={() => { setDates([dayjs().subtract(Number(days), 'day'), dayjs()]); setPage(1); }}>{label}</Button>)}
      <Button onClick={() => void load()} loading={loading}>刷新</Button>
    </Space>
    <Typography.Paragraph type="secondary">采集起点：{time(result.collectedFrom)} · 资源指标每5分钟汇总，上次更新：{time(result.updatedAt)} · 账户与下载明细实时查询</Typography.Paragraph>
    <Tabs activeKey={tab} onChange={(v) => { setTab(v); setPage(1); setUserId(undefined); setResourceId(undefined); setSort(v === 'accounts' ? 'transferredBytes' : 'hotScore'); }} items={[{ key: 'resources', label: '资源排行' }, { key: 'overview', label: '下载流量' }, { key: 'accounts', label: '账户排行' }, { key: 'downloads', label: '下载明细' }]} />
    <Space wrap style={{ marginBottom: 16 }}>
      {['resources', 'downloads'].includes(tab) && <Select aria-label="资源类型" style={{ width: 150 }} value={type} allowClear placeholder="全部类型" onChange={(v) => { setType(v); setPage(1); }} options={Object.entries(names).map(([value, label]) => ({ value, label }))} />}
      {['resources', 'accounts'].includes(tab) && <Select aria-label="排序" style={{ width: 150 }} value={sort} onChange={(v) => { setSort(v); setPage(1); }} options={sorts.map(([value, label]) => ({ value, label }))} />}
      {tab === 'accounts' && <Input.Search allowClear placeholder="昵称或账户 ID" onSearch={(v) => { setKeyword(v); setPage(1); }} style={{ width: 240 }} />}
      {tab === 'downloads' && (userId || resourceId) && <Tag closable onClose={() => { setUserId(undefined); setResourceId(undefined); setPage(1); }}>筛选：{userId ? `账户 ${userId}` : `资源 ${resourceId}`}</Tag>}
    </Space>
    {error && <Typography.Paragraph type="danger">统计加载失败，请重试</Typography.Paragraph>}
    {tab === 'overview' ? <Space direction="vertical" style={{ width: '100%' }}>
      <Card title="各类型下载消耗"><Table rowKey="resourceType" loading={loading} pagination={false} dataSource={result.types || []} columns={[typeColumn, field('请求次数', 'requests'), field('完成次数', 'downloads'), field('下载账户数', 'downloadUsers'), flowColumn]} scroll={{ x: 650 }} /></Card>
      <Card title="每日趋势"><Table rowKey={(r) => `${r.statDate}-${r.resourceType}`} dataSource={result.daily || []} pagination={{ pageSize: 15 }} scroll={{ x: 800 }} columns={[field('日期', 'statDate', 120), typeColumn, field('请求次数', 'requests'), field('完成次数', 'downloads'), field('下载账户数', 'downloadUsers'), flowColumn,
        { title: '流量趋势', width: 180, render: (_, r) => <div aria-label={bytes(r.transferredBytes)} style={{ height: 8, background: 'var(--ant-color-fill-secondary, #eee)', borderRadius: 4 }}><div style={{ height: 8, borderRadius: 4, background: '#1677ff', width: `${100 * Number(r.transferredBytes) / Math.max(1, ...(result.daily || []).map((d) => Number(d.transferredBytes)))}%` }} /></div> },
      ]} /></Card>
    </Space> : <Table<Row> rowKey={(r) => tab === 'accounts' ? String(r.userId) : `${r.resourceType}-${r.id}`} loading={loading} dataSource={result.records || []} columns={tab === 'resources' ? resourceColumns : tab === 'accounts' ? accountColumns : downloadColumns} scroll={{ x: 'max-content' }} pagination={{ current: page, pageSize: 20, total: result.total || 0, showSizeChanger: false, onChange: setPage }} />}
    <Modal title={Number(target?.restricted) ? '恢复账户下载' : '禁止账户下载'} open={!!target} onCancel={() => setTarget(null)} onOk={() => void save()} confirmLoading={saving} okText="保存" cancelText="取消">
      <Typography.Paragraph>{target?.userName}（{target?.userId}）</Typography.Paragraph>
      <Typography.Paragraph type="secondary">仅影响新的站内文件下载，登录、浏览、收藏和复制保持可用</Typography.Paragraph>
      <Input.TextArea aria-label="操作原因" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="填写原因" maxLength={500} showCount rows={3} />
    </Modal>
    <Drawer title="下载权限操作记录（最近100条）" width={660} open={audit !== null} onClose={() => setAudit(null)}>
      <Table rowKey="id" dataSource={audit || []} columns={[{ title: '时间', dataIndex: 'createdAt', render: time }, { title: '操作', dataIndex: 'restricted', render: (v) => Number(v) ? '禁止下载' : '恢复下载' }, field('原因', 'reason', 180), field('操作人', 'operatorName')]} />
    </Drawer>
  </div>;
}
