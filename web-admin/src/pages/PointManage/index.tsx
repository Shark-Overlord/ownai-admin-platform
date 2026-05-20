import { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Button, message } from 'antd';
import { DollarOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getMyPointOverview, dailyCheckIn, listMyPointRecords, type PointOverviewVO, type PointRecord } from '../../api/point';
import dayjs from 'dayjs';

export default function PointManage() {
  const actionRef = useRef<any>(null);
  const [overview, setOverview] = useState<PointOverviewVO | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);

  useEffect(() => {
    getMyPointOverview().then((res) => {
      setOverview(res.data);
      const today = dayjs().format('YYYY-MM-DD');
      setCheckedIn(res.data.lastCheckInDate === today);
    });
  }, []);

  const handleCheckIn = async () => {
    try {
      const res = await dailyCheckIn();
      message.success(`签到成功 +${res.data.rewardPoints} 积分`);
      setCheckedIn(true);
      // 刷新概览和表格
      const ov = await getMyPointOverview();
      setOverview(ov.data);
      actionRef.current?.reload();
    } catch {
      // 错误已在拦截器提示
    }
  };

  const columns: any[] = [
    {
      title: '变动类型',
      dataIndex: 'changeType',
      search: false,
      valueEnum: {
        check_in_reward: { text: '每日签到奖励' },
        purchase_reward: { text: '购买返积分' },
        redeem_consume: { text: '积分兑换消费' },
      },
    },
    {
      title: '变动数量',
      dataIndex: 'changeAmount',
      search: false,
      render: (_: any, record: PointRecord) => (
        <span style={{ color: record.changeAmount >= 0 ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
          {record.changeAmount > 0 ? '+' : ''}
          {record.changeAmount}
        </span>
      ),
    },
    {
      title: '变动后余额',
      dataIndex: 'balanceAfter',
      search: false,
    },
    {
      title: '关联类型',
      dataIndex: 'relatedType',
      search: false,
    },
    {
      title: '描述',
      dataIndex: 'description',
      search: false,
      ellipsis: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      search: false,
      valueType: 'dateTime',
    },
  ];

  return (
    <PageContainer title="积分中心">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic title="当前积分" value={overview?.pointBalance || 0} prefix={<DollarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="会员等级" value={overview?.memberLevel?.toUpperCase() || '-'} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="会员到期时间"
              value={overview?.memberExpireTime ? dayjs(overview.memberExpireTime).format('YYYY-MM-DD') : '-'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Statistic title="签到状态" value={checkedIn ? '已签到' : '未签到'} />
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                disabled={checkedIn}
                onClick={handleCheckIn}
              >
                {checkedIn ? '今日已签到' : '每日签到'}
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
      <Card style={{ marginTop: 24 }} title="积分流水">
        <ProTable
          actionRef={actionRef}
          columns={columns}
          rowKey="id"
          search={false}
          cardBordered
          request={async (params) => {
            const res = await listMyPointRecords({
              current: params.current || 1,
              pageSize: params.pageSize || 10,
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
