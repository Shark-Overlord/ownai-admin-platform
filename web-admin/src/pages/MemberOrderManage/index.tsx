import { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, InputNumber, Select, message, Popconfirm, Tag } from 'antd';
import { CrownOutlined } from '@ant-design/icons';
import {
  adminCancelMemberOrder,
  listAllMemberOrders,
  adminGrantMember,
  type MemberOrderVO,
} from '../../api/member';
import {
  listMemberPriceConfigs,
  type MemberPriceConfig,
} from '../../api/memberPriceConfig';

const orderStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: 'orange' },
  completed: { text: '已完成', color: 'green' },
  cancelled: { text: '已取消', color: 'default' },
};

const orderTypeMap: Record<string, { text: string }> = {
  cash: { text: '现金购买' },
  points: { text: '积分兑换' },
  admin_grant: { text: '管理员发放' },
};

export default function MemberOrderManage() {
  const actionRef = useRef<any>(null);
  const [grantModalVisible, setGrantModalVisible] = useState(false);
  const [grantForm] = Form.useForm();
  const [priceConfigs, setPriceConfigs] = useState<MemberPriceConfig[]>([]);

  useEffect(() => {
    listMemberPriceConfigs().then((res) => setPriceConfigs(res.data));
  }, []);

  const columns: any[] = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      copyable: true,
    },
    {
      title: '会员等级',
      dataIndex: 'memberLevel',
      valueType: 'select',
      valueEnum: {
        plus: { text: 'Plus' },
        pro: { text: 'Pro' },
      },
      render: (_: any, record: MemberOrderVO) => (
        <Tag color={record.memberLevel === 'pro' ? 'purple' : 'blue'}>
          {record.memberLevel?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '套餐类型',
      dataIndex: 'planType',
      search: false,
      valueEnum: {
        month: { text: '月费', status: 'Processing' },
        year: { text: '年费', status: 'Success' },
      },
    },
    {
      title: '开通时长(天)',
      dataIndex: 'durationDays',
      search: false,
    },
    {
      title: '订单类型',
      dataIndex: 'orderType',
      valueType: 'select',
      valueEnum: {
        cash: { text: '现金购买' },
        points: { text: '积分兑换' },
        admin_grant: { text: '管理员发放' },
      },
      render: (_: any, record: MemberOrderVO) => orderTypeMap[record.orderType]?.text || record.orderType,
    },
    {
      title: '订单状态',
      dataIndex: 'orderStatus',
      valueType: 'select',
      valueEnum: {
        pending: { text: '待支付' },
        completed: { text: '已完成' },
        cancelled: { text: '已取消' },
      },
      render: (_: any, record: MemberOrderVO) => {
        const cfg = orderStatusMap[record.orderStatus];
        return <Tag color={cfg?.color}>{cfg?.text}</Tag>;
      },
    },
    {
      title: '订单金额',
      dataIndex: 'orderAmount',
      search: false,
      valueType: 'money',
    },
    {
      title: '积分数量',
      dataIndex: 'pointsAmount',
      search: false,
    },
    {
      title: '支付时间',
      dataIndex: 'payTime',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '完成时间',
      dataIndex: 'finishTime',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_: any, record: MemberOrderVO) =>
        record.orderStatus === 'pending'
          ? [
              <Popconfirm
                key="cancel"
                title="确认取消该订单？"
                onConfirm={async () => {
                  await adminCancelMemberOrder({ orderNo: record.orderNo });
                  message.success('取消成功');
                  actionRef.current?.reload();
                }}
              >
                <Button type="link" danger>
                  取消订单
                </Button>
              </Popconfirm>,
            ]
          : [],
    },
  ];

  const handleGrant = async (values: any) => {
    await adminGrantMember(values);
    message.success('授予会员成功');
    setGrantModalVisible(false);
    grantForm.resetFields();
    actionRef.current?.reload();
  };

  const watchMemberLevel = Form.useWatch('memberLevel', grantForm);
  const watchPlanType = Form.useWatch('planType', grantForm);

  useEffect(() => {
    if (watchMemberLevel && watchPlanType) {
      const config = priceConfigs.find(
        (c) => c.memberLevel === watchMemberLevel && c.planType === watchPlanType
      );
      if (config) {
        grantForm.setFieldsValue({ durationDays: config.durationDays });
      }
    }
  }, [watchMemberLevel, watchPlanType, priceConfigs, grantForm]);

  return (
    <PageContainer title="会员订单">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        request={async (params) => {
          const res = await listAllMemberOrders({
            current: params.current || 1,
            pageSize: params.pageSize || 10,
            ...params,
          });
          return {
            data: res.data.records,
            total: res.data.total,
            success: true,
          };
        }}
        toolBarRender={() => [
          <Button
            key="grant"
            icon={<CrownOutlined />}
            type="primary"
            onClick={() => {
              grantForm.resetFields();
              setGrantModalVisible(true);
            }}
          >
            授予会员
          </Button>,
        ]}
      />
      <Modal
        title="授予会员"
        open={grantModalVisible}
        onCancel={() => setGrantModalVisible(false)}
        onOk={() => grantForm.submit()}
        destroyOnClose
      >
        <Form form={grantForm} layout="vertical" onFinish={handleGrant}>
          <Form.Item label="用户ID" name="userId" rules={[{ required: true, message: '请输入用户ID' }]}>
            <InputNumber style={{ width: '100%' }} min={1} />
          </Form.Item>
          <Form.Item label="会员等级" name="memberLevel" rules={[{ required: true }]}>
            <Select
              options={[
                { label: 'Plus', value: 'plus' },
                { label: 'Pro', value: 'pro' },
              ]}
              placeholder="请选择会员等级"
            />
          </Form.Item>
          <Form.Item label="套餐类型" name="planType" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '月费', value: 'month' },
                { label: '年费', value: 'year' },
              ]}
              placeholder="请选择套餐类型"
            />
          </Form.Item>
          <Form.Item label="开通时长(天)" name="durationDays" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={1} readOnly />
          </Form.Item>
          <Form.Item label="备注" name="description">
            <Input.TextArea rows={2} placeholder="manual grant" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
