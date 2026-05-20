import { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import { adminCancelOrder, listAllOrders, type OrderVO } from '../../api/order';

const orderStatusMap: Record<string, { text: string; color: string }> = {
  pending: { text: '待支付', color: 'orange' },
  completed: { text: '已完成', color: 'green' },
  cancelled: { text: '已取消', color: 'default' },
};



export default function OrderManage() {
  const actionRef = useRef<any>(null);

  const columns: any[] = [
    {
      title: '订单号',
      dataIndex: 'orderNo',
      copyable: true,
    },
    {
      title: '作品标题',
      dataIndex: 'artworkTitle',
      search: false,
    },
    {
      title: '订单类型',
      dataIndex: 'orderType',
      valueType: 'select',
      valueEnum: {
        cash: { text: '现金购买' },
        points: { text: '积分兑换' },
      },
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
      render: (_: any, record: OrderVO) => {
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
      title: '支付渠道',
      dataIndex: 'paymentChannel',
      search: false,
    },
    {
      title: '支付时间',
      dataIndex: 'payTime',
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
      render: (_: any, record: OrderVO) =>
        record.orderStatus === 'pending'
          ? [
              <Popconfirm
                key="cancel"
                title="确认取消该订单？"
                onConfirm={async () => {
                  await adminCancelOrder({ orderNo: record.orderNo });
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

  return (
    <PageContainer title="作品订单">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        request={async (params) => {
          const res = await listAllOrders({
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
      />
    </PageContainer>
  );
}
