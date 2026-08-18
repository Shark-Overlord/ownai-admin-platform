import {
  ArrowLeftOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileImageOutlined,
  FileTextOutlined,
  HolderOutlined,
  LinkOutlined,
  MoreOutlined,
  PlusOutlined,
  SaveOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Collapse,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Radio,
  Select,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { MenuProps } from 'antd';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  addBlogPost,
  assignBlogPost,
  deleteBlogChapter,
  getBlogBook,
  getBlogPost,
  listBlogCategories,
  listBlogPosts,
  listBlogTags,
  publishBlogPost,
  reorderBlogOutline,
  saveBlogBook,
  saveBlogChapter,
  updateBlogPost,
  uploadBlogMedia,
  type BlogBookSaveRequest,
  type BlogBookVO,
  type BlogCategoryVO,
  type BlogChapterVO,
  type BlogId,
  type BlogPostSaveRequest,
  type BlogPostVO,
  type BlogTagVO,
} from '../../api/blog';
import BlogEditor from '../../components/BlogEditor';
import { generateBlogSlug } from '../../utils/blogSlug';
import './index.css';

const EMPTY_DOCUMENT = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph' }] });

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';
type DragItem =
  | { type: 'chapter'; chapterId: BlogId }
  | { type: 'post'; postId: BlogId; chapterId: BlogId };

const postStatusLabel: Record<BlogPostVO['status'], string> = {
  draft: '草稿',
  published: '已发布',
  offline: '已下线',
};

function sameId(left?: BlogId, right?: BlogId) {
  return left !== undefined && right !== undefined && String(left) === String(right);
}

