import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, DatePicker, Row, Segmented, Space, Spin, Statistic, Table, Tabs, Tag, Typography } from 'antd';
import { BarChartOutlined, BookOutlined, EyeOutlined, FileTextOutlined, StarOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getSiteAnalyticsOverview,
  type SiteAnalyticsOverview,
  type TrafficDailyMetric,
  type TrafficDimensionMetric,
  type TutorialBookMetric,
  type TutorialPostMetric,
} from '../../api/siteAnalytics';

const { RangePicker } = DatePicker;

type RangePreset = 'today' | '7d' | '30d' | 'custom';

function presetRange(preset: RangePreset): [Dayjs, Dayjs] {
  const today = dayjs();
  if (preset === 'today') return [today, today];
  if (preset === '30d') return [today.subtract(29, 'day'), today];
  return [today.subtract(6, 'day'), today];
}

function changeLabel(value: number) {
  if (!value) return '较上一周期持平';
  return `较上一周期${value > 0 ? '增长' : '下降'} ${Math.abs(value).toFixed(1)}%`;
}

function metricCard(title: string, value: number, change: number, icon: React.ReactNode) {
  const color = change > 0 ? '#1677ff' : change < 0 ? '#cf1322' : '#8c8c8c';
  return (
    <Card>
      <Statistic title={title} value={value} prefix={icon} />
      <Typography.Text style={{ color, fontSize: 12 }}>{changeLabel(change)}</Typography.Text>
    </Card>
  );
}

const chartSeries = [
  { key: 'pv', name: 'PV', color: '#1677ff' },
  { key: 'uv', name: 'UV', color: '#52c41a' },
  { key: 'dau', name: 'DAU', color: '#fa8c16' },
] as const;

function TrafficTrendChart({ data }: { data: TrafficDailyMetric[] }) {
  const width = 900;
  const height = 270;
  const padding = { left: 48, right: 24, top: 24, bottom: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.pv, item.uv, item.dau]));
  const x = (index: number) => padding.left + (data.length <= 1 ? innerWidth / 2 : index * innerWidth / (data.length - 1));
  const y = (value: number) => padding.top + innerHeight - value * innerHeight / maxValue;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="PV、UV 与 DAU 趋势" style={{ minWidth: 720, width: '100%' }}>
        {ticks.map((tick) => {
          const tickY = padding.top + innerHeight - tick * innerHeight;
          return (
            <g key={tick}>
              <line x1={padding.left} x2={width - padding.right} y1={tickY} y2={tickY} stroke="#f0f0f0" />
              <text x={padding.left - 10} y={tickY + 4} textAnchor="end" fontSize="11" fill="#8c8c8c">
                {Math.round(maxValue * tick)}
              </text>
            </g>
          );
        })}
        {chartSeries.map((series) => {
          const points = data.map((item, index) => `${x(index)},${y(item[series.key])}`).join(' ');
          return <polyline key={series.key} points={points} fill="none" stroke={series.color} strokeWidth="2.5" />;
        })}
        {data.map((item, index) => {
          const show = data.length <= 10 || index === 0 || index === data.length - 1 || index % Math.ceil(data.length / 7) === 0;
          return show ? (
            <text key={item.date} x={x(index)} y={height - 15} textAnchor="middle" fontSize="11" fill="#8c8c8c">
              {dayjs(item.date).format('MM-DD')}
            </text>
          ) : null;
        })}
      </svg>
      <Space size={24} style={{ width: '100%', justifyContent: 'center' }}>
        {chartSeries.map((series) => (
          <Space key={series.key} size={6}>
            <span style={{ width: 18, height: 3, background: series.color, display: 'inline-block' }} />
            <Typography.Text type="secondary">{series.name}</Typography.Text>
          </Space>
        ))}
      </Space>
    </div>
  );
}

const dimensionColumns = [
  { title: '名称', dataIndex: 'name', ellipsis: true },
  { title: 'PV', dataIndex: 'pv', width: 90 },
  { title: 'UV', dataIndex: 'uv', width: 90 },
  { title: 'DAU', dataIndex: 'dau', width: 90 },
  {
    title: '占比', dataIndex: 'percentage', width: 100,
    render: (value: number) => <Tag>{Number(value || 0).toFixed(1)}%</Tag>,
  },
];

