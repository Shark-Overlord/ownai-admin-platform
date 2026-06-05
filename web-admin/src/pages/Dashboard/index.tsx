import { useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Alert, Card, Col, List, Progress, Row, Spin, Statistic, Tag, Typography } from 'antd';
import {
  ClockCircleOutlined,
  CrownOutlined,
  DatabaseOutlined,
  DollarOutlined,
  FireOutlined,
  PictureOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { DashboardOverview } from '../../api/dashboard';
import { getDashboardOverview } from '../../api/dashboard';

const zeroOverview: DashboardOverview = {
  user: { total: 0, todayNew: 0, plus: 0, pro: 0 },
  content: {
    artworkTotal: 0,
    promptAssetTotal: 0,
    promptAssetPublished: 0,
    promptAssetUnpublished: 0,
    promptFavoriteTotal: 0,
  },
  commerce: { todayArtworkOrders: 0, todayMemberOrders: 0, todayOrderAmount: 0, pendingOrders: 0 },
  point: { todayGranted: 0, todayDeducted: 0, totalBalance: 0 },
  imageGeneration: {
    todayTasks: 0,
    pendingTasks: 0,
    runningTasks: 0,
    successTasks: 0,
    failedTasks: 0,
    timeoutPendingTasks: 0,
    todayPointCost: 0,
    todayApiCostCny: 0,
    todayManualCostCny: 0,
  },
};

function money(value?: number) {
  return `¥${Number(value || 0).toFixed(2)}`;
}

function ratio(value: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.min(100, Math.round((value / total) * 100));
}

export default function Dashboard() {
  const [overview, setOverview] = useState<DashboardOverview>(zeroOverview);
  const [loading, setLoading] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await getDashboardOverview();
      setOverview(res.data || zeroOverview);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const generationTotal = useMemo(() => {
    const item = overview.imageGeneration;
    return item.pendingTasks + item.runningTasks + item.successTasks + item.failedTasks;
  }, [overview.imageGeneration]);

  const attentionItems = useMemo(() => {
    const items = [];
    const image = overview.imageGeneration;
    if (image.timeoutPendingTasks > 0) {
      items.push({ label: '超时等待任务', value: image.timeoutPendingTasks, color: 'red' });
    }
    if (image.failedTasks > 0) {
      items.push({ label: '失败生图任务', value: image.failedTasks, color: 'volcano' });
    }
    if (overview.content.promptAssetUnpublished > 0) {
      items.push({ label: '未发布 Prompt', value: overview.content.promptAssetUnpublished, color: 'orange' });
    }
    const importErrorCount = overview.latestImportBatch?.errorCount || 0;
    if (importErrorCount > 0) {
      items.push({ label: '最近导入错误', value: importErrorCount, color: 'magenta' });
    }
    if (items.length === 0) {
      items.push({ label: '暂无需要立即处理的事项', value: 0, color: 'green' });
    }
    return items;
  }, [overview]);

  return (
    <PageContainer
      title="概况"
      content="站点运营总览，统计口径为今天 00:00 至当前时间；待处理和任务状态为当前全量状态。"
      extra={[
        <Typography.Text key="refresh" type="secondary" onClick={loadOverview} style={{ cursor: 'pointer' }}>
          刷新
        </Typography.Text>,
      ]}
    >
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="用户总数" value={overview.user.total} prefix={<UserOutlined />} />
              <Typography.Text type="secondary">今日新增 {overview.user.todayNew}</Typography.Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="Prompt 资产" value={overview.content.promptAssetTotal} prefix={<DatabaseOutlined />} />
              <Typography.Text type="secondary">
                已发布 {overview.content.promptAssetPublished} / 收藏 {overview.content.promptFavoriteTotal}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic title="今日生图" value={overview.imageGeneration.todayTasks} prefix={<PictureOutlined />} />
              <Typography.Text type="secondary">
                待处理 {overview.imageGeneration.pendingTasks + overview.imageGeneration.runningTasks}
              </Typography.Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="今日成本"
                value={money(overview.imageGeneration.todayApiCostCny + overview.imageGeneration.todayManualCostCny)}
                prefix={<DollarOutlined />}
              />
              <Typography.Text type="secondary">消耗积分 {overview.imageGeneration.todayPointCost}</Typography.Text>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={12}>
            <Card title="图片生成状态">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic title="等待中" value={overview.imageGeneration.pendingTasks} prefix={<ClockCircleOutlined />} />
                  <Progress percent={ratio(overview.imageGeneration.pendingTasks, generationTotal)} showInfo={false} />
                </Col>
                <Col span={12}>
                  <Statistic title="运行中" value={overview.imageGeneration.runningTasks} prefix={<FireOutlined />} />
                  <Progress percent={ratio(overview.imageGeneration.runningTasks, generationTotal)} showInfo={false} />
                </Col>
                <Col span={12}>
                  <Statistic title="成功" value={overview.imageGeneration.successTasks} />
                  <Progress
                    percent={ratio(overview.imageGeneration.successTasks, generationTotal)}
                    status="success"
                    showInfo={false}
                  />
                </Col>
                <Col span={12}>
                  <Statistic title="失败" value={overview.imageGeneration.failedTasks} />
                  <Progress
                    percent={ratio(overview.imageGeneration.failedTasks, generationTotal)}
                    status="exception"
                    showInfo={false}
                  />
                </Col>
              </Row>
            </Card>
          </Col>

          <Col xs={24} xl={12}>
            <Card title="今日交易与积分">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="作品订单"
                    value={overview.commerce.todayArtworkOrders}
                    prefix={<ShoppingCartOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <Statistic title="会员订单" value={overview.commerce.todayMemberOrders} prefix={<CrownOutlined />} />
                </Col>
                <Col span={12}>
                  <Statistic title="今日订单金额" value={money(overview.commerce.todayOrderAmount)} />
                </Col>
                <Col span={12}>
                  <Statistic title="待支付订单" value={overview.commerce.pendingOrders} />
                </Col>
                <Col span={12}>
                  <Statistic title="今日发放积分" value={overview.point.todayGranted} />
                </Col>
                <Col span={12}>
                  <Statistic title="今日扣除积分" value={overview.point.todayDeducted} />
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={12}>
            <Card title="待关注事项">
              <List
                dataSource={attentionItems}
                renderItem={(item) => (
                  <List.Item>
                    <Typography.Text>{item.label}</Typography.Text>
                    {item.value > 0 ? <Tag color={item.color}>{item.value}</Tag> : <Tag color={item.color}>正常</Tag>}
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="最近导入批次">
              {overview.latestImportBatch ? (
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Statistic title="状态" value={overview.latestImportBatch.status || '-'} />
                  </Col>
                  <Col span={12}>
                    <Statistic title="总数" value={overview.latestImportBatch.totalCount || 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="新增" value={overview.latestImportBatch.insertCount || 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="更新" value={overview.latestImportBatch.updateCount || 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic title="错误" value={overview.latestImportBatch.errorCount || 0} />
                  </Col>
                </Row>
              ) : (
                <Alert type="info" message="暂无 Prompt 导入批次" showIcon />
              )}
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
