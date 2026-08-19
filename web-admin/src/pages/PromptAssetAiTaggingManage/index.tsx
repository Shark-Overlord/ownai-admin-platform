import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { SettingOutlined, TagsOutlined } from '@ant-design/icons';
import { listCategory, type CategoryVO } from '../../api/category';
import { getAiSystemConfig } from '../../api/aiConfig';
import {
  runPromptAssetAiTagging,
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
  const navigate = useNavigate();
  const [runForm] = Form.useForm();
  const [categories, setCategories] = useState<CategoryVO[]>([]);
  const [aiReady, setAiReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<PromptAssetAiTagRunResultVO | null>(null);

  const categoryOptions = categories.map((item) => ({ label: item.name, value: item.id }));

  useEffect(() => {
    getAiSystemConfig().then((res) => {
      const task = res.data.tasks?.find((item) => item.taskCode === 'prompt_asset_tagging');
      setAiReady(res.data.provider?.status === 1 && Boolean(res.data.provider?.apiKeyUsable) && task?.status === 1);
    });
    listCategory().then((res) => setCategories(res.data || []));
    runForm.setFieldsValue({
      dryRun: true,
      overwriteExisting: false,
      limit: 20,
      status: 1,
      assetType: 'image_prompt',
    });
  }, []);

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
          type={aiReady ? 'info' : 'warning'}
          message={aiReady ? 'DeepSeek 服务已就绪' : 'DeepSeek 服务未启用、密钥不可用或标签任务已停用'}
          description="该功能会生成 Prompt 资产的描述标签，写入 assetTagText，并把 aiTagStatus 标记为已处理；不会新增系统标签，也不会修改二级场景标签。"
          action={<Button icon={<SettingOutlined />} onClick={() => navigate('/ai-config')}>前往 AI 配置</Button>}
        />

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
