import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Alert, Button, Collapse, DatePicker, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Tabs, Tag, Upload, message } from 'antd';
import { EditOutlined, PlusOutlined, ReloadOutlined, UploadOutlined } from '@ant-design/icons';
import { NewsMarkdown } from '../../components/news/NewsMarkdown';
import { uploadBlogMedia } from '../../api/blog';
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
  const [preview, setPreview] = useState<'detail' | 'popup' | null>(null);
  const [uploading, setUploading] = useState(false);
  const values = Form.useWatch([], form) || {};

  const reload = () => actionRef.current?.reload();

  const openCreate = () => {
    setCurrent(null);
    form.resetFields();
    form.setFieldsValue({
      type: 'site_update',
      status: 'draft',
      priority: 0,
      publicVisible: true,
      popupEnabled: false,
      summary: '',
    });
    setDrawerOpen(true);
  };

  const openEdit = (record: AnnouncementVO) => {
    setCurrent(record);
    form.resetFields();
    form.setFieldsValue({
      ...record,
      publicVisible: !!record.publicVisible,
      popupEnabled: !!record.popupEnabled,
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
        publishTime: values.publishTime ? values.publishTime.format('YYYY-MM-DD HH:mm:ss') : null,
        expireTime: values.expireTime ? values.expireTime.format('YYYY-MM-DD HH:mm:ss') : null,
        summary: values.summary || '',
        // Preserve existing announcements' destinations; new links belong in Markdown.
        actionLabel: current?.actionLabel || '',
        actionPath: current?.actionPath || '',
        publicVisible: values.publicVisible !== false,
        popupEnabled: values.publicVisible !== false && !!values.popupEnabled,
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

  const handlePublish = async (record: AnnouncementVO) => {
    await publishAnnouncement(record.id);
    message.success(record.publishTime && dayjs(record.publishTime).isAfter(dayjs()) ? '公告已安排发布' : '公告已发布');
    reload();
  };

  const handleOffline = async (record: AnnouncementVO) => {
    await offlineAnnouncement(record.id);
    message.success('公告已下线');
    reload();
  };

  const handleDelete = async (record: AnnouncementVO) => {
    await deleteAnnouncement(record.id);
    message.success('公告已删除');
    reload();
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
      title: '展示方式',
      search: false,
      width: 165,
      render: (_: any, record: AnnouncementVO) => <Space size={4}><Tag>{record.publicVisible ? '公开新闻' : '登录可见'}</Tag>{record.popupEnabled && <Tag color="blue">弹窗</Tag>}</Space>,
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
            <Popconfirm
              title="发布公告"
              description={`确认发布「${record.title}」？发布后前台用户可见。`}
              okText="确认发布"
              cancelText="取消"
              onConfirm={() => handlePublish(record)}
            >
              <Button type="link" size="small">
                发布
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="下线公告"
              description={`确认下线「${record.title}」？下线后前台用户不可见。`}
              okText="确认下线"
              cancelText="取消"
              onConfirm={() => handleOffline(record)}
            >
              <Button type="link" size="small">
                下线
              </Button>
            </Popconfirm>
          )}
          <Popconfirm
            title="删除公告"
            description={`确认删除「${record.title}」？`}
            okText="确认删除"
            cancelText="取消"
            okButtonProps={{ danger: true }}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="系统公告" subTitle="发布近期系统动态；通常只需填写标题、类型、说明和正文">
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
        width="min(760px, 100vw)"
        destroyOnClose
        onClose={() => { if (!uploading) setDrawerOpen(false); }}
        extra={
          <Space>
            <Button disabled={uploading} onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button disabled={uploading} onClick={() => setPreview('detail')}>预览</Button>
            <Button type="primary" loading={saving} disabled={uploading} onClick={() => form.submit()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form name="announcement-editor" form={form} layout="vertical" onFinish={handleSave}>
          {current?.targetType === 'community_post' && <Alert type="info" showIcon style={{ marginBottom: 16 }} message={`关联帖子：${current.targetId}`} description="此公告来自已发布帖子，内容为生成时的摘要快照。需要补充链接时，可直接插入公告正文。" />}
          {!current?.targetType && <Alert type="info" showIcon style={{ marginBottom: 16 }} message="填写四项即可发布" description="标题、类型、一句话说明和正文是常用内容；链接直接写在正文中；定时和优先级收在更多设置中。" />}
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入公告标题' }]}>
            <Input maxLength={100} placeholder="例如：图片生成价格调整通知" />
          </Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="status" hidden rules={[{ required: true }]}>
            <Select options={statusOptions} disabled />
          </Form.Item>
          <Form.Item name="summary" label="一句话说明" dependencies={['popupEnabled']} rules={[
            { max: 300, message: '摘要最多 300 字' },
            ({ getFieldValue }) => ({ validator(_, value) { return getFieldValue('popupEnabled') && !value?.trim() ? Promise.reject(new Error('弹窗新闻需要填写摘要')) : Promise.resolve(); } }),
          ]}>
            <Input.TextArea rows={2} maxLength={300} showCount placeholder="一句话说明发生了什么，用于公告列表和弹窗" />
          </Form.Item>
          <Form.Item name="popupEnabled" label="弹窗提醒" valuePropName="checked" extra="只给需要用户及时看到的重要变化开启；用户关闭后不会重复提醒">
            <Switch onChange={checked => { if (checked) form.setFieldValue('publicVisible', true); }} />
          </Form.Item>
          <Form.Item name="content" label="公告正文（Markdown）" extra="插入链接：[链接文字](完整网址)，例如 [查看网站](https://ownai.icu)。可直接复制浏览器中的完整网址。" rules={[{ required: true, whitespace: true, message: '请输入公告内容' }]}>
            <Input.TextArea rows={10} placeholder={'说明这次更新、维护或活动的具体内容。\n\n- 影响范围\n- 预计时间\n- 用户需要做什么'} />
          </Form.Item>
          <Space wrap>
            <Upload accept="image/png,image/jpeg,image/webp,image/gif" showUploadList={false} disabled={uploading} beforeUpload={async file => {
              if (file.size > 10 * 1024 * 1024) { message.error('图片不能超过 10 MB'); return false; }
              setUploading(true);
              try {
                const res = await uploadBlogMedia(file, 'image');
                const url = res.data;
                if (!url || !/^https:\/\//i.test(url)) throw new Error('图片未返回有效的 HTTPS 地址');
                const alt = file.name.replace(/[\[\]\\\n\r]/g, '').slice(0, 80);
                form.setFieldValue('content', `${form.getFieldValue('content') || ''}\n\n![${alt}](<${url.replace(/>/g, '%3E')}>)\n`);
                message.success('图片已插入正文');
              } catch { message.error('图片上传失败，请重试'); }
              finally { setUploading(false); }
              return false;
            }}><Button icon={<UploadOutlined />} loading={uploading}>上传并插入图片</Button></Upload>
            <Button onClick={() => setPreview('detail')}>详情预览</Button>
            <Button onClick={() => setPreview('popup')}>弹窗预览</Button>
          </Space>
          <Collapse ghost style={{ marginTop: 18 }} items={[{
            key: 'advanced',
            label: '更多设置',
            children: <>
              <Form.Item name="publicVisible" label="公开展示" valuePropName="checked" extra="关闭后仅登录用户可见，同时不会弹窗">
                <Switch onChange={checked => { if (!checked) form.setFieldValue('popupEnabled', false); }} />
              </Form.Item>
              <Form.Item name="priority" label="优先级">
                <InputNumber precision={0} style={{ width: '100%' }} placeholder="数值越大越靠前" />
              </Form.Item>
              <Form.Item name="publishTime" label="定时发布">
                <DatePicker showTime style={{ width: '100%' }} placeholder="为空时点击发布即刻生效" />
              </Form.Item>
              <Form.Item name="expireTime" label="自动下线">
                <DatePicker showTime style={{ width: '100%' }} placeholder="为空表示长期有效" />
              </Form.Item>
            </>,
          }]} />
        </Form>
      </Drawer>
      <Modal open={preview !== null} title="发布预览" footer={null} zIndex={1200} width={preview === 'popup' ? 520 : 760} onCancel={() => setPreview(null)}>
        <Tabs activeKey={preview || 'detail'} onChange={key => setPreview(key as 'detail' | 'popup')} items={[
          { key: 'detail', label: '新闻详情' }, { key: 'popup', label: '弹窗提醒' },
        ]} />
        <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '16px 0' }} onClick={event => {
          if ((event.target as HTMLElement).closest('a')) event.preventDefault();
        }}>
          <p style={{ color: '#888', fontSize: 12 }}>OWNAI · 网站动态</p>
          <h2 style={{ fontSize: 22, lineHeight: 1.5, overflowWrap: 'anywhere' }}>{values.title || '新闻标题'}</h2>
          <p style={{ whiteSpace: 'pre-line', fontSize: 14, lineHeight: 1.8, opacity: .7 }}>{values.summary || '更新摘要将在这里展示'}</p>
          {preview === 'detail' && <NewsMarkdown content={values.content || ''} />}
          <Space wrap style={{ marginTop: 24 }}>
            {current?.actionLabel && current?.actionPath && <Button type="primary">{current.actionLabel}</Button>}
            {preview === 'popup' && <Button type={current?.actionLabel && current?.actionPath ? 'default' : 'primary'}>查看详情</Button>}
          </Space>
        </div>
      </Modal>
    </PageContainer>
  );
}
