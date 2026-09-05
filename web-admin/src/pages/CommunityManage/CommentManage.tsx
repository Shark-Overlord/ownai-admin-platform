import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components';
import { Alert, Button, Input, Modal, Popconfirm, Space, Tabs, Tag, message } from 'antd';
import { community, type CommentRow, type CommunityPage, type ReportRow } from '../../api/community';
import './community.css';

export default function CommentManage() {
  const [params] = useSearchParams();
  const postId = params.get('postId') || undefined;
  const comments = useRef<ActionType>(undefined);
  const reports = useRef<ActionType>(undefined);
  const [replyTo, setReplyTo] = useState<CommentRow>();
  const [report, setReport] = useState<ReportRow>();
  const [content, setContent] = useState('');
  const [requestKey, setRequestKey] = useState('');
  const [busy, setBusy] = useState(false);
  async function moderate(id: string, hidden: boolean) {
    await community('admin/comment/moderate', { id, hidden }); comments.current?.reload(); reports.current?.reload(); message.success(hidden ? '已隐藏' : '已恢复');
  }
  async function submit() {
    if (!content.trim()) { message.warning('请填写内容'); return; }
    setBusy(true);
    try {
      if (replyTo) { await community('comment/add', { postId: replyTo.postId, replyToId: replyTo.id, content, requestKey }); setReplyTo(undefined); comments.current?.reload(); }
      if (report) { await community('admin/report/resolve', { id: report.id, resolution: content }); setReport(undefined); reports.current?.reload(); }
      setContent(''); message.success('操作成功');
    } finally { setBusy(false); }
  }
  return <PageContainer title="评论管理" subTitle="回复读者、管理显示状态与处理举报">
    {postId && <Alert style={{ marginBottom: 16 }} message={`正在查看帖子 ${postId} 的互动`} />}
    <Tabs items={[
      { key: 'comments', label: '留言与回复', children: <ProTable<CommentRow> rowKey="id" actionRef={comments} scroll={{ x: 1100 }} params={{ postId }}
        request={async query => { const data = await community<CommunityPage<CommentRow>>('admin/comment/list/page', query); return { data: data.records, total: Number(data.total), success: true }; }}
        columns={[
          { title: '内容', dataIndex: 'keyword', render: (_, row) => <div className="community-comment">{row.replyToId && <Tag>回复 {row.replyToName}</Tag>}{row.content}</div> },
          { title: '帖子', dataIndex: 'postTitle', search: false, ellipsis: true },
          { title: '用户编号', dataIndex: 'userId', hideInTable: true },
          { title: '作者', dataIndex: 'authorName', search: false, render: (_, row) => <Space direction="vertical" size={0}><span>{row.authorName} {!!row.official && <Tag color="blue">官方</Tag>}</span><small>{row.userId}</small></Space> },
          { title: '显示状态', dataIndex: 'hidden', valueType: 'select', fieldProps: { options: [{ label: '正常', value: false }, { label: '已隐藏', value: true }] }, render: (_, row) => <Space direction="vertical" size={0}><Tag color={row.hidden ? 'red' : 'green'}>{row.hidden ? '已隐藏' : '正常'}</Tag>{!!row.rootHidden && <Tag>主留言已隐藏</Tag>}{(row.postDeleted || row.postStatus !== 'published') && <Tag>帖子未公开</Tag>}</Space> },
          { title: '时间', dataIndex: 'createTime', valueType: 'dateTime', search: false, width: 170 },
          { title: '操作', valueType: 'option', width: 160, render: (_, row) => <Space><Button type="link" disabled={!!row.hidden || !!row.rootHidden || !!row.postDeleted || row.postStatus !== 'published'} onClick={() => { setReplyTo(row); setContent(''); setRequestKey(crypto.randomUUID()); }}>回复</Button>
            <Popconfirm title={row.hidden ? '恢复这条评论？' : row.rootId ? '隐藏这条回复？' : '隐藏主留言及其整条讨论？'} onConfirm={() => moderate(row.id, !row.hidden)}><Button type="link" danger={!row.hidden}>{row.hidden ? '恢复' : '隐藏'}</Button></Popconfirm></Space> },
        ]} /> },
      { key: 'reports', label: '举报处理', children: <ProTable<ReportRow> rowKey="id" actionRef={reports} scroll={{ x: 1000 }} params={{ postId }}
        request={async query => { const data = await community<CommunityPage<ReportRow>>('admin/report/list/page', query); return { data: data.records, total: Number(data.total), success: true }; }}
        columns={[
          { title: '帖子', dataIndex: 'postTitle', search: false }, { title: '被举报内容', dataIndex: 'content', search: false, render: (_, row) => <div className="community-comment">{row.content}</div> },
          { title: '举报原因', dataIndex: 'reason', search: false }, { title: '举报用户', dataIndex: 'userId', search: false },
          { title: '状态', dataIndex: 'status', initialValue: 'pending', valueType: 'select', valueEnum: { pending: '待处理', resolved: '已处理' } },
          { title: '处理说明', dataIndex: 'resolution', search: false }, { title: '时间', dataIndex: 'createTime', valueType: 'dateTime', search: false },
          { title: '操作', valueType: 'option', render: (_, row) => <Space><Popconfirm title={row.hidden ? '恢复被举报评论？' : '隐藏被举报评论？主留言隐藏后整条讨论不再公开。'} onConfirm={() => moderate(row.commentId, !row.hidden)}><Button type="link">{row.hidden ? '恢复评论' : '隐藏评论'}</Button></Popconfirm>
            <Button type="link" disabled={row.status === 'resolved'} onClick={() => { setReport(row); setContent(''); }}>处理完成</Button></Space> },
        ]} /> },
    ]} />
    <Modal title={replyTo ? `回复 ${replyTo.authorName}` : '填写举报处理说明'} open={!!replyTo || !!report} confirmLoading={busy} onOk={() => void submit().catch(() => {})} onCancel={() => { if (!busy) { setReplyTo(undefined); setReport(undefined); } }}>
      {replyTo && <Alert type="info" message="回复以官方身份直接展示。帖子关闭评论后将无法提交。" style={{ marginBottom: 16 }} />}
      <Input.TextArea aria-label={replyTo ? '官方回复内容' : '举报处理说明'} value={content} onChange={e => { setContent(e.target.value); if (replyTo) setRequestKey(crypto.randomUUID()); }} maxLength={replyTo ? 2000 : 500} rows={5} showCount disabled={busy} />
    </Modal>
  </PageContainer>;
}
