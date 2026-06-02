import { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Alert, Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Space, Statistic, Tag, message } from 'antd';
import { DollarOutlined, MinusCircleOutlined, PlusCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { listUserByPage, type UserVO } from '../../api/user';
import { adminAdjustPoints, listAdminPointRecords, type PointRecord } from '../../api/point';

const changeTypeText: Record<string, string> = {
  check_in_reward: '每日签到奖励',
  purchase_reward: '购买返积分',
  redeem_consume: '积分兑换消费',
  image_generate_freeze: '图片生成冻结',
  image_generate_refund: '图片生成退款',
  manual_adjust: '后台调整',
};

export default function PointManage() {
  const actionRef = useRef<any>(null);
  const [adjustForm] = Form.useForm();
  const [users, setUsers] = useState<UserVO[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserVO | null>(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [adjusting, setAdjusting] = useState(false);

  const loadUsers = async (keyword?: string) => {
    setLoadingUsers(true);
    try {
      const requestParams: any = {
        current: 1,
        pageSize: 20,
      };
      const safeKeyword = keyword?.trim();
      if (safeKeyword) {
        if (/^\d+$/.test(safeKeyword)) {
          requestParams.id = safeKeyword;
        } else {
          requestParams.userAccount = safeKeyword;
        }
      }
      const res = await listUserByPage(requestParams);
      setUsers(res.data.records || []);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedUserId = selectedUser?.id;

  const reloadRecords = () => {
    actionRef.current?.reload();
  };

  const handleAdjust = async (values: any) => {
    if (!selectedUser) {
      message.warning('请先选择用户');
      return;
    }
    const operation = values.operation;
    const amount = Number(values.amount);
    const run = async () => {
      setAdjusting(true);
      try {
        const res = await adminAdjustPoints({
          userId: selectedUser.id,
          operation,
          amount,
          description: values.description,
        });
        setSelectedUser({
          ...selectedUser,
          pointBalance: res.data,
        });
        setUsers((list) => list.map((user) => (user.id === selectedUser.id ? { ...user, pointBalance: res.data } : user)));
        adjustForm.resetFields(['amount', 'description']);
        adjustForm.setFieldValue('operation', operation);
        message.success(operation === 'grant' ? `已赠送 ${amount} 积分` : `已扣减 ${amount} 积分`);
        reloadRecords();
      } finally {
        setAdjusting(false);
      }
    };
    if (operation === 'deduct') {
      Modal.confirm({
        title: '确认扣减积分',
        content: `将从用户 ${selectedUser.userAccount} 扣减 ${amount} 积分，请确认原因填写无误。`,
        okText: '确认扣减',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: run,
      });
      return;
    }
    await run();
  };

  const columns: any[] = [
    {
      title: '用户',
      dataIndex: 'userAccount',
      search: false,
      width: 190,
      render: (_: any, record: PointRecord) => (
        <Space direction="vertical" size={0}>
          <span>{record.userAccount || '-'}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>
            ID: {record.userId || '-'} {record.userName ? ` / ${record.userName}` : ''}
          </span>
        </Space>
      ),
    },
    {
      title: '变动类型',
      dataIndex: 'changeType',
      valueType: 'select',
      width: 150,
      valueEnum: {
        check_in_reward: { text: '每日签到奖励' },
        purchase_reward: { text: '购买返积分' },
        redeem_consume: { text: '积分兑换消费' },
        image_generate_freeze: { text: '图片生成冻结' },
        image_generate_refund: { text: '图片生成退款' },
        manual_adjust: { text: '后台调整' },
      },
      render: (_: any, record: PointRecord) => changeTypeText[record.changeType] || record.changeType || '-',
    },
    {
      title: '变动数量',
      dataIndex: 'changeAmount',
      search: false,
      width: 120,
      render: (_: any, record: PointRecord) => (
        <Tag color={record.changeAmount >= 0 ? 'green' : 'red'}>
          {record.changeAmount > 0 ? '+' : ''}
          {record.changeAmount}
        </Tag>
      ),
    },
    {
      title: '变动后余额',
      dataIndex: 'balanceAfter',
      search: false,
      width: 120,
    },
    {
      title: '原因',
      dataIndex: 'description',
      search: false,
      ellipsis: true,
    },
    {
      title: '关联类型',
      dataIndex: 'relatedType',
      search: false,
      width: 160,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTimeRange',
      width: 190,
      search: {
        transform: (value: string[]) => ({
          startTime: value?.[0],
          endTime: value?.[1],
        }),
      },
      render: (_: any, record: PointRecord) =>
        record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
  ];

  return (
    <PageContainer title="积分管理">
      <Alert
        style={{ marginBottom: 16 }}
        type="info"
        showIcon
        message="日常发放或扣减积分请使用本页操作；用户管理里的积分余额是设置最终余额，适合修正历史数据。"
      />
      <Card title="用户积分调整">
        <Row gutter={16}>
          <Col xs={24} lg={8}>
            <Select
              showSearch
              allowClear
              value={selectedUserId}
              loading={loadingUsers}
              placeholder="搜索用户账号或 ID"
              filterOption={false}
              style={{ width: '100%' }}
              onSearch={loadUsers}
              onClear={() => {
                setSelectedUser(null);
                setTimeout(reloadRecords, 0);
              }}
              onChange={(value) => {
                const nextUser = users.find((user) => user.id === value) || null;
                setSelectedUser(nextUser);
                setTimeout(reloadRecords, 0);
              }}
              options={users.map((user) => ({
                value: user.id,
                label: `${user.userAccount}${user.userName ? ` / ${user.userName}` : ''}（${user.pointBalance || 0} 分）`,
              }))}
            />
          </Col>
          <Col xs={24} lg={5}>
            <Statistic title="当前积分" value={selectedUser?.pointBalance || 0} prefix={<DollarOutlined />} />
          </Col>
          <Col xs={24} lg={11}>
            <Form
              form={adjustForm}
              layout="inline"
              initialValues={{ operation: 'grant' }}
              onFinish={handleAdjust}
              style={{ rowGap: 12 }}
            >
              <Form.Item name="operation" rules={[{ required: true }]}>
                <Select
                  style={{ width: 120 }}
                  options={[
                    { label: '赠送积分', value: 'grant' },
                    { label: '扣减积分', value: 'deduct' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="amount" rules={[{ required: true, message: '请输入积分数量' }]}>
                <InputNumber min={1} precision={0} placeholder="数量" />
              </Form.Item>
              <Form.Item name="description" rules={[{ required: true, message: '请填写调整原因' }]}>
                <Input maxLength={200} placeholder="调整原因" style={{ width: 220 }} />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={adjusting}
                  disabled={!selectedUser}
                  icon={adjustForm.getFieldValue('operation') === 'deduct' ? <MinusCircleOutlined /> : <PlusCircleOutlined />}
                >
                  提交
                </Button>
              </Form.Item>
            </Form>
          </Col>
        </Row>
      </Card>
      <Card
        style={{ marginTop: 16 }}
        title={selectedUser ? `积分流水：${selectedUser.userAccount}` : '全站积分流水'}
        extra={
          <Button icon={<ReloadOutlined />} onClick={reloadRecords}>
            刷新
          </Button>
        }
      >
        <ProTable
          actionRef={actionRef}
          columns={columns}
          rowKey="id"
          cardBordered
          search={{ labelWidth: 'auto' }}
          request={async (params) => {
            const res = await listAdminPointRecords({
              current: params.current || 1,
              pageSize: params.pageSize || 10,
              userId: selectedUserId,
              changeType: params.changeType,
              startTime: params.startTime,
              endTime: params.endTime,
            });
            return {
              data: res.data.records,
              total: res.data.total,
              success: true,
            };
          }}
        />
      </Card>
    </PageContainer>
  );
}
