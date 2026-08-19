import { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
  type FormInstance,
} from 'antd';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import {
  getAiSystemConfig,
  saveAiProviderConfig,
  saveAiTaskConfig,
  type AiProviderConfigVO,
  type AiTaskCode,
  type AiTaskConfigVO,
} from '../../api/aiConfig';

const taskDescriptions: Record<AiTaskCode, string> = {
  prompt_asset_tagging: '为 Prompt 资产生成中文描述标签。',
  blog_slug_generation: '为教程书和文章生成语义化英文链接标识。',
  blog_seo_generation: '为教程书和文章生成中文 SEO 标题和描述。',
};

export default function AiConfigManage() {
  const [providerForm] = Form.useForm<AiProviderConfigVO & { apiKey?: string }>();
  const [taggingForm] = Form.useForm<AiTaskConfigVO>();
  const [slugForm] = Form.useForm<AiTaskConfigVO>();
  const [seoForm] = Form.useForm<AiTaskConfigVO>();
  const [tasks, setTasks] = useState<AiTaskConfigVO[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingProvider, setSavingProvider] = useState(false);
  const [savingTask, setSavingTask] = useState<AiTaskCode | null>(null);

  const taskForms: Record<AiTaskCode, FormInstance<AiTaskConfigVO>> = {
    prompt_asset_tagging: taggingForm,
    blog_slug_generation: slugForm,
    blog_seo_generation: seoForm,
  };

  const loadConfig = async () => {
    setLoading(true);
    try {
      const res = await getAiSystemConfig();
      providerForm.setFieldsValue({ ...res.data.provider, apiKey: '' });
      setTasks(res.data.tasks || []);
      (res.data.tasks || []).forEach((task) => taskForms[task.taskCode].setFieldsValue(task));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadConfig(); }, []);

  const taskItems = useMemo(() => tasks.map((task) => {
    const form = taskForms[task.taskCode];
    const isTagging = task.taskCode === 'prompt_asset_tagging';
    return {
      key: task.taskCode,
      label: task.taskName,
      children: (
        <Form form={form} layout="vertical">
          <Alert type="info" showIcon message={taskDescriptions[task.taskCode]} style={{ marginBottom: 16 }} />
          <Form.Item name="id" hidden><Input /></Form.Item>
          <Form.Item name="taskCode" hidden><Input /></Form.Item>
          <Form.Item name="providerCode" hidden><Input /></Form.Item>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item name="taskName" label="任务名称" rules={[{ required: true }]}>
                <Input maxLength={128} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="status" label="启用状态" rules={[{ required: true }]}>
                <Select options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
              </Form.Item>
            </Col>
          </Row>
          {isTagging ? (
            <Form.Item name="maxResultCount" label="最多标签数" rules={[{ required: true }]}>
              <InputNumber min={1} max={20} style={{ width: 220 }} />
            </Form.Item>
          ) : <Form.Item name="maxResultCount" hidden><InputNumber /></Form.Item>}
          <Form.Item name="systemPrompt" label="系统提示词" rules={[{ required: true, message: '请输入系统提示词' }]}>
            <Input.TextArea rows={8} maxLength={8000} showCount />
          </Form.Item>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={savingTask === task.taskCode}
            onClick={async () => {
              const values = await form.validateFields();
              setSavingTask(task.taskCode);
              try {
                await saveAiTaskConfig(values as AiTaskConfigVO);
                message.success(`${task.taskName}配置已保存`);
                await loadConfig();
              } finally {
                setSavingTask(null);
              }
            }}
          >保存任务配置</Button>
        </Form>
      ),
    };
  }), [tasks, savingTask]);

  const providerStatus = Form.useWatch('status', providerForm);
  const hasApiKey = Form.useWatch('hasApiKey', providerForm);
  const apiKeyUsable = Form.useWatch('apiKeyUsable', providerForm);

  return (
    <PageContainer title="AI 配置" subTitle="统一管理 DeepSeek 服务及系统 AI 任务">
      <Spin spinning={loading}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Card
            title={<Space>DeepSeek 服务<Tag color={providerStatus === 1 ? 'green' : 'default'}>{providerStatus === 1 ? '已启用' : '已停用'}</Tag></Space>}
            extra={<Button icon={<ReloadOutlined />} onClick={() => void loadConfig()}>刷新</Button>}
          >
            <Form form={providerForm} layout="vertical">
              <Form.Item name="id" hidden><Input /></Form.Item>
              <Form.Item name="providerCode" hidden><Input /></Form.Item>
              <Form.Item name="hasApiKey" hidden><Input /></Form.Item>
              <Form.Item name="apiKeyUsable" hidden><Input /></Form.Item>
              {hasApiKey && apiKeyUsable === false && (
                <Alert
                  type="warning"
                  showIcon
                  message="现有 API Key 无法解密"
                  description="请确认运行环境中的 AI_CONFIG_SECRET（或兼容的旧配置密钥）与保存密钥时一致；也可以重新输入 API Key 后保存。"
                  style={{ marginBottom: 16 }}
                />
              )}
              <Row gutter={16}>
                <Col xs={24} md={8}><Form.Item name="providerName" label="服务名称" rules={[{ required: true }]}><Input /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="modelCode" label="模型" rules={[{ required: true }]}><Input placeholder="deepseek-chat" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="status" label="启用状态" rules={[{ required: true }]}><Select options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="baseUrl" label="Base URL" rules={[{ required: true }]}><Input placeholder="https://api.deepseek.com" /></Form.Item></Col>
                <Col xs={24} md={12}><Form.Item name="chatPath" label="Chat Path" rules={[{ required: true }]}><Input placeholder="/v1/chat/completions" /></Form.Item></Col>
                <Col xs={24} md={8}><Form.Item name="timeoutSeconds" label="超时秒数" rules={[{ required: true }]}><InputNumber min={1} max={300} style={{ width: '100%' }} /></Form.Item></Col>
                <Col xs={24} md={16}>
                  <Form.Item name="apiKey" label="API Key" extra={hasApiKey ? '已配置；留空表示不修改现有密钥。' : '尚未配置 DeepSeek API Key。'}>
                    <Input.Password placeholder={hasApiKey ? '留空保留现有密钥' : 'sk-...'} />
                  </Form.Item>
                </Col>
              </Row>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={savingProvider}
                onClick={async () => {
                  const values = await providerForm.validateFields();
                  const payload = { ...values };
                  if (!payload.apiKey) delete payload.apiKey;
                  setSavingProvider(true);
                  try {
                    await saveAiProviderConfig(payload);
                    message.success('DeepSeek 服务配置已保存');
                    await loadConfig();
                  } finally {
                    setSavingProvider(false);
                  }
                }}
              >保存服务配置</Button>
            </Form>
          </Card>

          <Card title="AI 任务配置">
            <Typography.Paragraph type="secondary">不同业务共享 DeepSeek 服务，但使用独立的系统提示词和启用状态。</Typography.Paragraph>
            <Tabs items={taskItems} />
          </Card>
        </Space>
      </Spin>
    </PageContainer>
  );
}