export default function BlogBookWorkspace() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const creatingBook = bookId === 'new';
  const requestedNewPost = searchParams.get('new') === '1';
  const requestedChapterId = searchParams.get('chapterId');
  const requestedEditPostId = searchParams.get('edit');
  const dragItemRef = useRef<DragItem | null>(null);
  const articleSlugAutoRef = useRef(true);
  const articleSlugSeedRef = useRef(Date.now().toString(36));
  const bookSlugAutoRef = useRef(true);
  const bookSlugSeedRef = useRef(Date.now().toString(36));
  const [articleForm] = Form.useForm<BlogPostSaveRequest>();
  const [chapterForm] = Form.useForm();
  const [bookForm] = Form.useForm<BlogBookSaveRequest>();
  const [book, setBook] = useState<BlogBookVO | null>(null);
  const [outline, setOutline] = useState<BlogChapterVO[]>([]);
  const [categories, setCategories] = useState<BlogCategoryVO[]>([]);
  const [tags, setTags] = useState<BlogTagVO[]>([]);
  const [activePost, setActivePost] = useState<BlogPostVO | null>(null);
  const [activeChapterId, setActiveChapterId] = useState<BlogId>();
  const [contentJson, setContentJson] = useState(EMPTY_DOCUMENT);
  const [contentHtml, setContentHtml] = useState('<p></p>');
  const [editorKey, setEditorKey] = useState('empty');
  const [loading, setLoading] = useState(true);
  const [postLoading, setPostLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [lastChangeAt, setLastChangeAt] = useState(0);
  const [outlineSearch, setOutlineSearch] = useState('');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [chapterModalOpen, setChapterModalOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<BlogChapterVO | null>(null);
  const [bookSettingsOpen, setBookSettingsOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignChapter, setAssignChapter] = useState<BlogChapterVO | null>(null);
  const [standalonePosts, setStandalonePosts] = useState<BlogPostVO[]>([]);
  const [assignPostId, setAssignPostId] = useState<BlogId>();
  const coverUrl = Form.useWatch('coverUrl', articleForm);
  const bookCoverUrl = Form.useWatch('coverUrl', bookForm);
  const draftTitle = Form.useWatch('title', articleForm);

  const prepareNewPost = useCallback((chapter: BlogChapterVO, categoryId?: BlogId) => {
    articleSlugAutoRef.current = true;
    articleSlugSeedRef.current = Date.now().toString(36);
    setActivePost(null);
    setActiveChapterId(chapter.id);
    setContentJson(EMPTY_DOCUMENT);
    setContentHtml('<p></p>');
    setEditorKey(`new-${chapter.id}-${Date.now()}`);
    articleForm.resetFields();
    articleForm.setFieldsValue({
      categoryId,
      chapterId: chapter.id,
      tagIds: [],
      visibility: 'public',
      memberOnly: false,
      contentJson: EMPTY_DOCUMENT,
      contentHtml: '<p></p>',
      contentSchemaVersion: 1,
    });
    setSaveState('unsaved');
    setLastChangeAt(0);
  }, [articleForm]);

  const refreshOutline = useCallback(async () => {
    if (!bookId) return null;
    const res = await getBlogBook(bookId);
    setBook(res.data);
    setOutline(res.data.chapters || []);
    return res.data;
  }, [bookId]);

  const openPost = useCallback(async (postId: BlogId) => {
    articleSlugAutoRef.current = false;
    setPostLoading(true);
    try {
      const res = await getBlogPost(postId);
      const post = res.data;
      setActivePost(post);
      setActiveChapterId(post.chapterId);
      setContentJson(post.contentJson || EMPTY_DOCUMENT);
      setContentHtml(post.contentHtml || '<p></p>');
      setEditorKey(String(post.id));
      articleForm.resetFields();
      articleForm.setFieldsValue({
        ...post,
        chapterId: post.chapterId,
        memberOnly: post.memberOnly === 1,
        tagIds: post.tags?.map((item) => item.id) || [],
      });
      setSaveState('saved');
      setLastChangeAt(0);
    } finally {
      setPostLoading(false);
    }
  }, [articleForm]);

  useEffect(() => {
    if (!bookId) return;
    setLoading(true);
    if (creatingBook) {
      void Promise.all([listBlogTags(), listBlogCategories()]).then(([tagRes, categoryRes]) => {
        setTags(tagRes.data);
        setCategories(categoryRes.data);
        bookSlugAutoRef.current = true;
        bookSlugSeedRef.current = Date.now().toString(36);
        bookForm.resetFields();
        bookForm.setFieldsValue({ status: 'disabled', memberOnly: 0, sort: 0 } as BlogBookSaveRequest);
        setBookSettingsOpen(true);
      }).finally(() => setLoading(false));
      return;
    }
    void Promise.all([
      getBlogBook(bookId),
      listBlogTags(),
      listBlogCategories(),
    ]).then(async ([bookRes, tagRes, categoryRes]) => {
      const detail = bookRes.data;
      setBook(detail);
      setOutline(detail.chapters || []);
      setTags(tagRes.data);
      setCategories(categoryRes.data);
      const requestedChapter = requestedNewPost
        ? detail.chapters?.find((chapter) => String(chapter.id) === requestedChapterId)
        : undefined;
      if (requestedChapter) {
        prepareNewPost(requestedChapter, detail.categoryId);
        return;
      }
      const requestedPost = requestedEditPostId
        ? detail.chapters?.flatMap((chapter) => chapter.posts || []).find((post) => String(post.id) === requestedEditPostId)
        : undefined;
      if (requestedPost) {
        await openPost(requestedPost.id);
        return;
      }
      const firstPost = detail.chapters?.flatMap((chapter) => chapter.posts || [])[0];
      if (firstPost) await openPost(firstPost.id);
    }).finally(() => setLoading(false));
  }, [bookForm, bookId, creatingBook, openPost, prepareNewPost, requestedChapterId, requestedEditPostId, requestedNewPost]);

  const markChanged = () => {
    setSaveState('unsaved');
    setLastChangeAt(Date.now());
  };

  const saveCurrent = useCallback(async (silent = false): Promise<BlogId | undefined> => {
    if (!book || !activeChapterId) return undefined;
    let values: BlogPostSaveRequest;
    try {
      values = await articleForm.validateFields();
    } catch {
      if (!silent) message.warning('请先补全标题、Slug 和可见性');
      return undefined;
    }
    setSaveState('saving');
    try {
      const params: BlogPostSaveRequest = {
        ...values,
        id: activePost?.id,
        version: activePost?.version,
        categoryId: book.categoryId,
        chapterId: activeChapterId,
        tagIds: values.tagIds || [],
        memberOnly: values.memberOnly ? 1 : 0,
        contentJson,
        contentHtml,
        contentSchemaVersion: 1,
      };
      let savedId = activePost?.id;
      if (activePost) {
        await updateBlogPost(params);
      } else {
        const res = await addBlogPost(params);
        savedId = res.data;
      }
      if (!savedId) return undefined;
      const detailRes = await getBlogPost(savedId);
      const savedPost = detailRes.data;
      setActivePost(savedPost);
      setEditorKey(String(savedPost.id));
      articleForm.setFieldsValue({
        ...savedPost,
        memberOnly: savedPost.memberOnly === 1,
        tagIds: savedPost.tags?.map((item) => item.id) || [],
      });
      setSaveState('saved');
      setLastChangeAt(0);
      await refreshOutline();
      if (!silent) message.success('文章草稿已保存');
      return savedId;
    } catch (error) {
      setSaveState('error');
      if (!silent) message.error('保存失败，请稍后重试');
      throw error;
    }
  }, [activeChapterId, activePost, articleForm, book, contentHtml, contentJson, refreshOutline]);

  useEffect(() => {
    if (!activePost || saveState !== 'unsaved' || !lastChangeAt) return;
    const timer = window.setTimeout(() => {
      void saveCurrent(true);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [activePost, lastChangeAt, saveCurrent, saveState]);

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveCurrent(false);
      }
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [saveCurrent]);

  const startNewPost = (chapter: BlogChapterVO) => {
    prepareNewPost(chapter, book?.categoryId);
  };

  const openChapterModal = (chapter?: BlogChapterVO) => {
    setEditingChapter(chapter || null);
    chapterForm.resetFields();
    chapterForm.setFieldsValue(chapter || {});
    setChapterModalOpen(true);
  };

  const openAssign = async (chapter: BlogChapterVO) => {
    const res = await listBlogPosts({ current: 1, pageSize: 100, standaloneOnly: true });
    setStandalonePosts(res.data.records);
    setAssignChapter(chapter);
    setAssignPostId(undefined);
    setAssignOpen(true);
  };

  const persistOutline = async (next: BlogChapterVO[]) => {
    if (!book) return;
    setOutline(next);
    try {
      await reorderBlogOutline(book.id, next.map((chapter) => ({
        chapterId: chapter.id,
        postIds: (chapter.posts || []).map((post) => post.id),
      })));
      await refreshOutline();
      message.success('目录顺序已保存');
    } finally {
      dragItemRef.current = null;
    }
  };

  const dropChapter = (targetChapterId: BlogId) => {
    const dragItem = dragItemRef.current;
    if (!dragItem || dragItem.type !== 'chapter' || sameId(dragItem.chapterId, targetChapterId)) return;
    const next = [...outline];
    const sourceIndex = next.findIndex((item) => sameId(item.id, dragItem.chapterId));
    const targetIndex = next.findIndex((item) => sameId(item.id, targetChapterId));
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [moved] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, moved);
    void persistOutline(next);
  };

  const dropPost = (targetChapterId: BlogId, targetPostId?: BlogId) => {
    const dragItem = dragItemRef.current;
    if (!dragItem || dragItem.type !== 'post' || sameId(dragItem.postId, targetPostId)) return;
    const next = outline.map((chapter) => ({ ...chapter, posts: [...(chapter.posts || [])] }));
    const sourceChapter = next.find((chapter) => sameId(chapter.id, dragItem.chapterId));
    const targetChapter = next.find((chapter) => sameId(chapter.id, targetChapterId));
    if (!sourceChapter || !targetChapter) return;
    const sourceIndex = (sourceChapter.posts || []).findIndex((post) => sameId(post.id, dragItem.postId));
    if (sourceIndex < 0) return;
    const [moved] = (sourceChapter.posts || []).splice(sourceIndex, 1);
    const targetPosts = targetChapter.posts || [];
    const targetIndex = targetPostId ? targetPosts.findIndex((post) => sameId(post.id, targetPostId)) : -1;
    targetPosts.splice(targetIndex < 0 ? targetPosts.length : targetIndex, 0, moved);
    targetChapter.posts = targetPosts;
    void persistOutline(next);
  };

  const filteredOutline = useMemo(() => {
    const keyword = outlineSearch.trim().toLowerCase();
    if (!keyword) return outline;
    return outline
      .map((chapter) => ({
        ...chapter,
        posts: (chapter.posts || []).filter((post) => post.title.toLowerCase().includes(keyword)),
      }))
      .filter((chapter) => chapter.title.toLowerCase().includes(keyword) || (chapter.posts || []).length > 0);
  }, [outline, outlineSearch]);

  const activeChapter = outline.find((chapter) => sameId(chapter.id, activeChapterId));
  const editorTextLength = contentHtml.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length;
  const saveLabel = saveState === 'saving' ? '保存中' : saveState === 'error' ? '保存失败' : saveState === 'unsaved' ? '有未保存修改' : '已保存';

  const openBookSettings = () => {
    if (book) {
      bookSlugAutoRef.current = false;
      bookForm.resetFields();
      bookForm.setFieldsValue(book);
    }
    setBookSettingsOpen(true);
  };

  const uploadBookCover = async (options: UploadRequestOption) => {
    const file = options.file as File;
    const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
      || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!supported) {
      const error = new Error('教程书封面仅支持 JPG、PNG、WebP');
      message.error(error.message);
      options.onError?.(error);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      const error = new Error('教程书封面不能超过 20MB');
      message.error(error.message);
      options.onError?.(error);
      return;
    }
    try {
      const res = await uploadBlogMedia(file, 'image');
      bookForm.setFieldValue('coverUrl', res.data);
      options.onSuccess?.(res.data);
      message.success('教程书封面上传成功');
    } catch (error) {
      options.onError?.(error as Error);
    }
  };

  const bookSettingsModal = (
    <Modal
      title={creatingBook ? '创建教程书' : '书籍设置'}
      open={bookSettingsOpen}
      forceRender
      width={680}
      okText={creatingBook ? '创建并进入工作台' : '保存'}
      onCancel={() => {
        setBookSettingsOpen(false);
        if (creatingBook) navigate('/tutorial-assets/books');
      }}
      onOk={() => bookForm.submit()}
    >
      <Form
        form={bookForm}
        layout="vertical"
        onValuesChange={(changedValues) => {
          if (Object.prototype.hasOwnProperty.call(changedValues, 'slug')) bookSlugAutoRef.current = false;
          if (Object.prototype.hasOwnProperty.call(changedValues, 'title') && bookSlugAutoRef.current) {
            bookForm.setFieldValue('slug', generateBlogSlug(changedValues.title, 'book', bookSlugSeedRef.current));
          }
        }}
        onFinish={async (values) => {
          const res = await saveBlogBook({ ...values, id: book?.id });
          setBookSettingsOpen(false);
          if (creatingBook) {
            message.success('教程书已创建，正在进入工作台');
            navigate(`/tutorial-assets/books/${res.data}/workspace`, { replace: true });
            return;
          }
          await refreshOutline();
          message.success('书籍资料已保存');
        }}
      >
        <Form.Item name="title" label="教程书名称" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
        <Form.Item
          name="slug"
          label="Slug"
          extra="根据名称自动生成，用于教程链接；也可以手动修改"
          rules={[{ required: true }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '仅支持小写字母、数字和中划线' }]}
        >
          <Input placeholder="自动生成" />
        </Form.Item>
        <Form.Item
          name="categoryId"
          label="教程分类"
          rules={[{ required: true }]}
          extra={categories.filter((item) => item.status === 'enabled').length === 0
            ? <Button type="link" size="small" onClick={() => navigate('/tutorial-assets/categories')}>暂无可用分类，去创建</Button>
            : undefined}
        >
          <Select options={categories.filter((item) => item.status === 'enabled').map((item) => ({ label: item.name, value: item.id }))} />
        </Form.Item>
        <Form.Item name="summary" label="简介"><Input.TextArea rows={4} maxLength={1000} showCount /></Form.Item>
        <Form.Item
          name="memberOnly"
          label="教程权限"
          rules={[{ required: true }]}
          extra="免费教程中仍可单独设置会员文章；会员专享教程的所有文章都需要有效会员。"
        >
          <Radio.Group optionType="button" buttonStyle="solid">
            <Radio.Button value={0}>免费教程</Radio.Button>
            <Radio.Button value={1}>会员专享</Radio.Button>
          </Radio.Group>
        </Form.Item>
        <Form.Item label="教程书封面" extra="支持 JPG、PNG、WebP，最大 20MB；推荐使用 16:9 横版封面（1600 × 900）">
          <div className="tutorial-book-cover-field">
            <div className="tutorial-book-cover-field__preview">
              {bookCoverUrl ? (
                <Image src={String(bookCoverUrl)} alt="教程书封面预览" />
              ) : (
                <div className="tutorial-book-cover-field__placeholder"><FileImageOutlined /></div>
              )}
            </div>
            <div className="tutorial-book-cover-field__controls">
              <Space.Compact block>
                <Form.Item name="coverUrl" noStyle>
                  <Input allowClear placeholder="上传封面或填写 HTTPS 图片地址" />
                </Form.Item>
                <Upload
                  accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                  showUploadList={false}
                  customRequest={uploadBookCover}
                >
                  <Button icon={<UploadOutlined />}>上传封面</Button>
                </Upload>
              </Space.Compact>
              {bookCoverUrl && <Button type="link" danger onClick={() => bookForm.setFieldValue('coverUrl', '')}>移除封面</Button>}
            </div>
          </div>
        </Form.Item>
        <Space size="large">
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select style={{ width: 160 }} options={[{ label: '已启用', value: 'enabled' }, { label: '已停用', value: 'disabled' }]} />
          </Form.Item>
          <Form.Item name="sort" label="排序"><InputNumber precision={0} /></Form.Item>
        </Space>
        <Form.Item name="seoTitle" label="SEO 标题"><Input maxLength={255} /></Form.Item>
        <Form.Item name="seoDescription" label="SEO 描述"><Input.TextArea rows={3} maxLength={512} /></Form.Item>
      </Form>
    </Modal>
  );

  if (loading) {
    return <div className="tutorial-workspace-loading"><Spin size="large" /></div>;
  }

  if (creatingBook && !book) {
    return (
      <div className="tutorial-workspace tutorial-workspace--creating">
        <header className="tutorial-workspace__topbar">
          <div className="tutorial-workspace__book-identity">
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/tutorial-assets/books')}>教程书</Button>
            <span className="tutorial-workspace__divider" />
            <Typography.Text strong className="tutorial-workspace__book-title">新建教程书</Typography.Text>
          </div>
        </header>
        <main className="tutorial-workspace__create-empty">
          <Empty description="先设置教程书名称与分类，创建后即可编排章节并写文章">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setBookSettingsOpen(true)}>设置教程书</Button>
          </Empty>
        </main>
        {bookSettingsModal}
      </div>
    );
  }

  if (!book) {
    return <div className="tutorial-workspace-loading"><Empty description="教程书不存在" /></div>;
  }

  return (
    <div className={`tutorial-workspace${inspectorOpen ? '' : ' tutorial-workspace--inspector-closed'}`}>
      <header className="tutorial-workspace__topbar">
        <div className="tutorial-workspace__book-identity">
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/tutorial-assets/books')}>教程书</Button>
          <span className="tutorial-workspace__divider" />
          <Typography.Text strong className="tutorial-workspace__book-title">{book.title}</Typography.Text>
          {book.status === 'enabled' ? <Tag color="green">已启用</Tag> : <Tag>已停用</Tag>}
          <Typography.Text type={saveState === 'error' ? 'danger' : 'secondary'} className="tutorial-workspace__save-state">
            {saveState === 'saving' ? <SyncOutlined spin /> : <SaveOutlined />} {saveLabel}
          </Typography.Text>
        </div>
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => message.info('公开教程页面将在后续接入')}>预览</Button>
          <Button icon={<SaveOutlined />} onClick={() => void saveCurrent(false)} disabled={!activeChapterId}>保存</Button>
          <Button
            type="primary"
            disabled={!activeChapterId}
            loading={publishing}
            onClick={async () => {
              const messageKey = 'tutorial-post-publish';
              setPublishing(true);
              message.loading({ key: messageKey, content: '正在发布...', duration: 0 });
              try {
                const savedId = await saveCurrent(true);
                if (!savedId) {
                  message.warning({ key: messageKey, content: '发布失败：请先补全文章标题、Slug 和可见范围' });
                  return;
                }
                const result = await publishBlogPost(savedId);
                if (result.data !== true) throw new Error('后端未确认发布成功');
                await openPost(savedId);
                await refreshOutline();
                message.success({ key: messageKey, content: '发布成功' });
              } catch (error) {
                const reason = error instanceof Error
                  ? error.message
                  : (error && typeof error === 'object' && 'message' in error ? String(error.message) : '请稍后重试');
                message.error({ key: messageKey, content: `发布失败：${reason}` });
              } finally {
                setPublishing(false);
              }
            }}
          >
            发布
          </Button>
          <Button icon={<SettingOutlined />} aria-label="切换文章设置" onClick={() => setInspectorOpen((value) => !value)} />
          <Button icon={<MoreOutlined />} aria-label="书籍设置" onClick={openBookSettings} />
        </Space>
      </header>

      <Form
        form={articleForm}
        component={false}
        onValuesChange={(changedValues) => {
          if (Object.prototype.hasOwnProperty.call(changedValues, 'slug')) articleSlugAutoRef.current = false;
          if (Object.prototype.hasOwnProperty.call(changedValues, 'title') && articleSlugAutoRef.current) {
            articleForm.setFieldValue('slug', generateBlogSlug(changedValues.title, 'article', articleSlugSeedRef.current));
          }
          markChanged();
        }}
      >
        <div className="tutorial-workspace__body">
          <aside className="tutorial-outline-panel">
            <div className="tutorial-outline-panel__header">
              <Typography.Text strong>目录编排</Typography.Text>
              <Typography.Text type="secondary">{book.chapterCount || 0} 章 · {book.postCount || 0} 篇</Typography.Text>
            </div>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="搜索章节或文章"
              value={outlineSearch}
              onChange={(event) => setOutlineSearch(event.target.value)}
            />
            <Dropdown.Button
              type="primary"
              icon={<MoreOutlined />}
              menu={{
                items: [
                  { key: 'chapter', label: '新建章节', icon: <PlusOutlined /> },
                  { key: 'book-settings', label: '书籍设置', icon: <SettingOutlined /> },
                ],
                onClick: ({ key }) => {
                  if (key === 'chapter') openChapterModal();
                  else openBookSettings();
                },
              }}
              onClick={() => outline[0] ? startNewPost(outline[0]) : openChapterModal()}
            >
              {outline.length ? '新建文章' : '新建第一章'}
            </Dropdown.Button>

            <div className="tutorial-outline-tree">
              {filteredOutline.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={outline.length ? '没有匹配内容' : '还没有章节'}>
                  {!outline.length && <Button type="primary" size="small" onClick={() => openChapterModal()}>新建第一章</Button>}
                </Empty>
              ) : filteredOutline.map((chapter, chapterIndex) => {
                const chapterMenu: MenuProps = {
                  items: [
                    { key: 'new', label: '新建文章', icon: <FileAddOutlined /> },
                    { key: 'assign', label: '加入已有文章', icon: <LinkOutlined /> },
                    { key: 'edit', label: '编辑章节', icon: <EditOutlined /> },
                    { key: 'delete', label: '删除章节', icon: <DeleteOutlined />, danger: true },
                  ],
                  onClick: async ({ key }) => {
                    if (key === 'new') startNewPost(chapter);
                    if (key === 'assign') await openAssign(chapter);
                    if (key === 'edit') openChapterModal(chapter);
                    if (key === 'delete') {
                      await deleteBlogChapter(chapter.id);
                      message.success('章节已删除');
                      await refreshOutline();
                    }
                  },
                };
                return (
                  <section
                    key={String(chapter.id)}
                    className="tutorial-outline-chapter"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => { event.preventDefault(); dropChapter(chapter.id); }}
                  >
                    <div className="tutorial-outline-chapter__header">
                      <Space size={6}>
                        <HolderOutlined
                          className="tutorial-outline-drag"
                          draggable
                          onDragStart={(event) => {
                            event.stopPropagation();
                            dragItemRef.current = { type: 'chapter', chapterId: chapter.id };
                          }}
                        />
                        <Typography.Text strong ellipsis>{`第 ${chapterIndex + 1} 章 ${chapter.title}`}</Typography.Text>
                      </Space>
                      <Space size={2}>
                        <Typography.Text type="secondary">{chapter.posts?.length || 0}</Typography.Text>
                        <Button type="text" size="small" icon={<PlusOutlined />} aria-label={`在${chapter.title}中新建文章`} onClick={() => startNewPost(chapter)} />
                        <Dropdown menu={chapterMenu} trigger={['click']}>
                          <Button type="text" size="small" icon={<MoreOutlined />} aria-label={`${chapter.title}更多操作`} />
                        </Dropdown>
                      </Space>
                    </div>
                    <div
                      className="tutorial-outline-chapter__posts"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => { event.preventDefault(); event.stopPropagation(); dropPost(chapter.id); }}
                    >
                      {(chapter.posts || []).map((post) => (
                        <div
                          key={String(post.id)}
                          className={`tutorial-outline-post${sameId(post.id, activePost?.id) ? ' tutorial-outline-post--active' : ''}`}
                          draggable
                          onDragStart={(event) => {
                            event.stopPropagation();
                            dragItemRef.current = { type: 'post', postId: post.id, chapterId: chapter.id };
                          }}
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={(event) => { event.preventDefault(); event.stopPropagation(); dropPost(chapter.id, post.id); }}
                          onClick={() => void openPost(post.id)}
                        >
                          <HolderOutlined className="tutorial-outline-drag" />
                          <FileTextOutlined />
                          <Typography.Text ellipsis>{post.title}</Typography.Text>
                          <Dropdown
                            trigger={['click']}
                            menu={{
                              items: [{ key: 'remove', label: '移出教程书', danger: true, icon: <DeleteOutlined /> }],
                              onClick: async ({ domEvent }) => {
                                domEvent.stopPropagation();
                                await assignBlogPost(post.id);
                                if (sameId(post.id, activePost?.id)) {
                                  setActivePost(null);
                                  setActiveChapterId(undefined);
                                }
                                await refreshOutline();
                                message.success('文章已移出教程书');
                              },
                            }}
                          >
                            <Button type="text" size="small" icon={<MoreOutlined />} aria-label={`${post.title}更多操作`} onClick={(event) => event.stopPropagation()} />
                          </Dropdown>
                        </div>
                      ))}
                      {!activePost && sameId(activeChapterId, chapter.id) && (
                        <div className="tutorial-outline-post tutorial-outline-post--active tutorial-outline-post--draft">
                          <span />
                          <FileTextOutlined />
                          <Typography.Text ellipsis>{draftTitle || '未命名文章'}</Typography.Text>
                          <Tag color="orange">新建</Tag>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
            <div className="tutorial-outline-panel__footer">拖拽章节或文章可调整顺序</div>
          </aside>

          <main className="tutorial-editor-panel">
            {postLoading ? <div className="tutorial-editor-panel__empty"><Spin /></div> : !activeChapterId ? (
              <div className="tutorial-editor-panel__empty">
                <Empty description="从左侧选择文章，或先新建一篇教程">
                  {outline[0] && <Button type="primary" icon={<PlusOutlined />} onClick={() => startNewPost(outline[0])}>新建教程</Button>}
                </Empty>
              </div>
            ) : (
              <>
                <div className="tutorial-editor-panel__breadcrumb">
                  <Typography.Text type="secondary">{activeChapter?.title || '未命名章节'}</Typography.Text>
                  <span>/</span>
                  <Typography.Text>{activePost?.title || '新文章'}</Typography.Text>
                </div>
                <Form.Item name="title" rules={[{ required: true, message: '请输入文章标题' }]} noStyle>
                  <Input.TextArea
                    className="tutorial-editor-panel__title"
                    autoSize={{ minRows: 1, maxRows: 2 }}
                    placeholder="输入文章标题"
                    maxLength={255}
                  />
                </Form.Item>
                <BlogEditor
                  key={editorKey}
                  variant="workspace"
                  initialContentJson={contentJson}
                  onChange={(json, html) => {
                    setContentJson((previous) => {
                      if (previous !== json) markChanged();
                      return json;
                    });
                    setContentHtml(html);
                  }}
                />
                <footer className="tutorial-editor-panel__footer">
                  <Space size="large">
                    <Typography.Text type="secondary">字数：{editorTextLength}</Typography.Text>
                    <Typography.Text type="secondary">预计阅读 {Math.max(1, Math.ceil(editorTextLength / 400))} 分钟</Typography.Text>
                  </Space>
                  <Typography.Text type="secondary">{saveLabel}{saveState === 'saved' ? ' · Ctrl+S 可手动保存' : ''}</Typography.Text>
                </footer>
              </>
            )}
          </main>

          <aside className="tutorial-inspector-panel">
            <div className="tutorial-inspector-panel__header">
              <Typography.Text strong>文章设置</Typography.Text>
              <Button type="text" size="small" onClick={() => setInspectorOpen(false)}>收起</Button>
            </div>
            {!activeChapterId ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="选择文章后设置" /> : (
              <div className="tutorial-inspector-panel__content">
                <Form.Item label="发布状态">
                  <Select
                    disabled
                    value={activePost ? postStatusLabel[activePost.status] : '新建草稿'}
                    options={[{ label: activePost ? postStatusLabel[activePost.status] : '新建草稿', value: activePost ? postStatusLabel[activePost.status] : '新建草稿' }]}
                  />
                </Form.Item>
                <Form.Item name="visibility" label="可见范围" rules={[{ required: true, message: '请选择可见范围' }]}>
                  <Select options={[
                    { label: '公开可见', value: 'public' },
                    { label: '登录可见', value: 'login' },
                    { label: '仅管理员', value: 'admin' },
                  ]} />
                </Form.Item>
                <Form.Item name="memberOnly" label="会员专享" valuePropName="checked">
                  <Switch checkedChildren="会员" unCheckedChildren="普通" />
                </Form.Item>
                <Typography.Paragraph type="secondary" className="tutorial-inspector-panel__hint">公开后，符合书籍状态的用户可以查看该文章。</Typography.Paragraph>
                <Form.Item name="tagIds" label="标签">
                  <Select mode="multiple" allowClear options={tags.filter((item) => item.status === 'enabled').map((item) => ({ label: item.name, value: item.id }))} />
                </Form.Item>
                <Form.Item name="slug" label="Slug" rules={[{ required: true, message: '请输入文章 Slug' }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '仅支持小写字母、数字和中划线' }]}>
                  <Input placeholder="variables-and-types" />
                </Form.Item>
                <Typography.Paragraph type="secondary" className="tutorial-inspector-panel__hint">用于生成文章链接，仅支持小写字母、数字和中划线。</Typography.Paragraph>
                <Form.Item name="coverUrl" label="封面图">
                  <Input placeholder="封面图片地址" />
                </Form.Item>
                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    void uploadBlogMedia(file as File, 'image').then((res) => {
                      articleForm.setFieldValue('coverUrl', res.data);
                      markChanged();
                      message.success('封面已上传');
                    });
                    return false;
                  }}
                >
                  <Button block icon={<UploadOutlined />}>上传封面</Button>
                </Upload>
                {coverUrl && <Image className="tutorial-inspector-panel__cover" src={String(coverUrl)} />}
                <Collapse
                  ghost
                  className="tutorial-inspector-panel__collapse"
                  items={[
                    {
                      key: 'seo',
                      label: 'SEO 设置',
                      children: (
                        <>
                          <Form.Item name="seoTitle" label="SEO 标题"><Input maxLength={255} /></Form.Item>
                          <Form.Item name="seoDescription" label="SEO 描述"><Input.TextArea rows={4} maxLength={512} /></Form.Item>
                        </>
                      ),
                    },
                    {
                      key: 'history',
                      label: '历史版本',
                      children: <Typography.Text type="secondary">每次保存都会保留文章版本记录。</Typography.Text>,
                    },
                  ]}
                />
              </div>
            )}
          </aside>
        </div>
      </Form>

      <Modal
        title={editingChapter ? '编辑章节' : '新建章节'}
        open={chapterModalOpen}
        forceRender
        okText="保存"
        onCancel={() => setChapterModalOpen(false)}
        onOk={() => chapterForm.submit()}
      >
        <Form form={chapterForm} layout="vertical" onFinish={async (values) => {
          await saveBlogChapter({ ...values, id: editingChapter?.id, bookId: book.id });
          setChapterModalOpen(false);
          await refreshOutline();
          message.success('章节已保存');
        }}>
          <Form.Item name="title" label="章节标题" rules={[{ required: true }]}><Input maxLength={255} /></Form.Item>
          <Form.Item name="description" label="章节说明"><Input.TextArea rows={4} maxLength={1000} showCount /></Form.Item>
        </Form>
      </Modal>

      {bookSettingsModal}

      <Modal
        title={`加入已有文章${assignChapter ? ` · ${assignChapter.title}` : ''}`}
        open={assignOpen}
        okText="加入章节"
        okButtonProps={{ disabled: !assignPostId }}
        onCancel={() => setAssignOpen(false)}
        onOk={async () => {
          if (!assignPostId || !assignChapter) return;
          await assignBlogPost(assignPostId, assignChapter.id);
          setAssignOpen(false);
          await refreshOutline();
          message.success('文章已加入章节');
        }}
      >
        <Select
          showSearch
          allowClear
          style={{ width: '100%' }}
          placeholder="选择一篇独立文章"
          value={assignPostId}
          onChange={setAssignPostId}
          optionFilterProp="label"
          options={standalonePosts.map((post) => ({ label: post.title, value: post.id }))}
        />
      </Modal>
    </div>
  );
}
