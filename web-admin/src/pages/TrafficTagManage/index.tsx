import { useRef, useState } from 'react';
import { DeleteOutlined, EditOutlined, KeyOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Alert, Button, DatePicker, Drawer, Form, Input, InputNumber, message, Popconfirm, Select, Space, Switch, Tag } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useNavigate } from 'react-router-dom';
import {
  addTrafficTag,
  deleteTrafficTag,
  listTrafficTags,
  updateTrafficTag,
} from '../../api/trafficTag';
import type { TrafficTagVO } from '../../api/trafficTag';

const platformOptions = [
  { value: 'douyin', label: '抖音' },
  { value: 'xiaohongshu', label: '小红书' },
];

const statusOptions = [
  { value: 'active', label: '进行中', color: 'green' },
  { value: 'long_term', label: '长期有效', color: 'blue' },
  { value: 'upcoming', label: '即将开始', color: 'gold' },
  { value: 'expired', label: '已失效', color: 'default' },
];

type TrafficTagForm = Omit<TrafficTagVO, 'id' | 'tags' | 'requirements' | 'sourceUpdatedTime'> & {
  tagsText: string;
  requirementsText: string;
  sourceUpdatedTime?: Dayjs;
};

function splitLines(value?: string) {
  return (value || '').split(/[\n,，]+/).map((item) => item.trim()).filter(Boolean);
}

