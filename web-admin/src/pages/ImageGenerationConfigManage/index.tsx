import { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  addImageGenerationModel,
  addImageGenerationProvider,
  listImageGenerationModels,
  listImageGenerationProviders,
  setDefaultImageGenerationProvider,
  updateImageGenerationModel,
  updateImageGenerationProvider,
  type ImageGenerationModelConfig,
  type ImageGenerationModelConfigRequest,
  type ImageGenerationProviderConfig,
  type ImageGenerationProviderConfigRequest,
} from '../../api/imageGeneration';

const statusEnum = {
  0: { text: '禁用', status: 'Default' },
  1: { text: '启用', status: 'Success' },
};

const sizeOptions = [
  { label: '1K 级别', value: '1k' },
  { label: '2K 级别', value: '2k' },
  { label: '4K 级别', value: '4k' },
];

const aspectRatioOptions = [
  { label: '1:1', value: '1:1' },
  { label: '3:4', value: '3:4' },
  { label: '4:3', value: '4:3' },
  { label: '16:9', value: '16:9' },
  { label: '9:16', value: '9:16' },
];

const vendorSizeByCode: Record<string, Record<string, string>> = {
  '1k': {
    '1:1': '1024x1024',
    '3:4': '768x1024',
    '4:3': '1024x768',
    '16:9': '1280x720',
    '9:16': '720x1280',
  },
  '2k': {
    '1:1': '2048x2048',
    '3:4': '1536x2048',
    '4:3': '2048x1536',
    '16:9': '1920x1080',
    '9:16': '1080x1920',
  },
  '4k': {
    '1:1': '4096x4096',
    '3:4': '3072x4096',
    '4:3': '4096x3072',
    '16:9': '3840x2160',
    '9:16': '2160x3840',
  },
};

function resolveVendorSize(sizeCode?: string, aspectRatio?: string) {
  return vendorSizeByCode[sizeCode || '']?.[aspectRatio || ''] || '';
}