const bookColumns = [
  {
    title: '教程书',
    dataIndex: 'title',
    ellipsis: true,
    render: (value: string, record: TutorialBookMetric) => (
      <Space size={6} wrap>
        <Typography.Text strong>{value}</Typography.Text>
        <Tag color={record.memberOnly === 1 ? 'gold' : 'blue'}>
          {record.memberOnly === 1 ? '会员专享' : '免费教程'}
        </Tag>
      </Space>
    ),
  },
  { title: '章节', dataIndex: 'chapterCount', width: 80 },
  {
    title: '文章',
    dataIndex: 'postCount',
    width: 80,
  },
  { title: '有效阅读', dataIndex: 'effectiveReadCount', width: 100, sorter: (a: TutorialBookMetric, b: TutorialBookMetric) => a.effectiveReadCount - b.effectiveReadCount },
  { title: '独立读者', dataIndex: 'uniqueReaderCount', width: 100, sorter: (a: TutorialBookMetric, b: TutorialBookMetric) => a.uniqueReaderCount - b.uniqueReaderCount },
  { title: '书籍收藏', dataIndex: 'favoriteCount', width: 100, sorter: (a: TutorialBookMetric, b: TutorialBookMetric) => a.favoriteCount - b.favoriteCount },
];

const postColumns = [
  {
    title: '教程文章',
    dataIndex: 'title',
    ellipsis: true,
    render: (value: string, record: TutorialPostMetric) => (
      <Space size={6} wrap>
        <Typography.Text strong>{value}</Typography.Text>
        {record.memberOnly === 1 && <Tag color="gold">会员专享</Tag>}
      </Space>
    ),
  },
  {
    title: '所属教程书 / 章节',
    key: 'outline',
    ellipsis: true,
    render: (_: unknown, record: TutorialPostMetric) => (
      record.bookTitle
        ? `${record.bookTitle}${record.chapterTitle ? ` / ${record.chapterTitle}` : ''}`
        : <Typography.Text type="secondary">独立文章</Typography.Text>
    ),
  },
  { title: '有效阅读', dataIndex: 'effectiveReadCount', width: 100, sorter: (a: TutorialPostMetric, b: TutorialPostMetric) => a.effectiveReadCount - b.effectiveReadCount },
  { title: '独立读者', dataIndex: 'uniqueReaderCount', width: 100, sorter: (a: TutorialPostMetric, b: TutorialPostMetric) => a.uniqueReaderCount - b.uniqueReaderCount },
  { title: '收藏量', dataIndex: 'favoriteCount', width: 100, sorter: (a: TutorialPostMetric, b: TutorialPostMetric) => a.favoriteCount - b.favoriteCount },
];