export default function TrafficTagManage() {
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<TrafficTagForm>();
  const [current, setCurrent] = useState<TrafficTagVO | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const reload = () => actionRef.current?.reload();

  const openCreate = () => {
    setCurrent(null);
    form.setFieldsValue({
      title: '', platform: 'douyin', category: 'AI 工具', status: 'active', dateLabel: '', heat: 0,
      tagsText: '', requirementsText: '', description: '', sourceUrl: '', sortOrder: 0, enabled: true,
      sourceUpdatedTime: dayjs(),
    });
    setOpen(true);
  };

  const openEdit = (record: TrafficTagVO) => {
    setCurrent(record);
    form.setFieldsValue({
      ...record,
      tagsText: record.tags.join('\n'),
      requirementsText: record.requirements.join('\n'),
      sourceUpdatedTime: record.sourceUpdatedTime ? dayjs(record.sourceUpdatedTime) : dayjs(),
    });
    setOpen(true);
  };

  const save = async (values: TrafficTagForm) => {
    setSaving(true);
    try {
      const payload = {
        ...(current ? { id: current.id } : {}),
        ...values,
        tags: splitLines(values.tagsText),
        requirements: splitLines(values.requirementsText),
        sourceUpdatedTime: values.sourceUpdatedTime?.format('YYYY-MM-DD HH:mm:ss'),
      };
      delete (payload as any).tagsText;
      delete (payload as any).requirementsText;
      if (current) await updateTrafficTag(payload);
      else await addTrafficTag(payload);
      message.success(current ? '流量标签已更新' : '流量标签已新增');
      setOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (record: TrafficTagVO) => {
    await deleteTrafficTag(record.id);
    message.success('流量标签已删除');
    reload();
  };

  const platformMap = Object.fromEntries(platformOptions.map((item) => [item.value, { text: item.label }]));
  const statusMap = Object.fromEntries(statusOptions.map((item) => [item.value, { text: item.label }]));

  const columns: ProColumns<TrafficTagVO>[] = [
    { title: '关键词', dataIndex: 'keyword', hideInTable: true },
    { title: '标题', dataIndex: 'title', ellipsis: true, search: false, width: 220 },
    {
      title: '平台', dataIndex: 'platform', valueType: 'select', valueEnum: platformMap, width: 100,
      render: (_, record) => platformOptions.find((item) => item.value === record.platform)?.label || record.platform,
    },
    { title: '分类', dataIndex: 'category', width: 110 },
    {
      title: '状态', dataIndex: 'status', valueType: 'select', valueEnum: statusMap, width: 105,
      render: (_, record) => {
        const status = statusOptions.find((item) => item.value === record.status);
        return <Tag color={status?.color}>{status?.label || record.status}</Tag>;
      },
    },
    { title: '有效期', dataIndex: 'dateLabel', search: false, width: 110 },
    { title: '热度', dataIndex: 'heat', search: false, width: 80, sorter: false },
    {
      title: '标签', dataIndex: 'tags', search: false, ellipsis: true, width: 240,
      render: (_, record) => record.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>),
    },
    {
      title: '前台展示', dataIndex: 'enabled', valueType: 'select', width: 100,
      valueEnum: { true: { text: '展示' }, false: { text: '隐藏' } },
      render: (_, record) => <Tag color={record.enabled ? 'green' : 'default'}>{record.enabled ? '展示' : '隐藏'}</Tag>,
    },
    {
      title: '数据时间', dataIndex: 'sourceUpdatedTime', search: false, width: 165,
      render: (_, record) => record.sourceUpdatedTime ? dayjs(record.sourceUpdatedTime).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作', valueType: 'option', width: 145, fixed: 'right',
      render: (_, record) => (
        <Space size={2}>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>编辑</Button>
          <Popconfirm title="删除流量标签" description={`确认删除「${record.title}」？`} okText="删除" cancelText="取消" okButtonProps={{ danger: true }} onConfirm={() => remove(record)}>
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="流量标签" subTitle="维护前台自媒体流量标签；支持后台编辑与 Agent 密钥自动更新">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Agent 自动更新"
        description="为 Agent 创建仅含流量标签查询、新增、修改权限的 API 密钥，即可通过统一内容接口持续维护数据。密钥不提供删除权限。"
        action={<Button icon={<KeyOutlined />} onClick={() => navigate('/content-api-key')}>添加 Agent 密钥</Button>}
      />
      <ProTable<TrafficTagVO>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        cardBordered
        scroll={{ x: 1450 }}
        search={{ labelWidth: 'auto' }}
        toolBarRender={() => [
          <Button key="reload" icon={<ReloadOutlined />} onClick={reload}>刷新</Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增标签</Button>,
        ]}
        request={async (params) => {
          const res = await listTrafficTags({
            current: params.current || 1,
            pageSize: params.pageSize || 10,
            keyword: params.keyword,
            platform: params.platform,
            category: params.category,
            status: params.status,
            enabled: params.enabled === undefined ? undefined : params.enabled === true || params.enabled === 'true',
          });
          return { data: res.data.records, total: res.data.total, success: true };
        }}
      />

      <Drawer
        title={current ? '编辑流量标签' : '新增流量标签'}
        open={open}
        width="min(720px, 100vw)"
        destroyOnClose
        onClose={() => setOpen(false)}
        extra={<Space><Button onClick={() => setOpen(false)}>取消</Button><Button type="primary" loading={saving} onClick={() => form.submit()}>保存</Button></Space>}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="title" label="标题" rules={[{ required: true, whitespace: true }, { max: 120 }]}>
            <Input placeholder="例如：抖音 AI 学习类扶持" />
          </Form.Item>
          <Space align="start" wrap style={{ width: '100%' }}>
            <Form.Item name="platform" label="平台" rules={[{ required: true }]}><Select style={{ width: 150 }} options={platformOptions} /></Form.Item>
            <Form.Item name="category" label="分类" rules={[{ required: true, whitespace: true }]}><Input style={{ width: 180 }} /></Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select style={{ width: 150 }} options={statusOptions} /></Form.Item>
          </Space>
          <Space align="start" wrap style={{ width: '100%' }}>
            <Form.Item name="dateLabel" label="有效期文案"><Input style={{ width: 180 }} placeholder="长期有效 / 9/20–10/11" /></Form.Item>
            <Form.Item name="heat" label="热度"><InputNumber min={0} precision={0} style={{ width: 130 }} /></Form.Item>
            <Form.Item name="sortOrder" label="默认排序"><InputNumber precision={0} style={{ width: 130 }} /></Form.Item>
          </Space>
          <Form.Item name="tagsText" label="流量标签" extra="每行一个，也支持逗号分隔" rules={[{ required: true, whitespace: true }]}>
            <Input.TextArea rows={5} placeholder={'#我在抖音学ai\n#ai实战经验'} />
          </Form.Item>
          <Form.Item name="requirementsText" label="参与要求" extra="每行一条；没有可留空">
            <Input.TextArea rows={4} placeholder={'必须使用抖音 App 发布\n完成作品回填'} />
          </Form.Item>
          <Form.Item name="description" label="说明" rules={[{ max: 3000 }]}><Input.TextArea rows={5} /></Form.Item>
          <Form.Item name="sourceUrl" label="活动来源"><Input placeholder="https://..." /></Form.Item>
          <Form.Item name="sourceUpdatedTime" label="数据更新时间" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="enabled" label="前台展示" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
