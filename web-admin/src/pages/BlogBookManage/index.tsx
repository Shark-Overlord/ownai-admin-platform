import {
  BookOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import {
  Button,
  Card,
  Drawer,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Radio,
  Select,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  Upload,
} from 'antd';
import type { UploadRequestOption } from 'rc-upload/lib/interface';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteBlogBook,
  listBlogBooks,
  listBlogCategories,
  saveBlogBook,
  uploadBlogMedia,
  type BlogBookQuery,
  type BlogBookSaveRequest,
  type BlogBookVO,
  type BlogCategoryVO,
} from '../../api/blog';
import './index.css';

const bookStatus = (status: BlogBookVO['status']) => (
  status === 'enabled' ? <Tag color="green">已启用</Tag> : <Tag>已停用</Tag>
);

export default function BlogBookManage() {
  const navigate = useNavigate();
  const [filterForm] = Form.useForm<BlogBookQuery>();
  const [bookForm] = Form.useForm<BlogBookSaveRequest>();
  const [categories, setCategories] = useState<BlogCategoryVO[]>([]);
  const [books, setBooks] = useState<BlogBookVO[]>([]);
  const [bookTotal, setBookTotal] = useState(0);
  const [listLoading, setListLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<BlogBookVO | null>(null);
  const [savingBook, setSavingBook] = useState(false);
  const [statusChangingId, setStatusChangingId] = useState<string>();
  const bookCoverUrl = Form.useWatch('coverUrl', bookForm);
  const enabledCategories = categories.filter((item) => item.status === 'enabled');

  const loadBooks = async (filters?: BlogBookQuery) => {
    setListLoading(true);
    try {
      const values = filters ?? filterForm.getFieldsValue();
      const res = await listBlogBooks({
        current: 1,
        pageSize: 100,
        keyword: values.keyword,
        categoryId: values.categoryId,
        status: values.status,
      });
      setBooks(res.data.records);
      setBookTotal(res.data.total);
    } finally {
      setListLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([
      listBlogCategories().then((res) => setCategories(res.data)),
      listBlogBooks({ current: 1, pageSize: 100 }).then((res) => {
        setBooks(res.data.records);
        setBookTotal(res.data.total);
      }),
    ]);
  }, []);

  const openEditDrawer = (book: BlogBookVO) => {
    setEditingBook(book);
    bookForm.resetFields();
    bookForm.setFieldsValue({
      categoryId: book.categoryId,
      title: book.title,
      slug: book.slug,
      summary: book.summary,
      coverUrl: book.coverUrl,
      seoTitle: book.seoTitle,
      seoDescription: book.seoDescription,
      memberOnly: book.memberOnly,
      status: book.status,
      sort: book.sort,
    });
    setDrawerOpen(true);
  };

  const changeBookStatus = async (book: BlogBookVO) => {
    const nextStatus = book.status === 'enabled' ? 'disabled' : 'enabled';
    setStatusChangingId(String(book.id));
    try {
      await saveBlogBook({
        id: book.id,
        categoryId: book.categoryId,
        title: book.title,
        slug: book.slug,
        summary: book.summary,
        coverUrl: book.coverUrl,
        seoTitle: book.seoTitle,
        seoDescription: book.seoDescription,
        memberOnly: book.memberOnly,
        status: nextStatus,
        sort: book.sort,
      });
      message.success(nextStatus === 'enabled' ? '教程书已启用' : '教程书已停用');
      await loadBooks();
    } finally {
      setStatusChangingId(undefined);
    }
  };

  const uploadCover = async (options: UploadRequestOption) => {
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
      message.success('封面上传成功');
    } catch (error) {
      options.onError?.(error as Error);
    }
  };

  const renderBookRow = (book: BlogBookVO) => (
    <div className="tutorial-book-header">
      <div className="tutorial-book-heading">
        <span className={`tutorial-book-icon${book.coverUrl ? ' tutorial-book-icon--cover' : ''}`}>
          {book.coverUrl ? <img src={book.coverUrl} alt={`${book.title}封面`} /> : <BookOutlined />}
        </span>
        <div className="tutorial-book-title-block">
          <Space size={8} wrap>
            <Typography.Text strong className="tutorial-book-title">{book.title}</Typography.Text>
            {bookStatus(book.status)}
            {book.memberOnly === 1
              ? <Tag color="gold">会员专享</Tag>
              : <Tag color="blue">免费教程</Tag>}
          </Space>
          <Typography.Text type="secondary" className="tutorial-book-meta">
            {book.category?.name || '未分类'} · {book.chapterCount || 0} 章 · {book.publishedPostCount || 0}/{book.postCount || 0} 篇已发布
          </Typography.Text>
        </div>
      </div>
      <Space className="tutorial-book-actions" wrap>
        <Popconfirm
          title={book.status === 'enabled' ? '确认停用这本教程书？' : '确认启用这本教程书？'}
          description={book.status === 'enabled' ? '停用后，整本教程将不再通过前台接口展示。' : '启用后，已发布文章将恢复前台访问。'}
          onConfirm={() => changeBookStatus(book)}
        >
          <Button size="small" loading={statusChangingId === String(book.id)}>
            {book.status === 'enabled' ? '停用' : '启用'}
          </Button>
        </Popconfirm>
        <Button
          size="small"
          type="primary"
          icon={<BookOutlined />}
          onClick={() => navigate(`/tutorial-assets/books/${book.id}/workspace`)}
        >
          进入工作台
        </Button>
        <Button size="small" icon={<EditOutlined />} onClick={() => openEditDrawer(book)}>编辑资料</Button>
        <Popconfirm
          title="确认删除教程书？"
          description="只有没有章节的教程书可以删除。"
          onConfirm={async () => {
            await deleteBlogBook(book.id);
            message.success('教程书已删除');
            await loadBooks();
          }}
        >
          <Button danger size="small" icon={<DeleteOutlined />} aria-label={`删除${book.title}`} />
        </Popconfirm>
      </Space>
    </div>
  );

  return (
    <PageContainer title="教程书" subTitle="选择一本教程书，进入独立工作台管理目录与文章">
      <Card className="tutorial-book-filter" variant="borderless">
        <Form form={filterForm} layout="inline" onFinish={(values) => void loadBooks(values)}>
          <Form.Item name="keyword" label="教程书">
            <Input allowClear placeholder="搜索名称或 Slug" />
          </Form.Item>
          <Form.Item name="categoryId" label="分类">
            <Select
              allowClear
              placeholder="全部分类"
              style={{ width: 200 }}
              options={categories.map((item) => ({ label: item.name, value: item.id }))}
            />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              allowClear
              placeholder="全部状态"
              style={{ width: 140 }}
              options={[{ label: '已启用', value: 'enabled' }, { label: '已停用', value: 'disabled' }]}
            />
          </Form.Item>
          <Form.Item className="tutorial-book-filter-actions">
            <Space>
              <Button htmlType="submit" type="primary">查询</Button>
              <Button onClick={() => {
                filterForm.resetFields();
                void loadBooks({});
              }}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card className="tutorial-book-workspace" variant="borderless">
        <div className="tutorial-book-toolbar">
          <div>
            <Typography.Title level={4}>教程书列表</Typography.Title>
            <Typography.Text type="secondary">共 {bookTotal} 本；目录、章节和文章统一在工作台管理</Typography.Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={() => void loadBooks()}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tutorial-assets/books/new/workspace')}>新建教程书</Button>
          </Space>
        </div>

        <Spin spinning={listLoading}>
          {books.length === 0 ? (
            <div className="tutorial-book-empty">
              <Empty description="还没有教程书，先创建一本再继续添加章节">
                <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tutorial-assets/books/new/workspace')}>新建第一本教程书</Button>
              </Empty>
            </div>
          ) : (
            <div className="tutorial-book-list">
              {books.map((book) => (
                <div key={String(book.id)} className="tutorial-book-list-item">
                  {renderBookRow(book)}
                </div>
              ))}
            </div>
          )}
        </Spin>
      </Card>

      <Drawer
        title={editingBook ? `编辑教程书 · ${editingBook.title}` : '编辑教程书'}
        open={drawerOpen}
        width={720}
        onClose={() => setDrawerOpen(false)}
        extra={(
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={savingBook} onClick={() => bookForm.submit()}>保存</Button>
          </Space>
        )}
      >
        <Form
          form={bookForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!editingBook) return;
            setSavingBook(true);
            try {
              await saveBlogBook({ ...values, id: editingBook.id, status: editingBook.status });
              message.success('教程书资料已保存');
              setDrawerOpen(false);
              await loadBooks();
            } finally {
              setSavingBook(false);
            }
          }}
        >
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic',
                label: '基础信息',
                forceRender: true,
                children: (
                  <>
                    <Form.Item name="title" label="教程书名称" rules={[{ required: true, message: '请输入教程书名称' }]}>
                      <Input maxLength={255} />
                    </Form.Item>
                    <Form.Item
                      name="slug"
                      label="Slug"
                      extra="仅小写字母、数字和中划线，例如 programming-basics"
                      rules={[{ required: true, message: '请输入 Slug' }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Slug 格式不正确' }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item name="categoryId" label="教程分类" rules={[{ required: true, message: '请选择教程分类' }]}>
                      <Select options={enabledCategories.map((item) => ({ label: item.name, value: item.id }))} />
                    </Form.Item>
                    <Form.Item
                      name="memberOnly"
                      label="教程权限"
                      rules={[{ required: true, message: '请选择教程权限' }]}
                      extra="这里只控制教程书本身；书内文章仍可分别设置免费或会员专享。"
                    >
                      <Radio.Group optionType="button" buttonStyle="solid">
                        <Radio.Button value={0}>免费教程</Radio.Button>
                        <Radio.Button value={1}>会员专享</Radio.Button>
                      </Radio.Group>
                    </Form.Item>
                    <Form.Item name="summary" label="简介">
                      <Input.TextArea rows={6} maxLength={1000} showCount />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'appearance',
                label: '封面与展示',
                forceRender: true,
                children: (
                  <>
                    <Form.Item label="教程书封面" extra="支持 JPG、PNG、WebP，最大 20MB；推荐 16:9 横版封面（1600 × 900）">
                      <div className="tutorial-book-cover-field">
                        <div className="tutorial-book-cover-field__preview">
                          {bookCoverUrl ? (
                            <Image src={String(bookCoverUrl)} alt="教程书封面预览" />
                          ) : (
                            <div className="tutorial-book-cover-field__placeholder"><BookOutlined /></div>
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
                              customRequest={uploadCover}
                            >
                              <Button icon={<UploadOutlined />}>上传封面</Button>
                            </Upload>
                          </Space.Compact>
                          {bookCoverUrl && (
                            <Button type="link" danger onClick={() => bookForm.setFieldValue('coverUrl', '')}>移除封面</Button>
                          )}
                        </div>
                      </div>
                    </Form.Item>
                    <Form.Item name="sort" label="列表排序" extra="数值越小越靠前">
                      <InputNumber min={0} precision={0} />
                    </Form.Item>
                    <Typography.Paragraph type="secondary">
                      启用或停用请直接在教程书列表操作，避免编辑资料时误改前台状态。
                    </Typography.Paragraph>
                  </>
                ),
              },
              {
                key: 'seo',
                label: 'SEO 设置',
                forceRender: true,
                children: (
                  <>
                    <Form.Item name="seoTitle" label="SEO 标题">
                      <Input maxLength={255} />
                    </Form.Item>
                    <Form.Item name="seoDescription" label="SEO 描述">
                      <Input.TextArea rows={5} maxLength={512} showCount />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
        </Form>
      </Drawer>
    </PageContainer>
  );
}
