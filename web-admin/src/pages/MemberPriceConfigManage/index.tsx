import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, InputNumber, Select, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  listMemberPriceConfigs,
  updateMemberPriceConfig,
  addMemberPriceConfig,
  type MemberPriceConfig,
} from '../../api/memberPriceConfig';

const planTypeMap: Record<string, string> = {
  month: '月费',
  year: '年费',
};

export default function MemberPriceConfigManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<MemberPriceConfig | null>(null);

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
      width: 60,
    },
    {
      title: '会员等级',
      dataIndex: 'memberLevel',
      render: (_: any, record: MemberPriceConfig) => (
        <Tag color={record.memberLevel === 'pro' ? 'purple' : 'blue'}>
          {record.memberLevel?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '套餐类型',
      dataIndex: 'planType',
      render: (_: any, record: MemberPriceConfig) => (
        <Tag color={record.planType === 'year' ? 'gold' : 'cyan'}>
          {planTypeMap[record.planType] || record.planType}
        </Tag>
      ),
    },
    {
      title: '套餐现金价(元)',
      dataIndex: 'cashPrice',
      search: false,
      valueType: 'money',
    },
    {
      title: '套餐积分价',
      dataIndex: 'pointsPrice',
      search: false,
    },
    {
      title: '包含天数',
      dataIndex: 'durationDays',
      search: false,
    },
    {
      title: '描述',
      dataIndex: 'description',
      search: false,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: '禁用', status: 'Error' },
        1: { text: '启用', status: 'Success' },
      },
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_: any, record: MemberPriceConfig) => [
        <Button
          key="edit"
          type="link"
          onClick={() => {
            setEditing(record);
            form.setFieldsValue({
              ...record,
            });
            setModalVisible(true);
          }}
        >
          编辑
        </Button>,
      ],
    },
  ];

  const handleSave = async (values: any) => {
    if (editing) {
      await updateMemberPriceConfig({ ...values, id: editing.id });
      message.success('更新成功');
    } else {
      await addMemberPriceConfig(values);
      message.success('添加成功');
    }
    setModalVisible(false);
    setEditing(null);
    form.resetFields();
    actionRef.current?.reload();
  };

  return (
    <PageContainer title="会员价格配置">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={false}
        cardBordered
        request={async () => {
          const res = await listMemberPriceConfigs();
          return {
            data: res.data,
            total: res.data.length,
            success: true,
          };
        }}
        toolBarRender={() => [
          <Button
            key="add"
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新增配置
          </Button>,
        ]}
      />
      <Modal
        title={editing ? '编辑会员价格配置' : '新增会员价格配置'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="会员等级"
            name="memberLevel"
            rules={[{ required: true, message: '请选择会员等级' }]}
          >
            <Select
              options={[
                { label: 'Plus', value: 'plus' },
                { label: 'Pro', value: 'pro' },
              ]}
              placeholder="请选择会员等级"
              disabled={!!editing}
            />
          </Form.Item>
          <Form.Item
            label="套餐类型"
            name="planType"
            rules={[{ required: true, message: '请选择套餐类型' }]}
          >
            <Select
              options={[
                { label: '月费', value: 'month' },
                { label: '年费', value: 'year' },
              ]}
              placeholder="请选择套餐类型"
              disabled={!!editing}
            />
          </Form.Item>
          <Form.Item
            label="套餐现金价(元)"
            name="cashPrice"
            rules={[{ required: true, message: '请输入套餐现金价' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} precision={2} placeholder="例如: 15.00" />
          </Form.Item>
          <Form.Item
            label="套餐积分价"
            name="pointsPrice"
            rules={[{ required: true, message: '请输入套餐积分价' }]}
          >
            <InputNumber style={{ width: '100%' }} min={0} precision={0} placeholder="例如: 180" />
          </Form.Item>
          <Form.Item
            label="包含天数"
            name="durationDays"
            rules={[{ required: true, message: '请输入包含天数' }]}
          >
            <InputNumber style={{ width: '100%' }} min={1} precision={0} placeholder="例如: 30" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} placeholder="可选填" />
          </Form.Item>
          <Form.Item
            label="状态"
            name="status"
            rules={[{ required: true }]}
            initialValue={1}
          >
            <Select
              options={[
                { label: '禁用', value: 0 },
                { label: '启用', value: 1 },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
