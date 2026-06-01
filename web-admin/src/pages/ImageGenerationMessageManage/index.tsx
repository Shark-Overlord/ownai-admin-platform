import { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Drawer,
  Empty,
  Image,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import {
  getImageGenerationConversation,
  getImageGenerationMessage,
  getImageGenerationMonitorOverview,
  listImageGenerationConversations,
  listImageGenerationMessages,
  type ImageGenerationConversationDetail,
  type ImageGenerationConversationSummary,
  type ImageGenerationDailyTrend,
  type ImageGenerationMessageItem,
  type ImageGenerationMonitorOverview,
} from '../../api/imageGeneration';

const { Paragraph, Text } = Typography;

const roleColorMap: Record<string, string> = {
  user: 'blue',
  assistant: 'purple',
  system: 'default',
};

const statusColorMap: Record<string, string> = {
  pending: 'gold',
  running: 'processing',
  success: 'success',
  failed: 'error',
};

const pointStatusColorMap: Record<string, string> = {
  none: 'default',
  frozen: 'gold',
  consumed: 'success',
  refunded: 'blue',
};

const defaultOverview: ImageGenerationMonitorOverview = {
  totalTasks: 0,
  successTasks: 0,
  failedTasks: 0,
  pendingTasks: 0,
  runningTasks: 0,
  totalImages: 0,
  totalPointCost: 0,
  totalApiCostCny: 0,
  successRate: 0,
  avgDurationSeconds: 0,
  statusDistribution: {},
  dailyTrend: [],
};

function formatJsonText(value?: string) {
  if (!value) {
    return '-';
  }
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function parseJsonObject(value?: string) {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, any> : null;
  } catch {
    return null;
  }
}

function getOriginalPrompt(message?: ImageGenerationMessageItem | null) {
  if (!message) {
    return undefined;
  }
  const payload = parseJsonObject(message.requestPayload);
  const payloadPrompt = payload?.prompt || payload?.requestBody?.prompt;
  if (typeof payloadPrompt === 'string' && payloadPrompt.trim()) {
    return payloadPrompt;
  }
  if (message.role !== 'assistant' && message.prompt) {
    return message.prompt;
  }
  return undefined;
}

function isEnhancedModelPrompt(value?: string) {
  const text = value?.trim();
  if (!text) {
    return false;
  }
  return /^Use case:/i.test(text) || text.includes('\nAsset type:') || text.includes('\nPrimary request:');
}

function renderModelPromptDebug(value?: string) {
  if (!value || !isEnhancedModelPrompt(value)) {
    return null;
  }
  return (
    <Collapse
      ghost
      size="small"
      items={[
        {
          key: 'model-prompt',
          label: '模型 Prompt（调试）',
          children: renderLongText(value),
        },
      ]}
    />
  );
}

function renderLongText(value?: string) {
  if (!value) {
    return <Text type="secondary">-</Text>;
  }
  return (
    <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }} copyable>
      {value}
    </Paragraph>
  );
}

function renderConversationMessageText(message: ImageGenerationMessageItem) {
  const originalPrompt = getOriginalPrompt(message);
  const enhancedPrompt = isEnhancedModelPrompt(message.prompt) ? message.prompt : undefined;
  const fallbackPrompt = enhancedPrompt ? undefined : message.prompt;

  if (message.role === 'user') {
    return renderLongText(originalPrompt || fallbackPrompt || message.errorMessage || message.requestPayload);
  }

  return (
    <Space direction="vertical" size={6} style={{ width: '100%' }}>
      {originalPrompt ? (
        <div>
          <Text type="secondary">用户原始输入</Text>
          {renderLongText(originalPrompt)}
        </div>
      ) : fallbackPrompt || message.errorMessage ? (
        renderLongText(fallbackPrompt || message.errorMessage)
      ) : null}
      {message.role === 'assistant' ? (
        <Text type="secondary">
          生成任务：{message.status || '-'}
          {message.taskId ? ` / ${message.taskId}` : ''}
        </Text>
      ) : null}
      {renderModelPromptDebug(enhancedPrompt)}
    </Space>
  );
}

