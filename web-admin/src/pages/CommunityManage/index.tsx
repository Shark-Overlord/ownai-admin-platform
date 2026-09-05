import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageContainer, ProTable, type ActionType } from '@ant-design/pro-components';
import { Alert, Button, Drawer, Form, Input, Modal, Popconfirm, Select, Space, Switch, Tabs, Tag, Upload, message } from 'antd';
import { community, getCommunityTerms, type CommunityPage, type CommunityPost, type CommunityTerm, type PostDraft, type PostRow } from '../../api/community';
import { uploadBlogMedia } from '../../api/blog';
import { CommunityMarkdown } from '../../components/community/CommunityMarkdown';
import { safeMediaUrl } from '../../utils/communityMedia';
import TaxonomyPanel from './TaxonomyPanel';
import './community.css';

const statuses: Record<string, string> = { draft: '草稿', published: '已发布', offline: '已下线' };
export default function CommunityManage() {
  const navigate = useNavigate();
  const table = useRef<ActionType>(undefined);
  const [form] = Form.useForm<PostDraft>();
  const values = Form.useWatch([], form) as PostDraft | undefined;
  const [categories, setCategories] = useState<CommunityTerm[]>([]);
  const [tags, setTags] = useState<CommunityTerm[]>([]);
  const [current, setCurrent] = useState<CommunityPost>();
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sort, setSort] = useState('latest');
  const [tagName, setTagName] = useState('');
  const [tagOpen, setTagOpen] = useState(false);
  async function loadTerms() { const [c, t] = await Promise.all([getCommunityTerms('category'), getCommunityTerms('tag')]); setCategories(c); setTags(t); }
  useEffect(() => { void loadTerms().catch(() => {}); }, []);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', guard); return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);
  const options = (terms: CommunityTerm[], selected: string[] = []) => terms.map(t => ({ label: `${t.name}${t.enabled ? '' : '（已停用）'}`, value: t.id, disabled: !t.enabled && !selected.includes(t.id) }));
  async function edit(row?: PostRow) {
    setBusy(true);
    try {
      await loadTerms();
      const post = row ? await community<CommunityPost>(`admin/post/get?id=${row.id}`) : undefined;
      setCurrent(post); form.resetFields(); form.setFieldsValue(post ? { ...post.draft, commentsEnabled: !!post.draft.commentsEnabled } : { title: '', summary: '', markdown: '', coverUrl: '', tagIds: [], commentsEnabled: true });
      setDirty(false); setOpen(true);
    } finally { setBusy(false); }
  }
  function close() {
    if (dirty) Modal.confirm({ title: '放弃尚未保存的修改？', onOk: () => { setOpen(false); setDirty(false); } });
    else setOpen(false);
  }
  async function save() {
    const draft = await form.validateFields(); setBusy(true);
    try {
      const post = await community<CommunityPost>('admin/post/save', { ...draft, id: current?.id, version: current?.version });
      setCurrent(post); setDirty(false); table.current?.reload(); message.success('草稿已保存，线上内容保持原版本');
    } finally { setBusy(false); }
  }
  async function action(row: { id: string; version: number }, type: 'publish' | 'offline' | 'delete') {
    setBusy(true);
    try {
      await community(`admin/post/${type}`, { id: row.id, version: row.version });
      table.current?.reload();
      if (current?.id === row.id && type !== 'delete') setCurrent(await community<CommunityPost>(`admin/post/get?id=${row.id}`));
      message.success(type === 'publish' ? '已发布保存的版本' : type === 'offline' ? '帖子已下线' : '帖子已删除');
    } finally { setBusy(false); }
  }
  function append(source: string) { form.setFieldValue('markdown', `${form.getFieldValue('markdown') || ''}\n\n${source}\n`); setDirty(true); }
  async function upload(file: File, kind: 'image' | 'video' | 'cover') {
    setUploading(true);
    try {
      const res = await uploadBlogMedia(file, kind === 'video' ? 'video' : 'image');
      const url = safeMediaUrl(res.data); if (!url) throw new Error('上传地址不是有效的 HTTPS 地址');
      if (kind === 'cover') { form.setFieldValue('coverUrl', url); setDirty(true); }
      else append(kind === 'video' ? `\`\`\`video\n${url}\n\`\`\`` : `![帖子配图](<${url}>)`);
      message.success('上传完成');
    } catch (error) { message.error(error instanceof Error ? error.message : '上传失败'); }
    finally { setUploading(false); }
    return false;
  }
  async function inlineTag() {
    if (!tagName.trim()) return;
    setBusy(true);
    try { const id = await community<string>('admin/taxonomy/tag/save', { name: tagName.trim(), enabled: true, sort: 0 }); await loadTerms(); form.setFieldValue('tagIds', [...(form.getFieldValue('tagIds') || []), id]); setDirty(true); setTagOpen(false); setTagName(''); }
    finally { setBusy(false); }
  }
  function exportMarkdown() {
    const blob = new Blob([form.getFieldValue('markdown') || ''], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url;
    link.download = `${(form.getFieldValue('title') || '帖子').replace(/[\\/:*?"<>|]/g, '_')}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <PageContainer title="新闻与帖子" subTitle="发布短篇图文和视频，按分类与标签组织内容">
    <Tabs onChange={() => void loadTerms().catch(() => {})} items={[
      { key: 'posts', label: '帖子列表', children: <ProTable<PostRow> actionRef={table} rowKey="id" scroll={{ x: 1150 }} params={{ sort }}
        request={async params => { const data = await community<CommunityPage<PostRow>>('admin/post/list/page', params); return { data: data.records, total: Number(data.total), success: true }; }}
        toolBarRender={() => [<Select key="sort" aria-label="帖子排序" value={sort} onChange={setSort} style={{ width: 150 }} options={[{ value: 'latest', label: '最新' }, { value: 'popular', label: '最受欢迎' }]} />, <Button key="add" type="primary" loading={busy} onClick={() => void edit().catch(() => {})}>新建帖子</Button>]}
        columns={[
          { title: '标题', dataIndex: 'keyword', render: (_, row) => <Space direction="vertical" size={2}><a onClick={() => void edit(row).catch(() => {})}>{row.title}</a>{Number(row.hasUnpublishedChanges) === 1 && row.status === 'published' && <Tag color="orange">有未发布修改</Tag>}</Space> },
          { title: '主分类', dataIndex: 'categoryId', valueType: 'select', fieldProps: { options: options(categories, categories.map(t => t.id)) }, render: (_, row) => row.categoryName || '未分类' },
          { title: '标签', dataIndex: 'tagId', valueType: 'select', fieldProps: { options: options(tags, tags.map(t => t.id)) }, render: (_, row) => row.tags.map(t => <Tag key={t.id}>{t.name}</Tag>) },
          { title: '状态', dataIndex: 'status', valueType: 'select', valueEnum: statuses, render: (_, row) => <Tag color={row.status === 'published' ? 'green' : 'default'}>{statuses[row.status]}</Tag> },
          { title: '点赞', dataIndex: 'likeCount', search: false, width: 65 }, { title: '评论', dataIndex: 'commentCount', search: false, width: 65 }, { title: '热度', dataIndex: 'popularity', search: false, width: 65 },
          { title: '首次发布', dataIndex: 'firstPublishedAt', valueType: 'dateTime', search: false, width: 165 },
          { title: '操作', valueType: 'option', width: 300, render: (_, row) => <Space wrap size={2}>
            <Button type="link" onClick={() => void edit(row).catch(() => {})}>编辑</Button>
            <Popconfirm title="发布当前已保存的版本？" onConfirm={() => action(row, 'publish')}><Button type="link" disabled={busy || (row.status === 'published' && Number(row.hasUnpublishedChanges) !== 1)}>发布</Button></Popconfirm>
            {row.status === 'published' && <><Popconfirm title="下线后将停止公开展示和互动。" onConfirm={() => action(row, 'offline')}><Button type="link" disabled={busy}>下线</Button></Popconfirm>
              <Button type="link" disabled={busy} onClick={async () => { setBusy(true); try { const id = await community<string>('admin/post/announcement', { id: row.id, version: row.version }); Modal.success({ title: '已生成系统公告草稿', content: `公告编号：${id}。请在系统公告中预览并手动发布。`, okText: '查看系统公告', onOk: () => navigate('/announcement') }); } catch { /* API interceptor displays errors. */ } finally { setBusy(false); } }}>生成公告</Button></>}
            <Button type="link" onClick={() => navigate(`/community/comments?postId=${row.id}`)}>评论</Button>
            <Popconfirm title="删除帖子？删除后停止公开展示，内容版本保留。" onConfirm={() => action(row, 'delete')}><Button type="link" danger disabled={busy}>删除</Button></Popconfirm>
          </Space> },
        ]} /> },
      { key: 'categories', label: '分类管理', children: <TaxonomyPanel kind="category" /> },
      { key: 'tags', label: '标签管理', children: <TaxonomyPanel kind="tag" /> },
    ]} />
    <Drawer rootClassName="community-drawer" title={current ? '编辑帖子' : '新建帖子'} width="min(1120px, 100vw)" open={open} onClose={close} maskClosable={false}
      extra={<Space wrap><Button onClick={exportMarkdown}>导出 Markdown</Button><Button loading={busy} disabled={uploading} onClick={() => void save().catch(() => {})}>保存草稿</Button>
        <Popconfirm title="确认发布当前保存的版本？" onConfirm={() => current && action(current, 'publish')}><Button type="primary" disabled={!current || dirty || uploading || busy || (current.status === 'published' && Number(current.hasUnpublishedChanges) !== 1)}>发布</Button></Popconfirm></Space>}>
      <Alert type="info" showIcon message="先保存草稿，再发布。已发布帖子的线上内容在确认发布新版前保持不变。" style={{ marginBottom: 20 }} />
      <Form name="community-post-editor" form={form} layout="vertical" disabled={busy} onValuesChange={() => setDirty(true)}>
        <Form.Item label="标题" name="title" rules={[{ required: true, whitespace: true }]}><Input maxLength={150} showCount /></Form.Item>
        <Form.Item label="摘要" name="summary"><Input.TextArea maxLength={300} rows={2} showCount /></Form.Item>
        <div className="community-fields"><Form.Item label="主分类（发布时必选）" name="categoryId"><Select allowClear options={options(categories, values?.categoryId ? [values.categoryId] : [])} placeholder="选择主分类" /></Form.Item>
          <Form.Item label={<Space>标签 <Button type="link" size="small" onClick={() => setTagOpen(true)}>新增标签</Button></Space>} name="tagIds"><Select mode="multiple" maxCount={20} options={options(tags, values?.tagIds)} placeholder="选择多个标签" /></Form.Item></div>
        <Form.Item label="封面图片" name="coverUrl" rules={[{ validator: (_, value) => !value || safeMediaUrl(value) ? Promise.resolve() : Promise.reject(new Error('请输入 HTTPS 图片地址')) }]}><Input placeholder="HTTPS 图片地址" /></Form.Item>
        <Space wrap style={{ marginBottom: 16 }}><Upload showUploadList={false} accept="image/*" beforeUpload={file => upload(file, 'cover')} disabled={uploading || busy}><Button loading={uploading}>上传封面</Button></Upload>
          <Upload showUploadList={false} accept="image/*" beforeUpload={file => upload(file, 'image')} disabled={uploading || busy}><Button>插入图片</Button></Upload>
          <Upload showUploadList={false} accept="video/mp4,video/webm,.m4v" beforeUpload={file => upload(file, 'video')} disabled={uploading || busy}><Button>插入视频</Button></Upload>
          <Upload showUploadList={false} accept=".md,.markdown,text/markdown" beforeUpload={async file => { if (file.size > 800000) { message.error('文件过大'); return false; } const text = await file.text(); if (text.length > 200000) { message.error('正文最多 200000 字符'); return false; } Modal.confirm({ title: '用导入内容替换当前正文？', onOk: () => { form.setFieldValue('markdown', text); setDirty(true); } }); return false; }}><Button>导入 Markdown</Button></Upload>
        </Space>
        <Tabs items={[
          { key: 'edit', label: '编辑与预览', children: <div className="community-editor"><Form.Item name="markdown" label="Markdown 正文"><Input.TextArea rows={22} maxLength={200000} className="community-source" /></Form.Item><section className="community-preview" aria-label="帖子草稿预览"><h2>{values?.title || '帖子预览'}</h2>{values?.coverUrl && safeMediaUrl(values.coverUrl) && <CommunityMarkdown content={`![封面](<${values.coverUrl}>)`} />}<CommunityMarkdown content={values?.markdown || ''} /></section></div> },
          ...(current?.published ? [{ key: 'published', label: '线上版本', children: <section className="community-preview"><h2>{current.published.title}</h2><p>{current.published.summary}</p><CommunityMarkdown content={current.published.markdown} /></section> }] : []),
        ]} />
        <Form.Item name="commentsEnabled" label="允许评论和回复" valuePropName="checked" extra="关闭后保留历史评论；修改开关也需要发布后生效。"><Switch /></Form.Item>
      </Form>
    </Drawer>
    <Modal title="新增帖子标签" open={tagOpen} onCancel={() => setTagOpen(false)} onOk={() => void inlineTag().catch(() => {})} confirmLoading={busy}><Input aria-label="新标签名称" value={tagName} onChange={e => setTagName(e.target.value)} maxLength={60} placeholder="标签名称" /></Modal>
  </PageContainer>;
}
