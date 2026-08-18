/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Collapse,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Upload,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined, ReloadOutlined, SendOutlined, UnlockOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  addBlogPost,
  batchDeleteBlogPosts,
  batchPublishBlogPosts,
  batchSetBlogPostMemberOnly,
  deleteBlogCategory,
  deleteBlogPost,
  deleteBlogTag,
  getBlogPost,
  listBlogBooks,
  listBlogCategories,
  listBlogChapters,
  listBlogPosts,
  listBlogTags,
  offlineBlogPost,
  publishBlogPost,
  saveBlogCategory,
  saveBlogTag,
  updateBlogPost,
  uploadBlogMedia,
  type BlogCategoryVO,
  type BlogBookVO,
  type BlogChapterVO,
  type BlogId,
  type BlogPostVO,
  type BlogTagVO,
} from '../../api/blog';
import BlogEditor from '../../components/BlogEditor';
import { generateBlogSlug } from '../../utils/blogSlug';

const EMPTY_DOCUMENT = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

const statusMap: Record<string, { text: string; color: string }> = {
  draft: { text: '草稿', color: 'default' },
  published: { text: '已发布', color: 'green' },
  offline: { text: '已下线', color: 'orange' },
};

const visibilityOptions = [
  { label: '公开可见', value: 'public' },
  { label: '登录可见', value: 'login' },
  { label: '仅管理员', value: 'admin' },
];

type BlogManageProps = {
  initialTab?: 'posts' | 'categories' | 'tags';
};

