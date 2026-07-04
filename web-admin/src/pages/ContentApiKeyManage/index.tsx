import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { CheckOutlined, CopyOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  addContentApiKey,
  deleteContentApiKey,
  listContentApiKeyByPage,
  updateContentApiKey,
  type ContentApiKeyVO,
} from '../../api/contentApiKey';

const scopeOptions = [
  { label: '全部内容资产接口', value: '*' },
  { label: '作品新增', value: 'artwork:add' },
  { label: '作品修改', value: 'artwork:update' },
  { label: 'Prompt 资产新增', value: 'prompt_asset:add' },
  { label: 'Prompt 资产修改', value: 'prompt_asset:update' },
];

const scopeText: Record<string, string> = scopeOptions.reduce(
  (acc, item) => ({ ...acc, [item.value]: item.label }),
  {}
);

export default function ContentApiKeyManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [current, setCurrent] = useState<ContentApiKeyVO | null>(null);
  const [saving, setSaving] = useState(false);
  const [plainKeyMap, setPlainKeyMap] = useState<Record<string, string>>({});
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const copyResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = () => actionRef.current?.reload();

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      message.success('密钥已复制');
      return true;
    } catch (error) {
      message.error('复制失败，请手动选择密钥复制');
      return false;
    }
  };

  const markCopied = (id: string) => {
    setCopiedKeyId(id);
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
    }
    copyResetTimerRef.current = setTimeout(() => {
      setCopiedKeyId((currentId) => (currentId === id ? null : currentId));
    }, 3000);
  };

  const openCreate = () => {
    setCurrent(null);
    form.resetFields();
    form.setFieldsValue({
      status: 1,
      scopes: ['prompt_asset:add', 'prompt_asset:update'],
    });
    setDrawerOpen(true);
  };

  const openEdit = (record: ContentApiKeyVO) => {
    setCurrent(record);
    form.setFieldsValue({
      ...record,
      scopes: record.scopeList || [],
      expireTime: record.expireTime ? dayjs(record.expireTime) : undefined,
    });
    setDrawerOpen(true);
  };

  const showPlainKey = (plainKey: string, keyId: string) => {
    Modal.info({
      title: '请立即保存 API 密钥',
      width: 680,
      content: (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="warning"
            showIcon
            message="密钥明文只展示这一次，关闭后后台不会再显示。"
          />
          <Input.TextArea value={plainKey} autoSize readOnly />
          <Button
            type="primary"
            icon={<CopyOutlined />}
            onClick={async () => {
              if (await copyText(plainKey)) {
                markCopied(keyId);
              }
            }}
          >
            复制完整密钥
          </Button>
          <Typography.Text type="secondary">
            外部调用推荐放在请求头：X-Content-Asset-Key: {plainKey}
          </Typography.Text>
        </Space>
      ),
      okText: '我已保存',
    });
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      const params = {
        ...values,
        id: current?.id,
        expireTime: values.expireTime ? values.expireTime.format('YYYY-MM-DD HH:mm:ss') : undefined,
      };
      if (current) {
        await updateContentApiKey(params);
        message.success('密钥已更新');
      } else {
        const res = await addContentApiKey(params);
        message.success('密钥已创建');
        setPlainKeyMap((prev) => ({
          ...prev,
          [String(res.data.id)]: res.data.plainKey,
        }));
        showPlainKey(res.data.plainKey, String(res.data.id));
      }
      setDrawerOpen(false);
      reload();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: ContentApiKeyVO) => {
    await deleteContentApiKey(record.id);
    setPlainKeyMap((prev) => {
      const next = { ...prev };
      delete next[String(record.id)];
      return next;
    });
    message.success('密钥已删除');
    reload();
  };

  const handleCopy = (record: ContentApiKeyVO) => {
    const plainKey = plainKeyMap[String(record.id)];
    if (!plainKey) {
      message.warning('完整密钥只在创建成功后可复制；刷新或关闭页面后无法再次查看，请重新创建密钥。');
      return;
    }
    copyText(plainKey).then((success) => {
      if (success) {
        markCopied(String(record.id));
      }
    });
  };

  const columns: any[] = [
    {
      title: '名称',
      dataIndex: 'keyName',
      ellipsis: true,
      width: 180,
    },
    {
      title: '前缀',
      dataIndex: 'keyPrefix',
      search: false,
      width: 150,
      render: (_: any, record: ContentApiKeyVO) => <Typography.Text code>{record.keyPrefix}...</Typography.Text>,
    },
    {
      title: '权限范围',
      dataIndex: 'scope',
      valueType: 'select',
      width: 260,
      valueEnum: scopeOptions.reduce((acc, item) => ({ ...acc, [item.value]: { text: item.label } }), {}),
      render: (_: any, record: ContentApiKeyVO) => (
        <Space wrap size={[4, 4]}>
          {(record.scopeList || []).map((scope) => (
            <Tag color={scope === '*' ? 'red' : 'blue'} key={scope}>
              {scopeText[scope] || scope}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 110,
      valueEnum: {
        1: { text: '启用' },
        0: { text: '禁用' },
      },
      render: (_: any, record: ContentApiKeyVO) =>
        record.status === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
    },
    {
      title: '失效时间',
      dataIndex: 'expireTime',
      search: false,
      width: 180,
      render: (_: any, record: ContentApiKeyVO) =>
        record.expireTime ? dayjs(record.expireTime).format('YYYY-MM-DD HH:mm') : '长期有效',
    },
    {
      title: '最后使用',
      dataIndex: 'lastUsedTime',
      search: false,
      width: 220,
      render: (_: any, record: ContentApiKeyVO) => (
        <Space direction="vertical" size={0}>
          <span>{record.lastUsedTime ? dayjs(record.lastUsedTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
          <Typography.Text type="secondary">{record.lastUsedIp || '-'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'remark',
      search: false,
      ellipsis: true,
      width: 220,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTimeRange',
      width: 190,
      search: {
        transform: (value: string[]) => ({
          startTime: value?.[0],
          endTime: value?.[1],
        }),
      },
      render: (_: any, record: ContentApiKeyVO) =>
        record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 230,
      fixed: 'right',
      render: (_: any, record: ContentApiKeyVO) => {
        const copied = copiedKeyId === String(record.id);
        return (
          <Space>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(record)}>
              编辑
            </Button>
            <Popconfirm
              title="删除密钥"
              description={`确认删除「${record.keyName}」？删除后外部接口将无法继续使用该密钥。`}
              okText="确认删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" danger size="small">
                删除
              </Button>
            </Popconfirm>
            <Button
              type={copied ? 'primary' : 'link'}
              size="small"
              icon={copied ? <CheckOutlined /> : <CopyOutlined />}
              onClick={() => handleCopy(record)}
            >
              {copied ? '已复制' : '复制'}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <PageContainer title="API 密钥管理">
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message="用于外部程序免登录创建或更新作品、Prompt 资产。密钥只保存哈希，明文只在创建成功后展示一次。"
      />
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        cardBordered
        scroll={{ x: 1500 }}
        search={{ labelWidth: 'auto' }}
        toolBarRender={() => [
          <Button key="reload" icon={<ReloadOutlined />} onClick={reload}>
            刷新
          </Button>,
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增密钥
          </Button>,
        ]}
        request={async (params) => {
          const res = await listContentApiKeyByPage({
            current: params.current || 1,
            pageSize: params.pageSize || 10,
            keyName: params.keyName,
            scope: params.scope,
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
        title={current ? '编辑 API 密钥' : '新增 API 密钥'}
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
          <Form.Item name="keyName" label="密钥名称" rules={[{ required: true, message: '请输入密钥名称' }]}>
            <Input maxLength={100} placeholder="例如：视觉资产导入程序" />
          </Form.Item>
          <Form.Item name="scopes" label="授权范围" rules={[{ required: true, message: '请选择授权范围' }]}>
            <Checkbox.Group options={scopeOptions} />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '启用', value: 1 },
                { label: '禁用', value: 0 },
              ]}
            />
          </Form.Item>
          <Form.Item name="expireTime" label="失效时间">
            <DatePicker showTime style={{ width: '100%' }} placeholder="为空表示长期有效" />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={4} maxLength={500} placeholder="记录密钥用途、使用方、注意事项" />
          </Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
