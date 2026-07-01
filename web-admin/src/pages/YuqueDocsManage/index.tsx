import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Form, Input, Popconfirm, Select, Space, Table, Tag, message } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined, SyncOutlined, UnorderedListOutlined } from '@ant-design/icons';
import {
  deleteYuqueBook,
  listYuqueBooks,
  listYuqueToc,
  saveYuqueBook,
  syncAllYuqueBooks,
  syncYuqueBook,
  type YuqueBookVO,
  type YuqueTocVO,
} from '../../api/yuqueDocs';

const visibilityOptions = [
  { label: '公开', value: 'public' },
  { label: '登录可见', value: 'login' },
  { label: '管理员可见', value: 'admin' },
];

const statusOptions = [
  { label: '上线', value: 'online' },
  { label: '下线', value: 'offline' },
];

const visibilityMap: Record<string, { text: string; color: string }> = {
  public: { text: '公开', color: 'green' },
  login: { text: '登录可见', color: 'blue' },
  admin: { text: '管理员可见', color: 'purple' },
};

const statusMap: Record<string, { text: string; color: string }> = {
  online: { text: '上线', color: 'green' },
  offline: { text: '下线', color: 'default' },
};

export default function YuqueDocsManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [current, setCurrent] = useState<YuqueBookVO | null>(null);
  const [tocBook, setTocBook] = useState<YuqueBookVO | null>(null);
  const [tocList, setTocList] = useState<YuqueTocVO[]>([]);
  const [saving, setSaving] = useState(false);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [tocLoading, setTocLoading] = useState(false);

  const reload = () => actionRef.current?.reload();

  const openCreate = () => {
    setCurrent(null);
    form.resetFields();
    form.setFieldsValue({
      visibility: 'public',
      status: 'online',
    });
    setDrawerOpen(true);
  };

  const openEdit = (record: YuqueBookVO) => {
    setCurrent(record);
    form.setFieldsValue(record);
    setDrawerOpen(true);
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      await saveYuqueBook({
        ...values,
        id: current?.id,
      });
      message.success(current ? '知识库已更新' : '知识库已创建');
      setDrawerOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (record: YuqueBookVO) => {
    setSyncingId(record.id);
    try {
      await syncYuqueBook(record.id);
      message.success('同步完成');
      reload();
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await syncAllYuqueBooks();
      message.success('全部同步完成');
      reload();
    } finally {
      setSyncingAll(false);
    }
  };

  const handleDelete = async (record: YuqueBookVO) => {
    await deleteYuqueBook(record.id);
    message.success('知识库已删除');
    reload();
  };

  const openToc = async (record: YuqueBookVO) => {
    setTocBook(record);
    setTocOpen(true);
    setTocLoading(true);
    try {
      const res = await listYuqueToc(record.slug);
      setTocList(res.data);
    } finally {
      setTocLoading(false);
    }
  };

  const columns: any[] = [
    {
      title: '知识库名称',
      dataIndex: 'name',
      ellipsis: true,
      render: (_: any, record: YuqueBookVO) => (
        <Space direction="vertical" size={0}>
          <strong>{record.name}</strong>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{record.description || record.namespace}</span>
        </Space>
      ),
    },
    {
      title: '语雀 Namespace',
      dataIndex: 'namespace',
      ellipsis: true,
      copyable: true,
    },
    {
      title: '站内路径',
      dataIndex: 'slug',
      width: 160,
      copyable: true,
      render: (_: any, record: YuqueBookVO) => `/learn/${record.slug}`,
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      valueType: 'select',
      valueEnum: visibilityOptions.reduce((acc, item) => ({ ...acc, [item.value]: { text: item.label } }), {}),
      width: 130,
      render: (_: any, record: YuqueBookVO) => {
        const item = visibilityMap[record.visibility] || { text: record.visibility, color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusOptions.reduce((acc, item) => ({ ...acc, [item.value]: { text: item.label } }), {}),
      width: 110,
      render: (_: any, record: YuqueBookVO) => {
        const item = statusMap[record.status] || { text: record.status, color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '最近同步',
      dataIndex: 'lastSyncAt',
      search: false,
      width: 180,
      render: (_: any, record: YuqueBookVO) => record.lastSyncAt || '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 280,
      fixed: 'right',
      render: (_: any, record: YuqueBookVO) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button type="link" size="small" icon={<UnorderedListOutlined />} onClick={() => openToc(record)}>
            目录
          </Button>
          <Button
            type="link"
            size="small"
            icon={<SyncOutlined spin={syncingId === record.id} />}
            loading={syncingId === record.id}
            disabled={syncingAll || (syncingId !== null && syncingId !== record.id)}
            onClick={() => handleSync(record)}
          >
            同步
          </Button>
          <Popconfirm
            title="删除知识库"
            description={`确认删除「${record.name}」？同步缓存目录会一并不可见。`}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="语雀教程管理"
      subTitle="管理 www.ownai.icu 教程中心使用的语雀知识库缓存"
    >
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
          <Button key="sync-all" icon={<SyncOutlined />} loading={syncingAll} disabled={syncingId !== null} onClick={handleSyncAll}>
            同步全部
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增知识库
          </Button>,
        ]}
        request={async (params) => {
          const res = await listYuqueBooks();
          const keyword = String(params.name || '').trim().toLowerCase();
          const data = keyword
            ? res.data.filter((item) =>
                [item.name, item.namespace, item.slug, item.description]
                  .filter(Boolean)
                  .some((value) => String(value).toLowerCase().includes(keyword)),
              )
            : res.data;
          return {
            data,
            total: data.length,
            success: true,
          };
        }}
      />

      <Drawer
        title={current ? '编辑语雀知识库' : '新增语雀知识库'}
        open={drawerOpen}
        width={620}
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
          <Form.Item
            name="namespace"
            label="语雀 Namespace"
            rules={[{ required: true, message: '请输入语雀知识库 namespace，例如 user/book' }]}
          >
            <Input placeholder="例如：ownai/tutorials" />
          </Form.Item>
          <Form.Item
            name="slug"
            label="站内路径 Slug"
            rules={[{ required: true, message: '请输入站内路径 slug' }]}
          >
            <Input placeholder="例如：tutorials，对应 /learn/tutorials" />
          </Form.Item>
          <Form.Item name="name" label="知识库名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：OwnAI 教程" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={4} placeholder="显示在教程中心的简介" />
          </Form.Item>
          <Form.Item name="visibility" label="可见性" rules={[{ required: true }]}>
            <Select options={visibilityOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
        </Form>
      </Drawer>

      <Drawer
        title={tocBook ? `${tocBook.name} - 同步目录` : '同步目录'}
        open={tocOpen}
        width={720}
        onClose={() => setTocOpen(false)}
      >
        <Table
          rowKey="id"
          loading={tocLoading}
          pagination={false}
          dataSource={tocList}
          columns={[
            {
              title: '标题',
              dataIndex: 'title',
              render: (text: string, record: YuqueTocVO) => (
                <span style={{ paddingLeft: Math.max(0, record.depth - 1) * 16 }}>{text}</span>
              ),
            },
            {
              title: 'Slug',
              dataIndex: 'slug',
              width: 220,
            },
          ]}
        />
      </Drawer>
    </PageContainer>
  );
}
