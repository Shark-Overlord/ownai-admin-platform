import { useEffect, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from 'antd';
import { ReloadOutlined, SaveOutlined, TagsOutlined } from '@ant-design/icons';
import { listCategory, type CategoryVO } from '../../api/category';
import {
  getPromptAssetAiTagConfig,
  runPromptAssetAiTagging,
  savePromptAssetAiTagConfig,
  type PromptAssetAiTagItemResultVO,
  type PromptAssetAiTagRunResultVO,
} from '../../api/promptAssetAiTagging';

const { Text } = Typography;

const assetTypeOptions = [
  { label: '图片提示词', value: 'image_prompt' },
  { label: '视频提示词', value: 'video_prompt' },
];

const statusOptions = [
  { label: '草稿', value: 0 },
  { label: '已发布', value: 1 },
  { label: '已归档', value: 2 },
];

export default function PromptAssetAiTaggingManage() {
  const [configForm] = Form.useForm();
  const [runForm] = Form.useForm();
  const [categories, setCategories] = useState<CategoryVO[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PromptAssetAiTagRunResultVO | null>(null);

  const categoryOptions = categories.map((item) => ({ label: item.name, value: item.id }));

  const loadConfig = async () => {
    setLoadingConfig(true);
    try {
      const res = await getPromptAssetAiTagConfig();
      configForm.setFieldsValue({
        ...res.data,
        apiKey: '',
        status: res.data.status ?? 1,
        timeoutSeconds: res.data.timeoutSeconds ?? 60,
        maxTags: res.data.maxTags ?? 8,
      });
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    loadConfig();
    listCategory().then((res) => setCategories(res.data || []));
    runForm.setFieldsValue({
      dryRun: true,
      overwriteExisting: false,
      limit: 20,
      status: 1,
      assetType: 'image_prompt',
    });
  }, []);

  const handleSaveConfig = async () => {
    const values = await configForm.validateFields();
    setSavingConfig(true);
    try {
      const payload = { ...values };
      if (!payload.apiKey) {
        delete payload.apiKey;
      }
      await savePromptAssetAiTagConfig(payload);
      message.success('DeepSeek 配置已保存');
      await loadConfig();
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRun = async () => {
    const values = await runForm.validateFields();
    setRunning(true);
    try {
      const res = await runPromptAssetAiTagging(values);
      setResult(res.data);
      message.success(values.dryRun ? 'AI 标签预览完成' : 'AI 标签重标注完成');
    } finally {
      setRunning(false);
    }
  };

  const columns = [
    {
      title: '资产 ID',
      dataIndex: 'id',
      width: 180,
    },
    {
      title: '标题',
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: '结果',
      dataIndex: 'success',
      width: 100,
      render: (_: unknown, record: PromptAssetAiTagItemResultVO) =>
        record.success ? <Tag color={record.updated ? 'green' : 'blue'}>{record.updated ? '已写入' : '预览'}</Tag> : <Tag color="red">失败</Tag>,
    },
    {
      title: 'AI 标签',
      dataIndex: 'assetTagList',
      render: (_: unknown, record: PromptAssetAiTagItemResultVO) =>
        record.assetTagList?.length ? (
          <Space size={[0, 4]} wrap>
            {record.assetTagList.map((item) => (
              <Tag key={item}>{item}</Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: '错误',
      dataIndex: 'errorMessage',
      ellipsis: true,
      width: 260,
      render: (_: unknown, record: PromptAssetAiTagItemResultVO) => record.errorMessage || '-',
    },
  ];

  return (
    <PageContainer title="AI 标签重标注">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          showIcon
          type="info"
          message="该功能会用 DeepSeek 覆盖生成 Prompt 资产的资产描述标签，写入 assetTagText，并把 aiTagStatus 标记为已处理；不会新增系统标签，也不会修改二级场景标签。"
        />

        <Card
          title="DeepSeek 配置"
          extra={
            <Button icon={<ReloadOutlined />} loading={loadingConfig} onClick={loadConfig}>
              刷新
            </Button>
          }
        >
          <Form form={configForm} layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Provider Code" name="providerCode">
                  <Input placeholder="deepseek" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Provider Name" name="providerName">
                  <Input placeholder="DeepSeek" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="启用状态" name="status">
                  <Select
                    options={[
                      { label: '启用', value: 1 },
                      { label: '停用', value: 0 },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Base URL" name="baseUrl" rules={[{ required: true, message: '请输入 Base URL' }]}>
                  <Input placeholder="https://api.deepseek.com" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Chat Path" name="chatPath" rules={[{ required: true, message: '请输入 Chat Path' }]}>
                  <Input placeholder="/v1/chat/completions" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="模型" name="modelCode" rules={[{ required: true, message: '请输入模型名称' }]}>
                  <Input placeholder="deepseek-chat" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="鉴权方式" name="authType">
                  <Select options={[{ label: 'Bearer Token', value: 'bearer' }]} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="超时秒数" name="timeoutSeconds">
                  <InputNumber min={1} max={300} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="最多标签数" name="maxTags">
                  <InputNumber min={1} max={20} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item
                  label="API Key"
                  name="apiKey"
                  extra="保存后后台只脱敏展示；留空表示不修改已保存的 API Key。"
                >
                  <Input.Password placeholder="sk-..." />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label="系统提示词" name="systemPrompt">
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" icon={<SaveOutlined />} loading={savingConfig} onClick={handleSaveConfig}>
              保存配置
            </Button>
          </Form>
        </Card>

        <Card title="批量重标注">
          <Alert
            showIcon
            type="warning"
            style={{ marginBottom: 16 }}
            message="日常建议关闭“覆盖已处理”：系统只处理 aiTagStatus=未处理 的资产，避免重复调用 DeepSeek；需要重新纠正旧标签时再开启覆盖。"
          />
          <Form form={runForm} layout="vertical">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="资产类型" name="assetType">
                  <Select allowClear options={assetTypeOptions} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="分类" name="categoryId">
                  <Select allowClear showSearch options={categoryOptions} optionFilterProp="label" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="发布状态" name="status">
                  <Select allowClear options={statusOptions} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="关键词" name="searchText">
                  <Input placeholder="按标题、说明、Prompt 搜索" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="处理数量" name="limit" rules={[{ required: true, message: '请输入处理数量' }]}>
                  <InputNumber min={1} max={1000} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item label="预览模式" name="dryRun" valuePropName="checked">
                  <Switch checkedChildren="预览" unCheckedChildren="写入" />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item
                  label="覆盖已处理"
                  name="overwriteExisting"
                  valuePropName="checked"
                  extra="关闭时只扫描 aiTagStatus=未处理"
                >
                  <Switch checkedChildren="覆盖" unCheckedChildren="仅未处理" />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" icon={<TagsOutlined />} loading={running} onClick={handleRun}>
              开始处理
            </Button>
          </Form>
        </Card>

        {result ? (
          <Card title="处理结果">
            <Descriptions column={5} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="模式">{result.dryRun ? '预览' : '正式写入'}</Descriptions.Item>
              <Descriptions.Item label="总数">{result.totalCount}</Descriptions.Item>
              <Descriptions.Item label="成功">{result.successCount}</Descriptions.Item>
              <Descriptions.Item label="写入">{result.updateCount}</Descriptions.Item>
              <Descriptions.Item label="错误">{result.errorCount}</Descriptions.Item>
            </Descriptions>
            <ProTable
              rowKey="id"
              search={false}
              options={false}
              pagination={{ pageSize: 10 }}
              columns={columns}
              dataSource={result.itemList || []}
            />
          </Card>
        ) : null}
      </Space>
    </PageContainer>
  );
}
