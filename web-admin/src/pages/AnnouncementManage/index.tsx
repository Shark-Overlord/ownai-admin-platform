import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, DatePicker, Drawer, Form, Input, InputNumber, Modal, Select, Space, Tag, message } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  addAnnouncement,
  deleteAnnouncement,
  listAnnouncementByPage,
  offlineAnnouncement,
  publishAnnouncement,
  updateAnnouncement,
  type AnnouncementVO,
} from '../../api/announcement';

const typeOptions = [
  { label: '网站更新', value: 'site_update' },
  { label: '价格变动', value: 'price_change' },
  { label: '维护通知', value: 'maintenance' },
  { label: '活动通知', value: 'activity' },
];

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已下线', value: 'offline' },
];

const typeText: Record<string, string> = {
  site_update: '网站更新',
  price_change: '价格变动',
  maintenance: '维护通知',
  activity: '活动通知',
};

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  offline: { text: '已下线', color: 'orange' },
};

export default function AnnouncementManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [current, setCurrent] = useState<AnnouncementVO | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = () => actionRef.current?.reload();

  const openCreate = () => {
    setCurrent(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'site_update',
      status: 'draft',
      priority: 0,
    });
    setDrawerOpen(true);
  };

  const openEdit = (record: AnnouncementVO) => {
    setCurrent(record);
    form.setFieldsValue({
      ...record,
      publishTime: record.publishTime ? dayjs(record.publishTime) : undefined,
      expireTime: record.expireTime ? dayjs(record.expireTime) : undefined,
    });
    setDrawerOpen(true);
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const params = {
        ...values,
        id: current?.id,
        publishTime: values.publishTime ? values.publishTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
        expireTime: values.expireTime ? values.expireTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
      };
      if (current) {
        await updateAnnouncement(params);
        message.success('公告已更新');
      } else {
        await addAnnouncement(params);
        message.success('公告已新增');
      }
      setDrawerOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = (record: AnnouncementVO) => {
    Modal.confirm({
      title: '发布公告',
      content: `确认发布「${record.title}」？发布后前台用户可见。`,
      okText: '确认发布',
      cancelText: '取消',
      onOk: async () => {
        await publishAnnouncement(record.id);
        message.success('公告已发布');
        reload();
      },
    });
  };

  const handleOffline = (record: AnnouncementVO) => {
    Modal.confirm({
      title: '下线公告',
      content: `确认下线「${record.title}」？下线后前台用户不可见。`,
      okText: '确认下线',
      cancelText: '取消',
      onOk: async () => {
        await offlineAnnouncement(record.id);
        message.success('公告已下线');
        reload();
      },
    });
  };

  const handleDelete = (record: AnnouncementVO) => {
    Modal.confirm({
      title: '删除公告',
      content: `确认删除「${record.title}」？`,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await deleteAnnouncement(record.id);
        message.success('公告已删除');
        reload();
      },
    });
  };

  const columns: any[] = [
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: typeOptions.reduce((acc, item) => ({ ...acc, [item.value]: { text: item.label } }), {}),
      width: 120,
      render: (_: any, record: AnnouncementVO) => typeText[record.type] || record.type,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusOptions.reduce((acc, item) => ({ ...acc, [item.value]: { text: item.label } }), {}),
      width: 120,
      render: (_: any, record: AnnouncementVO) => {
        const status = statusMap[record.status] || { text: record.status, color: 'default' };
        return <Tag color={status.color}>{status.text}</Tag>;
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      search: false,
      width: 90,
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      search: false,
      width: 170,
      render: (_: any, record: AnnouncementVO) =>
        record.publishTime ? dayjs(record.publishTime).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '过期时间',
      dataIndex: 'expireTime',
      search: false,
      width: 170,
      render: (_: any, record: AnnouncementVO) =>
        record.expireTime ? dayjs(record.expireTime).format('YYYY-MM-DD HH:mm') : '长期有效',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTimeRange',
      width: 180,
      search: {
        transform: (value: string[]) => ({
          startTime: value?.[0],
          endTime: value?.[1],
        }),
      },
      render: (_: any, record: AnnouncementVO) =>
        record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      fixed: 'right',
      render: (_: any, record: AnnouncementVO) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          {record.status !== 'published' ? (
            <Button type="link" size="small" onClick={() => handlePublish(record)}>
              发布
            </Button>
          ) : (
            <Button type="link" size="small" onClick={() => handleOffline(record)}>
              下线
            </Button>
          )}
          <Button type="link" danger size="small" onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="公告管理">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        cardBordered
        scroll={{ x: 1200 }}
        search={{ labelWidth: 'auto' }}
        toolBarRender={() => [
          <Button key="reload" icon={<ReloadOutlined />} onClick={reload}>
            刷新
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增公告
          </Button>,
        ]}
        request={async (params) => {
          const res = await listAnnouncementByPage({
            current: params.current || 1,
            pageSize: params.pageSize || 10,
            title: params.title,
            type: params.type,
            status: params.status,
            startTime: params.startTime,
            endTime: params.endTime,
          });
          return {
            data: res.data.records,
            total: res.data.total,
            success: true,
          };
        }}
      />
      <Drawer
        title={current ? '编辑公告' : '新增公告'}
        open={drawerOpen}
        width={640}
        destroyOnClose
        onClose={() => setDrawerOpen(false)}
        extra={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={saving} onClick={() => form.submit()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入公告标题' }]}>
            <Input maxLength={100} placeholder="例如：图片生成价格调整通知" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
          <Form.Item name="priority" label="优先级">
            <InputNumber precision={0} style={{ width: '100%' }} placeholder="数值越大越靠前" />
          </Form.Item>
          <Form.Item name="publishTime" label="发布时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="为空时发布操作会使用当前时间" />
          </Form.Item>
          <Form.Item name="expireTime" label="过期时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="为空表示长期有效" />
          </Form.Item>
          <Form.Item name="content" label="公告内容" rules={[{ required: true, message: '请输入公告内容' }]}>
            <Input.TextArea rows={10} placeholder="支持普通文本或 Markdown 内容，前台按消息中心样式展示。" />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
