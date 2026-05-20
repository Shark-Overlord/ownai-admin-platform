import { useRef } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Tag, Typography } from 'antd';
import { listOperationLogs, type OperationLogItem } from '../../api/operationLog';

const { Text } = Typography;

export default function OperationLog() {
  const actionRef = useRef<any>(null);

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
      width: 60,
    },
    {
      title: '用户ID',
      dataIndex: 'userId',
    },
    {
      title: '模块',
      dataIndex: 'module',
      search: false,
    },
    {
      title: '动作',
      dataIndex: 'action',
      search: false,
    },
    {
      title: '请求方法',
      dataIndex: 'requestMethod',
      search: false,
      render: (_: any, record: OperationLogItem) => (
        <Tag color={record.requestMethod === 'GET' ? 'blue' : record.requestMethod === 'POST' ? 'green' : 'default'}>
          {record.requestMethod}
        </Tag>
      ),
    },
    {
      title: '请求URI',
      dataIndex: 'requestUri',
      search: false,
      ellipsis: true,
    },
    {
      title: '请求参数',
      dataIndex: 'requestParams',
      search: false,
      ellipsis: true,
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: '失败', status: 'Error' },
        1: { text: '成功', status: 'Success' },
      },
      render: (_: any, record: OperationLogItem) => (
        <Tag color={record.status === 1 ? 'success' : 'error'}>
          {record.status === 1 ? '成功' : '失败'}
        </Tag>
      ),
    },
    {
      title: '错误信息',
      dataIndex: 'errorMessage',
      search: false,
      render: (_: any, record: OperationLogItem) =>
        record.errorMessage ? <Text type="danger">{record.errorMessage}</Text> : '-',
    },
    {
      title: '耗时(ms)',
      dataIndex: 'costTime',
      search: false,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      search: false,
      valueType: 'dateTime',
    },
  ];

  return (
    <PageContainer title="操作日志">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        request={async (params) => {
          const res = await listOperationLogs({
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