export default function BlogManage({ initialTab = 'posts' }: BlogManageProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledQueryRef = useRef('');
  const postActionRef = useRef<any>(null);
  const categoryActionRef = useRef<any>(null);
  const tagActionRef = useRef<any>(null);
  const postSlugAutoRef = useRef(true);
  const postSlugSeedRef = useRef(Date.now().toString(36));
  const [postForm] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [tagForm] = Form.useForm();
  const [categories, setCategories] = useState<BlogCategoryVO[]>([]);
  const [books, setBooks] = useState<BlogBookVO[]>([]);
  const [chapters, setChapters] = useState<BlogChapterVO[]>([]);
  const [tags, setTags] = useState<BlogTagVO[]>([]);
  const [postDrawerOpen, setPostDrawerOpen] = useState(false);
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [tagDrawerOpen, setTagDrawerOpen] = useState(false);
  const [bookChooserOpen, setBookChooserOpen] = useState(false);
  const [newTutorialBookId, setNewTutorialBookId] = useState<BlogId>();
  const [currentPost, setCurrentPost] = useState<BlogPostVO | null>(null);
  const [currentCategory, setCurrentCategory] = useState<BlogCategoryVO | null>(null);
  const [currentTag, setCurrentTag] = useState<BlogTagVO | null>(null);
  const [contentJson, setContentJson] = useState(EMPTY_DOCUMENT);
  const [contentHtml, setContentHtml] = useState('<p></p>');
  const [saving, setSaving] = useState(false);
  const [loadingPost, setLoadingPost] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [selectedPostKeys, setSelectedPostKeys] = useState<BlogId[]>([]);
  const [batchOperating, setBatchOperating] = useState<'publish' | 'delete' | 'member' | 'free' | null>(null);
  const [publishError, setPublishError] = useState<{ title: string; content: string } | null>(null);
  const coverUrl = Form.useWatch('coverUrl', postForm);
  const selectedBookId = Form.useWatch('bookId', postForm);

  const loadTaxonomy = async () => {
    const [categoryRes, tagRes, bookRes, chapterRes] = await Promise.all([
      listBlogCategories(),
      listBlogTags(),
      listBlogBooks({ current: 1, pageSize: 100 }),
      listBlogChapters(),
    ]);
    setCategories(categoryRes.data);
    setTags(tagRes.data);
    setBooks(bookRes.data.records);
    setChapters(chapterRes.data);
  };

  useEffect(() => {
    void loadTaxonomy();
  }, []);

  const openCreatePost = (context?: { bookId?: BlogId; chapterId?: BlogId }) => {
    postSlugAutoRef.current = true;
    postSlugSeedRef.current = Date.now().toString(36);
    setCurrentPost(null);
    setContentJson(EMPTY_DOCUMENT);
    setContentHtml('<p></p>');
    postForm.resetFields();
    const book = books.find((item) => String(item.id) === String(context?.bookId));
    postForm.setFieldsValue({
      visibility: 'public',
      memberOnly: false,
      tagIds: [],
      bookId: context?.bookId,
      chapterId: context?.chapterId,
      categoryId: book?.categoryId,
    });
    setPostDrawerOpen(true);
  };

  const openEditPost = async (record: BlogPostVO) => {
    postSlugAutoRef.current = false;
    setLoadingPost(true);
    try {
      const res = await getBlogPost(record.id);
      const detail = res.data;
      setCurrentPost(detail);
      setContentJson(detail.contentJson || EMPTY_DOCUMENT);
      setContentHtml(detail.contentHtml || '<p></p>');
      postForm.setFieldsValue({
        ...detail,
        bookId: detail.bookId,
        memberOnly: detail.memberOnly === 1,
        tagIds: detail.tags?.map((item) => item.id) || [],
      });
      setPostDrawerOpen(true);
    } finally {
      setLoadingPost(false);
    }
  };

  const editPost = (record: BlogPostVO) => {
    if (record.bookId) {
      navigate(`/tutorial-assets/books/${record.bookId}/workspace?edit=${record.id}`);
      return;
    }
    void openEditPost(record);
  };

  useEffect(() => {
    const signature = searchParams.toString();
    if (!signature) {
      handledQueryRef.current = '';
      return;
    }
    if (handledQueryRef.current === signature) return;
    const editId = searchParams.get('edit') || undefined;
    const createNew = searchParams.get('new') === '1';
    const bookId = searchParams.get('bookId') || undefined;
    const chapterId = searchParams.get('chapterId') || undefined;
    if (bookId && books.length === 0) return;
    handledQueryRef.current = signature;
    if (editId) {
      void openEditPost({ id: editId } as BlogPostVO);
    } else if (createNew) {
      openCreatePost({ bookId, chapterId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, books]);

  const closePostDrawer = () => {
    setPostDrawerOpen(false);
    if (searchParams.toString()) setSearchParams({}, { replace: true });
  };

  const handleSavePost = async (values: any) => {
    setSaving(true);
    try {
      const params = {
        ...values,
        id: currentPost?.id,
        version: currentPost?.version,
        contentJson,
        contentHtml,
        contentSchemaVersion: 1,
        memberOnly: values.memberOnly ? 1 : 0,
      };
      delete params.bookId;
      if (currentPost) {
        await updateBlogPost(params);
        message.success(currentPost.status === 'published' ? '新内容已保存为草稿，请重新发布' : '文章已保存');
      } else {
        await addBlogPost(params);
        message.success('文章草稿已创建');
      }
      closePostDrawer();
      postActionRef.current?.reload();
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (record: BlogPostVO) => {
    try {
      await publishBlogPost(record.id);
      message.success('文章已发布');
      postActionRef.current?.reload();
    } catch (error: any) {
      setPublishError({
        title: '文章发布失败',
        content: error?.message || '请检查文章正文、分类和标签后重试',
      });
    }
  };

  const handleOffline = async (record: BlogPostVO) => {
    await offlineBlogPost(record.id);
    message.success('文章已下线');
    postActionRef.current?.reload();
  };

  const clearPostSelectionAndReload = () => {
    setSelectedPostKeys([]);
    postActionRef.current?.reload();
  };

  const handleBatchPublish = async () => {
    if (!selectedPostKeys.length) return;
    setBatchOperating('publish');
    try {
      const res = await batchPublishBlogPosts(selectedPostKeys);
      const skipped = selectedPostKeys.length - res.data;
      message.success(skipped > 0
        ? `已发布 ${res.data} 篇，跳过 ${skipped} 篇已发布文章`
        : `已批量发布 ${res.data} 篇文章`);
      clearPostSelectionAndReload();
    } catch (error: any) {
      setPublishError({
        title: '批量发布失败',
        content: error?.message || '请检查所选文章的正文、分类和标签后重试',
      });
    } finally {
      setBatchOperating(null);
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedPostKeys.length) return;
    setBatchOperating('delete');
    try {
      const res = await batchDeleteBlogPosts(selectedPostKeys);
      message.success(`已批量删除 ${res.data} 篇文章`);
      clearPostSelectionAndReload();
    } finally {
      setBatchOperating(null);
    }
  };

  const handleBatchMemberOnly = async (memberOnly: 0 | 1) => {
    if (!selectedPostKeys.length) return;
    const operation = memberOnly === 1 ? 'member' : 'free';
    setBatchOperating(operation);
    try {
      const res = await batchSetBlogPostMemberOnly(selectedPostKeys, memberOnly);
      const unchanged = selectedPostKeys.length - res.data;
      const suffix = unchanged ? `，${unchanged} 篇无需修改` : '';
      message.success(memberOnly === 1
        ? `已将 ${res.data} 篇文章设为会员专享${suffix}`
        : `已将 ${res.data} 篇文章设为普通文章${suffix}`);
      clearPostSelectionAndReload();
    } finally {
      setBatchOperating(null);
    }
  };

  const postColumns: any[] = [
    {
      title: '文章',
      dataIndex: 'keyword',
      ellipsis: true,
      render: (_: any, record: BlogPostVO) => (
        <Space direction="vertical" size={0}>
          <strong>{record.title}</strong>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>/blog/{record.slug}</span>
        </Space>
      ),
    },
    {
      title: '教程书',
      dataIndex: 'bookId',
      valueType: 'select',
      valueEnum: books.reduce((acc, item) => ({ ...acc, [item.id]: { text: item.title } }), {}),
      width: 150,
      render: (_: any, record: BlogPostVO) => record.bookTitle || <Tag>独立文章</Tag>,
    },
    {
      title: '章节',
      dataIndex: 'chapterId',
      valueType: 'select',
      valueEnum: chapters.reduce((acc, item) => ({ ...acc, [item.id]: { text: `${books.find((book) => String(book.id) === String(item.bookId))?.title || ''} / ${item.title}` } }), {}),
      width: 160,
      render: (_: any, record: BlogPostVO) => record.chapterTitle || '-',
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      valueType: 'select',
      valueEnum: categories.reduce((acc, item) => ({ ...acc, [item.id]: { text: item.name } }), {}),
      width: 140,
      render: (_: any, record: BlogPostVO) => record.category?.name || '-',
    },
    {
      title: '标签',
      dataIndex: 'tagId',
      valueType: 'select',
      valueEnum: tags.reduce((acc, item) => ({ ...acc, [item.id]: { text: item.name } }), {}),
      width: 220,
      render: (_: any, record: BlogPostVO) => (
        <Space size={[0, 4]} wrap>{record.tags?.map((item) => <Tag key={item.id}>{item.name}</Tag>)}</Space>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        draft: { text: '草稿' },
        published: { text: '已发布' },
        offline: { text: '已下线' },
      },
      width: 110,
      render: (_: any, record: BlogPostVO) => {
        const item = statusMap[record.status] || { text: record.status, color: 'default' };
        return <Tag color={item.color}>{item.text}</Tag>;
      },
    },
    {
      title: '会员专享',
      dataIndex: 'memberOnly',
      valueType: 'select',
      valueEnum: {
        0: { text: '否', status: 'Default' },
        1: { text: '是', status: 'Success' },
      },
      width: 110,
      render: (_: any, record: BlogPostVO) => record.memberOnly === 1
        ? <Tag color="gold" icon={<LockOutlined />}>会员</Tag>
        : <Tag>普通</Tag>,
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      search: false,
      width: 170,
      render: (_: any, record: BlogPostVO) => record.updateTime ? dayjs(record.updateTime).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 230,
      fixed: 'right',
      render: (_: any, record: BlogPostVO) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} loading={loadingPost} onClick={() => editPost(record)}>编辑</Button>
          {record.status === 'published' ? (
            <Popconfirm title="确认下线这篇文章？" onConfirm={() => handleOffline(record)}><Button type="link" size="small">下线</Button></Popconfirm>
          ) : (
            <Popconfirm title="确认发布这篇文章？" description="请先确认最新正文已经保存。" onConfirm={() => handlePublish(record)}><Button type="link" size="small">发布</Button></Popconfirm>
          )}
          <Popconfirm title="确认删除这篇文章？" okButtonProps={{ danger: true }} onConfirm={async () => { await deleteBlogPost(record.id); message.success('文章已删除'); postActionRef.current?.reload(); }}>
            <Button type="link" danger size="small">删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const openCategory = (record?: BlogCategoryVO) => {
    setCurrentCategory(record || null);
    categoryForm.resetFields();
    categoryForm.setFieldsValue(record || { status: 'enabled', sort: 0 });
    setCategoryDrawerOpen(true);
  };

  const openTag = (record?: BlogTagVO) => {
    setCurrentTag(record || null);
    tagForm.resetFields();
    tagForm.setFieldsValue(record || { status: 'enabled', sort: 0 });
    setTagDrawerOpen(true);
  };

  const taxonomyStatus = (status: string) => <Tag color={status === 'enabled' ? 'green' : 'default'}>{status === 'enabled' ? '启用' : '停用'}</Tag>;

  const categoryColumns: any[] = [
    { title: '分类名称', dataIndex: 'name' },
    { title: 'Slug', dataIndex: 'slug', copyable: true },
    { title: '文章数', dataIndex: 'postCount', width: 100 },
    { title: '排序', dataIndex: 'sort', width: 90 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_: any, record: BlogCategoryVO) => taxonomyStatus(record.status) },
    {
      title: '操作', valueType: 'option', width: 150,
      render: (_: any, record: BlogCategoryVO) => <Space>
        <Button type="link" size="small" onClick={() => openCategory(record)}>编辑</Button>
        <Popconfirm title="确认删除分类？" description="分类下仍有文章时不能删除。" onConfirm={async () => { await deleteBlogCategory(record.id); message.success('分类已删除'); await loadTaxonomy(); categoryActionRef.current?.reload(); }}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      </Space>,
    },
  ];

  const tagColumns: any[] = [
    { title: '标签名称', dataIndex: 'name' },
    { title: 'Slug', dataIndex: 'slug', copyable: true },
    { title: '文章数', dataIndex: 'postCount', width: 100 },
    { title: '排序', dataIndex: 'sort', width: 90 },
    { title: '状态', dataIndex: 'status', width: 100, render: (_: any, record: BlogTagVO) => taxonomyStatus(record.status) },
    {
      title: '操作', valueType: 'option', width: 150,
      render: (_: any, record: BlogTagVO) => <Space>
        <Button type="link" size="small" onClick={() => openTag(record)}>编辑</Button>
        <Popconfirm title="确认删除标签？" description="仍被文章使用的标签不能删除。" onConfirm={async () => { await deleteBlogTag(record.id); message.success('标签已删除'); await loadTaxonomy(); tagActionRef.current?.reload(); }}>
          <Button type="link" danger size="small">删除</Button>
        </Popconfirm>
      </Space>,
    },
  ];

  const pageMeta = initialTab === 'posts'
    ? { title: '教程文章', subTitle: '集中管理教程文章、发布状态和会员权限' }
    : initialTab === 'categories'
      ? { title: '教程分类', subTitle: '管理教程书与独立文章使用的分类' }
      : { title: '教程标签', subTitle: '管理教程文章使用的标签' };

  return (
    <PageContainer title={pageMeta.title} subTitle={pageMeta.subTitle}>
      <Tabs
        activeKey={initialTab}
        renderTabBar={() => <></>}
        items={[
          {
            key: 'posts', label: '教程文章', children: (
              <ProTable
                actionRef={postActionRef}
                columns={postColumns}
                rowKey="id"
                rowSelection={{
                  selectedRowKeys: selectedPostKeys,
                  preserveSelectedRowKeys: true,
                  onChange: (keys) => setSelectedPostKeys(keys as BlogId[]),
                }}
                cardBordered
                scroll={{ x: 1300 }}
                search={{ labelWidth: 'auto' }}
                toolBarRender={() => [
                  <Popconfirm
                    key="batch-publish"
                    title={`确认发布选中的 ${selectedPostKeys.length} 篇文章？`}
                    description="已发布文章会自动跳过；若任一文章不符合发布条件，本次操作不会修改任何文章。"
                    disabled={!selectedPostKeys.length}
                    onConfirm={handleBatchPublish}
                  >
                    <Button
                      icon={<SendOutlined />}
                      disabled={!selectedPostKeys.length || Boolean(batchOperating)}
                      loading={batchOperating === 'publish'}
                    >
                      批量发布{selectedPostKeys.length ? ` (${selectedPostKeys.length})` : ''}
                    </Button>
                  </Popconfirm>,
                  <Popconfirm
                    key="batch-member-only"
                    title={`确认将选中的 ${selectedPostKeys.length} 篇文章设为会员专享？`}
                    disabled={!selectedPostKeys.length}
                    onConfirm={() => handleBatchMemberOnly(1)}
                  >
                    <Button
                      icon={<LockOutlined />}
                      disabled={!selectedPostKeys.length || Boolean(batchOperating)}
                      loading={batchOperating === 'member'}
                    >
                      设为会员专享{selectedPostKeys.length ? ` (${selectedPostKeys.length})` : ''}
                    </Button>
                  </Popconfirm>,
                  <Popconfirm
                    key="batch-free"
                    title={`确认将选中的 ${selectedPostKeys.length} 篇文章设为普通文章？`}
                    disabled={!selectedPostKeys.length}
                    onConfirm={() => handleBatchMemberOnly(0)}
                  >
                    <Button
                      icon={<UnlockOutlined />}
                      disabled={!selectedPostKeys.length || Boolean(batchOperating)}
                      loading={batchOperating === 'free'}
                    >
                      设为普通文章{selectedPostKeys.length ? ` (${selectedPostKeys.length})` : ''}
                    </Button>
                  </Popconfirm>,
                  <Popconfirm
                    key="batch-delete"
                    title={`确认删除选中的 ${selectedPostKeys.length} 篇文章？`}
                    description="文章正文、标签关系和版本记录将一起删除，此操作不可恢复。"
                    okText="批量删除"
                    okButtonProps={{ danger: true }}
                    disabled={!selectedPostKeys.length}
                    onConfirm={handleBatchDelete}
                  >
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!selectedPostKeys.length || Boolean(batchOperating)}
                      loading={batchOperating === 'delete'}
                    >
                      批量删除{selectedPostKeys.length ? ` (${selectedPostKeys.length})` : ''}
                    </Button>
                  </Popconfirm>,
                  <Button key="reload" icon={<ReloadOutlined />} onClick={() => postActionRef.current?.reload()}>刷新</Button>,
                  <Button key="standalone" icon={<PlusOutlined />} onClick={() => openCreatePost()}>新建独立文章</Button>,
                  <Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => {
                    setNewTutorialBookId(undefined);
                    setBookChooserOpen(true);
                  }}>新建教程</Button>,
                ]}
                request={async (params) => {
                  const res = await listBlogPosts({ current: params.current || 1, pageSize: params.pageSize || 10, keyword: params.keyword, bookId: params.bookId, chapterId: params.chapterId, categoryId: params.categoryId, tagId: params.tagId, status: params.status, memberOnly: params.memberOnly });
                  return { data: res.data.records, total: res.data.total, success: true };
                }}
              />
            ),
          },
          {
            key: 'categories', label: '教程分类', children: (
              <ProTable
                actionRef={categoryActionRef}
                columns={categoryColumns}
                rowKey="id"
                search={false}
                pagination={false}
                toolBarRender={() => [<Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => openCategory()}>新增教程分类</Button>]}
                request={async () => { const res = await listBlogCategories(); setCategories(res.data); return { data: res.data, total: res.data.length, success: true }; }}
              />
            ),
          },
          {
            key: 'tags', label: '教程标签', children: (
              <ProTable
                actionRef={tagActionRef}
                columns={tagColumns}
                rowKey="id"
                search={false}
                pagination={false}
                toolBarRender={() => [<Button key="add" type="primary" icon={<PlusOutlined />} onClick={() => openTag()}>新增教程标签</Button>]}
                request={async () => { const res = await listBlogTags(); setTags(res.data); return { data: res.data, total: res.data.length, success: true }; }}
              />
            ),
          },
        ]}
      />

      <Drawer
        title={currentPost ? `编辑：${currentPost.title}` : '新建文章'}
        open={postDrawerOpen}
        width="92vw"
        destroyOnClose
        onClose={closePostDrawer}
        extra={<Space><Button onClick={closePostDrawer}>取消</Button><Button type="primary" loading={saving} onClick={() => postForm.submit()}>保存草稿</Button></Space>}
      >
        <Form
          form={postForm}
          layout="vertical"
          onFinish={handleSavePost}
          onValuesChange={(changedValues) => {
            if (Object.prototype.hasOwnProperty.call(changedValues, 'slug')) postSlugAutoRef.current = false;
            if (Object.prototype.hasOwnProperty.call(changedValues, 'title') && postSlugAutoRef.current) {
              postForm.setFieldValue('slug', generateBlogSlug(changedValues.title, 'article', postSlugSeedRef.current));
            }
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 24 }}>
            <div>
              <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入文章标题' }]}><Input maxLength={255} showCount /></Form.Item>
              <Form.Item name="summary" label="摘要"><Input.TextArea rows={3} maxLength={1000} showCount /></Form.Item>
              <Form.Item label="正文" required>
                <BlogEditor
                  key={currentPost?.id ? String(currentPost.id) : 'new-post'}
                  initialContentJson={contentJson}
                  onChange={(json, html) => { setContentJson(json); setContentHtml(html); }}
                />
              </Form.Item>
            </div>
            <div>
              <Form.Item name="slug" label="文章 Slug" extra="仅小写字母、数字和中划线，例如 spring-boot-blog" rules={[{ required: true }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Slug 格式不正确' }]}><Input /></Form.Item>
              <Form.Item name="bookId" label="教程书" extra="不选择时保存为独立文章">
                <Select
                  allowClear
                  placeholder="独立文章"
                  options={books.map((item) => ({ label: item.title, value: item.id }))}
                  onChange={(bookId) => {
                    const book = books.find((item) => String(item.id) === String(bookId));
                    postForm.setFieldsValue({ chapterId: undefined, categoryId: book?.categoryId });
                  }}
                />
              </Form.Item>
              {selectedBookId ? (
                <Form.Item name="chapterId" label="章节" rules={[{ required: true, message: '请选择章节' }]}>
                  <Select options={chapters.filter((item) => String(item.bookId) === String(selectedBookId)).map((item) => ({ label: item.title, value: item.id }))} />
                </Form.Item>
              ) : null}
              <Form.Item name="categoryId" label="分类" rules={[{ required: true, message: '请选择分类' }]} extra={selectedBookId ? '分类由教程书统一管理' : undefined}>
                <Select disabled={Boolean(selectedBookId)} options={categories.filter((item) => item.status === 'enabled').map((item) => ({ label: item.name, value: item.id }))} />
              </Form.Item>
              <Form.Item name="tagIds" label="标签"><Select mode="multiple" allowClear options={tags.filter((item) => item.status === 'enabled').map((item) => ({ label: item.name, value: item.id }))} /></Form.Item>
              <Form.Item name="visibility" label="可见性" rules={[{ required: true }]}><Select options={visibilityOptions} /></Form.Item>
              <Form.Item name="memberOnly" label="会员专享" valuePropName="checked">
                <Switch checkedChildren="会员" unCheckedChildren="普通" />
              </Form.Item>
              <Form.Item label="封面地址">
                <Space.Compact block>
                  <Form.Item name="coverUrl" noStyle><Input /></Form.Item>
                  <Upload showUploadList={false} accept="image/jpeg,image/png,image/webp" beforeUpload={(file) => { setCoverUploading(true); void uploadBlogMedia(file as File, 'image').then((res) => { postForm.setFieldValue('coverUrl', res.data); message.success('封面已上传'); }).finally(() => setCoverUploading(false)); return false; }}>
                    <Button loading={coverUploading} icon={<UploadOutlined />}>上传</Button>
                  </Upload>
                </Space.Compact>
              </Form.Item>
              {coverUrl ? <Image src={coverUrl} style={{ maxHeight: 180, objectFit: 'cover' }} /> : null}
              <Collapse
                ghost
                items={[{
                  key: 'seo', label: 'SEO 设置', children: <>
                    <Form.Item name="seoTitle" label="SEO 标题"><Input maxLength={255} /></Form.Item>
                    <Form.Item name="seoDescription" label="SEO 描述"><Input.TextArea rows={4} maxLength={512} showCount /></Form.Item>
                  </>,
                }]}
              />
            </div>
          </div>
        </Form>
      </Drawer>

      <Modal
        title="选择教程书"
        open={bookChooserOpen}
        okText="进入工作台"
        okButtonProps={{ disabled: !newTutorialBookId }}
        onCancel={() => setBookChooserOpen(false)}
        onOk={() => {
          if (!newTutorialBookId) return;
          setBookChooserOpen(false);
          navigate(`/tutorial-assets/books/${newTutorialBookId}/workspace`);
        }}
      >
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="请选择要编写的教程书"
          optionFilterProp="label"
          value={newTutorialBookId}
          onChange={setNewTutorialBookId}
          options={books.map((item) => ({ label: item.title, value: item.id }))}
        />
      </Modal>

      <Modal
        title={publishError?.title}
        open={Boolean(publishError)}
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="知道了"
        onCancel={() => setPublishError(null)}
        onOk={() => setPublishError(null)}
      >
        {publishError?.content}
      </Modal>

      <Drawer title={currentCategory ? '编辑博客分类' : '新增博客分类'} open={categoryDrawerOpen} width={560} onClose={() => setCategoryDrawerOpen(false)} extra={<Button type="primary" onClick={() => categoryForm.submit()}>保存</Button>}>
        <Form form={categoryForm} layout="vertical" onFinish={async (values) => { await saveBlogCategory({ ...values, id: currentCategory?.id }); message.success('分类已保存'); setCategoryDrawerOpen(false); await loadTaxonomy(); categoryActionRef.current?.reload(); }}>
          <Form.Item name="name" label="分类名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Slug 格式不正确' }]}><Input /></Form.Item>
          <Form.Item name="description" label="说明"><Input.TextArea rows={4} maxLength={512} /></Form.Item>
          <Form.Item name="sort" label="排序"><InputNumber precision={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{ label: '启用', value: 'enabled' }, { label: '停用', value: 'disabled' }]} /></Form.Item>
        </Form>
      </Drawer>

      <Drawer title={currentTag ? '编辑博客标签' : '新增博客标签'} open={tagDrawerOpen} width={520} onClose={() => setTagDrawerOpen(false)} extra={<Button type="primary" onClick={() => tagForm.submit()}>保存</Button>}>
        <Form form={tagForm} layout="vertical" onFinish={async (values) => { await saveBlogTag({ ...values, id: currentTag?.id }); message.success('标签已保存'); setTagDrawerOpen(false); await loadTaxonomy(); tagActionRef.current?.reload(); }}>
          <Form.Item name="name" label="标签名称" rules={[{ required: true }]}><Input maxLength={100} /></Form.Item>
          <Form.Item name="slug" label="Slug" rules={[{ required: true }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Slug 格式不正确' }]}><Input /></Form.Item>
          <Form.Item name="description" label="说明"><Input.TextArea rows={4} maxLength={512} /></Form.Item>
          <Form.Item name="sort" label="排序"><InputNumber precision={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={[{ label: '启用', value: 'enabled' }, { label: '停用', value: 'disabled' }]} /></Form.Item>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