function parseImageUrls(value?: string) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(Boolean).map(String);
    }
    if (typeof parsed === 'string') {
      return [parsed];
    }
  } catch {
    // fall through
  }
  return value.includes(',') ? value.split(',').map((item) => item.trim()).filter(Boolean) : [value];
}

function getMessageImages(message: ImageGenerationMessageItem) {
  const urls = [
    ...(message.referenceImageUrl ? [message.referenceImageUrl] : []),
    ...(message.resultImageUrlList || parseImageUrls(message.resultImageUrls)),
  ];
  return Array.from(new Set(urls.filter(Boolean)));
}

function renderThumbnails(urls?: string[], size = 58) {
  const safeUrls = (urls || []).filter(Boolean);
  if (!safeUrls.length) {
    return <Text type="secondary">-</Text>;
  }
  return (
    <Image.PreviewGroup>
      <Space size={6} wrap>
        {safeUrls.map((url) => (
          <Image
            key={url}
            src={url}
            width={size}
            height={size}
            style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }}
          />
        ))}
      </Space>
    </Image.PreviewGroup>
  );
}

function buildTimeQuery(params: any) {
  const { timeRange, current, pageSize, ...rest } = params;
  return {
    ...rest,
    current: current || 1,
    pageSize: pageSize || 10,
    startTime: timeRange?.[0],
    endTime: timeRange?.[1],
  };
}

function MonitorCards({ overview }: { overview: ImageGenerationMonitorOverview }) {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="总任务数" value={overview.totalTasks || 0} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="成功任务" value={overview.successTasks || 0} valueStyle={{ color: '#3f8600' }} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="待处理 / 运行中" value={`${overview.pendingTasks || 0} / ${overview.runningTasks || 0}`} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="失败任务" value={overview.failedTasks || 0} valueStyle={{ color: '#cf1322' }} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="生成图片数" value={overview.totalImages || 0} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="积分消耗" value={overview.totalPointCost || 0} />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="预估 API 成本" value={overview.totalApiCostCny || 0} precision={2} prefix="¥" />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card>
          <Statistic title="成功率 / 平均耗时" value={`${overview.successRate || 0}% / ${overview.avgDurationSeconds || 0}s`} />
        </Card>
      </Col>
    </Row>
  );
}

