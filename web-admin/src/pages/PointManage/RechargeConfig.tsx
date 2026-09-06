import { useEffect, useState } from 'react';
import { Button, Card, Form, InputNumber, Space, Switch, message } from 'antd';
import request from '../../api/request';

export default function RechargeConfig() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await request.get('/point/recharge-config');
      form.setFieldsValue({ ...data, status: data.status === 1 });
    } catch { message.error('充值配置加载失败'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  return <Card title="积分充值配置" style={{ marginBottom: 16 }}>
    <Form form={form} layout="inline" style={{ rowGap: 12 }} onFinish={async (values) => {
      setSaving(true);
      try {
        await request.post('/point/recharge-config/update', { ...values, status: values.status ? 1 : 0 });
        message.success('充值配置已保存');
      } catch { message.error('充值配置保存失败'); }
      finally { setSaving(false); }
    }}>
      <Form.Item name="unitPrice" label="每份价格（元）" rules={[{ required: true }]}><InputNumber min={0.01} max={10000} precision={2} /></Form.Item>
      <Form.Item name="pointsPerUnit" label="每份积分" rules={[{ required: true }]}><InputNumber min={1} max={100000} precision={0} /></Form.Item>
      <Form.Item name="maxQuantity" label="单笔份数上限" rules={[{ required: true }]}><InputNumber min={1} max={1000} precision={0} /></Form.Item>
      <Form.Item name="status" label="启用" valuePropName="checked"><Switch /></Form.Item>
      <Form.Item><Space><Button type="primary" htmlType="submit" loading={saving} disabled={loading}>保存充值配置</Button><Button onClick={() => void load()} loading={loading}>刷新</Button></Space></Form.Item>
    </Form>
    <p style={{ color: '#8c8c8c', marginTop: 12 }}>前台按此配置展示和创建支付宝订单；修改仅影响新订单，已创建订单保留原金额与到账积分。</p>
  </Card>;
}