export default function SiteAnalytics() {
  const [preset, setPreset] = useState<RangePreset>('7d');
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => presetRange('7d'));
  const [overview, setOverview] = useState<SiteAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const loadOverview = useCallback(async (nextRange: [Dayjs, Dayjs]) => {
    setLoading(true);
    try {
      const response = await getSiteAnalyticsOverview({
        startDate: nextRange[0].format('YYYY-MM-DD'),
        endDate: nextRange[1].format('YYYY-MM-DD'),
      });
      setOverview(response.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview(range);
  }, [loadOverview, range]);

  const handlePresetChange = (value: string | number) => {
    const nextPreset = value as RangePreset;
    setPreset(nextPreset);
    if (nextPreset !== 'custom') setRange(presetRange(nextPreset));
  };

  const today = overview?.today;
  const deviceData = useMemo(() => overview?.deviceDistribution || [], [overview]);
  const contentSummary = overview?.tutorialContentSummary;

  return (
    <PageContainer title="流量分析" content="统计前台页面访问、匿名访客与登录活跃用户，数据时区为 Asia/Shanghai。">
      <Space wrap style={{ marginBottom: 16 }}>
        <Segmented
          value={preset}
          options={[
            { label: '今日', value: 'today' },
            { label: '近 7 天', value: '7d' },
            { label: '近 30 天', value: '30d' },
            { label: '自定义', value: 'custom' },
          ]}
          onChange={handlePresetChange}
        />
        <RangePicker
          value={range}
          allowClear={false}
          disabledDate={(date) => date.isAfter(dayjs(), 'day')}
          onChange={(dates) => {
            if (dates?.[0] && dates[1]) {
              setPreset('custom');
              setRange([dates[0], dates[1]]);
            }
          }}
        />
      </Space>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>{metricCard('今日页面浏览量 PV', today?.pv || 0, today?.pvChangeRate || 0, <EyeOutlined />)}</Col>
          <Col xs={24} sm={12} xl={6}>{metricCard('今日独立访客 UV', today?.uv || 0, today?.uvChangeRate || 0, <TeamOutlined />)}</Col>
          <Col xs={24} sm={12} xl={6}>{metricCard('今日登录日活 DAU', today?.dau || 0, today?.dauChangeRate || 0, <UserOutlined />)}</Col>
          <Col xs={24} sm={12} xl={6}>{metricCard('今日登录设备访客', today?.loggedInVisitors || 0, today?.loggedInVisitorsChangeRate || 0, <BarChartOutlined />)}</Col>
        </Row>

        <Card title="访问趋势" style={{ marginTop: 16 }}>
          <TrafficTrendChart data={overview?.dailyTrend || []} />
        </Card>

        <Card
          title="教程内容表现"
          extra={<Typography.Text type="secondary">累计数据，不受上方日期范围影响</Typography.Text>}
          style={{ marginTop: 16 }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} xl={6}>
              <Statistic title="已启用教程书" value={contentSummary?.bookCount || 0} suffix="本" prefix={<BookOutlined />} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Statistic title="已发布教程文章" value={contentSummary?.postCount || 0} suffix="篇" prefix={<FileTextOutlined />} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Statistic title="有效阅读" value={contentSummary?.effectiveReadCount || 0} suffix={`独立读者 ${contentSummary?.uniqueReaderCount || 0}`} prefix={<EyeOutlined />} />
            </Col>
            <Col xs={24} sm={12} xl={6}>
              <Statistic
                title="累计收藏"
                value={contentSummary?.bookFavoriteCount || 0}
                suffix={`本教程书 · ${contentSummary?.postFavoriteCount || 0} 篇文章`}
                prefix={<StarOutlined />}
              />
            </Col>
          </Row>
          <Tabs
            style={{ marginTop: 16 }}
            items={[
              {
                key: 'books',
                label: `各教程书（${overview?.tutorialBooks?.length || 0}）`,
                children: (
                  <Table<TutorialBookMetric>
                    rowKey="id"
                    size="small"
                    columns={bookColumns}
                    dataSource={overview?.tutorialBooks || []}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 760 }}
                  />
                ),
              },
              {
                key: 'posts',
                label: `各教程文章（${overview?.tutorialPosts?.length || 0}）`,
                children: (
                  <Table<TutorialPostMetric>
                    rowKey="id"
                    size="small"
                    columns={postColumns}
                    dataSource={overview?.tutorialPosts || []}
                    pagination={{ pageSize: 10, showSizeChanger: true }}
                    scroll={{ x: 820 }}
                  />
                ),
              },
            ]}
          />
        </Card>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} xl={12}>
            <Card title="热门页面">
              <Table<TrafficDimensionMetric> rowKey="name" size="small" pagination={false} columns={dimensionColumns} dataSource={overview?.topPages || []} />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card title="来源渠道">
              <Table<TrafficDimensionMetric> rowKey="name" size="small" pagination={false} columns={dimensionColumns} dataSource={overview?.topSources || []} />
            </Card>
          </Col>
        </Row>

        <Card title="设备分布" style={{ marginTop: 16 }}>
          <Table<TrafficDimensionMetric> rowKey="name" size="small" pagination={false} columns={dimensionColumns} dataSource={deviceData} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
