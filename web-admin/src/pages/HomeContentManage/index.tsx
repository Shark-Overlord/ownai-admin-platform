import { useEffect, useState } from 'react';
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
  Space,
  Spin,
  Switch,
  Tabs,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, PlusOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import {
  getHomeContentConfig,
  updateHomeContentConfig,
  type HomeContentConfig,
} from '../../api/homeContent';
import './index.css';

const httpsRule = { type: 'url' as const, warningOnly: true, message: '请输入完整 HTTPS URL' };
const pathRule = { pattern: /^\/(?!\/)/, message: '请输入以 / 开头的站内路径' };

export default function HomeContentManage() {
  const [form] = Form.useForm<HomeContentConfig>();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const response = await getHomeContentConfig();
      form.setFieldsValue(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const saveConfig = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      await updateHomeContentConfig(values);
      message.success('首页内容已保存');
      await loadConfig();
    } finally {
      setSaving(false);
    }
  };

  const sectionSwitch = (name: ['hero' | 'design' | 'course', 'enabled'], label: string) => (
    <div className="section-switch">
      <div>
        <Typography.Text strong>{label}</Typography.Text>
        <Typography.Text type="secondary" style={{ marginLeft: 12 }}>关闭后公开接口不返回该区域的内容</Typography.Text>
      </div>
      <Form.Item name={name} valuePropName="checked" noStyle><Switch checkedChildren="启用" unCheckedChildren="停用" /></Form.Item>
    </div>
  );

  const heroTab = (
    <div className="settings-section">
      {sectionSwitch(['hero', 'enabled'], '首屏内容')}
      <Row gutter={16}>
        <Col xs={24} md={8}><Form.Item name={['hero', 'eyebrow']} label="眉题"><Input maxLength={80} /></Form.Item></Col>
        <Col xs={24} md={16}><Form.Item name={['hero', 'title']} label="主标题" rules={[{ required: true }]}><Input maxLength={120} /></Form.Item></Col>
        <Col span={24}><Form.Item name={['hero', 'description']} label="描述"><Input.TextArea rows={3} maxLength={300} showCount /></Form.Item></Col>
      </Row>
      <Typography.Title level={5}>循环视频</Typography.Title>
      <Typography.Paragraph type="secondary">数值越小越靠前；关闭单条后不会出现在公开接口中。</Typography.Paragraph>
      <Form.List name={['hero', 'videoList']}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {fields.map((field, index) => (
              <div className="repeat-item" key={field.key}>
                <div className="repeat-item-header">
                  <span className="repeat-item-title">视频 {index + 1}</span>
                  <Space>
                    <Form.Item name={[field.name, 'enabled']} valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)}>删除</Button>
                  </Space>
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={8}><Form.Item name={[field.name, 'id']} label="稳定 ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col xs={12} md={8}><Form.Item name={[field.name, 'alt']} label="替代文本" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col xs={12} md={8}><Form.Item name={[field.name, 'sort']} label="排序" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={24}><Form.Item name={[field.name, 'videoUrl']} label="视频 URL" rules={[{ required: true }, httpsRule]}><Input /></Form.Item></Col>
                  <Col span={24}><Form.Item name={[field.name, 'posterUrl']} label="封面 URL（可选）" rules={[httpsRule]}><Input /></Form.Item></Col>
                </Row>
              </div>
            ))}
            <Button block type="dashed" icon={<PlusOutlined />} onClick={() => add({ id: `hero-video-${fields.length + 1}`, sort: fields.length + 1, enabled: true })}>
              新增首屏视频
            </Button>
          </Space>
        )}
      </Form.List>
    </div>
  );

  const designTab = (
    <div className="settings-section">
      {sectionSwitch(['design', 'enabled'], 'OwnAI Design 区域')}
      <Row gutter={16}>
        <Col span={24}><Form.Item name={['design', 'title']} label="标题" rules={[{ required: true }]}><Input maxLength={120} /></Form.Item></Col>
        <Col span={24}><Form.Item name={['design', 'description']} label="描述"><Input.TextArea rows={4} maxLength={500} showCount /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name={['design', 'ctaText']} label="按钮文字"><Input maxLength={40} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name={['design', 'ctaPath']} label="按钮路径" rules={[{ required: true }, pathRule]}><Input placeholder="/ownai-design" /></Form.Item></Col>
        <Col span={24}><Form.Item name={['design', 'demoVideoUrl']} label="演示视频 URL" rules={[{ required: true }, httpsRule]}><Input /></Form.Item></Col>
        <Col span={24}><Form.Item name={['design', 'demoVideoPosterUrl']} label="演示视频封面 URL（可选）" rules={[httpsRule]}><Input /></Form.Item></Col>
      </Row>
    </div>
  );

  const courseTab = (
    <div className="settings-section">
      {sectionSwitch(['course', 'enabled'], '课程区域')}
      <Row gutter={16}>
        <Col xs={24} md={8}><Form.Item name={['course', 'eyebrow']} label="眉题"><Input maxLength={80} /></Form.Item></Col>
        <Col xs={24} md={16}><Form.Item name={['course', 'title']} label="标题" rules={[{ required: true }]}><Input maxLength={120} /></Form.Item></Col>
        <Col span={24}><Form.Item name={['course', 'description']} label="描述"><Input.TextArea rows={3} maxLength={500} showCount /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name={['course', 'ctaText']} label="按钮文字"><Input maxLength={40} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name={['course', 'ctaPath']} label="按钮路径" rules={[{ required: true }, pathRule]}><Input placeholder="/tutorials" /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name={['course', 'footerTitle']} label="底部标题"><Input maxLength={120} /></Form.Item></Col>
        <Col xs={24} md={12}><Form.Item name={['course', 'footerDescription']} label="底部说明"><Input maxLength={200} /></Form.Item></Col>
      </Row>
      <Typography.Title level={5}>课程卡片</Typography.Title>
      <Form.List name={['course', 'itemList']}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            {fields.map((field, index) => (
              <div className="repeat-item" key={field.key}>
                <div className="repeat-item-header">
                  <span className="repeat-item-title">课程 {index + 1}</span>
                  <Space>
                    <Form.Item name={[field.name, 'enabled']} valuePropName="checked" noStyle><Switch size="small" /></Form.Item>
                    <Button danger type="text" icon={<DeleteOutlined />} onClick={() => remove(field.name)}>删除</Button>
                  </Space>
                </div>
                <Row gutter={16}>
                  <Col xs={24} md={8}><Form.Item name={[field.name, 'id']} label="稳定 ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col xs={24} md={8}><Form.Item name={[field.name, 'title']} label="课程标题" rules={[{ required: true }]}><Input /></Form.Item></Col>
                  <Col xs={12} md={4}><Form.Item name={[field.name, 'statusText']} label="状态文字"><Input /></Form.Item></Col>
                  <Col xs={12} md={4}><Form.Item name={[field.name, 'sort']} label="排序" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={24}><Form.Item name={[field.name, 'description']} label="课程描述"><Input.TextArea rows={2} /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name={[field.name, 'coverUrl']} label="封面 URL" rules={[{ required: true }, httpsRule]}><Input /></Form.Item></Col>
                  <Col xs={24} md={12}><Form.Item name={[field.name, 'coverAlt']} label="封面替代文本"><Input /></Form.Item></Col>
                  <Col span={24}><Form.Item name={[field.name, 'targetPath']} label="跳转路径" rules={[{ required: true }, pathRule]}><Input placeholder="/tutorials" /></Form.Item></Col>
                </Row>
              </div>
            ))}
            <Button block type="dashed" icon={<PlusOutlined />} onClick={() => add({ id: `course-${fields.length + 1}`, sort: fields.length + 1, enabled: true, targetPath: '/tutorials' })}>
              新增课程卡片
            </Button>
          </Space>
        )}
      </Form.List>
    </div>
  );

  return (
    <PageContainer
      title="首页设置"
      subTitle="维护 OwnAI 前台首页文案、视频和课程入口"
      extra={[
        <Button key="reload" icon={<ReloadOutlined />} onClick={() => void loadConfig()}>重新加载</Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} loading={saving} onClick={() => void saveConfig()}>保存首页</Button>,
      ]}
    >
      <Alert
        type="info"
        showIcon
        message="保存后公开接口 GET /api/home/content 会立即使用新配置；素材地址必须为公开 HTTPS URL。"
        style={{ marginBottom: 16 }}
      />
      <Spin spinning={loading}>
        <Card className="home-content-settings">
          <Form form={form} layout="vertical">
            <Tabs items={[
              { key: 'hero', label: '首屏', children: heroTab },
              { key: 'design', label: 'OwnAI Design', children: designTab },
              { key: 'course', label: '课程', children: courseTab },
            ]} />
          </Form>
        </Card>
      </Spin>
    </PageContainer>
  );
}