export default function ImageGenerationMessageManage() {
  const conversationActionRef = useRef<any>(null);
  const taskActionRef = useRef<any>(null);
  const [overview, setOverview] = useState<ImageGenerationMonitorOverview>(defaultOverview);
  const [detail, setDetail] = useState<ImageGenerationConversationDetail | null>(null);
  const [taskDetail, setTaskDetail] = useState<ImageGenerationMessageItem | null>(null);
  const [taskConversation, setTaskConversation] = useState<ImageGenerationMessageItem[]>([]);

  const loadOverview = async () => {
    const res = await getImageGenerationMonitorOverview({});
    setOverview(res.data || defaultOverview);
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const openConversation = async (record: ImageGenerationConversationSummary) => {
    const res = await getImageGenerationConversation(record.conversationId, record.userId);
    setDetail(res.data);
  };

  const openTaskDetail = async (id: number) => {
    const detailRes = await getImageGenerationMessage(id);
    setTaskDetail(detailRes.data);
    if (!detailRes.data.conversationId || !detailRes.data.userId) {
      setTaskConversation([]);
      return;
    }
    const conversationRes = await getImageGenerationConversation(detailRes.data.conversationId, detailRes.data.userId);
    setTaskConversation(conversationRes.data.messages || []);
  };

  const conversationColumns: any[] = [
    {
      title: '用户 ID',
      dataIndex: 'userId',
      width: 110,
    },
    {
      title: '对话 ID',
      dataIndex: 'conversationId',
      ellipsis: true,
      width: 230,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      hideInTable: true,
      valueEnum: {
        pending: { text: 'pending' },
        running: { text: 'running' },
        success: { text: 'success' },
        failed: { text: 'failed' },
      },
    },
    {
      title: '模型',
      dataIndex: 'modelCode',
      valueType: 'select',
      hideInTable: true,
      valueEnum: {
        'gpt-image-2': { text: 'gpt-image-2' },
      },
    },
    {
      title: '规格',
      dataIndex: 'imageSize',
      valueType: 'select',
      hideInTable: true,
      valueEnum: {
        '1k': { text: '1K' },
        '2k': { text: '2K' },
        '4k': { text: '4K' },
      },
    },
    {
      title: '创建时间',
      dataIndex: 'timeRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
    },
    {
      title: '关键词',
      dataIndex: 'searchText',
      hideInTable: true,
    },
    {
      title: '缩略图',
      dataIndex: 'thumbnailUrls',
      search: false,
      width: 210,
      render: (_: unknown, record: ImageGenerationConversationSummary) => renderThumbnails(record.thumbnailUrls, 48),
    },
    {
      title: '任务',
      search: false,
      width: 170,
      render: (_: unknown, record: ImageGenerationConversationSummary) => (
        <Space wrap>
          <Tag>总 {record.taskCount || 0}</Tag>
          <Tag color="success">成功 {record.successCount || 0}</Tag>
          <Tag color="error">失败 {record.failedCount || 0}</Tag>
          <Tag color="gold">等待 {record.pendingCount || 0}</Tag>
          <Tag color="processing">运行 {record.runningCount || 0}</Tag>
        </Space>
      ),
    },
    {
      title: '积分',
      dataIndex: 'totalPointCost',
      search: false,
      width: 100,
    },
    {
      title: '成本',
      dataIndex: 'totalApiCostCny',
      search: false,
      width: 100,
      render: (_: unknown, record: ImageGenerationConversationSummary) => `¥${Number(record.totalApiCostCny || 0).toFixed(2)}`,
    },
    {
      title: '更新时间',
      dataIndex: 'lastUpdateTime',
      search: false,
      valueType: 'dateTime',
      width: 170,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      render: (_: unknown, record: ImageGenerationConversationSummary) => (
        <Button type="link" onClick={() => openConversation(record)}>
          详情
        </Button>
      ),
    },
  ];

  const taskColumns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
      width: 90,
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      width: 110,
    },
    {
      title: '对话 ID',
      dataIndex: 'conversationId',
      ellipsis: true,
      width: 220,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        pending: { text: 'pending' },
        running: { text: 'running' },
        success: { text: 'success' },
        failed: { text: 'failed' },
      },
      width: 110,
      render: (_: unknown, record: ImageGenerationMessageItem) => (
        <Tag color={statusColorMap[record.status || ''] || 'default'}>{record.status || '-'}</Tag>
      ),
    },
    {
      title: '规格',
      dataIndex: 'imageSize',
      valueType: 'select',
      valueEnum: {
        '1k': { text: '1K' },
        '2k': { text: '2K' },
        '4k': { text: '4K' },
      },
      width: 100,
    },
    {
      title: '积分',
      dataIndex: 'pointCost',
      search: false,
      width: 90,
    },
    {
      title: '积分状态',
      dataIndex: 'pointStatus',
      search: false,
      width: 110,
      render: (_: unknown, record: ImageGenerationMessageItem) => (
        <Tag color={pointStatusColorMap[record.pointStatus || ''] || 'default'}>{record.pointStatus || '-'}</Tag>
      ),
    },
    {
      title: '缩略图',
      search: false,
      width: 150,
      render: (_: unknown, record: ImageGenerationMessageItem) => renderThumbnails(getMessageImages(record).slice(0, 2), 48),
    },
    {
      title: 'Task ID',
      dataIndex: 'taskId',
      ellipsis: true,
      width: 190,
    },
    {
      title: '关键词',
      dataIndex: 'searchText',
      hideInTable: true,
    },
    {
      title: '创建时间',
      dataIndex: 'timeRange',
      valueType: 'dateTimeRange',
      hideInTable: true,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      search: false,
      valueType: 'dateTime',
      width: 170,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 90,
      render: (_: unknown, record: ImageGenerationMessageItem) => (
        <Button type="link" onClick={() => openTaskDetail(record.id)}>
          详情
        </Button>
      ),
    },
  ];

  const trendColumns: any[] = [
    { title: '日期', dataIndex: 'date' },
    { title: '任务数', dataIndex: 'totalTasks' },
    { title: '成功数', dataIndex: 'successTasks' },
    { title: '图片数', dataIndex: 'totalImages' },
    { title: '积分', dataIndex: 'totalPointCost' },
    {
      title: 'API 成本',
      dataIndex: 'totalApiCostCny',
      render: (value: number) => `¥${Number(value || 0).toFixed(2)}`,
    },
  ];

  return (
    <PageContainer
      title="图片生成监控"
      extra={[
        <Button key="refresh" onClick={() => { loadOverview(); conversationActionRef.current?.reload(); taskActionRef.current?.reload(); }}>
          刷新
        </Button>,
      ]}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <MonitorCards overview={overview} />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="最近 7 天趋势">
              <Table<ImageGenerationDailyTrend>
                size="small"
                rowKey="date"
                pagination={false}
                columns={trendColumns}
                dataSource={overview.dailyTrend || []}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="状态分布">
              <Space direction="vertical" style={{ width: '100%' }}>
                {['success', 'pending', 'running', 'failed'].map((status) => {
                  const value = overview.statusDistribution?.[status] || 0;
                  const percent = overview.totalTasks ? Math.round((value / overview.totalTasks) * 100) : 0;
                  return (
                    <div key={status}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Tag color={statusColorMap[status]}>{status}</Tag>
                        <Text>{value}</Text>
                      </Space>
                      <Progress percent={percent} size="small" showInfo={false} />
                    </div>
                  );
                })}
              </Space>
            </Card>
          </Col>
        </Row>

        <Tabs
          defaultActiveKey="conversation"
          items={[
            {
              key: 'conversation',
              label: '对话列表',
              children: (
                <ProTable
                  actionRef={conversationActionRef}
                  columns={conversationColumns}
                  rowKey={(record) => `${record.userId}_${record.conversationId}`}
                  search={{ labelWidth: 'auto' }}
                  cardBordered
                  scroll={{ x: 1300 }}
                  request={async (params) => {
                    const res = await listImageGenerationConversations(buildTimeQuery(params));
                    return {
                      data: res.data.records,
                      total: res.data.total,
                      success: true,
                    };
                  }}
                />
              ),
            },
            {
              key: 'task',
              label: '任务明细',
              children: (
                <ProTable
                  actionRef={taskActionRef}
                  columns={taskColumns}
                  rowKey="id"
                  search={{ labelWidth: 'auto' }}
                  form={{ initialValues: { role: 'assistant' } }}
                  cardBordered
                  scroll={{ x: 1500 }}
                  request={async (params) => {
                    const res = await listImageGenerationMessages({
                      ...buildTimeQuery(params),
                      role: 'assistant',
                    });
                    return {
                      data: res.data.records,
                      total: res.data.total,
                      success: true,
                    };
                  }}
                />
              ),
            },
          ]}
        />
      </Space>

      <Drawer title="图片生成对话详情" open={!!detail} width={980} onClose={() => setDetail(null)}>
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="用户 ID">{detail.userId || '-'}</Descriptions.Item>
              <Descriptions.Item label="消息数">{detail.messages?.length || 0}</Descriptions.Item>
              <Descriptions.Item label="对话 ID" span={2}>
                <Text copyable>{detail.conversationId}</Text>
              </Descriptions.Item>
            </Descriptions>
            {detail.messages?.length ? (
              <Timeline
                items={detail.messages.map((message) => ({
                  color: message.role === 'user' ? 'blue' : message.status === 'failed' ? 'red' : 'purple',
                  children: (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space wrap>
                        <Tag color={roleColorMap[message.role || ''] || 'default'}>{message.role || '-'}</Tag>
                        <Tag color={statusColorMap[message.status || ''] || 'default'}>{message.status || '-'}</Tag>
                        {message.imageSize ? <Tag>{message.imageSize.toUpperCase()}</Tag> : null}
                        {message.pointCost ? <Tag>积分 {message.pointCost}</Tag> : null}
                        {message.taskId ? <Text copyable>task: {message.taskId}</Text> : null}
                        <Text type="secondary">{message.createTime ? dayjs(message.createTime).format('YYYY-MM-DD HH:mm:ss') : '-'}</Text>
                      </Space>
                      {renderThumbnails(getMessageImages(message), 86)}
                      {renderConversationMessageText(message)}
                    </Space>
                  ),
                }))}
              />
            ) : (
              <Empty />
            )}
          </Space>
        ) : null}
      </Drawer>

      <Drawer title="图片生成任务详情" open={!!taskDetail} width={900} onClose={() => { setTaskDetail(null); setTaskConversation([]); }}>
        {taskDetail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="ID">{taskDetail.id}</Descriptions.Item>
              <Descriptions.Item label="用户 ID">{taskDetail.userId || '-'}</Descriptions.Item>
              <Descriptions.Item label="对话 ID" span={2}>
                <Text copyable>{taskDetail.conversationId || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusColorMap[taskDetail.status || ''] || 'default'}>{taskDetail.status || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="积分状态">
                <Tag color={pointStatusColorMap[taskDetail.pointStatus || ''] || 'default'}>{taskDetail.pointStatus || '-'}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="模型">{taskDetail.modelCode || '-'}</Descriptions.Item>
              <Descriptions.Item label="规格">{taskDetail.imageSize || '-'}</Descriptions.Item>
              <Descriptions.Item label="张数">{taskDetail.imageCount || '-'}</Descriptions.Item>
              <Descriptions.Item label="积分">{taskDetail.pointCost || '-'}</Descriptions.Item>
              <Descriptions.Item label="API 成本">¥{Number(taskDetail.apiCostCny || 0).toFixed(2)}</Descriptions.Item>
              <Descriptions.Item label="Task ID">
                <Text copyable>{taskDetail.taskId || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="开始时间">{taskDetail.startedTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="完成时间">{taskDetail.finishedTime || '-'}</Descriptions.Item>
              <Descriptions.Item label="图片" span={2}>
                {renderThumbnails(getMessageImages(taskDetail), 96)}
              </Descriptions.Item>
              <Descriptions.Item label="错误信息" span={2}>
                {taskDetail.errorMessage ? <Text type="danger">{taskDetail.errorMessage}</Text> : '-'}
              </Descriptions.Item>
            </Descriptions>

            <div>
              <Text strong>同轮对话</Text>
              {taskConversation.length ? (
                <Timeline
                  style={{ marginTop: 12 }}
                  items={taskConversation.map((message) => ({
                    color: message.role === 'user' ? 'blue' : message.status === 'failed' ? 'red' : 'purple',
                    children: (
                      <Space direction="vertical" size={6} style={{ width: '100%' }}>
                        <Space wrap>
                          <Tag color={roleColorMap[message.role || ''] || 'default'}>{message.role || '-'}</Tag>
                          <Tag color={statusColorMap[message.status || ''] || 'default'}>{message.status || '-'}</Tag>
                          <Text type="secondary">{message.createTime || '-'}</Text>
                        </Space>
                        {renderThumbnails(getMessageImages(message), 72)}
                        {renderConversationMessageText(message)}
                      </Space>
                    ),
                  }))}
                />
              ) : (
                <Empty />
              )}
            </div>

            <div>
              <Text strong>用户原始输入</Text>
              {renderLongText(getOriginalPrompt(taskDetail) || taskDetail.errorMessage)}
              {renderModelPromptDebug(taskDetail.prompt)}
            </div>
            <div>
              <Text strong>结果图 JSON</Text>
              {renderLongText(formatJsonText(taskDetail.resultImageUrls))}
            </div>
            <div>
              <Text strong>请求参数 JSON</Text>
              {renderLongText(formatJsonText(taskDetail.requestPayload))}
            </div>
            <div>
              <Text strong>响应参数 JSON</Text>
              {renderLongText(formatJsonText(taskDetail.responsePayload))}
            </div>
          </Space>
        ) : null}
      </Drawer>
    </PageContainer>
  );
}
