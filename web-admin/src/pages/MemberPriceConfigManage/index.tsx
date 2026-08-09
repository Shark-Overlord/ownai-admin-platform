import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Form, Input, InputNumber, Modal, Select, Tag, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  addMemberPriceConfig,
  listMemberPriceConfigs,
  updateMemberPriceConfig,
  type MemberPlanType,
  type MemberPriceConfig,
} from '../../api/memberPriceConfig';

const planTypeMap: Record<MemberPlanType, string> = {
  month: '月费会员',
  year: '年费会员',
  lifetime: '永久会员',
};

const durationMap: Record<MemberPlanType, string> = {
  month: '30 天',
  year: '365 天',
  lifetime: '永久有效',
};

export default function MemberPriceConfigManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<MemberPriceConfig | null>(null);

  const columns: any[] = [
    { title: '套餐', dataIndex: 'planType', width: 130, render: (_: any, row: MemberPriceConfig) => <Tag color="blue">{planTypeMap[row.planType]}</Tag> },
    { title: '价格', dataIndex: 'cashPrice', width: 120, search: false, render: (_: any, row: MemberPriceConfig) => `${row.currency || 'CNY'} ${Number(row.cashPrice).toFixed(2)}` },
    { title: '有效期', dataIndex: 'durationDays', width: 110, search: false, render: (_: any, row: MemberPriceConfig) => durationMap[row.planType] },
    { title: '续费方式', width: 150, search: false, render: () => '一次性付款，不自动续费' },
    { title: '说明', dataIndex: 'description', ellipsis: true, search: false },
    { title: '状态', dataIndex: 'status', width: 90, valueType: 'select', valueEnum: { 0: { text: '停用', status: 'Error' }, 1: { text: '启用', status: 'Success' } } },
    { title: '更新时间', dataIndex: 'updateTime', width: 170, search: false, valueType: 'dateTime' },
    {
      title: '操作', valueType: 'option', width: 90,
      render: (_: any, row: MemberPriceConfig) => [
        <Button key="edit" type="link" onClick={() => { setEditing(row); form.setFieldsValue(row); setModalVisible(true); }}>编辑</Button>,
      ],
    },
  ];

  const handleSave = async (values: any) => {
    const payload = { ...values, memberLevel: 'member', currency: values.currency || 'CNY' };
    if (editing) {
      await updateMemberPriceConfig({ ...payload, id: editing.id });
      message.success('套餐配置已更新');
    } else {
      await addMemberPriceConfig(payload);
      message.success('套餐配置已新增');
    }
    setModalVisible(false);
    setEditing(null);
    form.resetFields();
    actionRef.current?.reload();
  };

  return (
    <PageContainer title="会员价格配置" subTitle="只保留月费、年费和永久会员，全部为一次性付款">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={false}
        cardBordered
        scroll={{ x: 1050 }}
        request={async () => {
          const res = await listMemberPriceConfigs();
          return { data: res.data, total: res.data.length, success: true };
        }}
        toolBarRender={() => [
          <Button key="add" icon={<PlusOutlined />} type="primary" onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ currency: 'CNY', status: 1 }); setModalVisible(true); }}>
            补充缺失套餐
          </Button>,
        ]}
      />
      <Modal title={editing ? '编辑会员套餐' : '新增会员套餐'} open={modalVisible} onCancel={() => { setModalVisible(false); setEditing(null); }} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="套餐" name="planType" rules={[{ required: true, message: '请选择套餐' }]}>
            <Select disabled={!!editing} options={Object.entries(planTypeMap).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item label="现金价格" name="cashPrice" rules={[{ required: true, message: '请输入价格' }]}>
            <InputNumber style={{ width: '100%' }} min={0.01} precision={2} addonAfter="元" />
          </Form.Item>
          <Form.Item label="币种" name="currency" rules={[{ required: true }]}>
            <Select options={[{ label: '人民币 CNY', value: 'CNY' }]} />
          </Form.Item>
          <Form.Item label="说明" name="description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="状态" name="status" rules={[{ required: true }]}>
            <Select options={[{ label: '启用', value: 1 }, { label: '停用', value: 0 }]} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
