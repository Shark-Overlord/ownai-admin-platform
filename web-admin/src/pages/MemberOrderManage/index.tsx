import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Tag, message } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import { adminCancelMemberOrder, adminGrantMember, listAllMemberOrders, type MemberOrderVO } from '../../api/member';

const planLabels: Record<string, string> = { month: '月费', year: '年费', lifetime: '永久', points: '积分充值' };
const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: 'orange' },
  completed: { text: '已完成', color: 'green' },
  cancelled: { text: '已取消', color: 'default' },
  expired: { text: '已过期', color: 'default' },
  failed: { text: '失败', color: 'red' },
};

export default function MemberOrderManage() {
  const actionRef = useRef<any>(null);
  const [grantVisible, setGrantVisible] = useState(false);
  const [grantForm] = Form.useForm();

  const columns: any[] = [
    { title: '订单号', dataIndex: 'orderNo', width: 220, copyable: true },
    {
      title: '用户', dataIndex: 'userId', width: 160,
      render: (_: any, row: MemberOrderVO) => <span>{row.userName || '-'}<br /><small>ID: {row.userId}</small></span>,
    },
    {
      title: '套餐', dataIndex: 'planType', width: 100, valueType: 'select',
      valueEnum: { month: { text: '月费' }, year: { text: '年费' }, lifetime: { text: '永久' }, points: { text: '积分充值' } },
      render: (_: any, row: MemberOrderVO) => <Tag color="blue">{planLabels[row.planType] || row.planType}</Tag>,
    },
    {
      title: '订单类型', dataIndex: 'orderType', width: 130, valueType: 'select',
      valueEnum: { cash: { text: '会员购买' }, admin_grant: { text: '管理员发放' }, point_recharge: { text: '积分充值' } },
      render: (_: any, row: MemberOrderVO) => row.orderType === 'point_recharge' ? '积分充值' : row.orderType === 'admin_grant' ? '管理员发放' : '会员购买',
    },
    { title: '充值份数', dataIndex: 'rechargeQuantity', width: 100, search: false },
    { title: '充值积分', dataIndex: 'pointsAmount', width: 110, search: false, render: (_: any, row: MemberOrderVO) => row.orderType === 'point_recharge' ? row.pointsAmount : '-' },
    {
      title: '金额', dataIndex: 'orderAmount', width: 120, search: false,
      render: (_: any, row: MemberOrderVO) => `${row.currency || 'CNY'} ${Number(row.orderAmount || 0).toFixed(2)}`,
    },
    {
      title: '订单状态', dataIndex: 'orderStatus', width: 110, valueType: 'select',
      valueEnum: Object.fromEntries(Object.entries(statusLabels).map(([key, value]) => [key, { text: value.text }])),
      render: (_: any, row: MemberOrderVO) => <Tag color={statusLabels[row.orderStatus]?.color}>{statusLabels[row.orderStatus]?.text || row.orderStatus}</Tag>,
    },
    {
      title: '支付渠道', dataIndex: 'paymentChannel', width: 120, search: false, ellipsis: true,
      render: (_: any, row: MemberOrderVO) => row.paymentChannel?.toLowerCase() === 'stripe'
        ? '历史支付' : (row.paymentChannel || '-'),
    },
    { title: '支付时间', dataIndex: 'payTime', width: 180, search: false, valueType: 'dateTime' },
    { title: '创建时间', dataIndex: 'createTime', width: 180, search: false, valueType: 'dateTime' },
    { title: '失败原因', dataIndex: 'failureReason', width: 200, ellipsis: true, search: false },
    {
      title: '操作', valueType: 'option', fixed: 'right', width: 100,
      render: (_: any, row: MemberOrderVO) => row.orderStatus === 'pending' ? [
        <Popconfirm
          key="cancel"
          title="确认取消这笔待支付订单？"
          onConfirm={async () => {
            await adminCancelMemberOrder({ orderNo: row.orderNo });
            message.success('订单已取消');
            actionRef.current?.reload();
          }}
        >
          <Button type="link" danger>取消</Button>
        </Popconfirm>,
      ] : [],
    },
  ];

  const handleGrant = async (values: any) => {
    await adminGrantMember(values);
    message.success('会员已发放');
    setGrantVisible(false);
    grantForm.resetFields();
    actionRef.current?.reload();
  };

  return (
    <PageContainer title="交易订单" subTitle="会员购买、积分充值与管理员人工发放记录">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        scroll={{ x: 1500 }}
        request={async (params) => {
          const res = await listAllMemberOrders({ current: params.current || 1, pageSize: params.pageSize || 10, ...params });
          return { data: res.data.records, total: res.data.total, success: true };
        }}
        toolBarRender={() => [
          <Button key="grant" icon={<CrownOutlined />} type="primary" onClick={() => { grantForm.resetFields(); setGrantVisible(true); }}>
            人工发放会员
          </Button>,
        ]}
      />
      <Modal title="人工发放会员" open={grantVisible} onCancel={() => setGrantVisible(false)} onOk={() => grantForm.submit()} destroyOnClose>
        <Form form={grantForm} layout="vertical" onFinish={handleGrant}>
          <Form.Item label="用户 ID" name="userId" rules={[{ required: true, message: '请输入用户 ID' }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item label="套餐" name="planType" rules={[{ required: true, message: '请选择套餐' }]}>
            <Select options={[
              { label: '月费会员（30 天）', value: 'month' },
              { label: '年费会员（365 天）', value: 'year' },
              { label: '永久会员', value: 'lifetime' },
            ]} />
          </Form.Item>
          <Form.Item label="备注" name="description"><Input.TextArea rows={3} placeholder="填写发放原因" /></Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