export default function ImageGenerationConfigManage() {
  const providerActionRef = useRef<any>(null);
  const modelActionRef = useRef<any>(null);
  const [providerForm] = Form.useForm();
  const [modelForm] = Form.useForm();
  const [providers, setProviders] = useState<ImageGenerationProviderConfig[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>();
  const [providerDrawerOpen, setProviderDrawerOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ImageGenerationProviderConfig | null>(null);
  const [editingModel, setEditingModel] = useState<ImageGenerationModelConfig | null>(null);

  const loadProviders = async () => {
    const res = await listImageGenerationProviders();
    setProviders(res.data);
    if (!selectedProvider && res.data.length > 0) {
      const defaultProvider = res.data.find((item) => item.isDefault === 1) || res.data[0];
      setSelectedProvider(defaultProvider.providerCode);
    }
    return res.data;
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const providerOptions = providers.map((item) => ({
    label: `${item.providerName} (${item.providerCode})`,
    value: item.providerCode,
  }));

  const openProviderDrawer = (record?: ImageGenerationProviderConfig) => {
    setEditingProvider(record || null);
    providerForm.setFieldsValue(
      record
        ? { ...record, apiKey: '' }
        : {
            authType: 'bearer',
            baseUrl: 'https://api.lumio.games',
            generationPath: '/v1/images/generations',
            status: 1,
            isDefault: 0,
            timeoutSeconds: 120,
          }
    );
    setProviderDrawerOpen(true);
  };

  const closeProviderDrawer = () => {
    setProviderDrawerOpen(false);
    setEditingProvider(null);
    providerForm.resetFields();
  };

  const syncVendorSize = () => {
    const sizeCode = modelForm.getFieldValue('sizeCode');
    const aspectRatio = modelForm.getFieldValue('aspectRatio');
    const vendorSize = resolveVendorSize(sizeCode, aspectRatio);
    if (vendorSize) {
      modelForm.setFieldValue('vendorSize', vendorSize);
    }
  };

  const openModelModal = (record?: ImageGenerationModelConfig) => {
    setEditingModel(record || null);
    modelForm.setFieldsValue(
      record
        ? { ...record }
        : {
            providerCode: selectedProvider,
            modelCode: 'gpt-image-2',
            sizeCode: '1k',
            aspectRatio: '1:1',
            vendorSize: '1024x1024',
            pointCost: 30,
            manualPointCost: 30,
            apiInputCostCny: 0.05,
            apiOutputCostCny: 0.05,
            apiCostCny: 0.1,
            manualCostCny: 0.1,
            supportsReferenceImage: 1,
            status: 1,
            sortOrder: 10,
          }
    );
    setModelModalOpen(true);
  };

  const saveProvider = async (values: ImageGenerationProviderConfigRequest) => {
    const params = { ...values };
    if (!params.apiKey) {
      delete params.apiKey;
    }
    try {
      if (editingProvider) {
        await updateImageGenerationProvider({ ...params, id: editingProvider.id });
        message.success('厂商配置更新成功');
      } else {
        await addImageGenerationProvider(params);
        message.success('厂商配置新增成功');
      }
      closeProviderDrawer();
      await loadProviders();
      providerActionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.message || '厂商配置保存失败');
    }
  };

  const saveModel = async (values: ImageGenerationModelConfigRequest) => {
    const params = {
      ...values,
      apiCostCny: Number(values.apiInputCostCny || 0) + Number(values.apiOutputCostCny || 0),
    };
    try {
      if (editingModel) {
        await updateImageGenerationModel({ ...params, id: editingModel.id });
        message.success('模型规格更新成功');
      } else {
        await addImageGenerationModel(params);
        message.success('模型规格新增成功');
      }
      setModelModalOpen(false);
      setEditingModel(null);
      modelForm.resetFields();
      modelActionRef.current?.reload();
    } catch (error: any) {
      message.error(error?.message || '模型规格保存失败');
    }
  };

  const providerColumns: any[] = [
    {
      title: '厂商',
      dataIndex: 'providerName',
      render: (_: unknown, record: ImageGenerationProviderConfig) => (
        <Space>
          <span>{record.providerName}</span>
          <Tag>{record.providerCode}</Tag>
          {record.isDefault === 1 ? <Tag color="blue">默认</Tag> : null}
        </Space>
      ),
    },
    { title: 'Base URL', dataIndex: 'baseUrl', ellipsis: true },
    { title: '生成路径', dataIndex: 'generationPath', width: 180 },
    { title: '认证', dataIndex: 'authType', width: 100 },
    {
      title: 'API Key',
      dataIndex: 'apiKeyMasked',
      width: 140,
      render: (_: unknown, record: ImageGenerationProviderConfig) =>
        record.hasApiKey ? record.apiKeyMasked : '-',
    },
    { title: '超时', dataIndex: 'timeoutSeconds', width: 90, render: (value: number) => `${value || 0}s` },
    { title: '状态', dataIndex: 'status', valueEnum: statusEnum, width: 100 },
    { title: '更新时间', dataIndex: 'updateTime', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      render: (_: unknown, record: ImageGenerationProviderConfig) => [
        <Button key="edit" type="link" onClick={() => openProviderDrawer(record)}>
          编辑
        </Button>,
        record.isDefault !== 1 ? (
          <Button
            key="default"
            type="link"
            onClick={async () => {
              try {
                await setDefaultImageGenerationProvider(record.id);
                message.success('默认厂商设置成功');
                await loadProviders();
                providerActionRef.current?.reload();
              } catch (error: any) {
                message.error(error?.message || '默认厂商设置失败');
              }
            }}
          >
            设为默认
          </Button>
        ) : null,
      ],
    },
  ];

  const modelColumns: any[] = [
    { title: '厂商', dataIndex: 'providerCode', width: 120, render: (value: string) => <Tag>{value}</Tag> },
    { title: '模型', dataIndex: 'modelCode', width: 140 },
    { title: '级别', dataIndex: 'sizeCode', width: 100, render: (value: string) => <Tag color="blue">{value}</Tag> },
    { title: '比例', dataIndex: 'aspectRatio', width: 90, render: (value: string) => <Tag>{value}</Tag> },
    { title: '厂商尺寸', dataIndex: 'vendorSize', width: 130 },
    { title: 'API 积分', dataIndex: 'pointCost', width: 90 },
    { title: '人工积分', dataIndex: 'manualPointCost', width: 90 },
    {
      title: '输入成本',
      dataIndex: 'apiInputCostCny',
      width: 100,
      render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
    },
    {
      title: '输出成本',
      dataIndex: 'apiOutputCostCny',
      width: 100,
      render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
    },
    {
      title: '总成本',
      dataIndex: 'apiCostCny',
      width: 100,
      render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
    },
    {
      title: '人工成本',
      dataIndex: 'manualCostCny',
      width: 100,
      render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
    },
    {
      title: '参考图',
      dataIndex: 'supportsReferenceImage',
      width: 100,
      render: (value: number) => (value === 1 ? <Tag color="green">支持</Tag> : <Tag>不支持</Tag>),
    },
    { title: '状态', dataIndex: 'status', valueEnum: statusEnum, width: 90 },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      render: (_: unknown, record: ImageGenerationModelConfig) => [
        <Button key="edit" type="link" onClick={() => openModelModal(record)}>
          编辑
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer title="图片生成配置">
      <Tabs
        items={[
          {
            key: 'providers',
            label: '厂商配置',
            children: (
              <ProTable<ImageGenerationProviderConfig>
                actionRef={providerActionRef}
                rowKey="id"
                columns={providerColumns}
                search={false}
                cardBordered
                request={async () => {
                  const data = await loadProviders();
                  return { data, total: data.length, success: true };
                }}
                toolBarRender={() => [
                  <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => openProviderDrawer()}>
                    新增厂商
                  </Button>,
                ]}
              />
            ),
          },
          {
            key: 'models',
            label: '模型规格',
            children: (
              <ProTable<ImageGenerationModelConfig>
                actionRef={modelActionRef}
                rowKey="id"
                columns={modelColumns}
                search={false}
                cardBordered
                scroll={{ x: 1480 }}
                params={{ selectedProvider }}
                request={async () => {
                  const res = await listImageGenerationModels(selectedProvider);
                  return { data: res.data, total: res.data.length, success: true };
                }}
                toolBarRender={() => [
                  <Select
                    key="provider"
                    style={{ width: 240 }}
                    value={selectedProvider}
                    options={providerOptions}
                    placeholder="选择厂商"
                    onChange={(value) => {
                      setSelectedProvider(value);
                      modelActionRef.current?.reload();
                    }}
                  />,
                  <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => openModelModal()}>
                    新增规格
                  </Button>,
                ]}
              />
            ),
          },
        ]}
      />

      <Drawer
        title={editingProvider ? '编辑厂商配置' : '新增厂商配置'}
        width={620}
        open={providerDrawerOpen}
        onClose={closeProviderDrawer}
        destroyOnClose
        extra={
          <Space>
            <Button onClick={closeProviderDrawer}>取消</Button>
            <Button type="primary" onClick={() => providerForm.submit()}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={providerForm} layout="vertical" onFinish={saveProvider}>
          <Form.Item label="厂商 Code" name="providerCode" rules={[{ required: !editingProvider }]}>
            <Input disabled={!!editingProvider} placeholder="lumio" />
          </Form.Item>
          <Form.Item label="厂商名称" name="providerName" rules={[{ required: true }]}>
            <Input placeholder="LumioAPI" />
          </Form.Item>
          <Form.Item label="Base URL" name="baseUrl" rules={[{ required: true }]}>
            <Input placeholder="https://api.lumio.games" />
          </Form.Item>
          <Form.Item label="生成路径" name="generationPath" rules={[{ required: true }]}>
            <Input placeholder="/v1/images/generations" />
          </Form.Item>
          <Form.Item label="认证方式" name="authType" rules={[{ required: true }]}>
            <Select options={[{ label: 'Bearer Token', value: 'bearer' }]} />
          </Form.Item>
          <Form.Item label="API Key" name="apiKey" extra={editingProvider ? '留空表示保持原 API Key 不变。' : undefined}>
            <Input.Password placeholder="只写入，不明文展示" />
          </Form.Item>
          <Form.Item label="超时时间（秒）" name="timeoutSeconds" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} precision={0} />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
          <Form.Item
            label="设为默认"
            name="isDefault"
            valuePropName="checked"
            getValueProps={(value) => ({ checked: value === 1 })}
            getValueFromEvent={(checked) => (checked ? 1 : 0)}
          >
            <Switch />
          </Form.Item>
          <Form.Item label="请求结构说明" name="requestSchema">
            <Input.TextArea rows={5} placeholder='{"body":{"model":"string","prompt":"string","size":"string"}}' />
          </Form.Item>
        </Form>
      </Drawer>

      <Modal
        title={editingModel ? '编辑模型规格' : '新增模型规格'}
        open={modelModalOpen}
        onCancel={() => {
          setModelModalOpen(false);
          setEditingModel(null);
          modelForm.resetFields();
        }}
        onOk={() => modelForm.submit()}
        destroyOnClose
        width={720}
      >
        <Form form={modelForm} layout="vertical" onFinish={saveModel}>
          <Form.Item label="厂商" name="providerCode" rules={[{ required: true }]}>
            <Select options={providerOptions} disabled={!!editingModel} />
          </Form.Item>
          <Form.Item label="模型 Code" name="modelCode" rules={[{ required: true }]}>
            <Input disabled={!!editingModel} placeholder="gpt-image-2" />
          </Form.Item>
          <Form.Item label="清晰度级别" name="sizeCode" rules={[{ required: true }]}>
            <Select
              disabled={!!editingModel}
              options={sizeOptions}
              onChange={() => syncVendorSize()}
            />
          </Form.Item>
          <Form.Item label="画面比例" name="aspectRatio" rules={[{ required: true }]}>
            <Select
              disabled={!!editingModel}
              options={aspectRatioOptions}
              onChange={() => syncVendorSize()}
            />
          </Form.Item>
          <Form.Item label="厂商尺寸" name="vendorSize" rules={[{ required: true }]}>
            <Input placeholder="1024x1024" />
          </Form.Item>
          <Form.Item label="API 消耗积分" name="pointCost" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={0} />
          </Form.Item>
          <Form.Item label="人工消耗积分" name="manualPointCost" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={0} />
          </Form.Item>
          <Form.Item label="API 输入成本（元）" name="apiInputCostCny" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item label="API 输出成本（元）" name="apiOutputCostCny" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item label="人工成本（元/张）" name="manualCostCny" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} precision={2} />
          </Form.Item>
          <Form.Item
            label="支持参考图"
            name="supportsReferenceImage"
            valuePropName="checked"
            getValueProps={(value) => ({ checked: value === 1 })}
            getValueFromEvent={(checked) => (checked ? 1 : 0)}
          >
            <Switch />
          </Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={[{ label: '启用', value: 1 }, { label: '禁用', value: 0 }]} />
          </Form.Item>
          <Form.Item label="排序" name="sortOrder" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} precision={0} />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
