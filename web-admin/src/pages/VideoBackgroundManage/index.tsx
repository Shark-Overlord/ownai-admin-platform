import { useEffect, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Button,
  Col,
  Drawer,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Switch,
  Tabs,
  Tag,
  Upload,
  message,
} from 'antd';
import {
  CheckOutlined,
  DeleteOutlined,
  LockOutlined,
  PlusOutlined,
  StopOutlined,
  UnlockOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { listCategory, listTagsByCategory, type CategoryVO, type TagItem } from '../../api/category';
import { listTag, type TagVO } from '../../api/tag';
import {
  addVideoBackground,
  deleteVideoBackground,
  deleteVideoBackgroundBatch,
  listVideoBackgroundByPageForAdmin,
  offlineVideoBackgroundBatch,
  publishVideoBackgroundBatch,
  updateVideoBackground,
  updateVideoBackgroundMemberOnlyBatch,
  type VideoBackgroundVO,
} from '../../api/videoBackground';

const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

export default function VideoBackgroundManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<VideoBackgroundVO | null>(null);
  const [categories, setCategories] = useState<CategoryVO[]>([]);
  const [allTags, setAllTags] = useState<TagVO[]>([]);
  const [categoryTags, setCategoryTags] = useState<TagItem[]>([]);
  const [selectedRows, setSelectedRows] = useState<VideoBackgroundVO[]>([]);
  const [coverFiles, setCoverFiles] = useState<any[]>([]);
  const [previewFiles, setPreviewFiles] = useState<any[]>([]);
  const [sourceFiles, setSourceFiles] = useState<any[]>([]);
  const [previewing, setPreviewing] = useState<VideoBackgroundVO | null>(null);
  const previewVideoUrl = Form.useWatch('previewVideoUrl', form);
  const sourceVideoUrl = Form.useWatch('sourceVideoUrl', form);

  useEffect(() => {
    void Promise.all([listCategory(), listTag()]).then(([categoryResult, tagResult]) => {
      setCategories(categoryResult.data || []);
      setAllTags(tagResult.data || []);
    });
  }, []);

  const loadCategoryTags = async (categoryId?: string | number) => {
    if (!categoryId) {
      setCategoryTags([]);
      return;
    }
    const result = await listTagsByCategory(String(categoryId));
    setCategoryTags(result.data || []);
  };

  useEffect(() => {
    if (!drawerOpen) {
      return;
    }
    const categoryId = editing?.categoryId ?? editing?.category?.id;
    form.setFieldsValue({
      title: editing?.title,
      summary: editing?.summary,
      promptContent: editing?.promptContent,
      coverUrl: editing?.coverUrl,
      previewVideoUrl: editing?.previewVideoUrl,
      sourceVideoUrl: editing?.sourceVideoUrl,
      categoryId,
      tagIdList: editing?.tagList?.map((tag) => tag.id) || [],
      memberOnly: editing?.memberOnly === 1,
      status: editing?.status ?? 0,
      videoWidth: editing?.videoWidth,
      videoHeight: editing?.videoHeight,
      durationMs: editing?.durationMs,
      fileSize: editing?.fileSize,
      videoFormat: editing?.videoFormat,
      sort: editing?.sort ?? 0,
    });
    void loadCategoryTags(categoryId);
    setCoverFiles(editing?.coverUrl ? [{ uid: '-cover', name: 'cover', status: 'done', url: editing.coverUrl }] : []);
    setPreviewFiles(editing?.previewVideoUrl ? [{ uid: '-preview', name: 'preview video', status: 'done', url: editing.previewVideoUrl }] : []);
    setSourceFiles(editing?.sourceVideoUrl ? [{ uid: '-source', name: 'source video', status: 'done', url: editing.sourceVideoUrl }] : []);
  }, [drawerOpen, editing, form]);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ status: 0, memberOnly: false, sort: 0, tagIdList: [] });
    setCategoryTags([]);
    setCoverFiles([]);
    setPreviewFiles([]);
    setSourceFiles([]);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const validateVideo = (file: File, allowed: string[]) => {
    const suffix = file.name.split('.').pop()?.toLowerCase();
    if (!suffix || !allowed.includes(suffix)) {
      message.error(`仅支持 ${allowed.map((item) => item.toUpperCase()).join('、')}`);
      return Upload.LIST_IGNORE;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      message.error('单个视频不能超过 200MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };

  const getVideoMetadata = (file: File) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      form.setFieldsValue({
        videoWidth: video.videoWidth || undefined,
        videoHeight: video.videoHeight || undefined,
        durationMs: Number.isFinite(video.duration) ? Math.round(video.duration * 1000) : undefined,
        fileSize: file.size,
        videoFormat: file.name.split('.').pop()?.toLowerCase(),
      });
      URL.revokeObjectURL(objectUrl);
    };
    video.onerror = () => URL.revokeObjectURL(objectUrl);
    video.src = objectUrl;
  };

  const syncUploadedUrl = (field: string, setFiles: (files: any[]) => void) => (info: any) => {
    setFiles(info.fileList);
    if (info.file.status === 'done') {
      const response = info.file.response;
      if (response?.code === 0) {
        form.setFieldsValue({ [field]: response.data });
        message.success('上传成功');
      } else {
        message.error(response?.message || '上传失败');
      }
    } else if (info.file.status === 'error') {
      message.error('上传失败');
    }
    if (info.file.status === 'removed') {
      form.setFieldsValue({ [field]: undefined });
    }
  };

  const handleSave = async (values: any) => {
    const payload = {
      ...values,
      categoryId: values.categoryId ?? editing?.categoryId ?? editing?.category?.id,
      memberOnly: values.memberOnly ? 1 : 0,
      tagIdList: values.tagIdList || [],
    };
    if (editing) {
      await updateVideoBackground({ ...payload, id: editing.id });
      message.success('视频素材已更新');
    } else {
      await addVideoBackground(payload);
      message.success('视频素材已创建');
    }
    closeDrawer();
    actionRef.current?.reload();
  };

  const columns: any[] = [
    { title: 'ID', dataIndex: 'id', search: false, width: 82 },
    {
      title: '封面', dataIndex: 'coverUrl', search: false, width: 88,
      render: (_: unknown, record: VideoBackgroundVO) => record.coverUrl
        ? <Image src={record.coverUrl} width={60} height={42} style={{ objectFit: 'cover' }} preview /> : '-',
    },
    {
      title: '水印预览', dataIndex: 'previewVideoUrl', search: false, width: 170,
      render: (_: unknown, record: VideoBackgroundVO) => record.previewVideoUrl
        ? <video src={record.previewVideoUrl} controls preload="metadata" style={{ width: 150, height: 84, display: 'block', background: '#000', objectFit: 'contain' }} /> : '-',
    },
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true, search: { transform: (value: string) => ({ searchText: value }) } },
    {
      title: '原视频', dataIndex: 'sourceVideoUrl', search: false, width: 92,
      render: (_: unknown, record: VideoBackgroundVO) => record.sourceVideoUrl ? <Tag color="green">已上传</Tag> : <Tag>未上传</Tag>,
    },
    {
      title: '分类', dataIndex: 'categoryId', width: 130, valueType: 'select',
      fieldProps: { options: categories.map((item) => ({ label: item.name, value: item.id })), allowClear: true },
      render: (_: unknown, record: VideoBackgroundVO) => record.category?.name || '-',
    },
    {
      title: '标签', dataIndex: 'tagList', search: false, width: 220,
      render: (_: unknown, record: VideoBackgroundVO) => record.tagList?.length
        ? record.tagList.map((tag) => <Tag color="blue" key={tag.id}>{tag.name}</Tag>) : '-',
    },
    {
      title: '标签筛选', dataIndex: 'tagIdList', hideInTable: true, valueType: 'select',
      fieldProps: { mode: 'multiple', allowClear: true, showSearch: true, optionFilterProp: 'label', options: allTags.map((tag) => ({ label: tag.name, value: tag.id })) },
    },
    { title: '会员专享', dataIndex: 'memberOnly', width: 104, valueType: 'select', valueEnum: { 0: { text: '否', status: 'Default' }, 1: { text: '是', status: 'Success' } } },
    { title: '状态', dataIndex: 'status', width: 92, valueType: 'select', valueEnum: { 0: { text: '下架', status: 'Error' }, 1: { text: '上架', status: 'Success' } } },
    { title: '排序', dataIndex: 'sort', search: false, width: 72 },
    { title: '创建时间', dataIndex: 'createTime', search: false, valueType: 'dateTime', width: 168 },
    {
      title: '操作', valueType: 'option', fixed: 'right', width: 160,
      render: (_: unknown, record: VideoBackgroundVO) => [
        <Button key="preview" type="link" disabled={!record.previewVideoUrl} onClick={() => setPreviewing(record)}>预览</Button>,
        <Button key="edit" type="link" onClick={() => { setEditing(record); setDrawerOpen(true); }}>编辑</Button>,
        <Popconfirm key="delete" title="确认删除该视频素材？" onConfirm={async () => { await deleteVideoBackground({ id: record.id }); message.success('已删除'); actionRef.current?.reload(); }}>
          <Button type="link" danger>删除</Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer title="视频素材">
      <ProTable
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        cardBordered
        scroll={{ x: 1640 }}
        search={{ labelWidth: 'auto' }}
        request={async (params) => {
          const response = await listVideoBackgroundByPageForAdmin({ current: params.current || 1, pageSize: params.pageSize || 10, ...params });
          return { data: response.data.records, total: response.data.total, success: true };
        }}
        rowSelection={{ onChange: (_: React.Key[], rows: VideoBackgroundVO[]) => setSelectedRows(rows) }}
        toolBarRender={() => [
          <Button key="add" type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增视频素材</Button>,
          <Popconfirm key="publish" title="确认批量发布？" disabled={!selectedRows.length} onConfirm={async () => { await publishVideoBackgroundBatch({ ids: selectedRows.map((item) => item.id) }); message.success('已批量发布'); setSelectedRows([]); actionRef.current?.reload(); }}><Button icon={<CheckOutlined />} disabled={!selectedRows.length}>批量发布</Button></Popconfirm>,
          <Popconfirm key="offline" title="确认批量下架？下架不会删除数据。" disabled={!selectedRows.length} onConfirm={async () => { await offlineVideoBackgroundBatch({ ids: selectedRows.map((item) => item.id) }); message.success('已批量下架'); setSelectedRows([]); actionRef.current?.reload(); }}><Button icon={<StopOutlined />} disabled={!selectedRows.length}>批量下架</Button></Popconfirm>,
          <Popconfirm key="member" title="确认设为会员专享？" disabled={!selectedRows.length} onConfirm={async () => { await updateVideoBackgroundMemberOnlyBatch({ ids: selectedRows.map((item) => item.id), memberOnly: 1 }); message.success('已设为会员专享'); actionRef.current?.reload(); }}><Button icon={<LockOutlined />} disabled={!selectedRows.length}>设为会员专享</Button></Popconfirm>,
          <Popconfirm key="public" title="确认设为免费素材？" disabled={!selectedRows.length} onConfirm={async () => { await updateVideoBackgroundMemberOnlyBatch({ ids: selectedRows.map((item) => item.id), memberOnly: 0 }); message.success('已设为免费'); actionRef.current?.reload(); }}><Button icon={<UnlockOutlined />} disabled={!selectedRows.length}>设为免费</Button></Popconfirm>,
          <Popconfirm key="delete" title="确认批量删除？" disabled={!selectedRows.length} onConfirm={async () => { await deleteVideoBackgroundBatch({ ids: selectedRows.map((item) => item.id) }); message.success('已批量删除'); setSelectedRows([]); actionRef.current?.reload(); }}><Button danger icon={<DeleteOutlined />} disabled={!selectedRows.length}>批量删除</Button></Popconfirm>,
        ]}
      />
      <Drawer
        title={editing ? '编辑视频素材' : '新增视频素材'}
        open={drawerOpen}
        width={760}
        destroyOnClose
        onClose={closeDrawer}
        footer={<div style={{ textAlign: 'right' }}><Button onClick={closeDrawer}>取消</Button><Button type="primary" style={{ marginLeft: 8 }} onClick={() => form.submit()}>保存</Button></div>}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs
            defaultActiveKey="basic"
            items={[
              {
                key: 'basic', forceRender: true, label: '基础信息', children: <>
                  <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
                  <Form.Item label="简介" name="summary"><Input.TextArea rows={3} /></Form.Item>
                  <Row gutter={16}>
                    <Col span={8}><Form.Item label="状态" name="status" rules={[{ required: true }]}><Select options={[{ label: '下架', value: 0 }, { label: '上架', value: 1 }]} /></Form.Item></Col>
                    <Col span={8}><Form.Item label="会员专享" name="memberOnly" valuePropName="checked"><Switch checkedChildren="会员" unCheckedChildren="免费" /></Form.Item></Col>
                    <Col span={8}><Form.Item label="排序" name="sort"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                  </Row>
                </>,
              },
              { key: 'prompt', forceRender: true, label: '视频提示词', children: <Form.Item label="提示词" name="promptContent"><Input.TextArea rows={15} placeholder="填写视频生成或素材使用提示词" /></Form.Item> },
              {
                key: 'media', forceRender: true, label: '媒体资源', children: <>
                  <Form.Item label="封面图" extra="JPG、PNG、WebP，最大 10MB">
                    <Upload name="file" action="/api/file/upload?biz=video_background_cover" headers={{ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }} listType="picture-card" maxCount={1} fileList={coverFiles} showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }} beforeUpload={(file) => {
                      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { message.error('仅支持 JPG、PNG、WebP'); return Upload.LIST_IGNORE; }
                      if (file.size > 10 * 1024 * 1024) { message.error('封面不能超过 10MB'); return Upload.LIST_IGNORE; }
                      return true;
                    }} onChange={syncUploadedUrl('coverUrl', setCoverFiles)}>{coverFiles.length ? null : <div><PlusOutlined /><div style={{ marginTop: 8 }}>上传封面</div></div>}</Upload>
                  </Form.Item>
                  <Form.Item label="水印预览视频" extra="公开返回给所有用户，仅 MP4、WebM，最大 200MB">
                    <Upload name="file" action="/api/file/upload?biz=video_background_preview" headers={{ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }} maxCount={1} fileList={previewFiles} accept=".mp4,.webm,video/mp4,video/webm" beforeUpload={(file) => {
                      const valid = validateVideo(file as File, ['mp4', 'webm']);
                      if (valid === true) getVideoMetadata(file as File);
                      return valid;
                    }} onChange={syncUploadedUrl('previewVideoUrl', setPreviewFiles)}><Button icon={<UploadOutlined />}>上传水印预览视频</Button></Upload>
                    {previewVideoUrl ? <video src={previewVideoUrl} controls preload="metadata" style={{ width: '100%', maxHeight: 360, display: 'block', background: '#000', marginTop: 12, objectFit: 'contain' }} /> : null}
                  </Form.Item>
                  <Form.Item label="原视频" extra="仅通过后端鉴权下载，支持 MP4、MOV、WebM、M4V，最大 200MB">
                    <Upload name="file" action="/api/file/upload?biz=video_background_source" headers={{ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }} maxCount={1} fileList={sourceFiles} accept=".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm,video/x-m4v" beforeUpload={(file) => validateVideo(file as File, ['mp4', 'mov', 'webm', 'm4v'])} onChange={syncUploadedUrl('sourceVideoUrl', setSourceFiles)}><Button icon={<UploadOutlined />}>上传原视频</Button></Upload>
                    {sourceVideoUrl ? <video src={sourceVideoUrl} controls preload="metadata" style={{ width: '100%', maxHeight: 360, display: 'block', background: '#000', marginTop: 12, objectFit: 'contain' }} /> : null}
                  </Form.Item>
                  <Form.Item name="coverUrl" hidden><Input /></Form.Item><Form.Item name="previewVideoUrl" hidden><Input /></Form.Item><Form.Item name="sourceVideoUrl" hidden><Input /></Form.Item><Form.Item name="videoWidth" hidden><Input /></Form.Item><Form.Item name="videoHeight" hidden><Input /></Form.Item><Form.Item name="durationMs" hidden><Input /></Form.Item><Form.Item name="fileSize" hidden><Input /></Form.Item><Form.Item name="videoFormat" hidden><Input /></Form.Item>
                </>,
              },
              {
                key: 'category', forceRender: true, label: '分类标签', children: <>
                  <Form.Item label="分类" name="categoryId" rules={[{ required: true, message: '请选择分类' }]}><Select options={categories.map((item) => ({ label: item.name, value: item.id }))} onChange={(value) => { form.setFieldsValue({ tagIdList: [] }); void loadCategoryTags(value); }} /></Form.Item>
                  <Form.Item label="标签" name="tagIdList"><Select mode="multiple" showSearch optionFilterProp="label" options={categoryTags.map((item) => ({ label: item.name, value: item.id }))} placeholder="仅显示当前分类已绑定的标签" /></Form.Item>
                </>,
              },
            ]}
          />
        </Form>
      </Drawer>
      <Modal title={previewing?.title || '水印预览视频'} open={Boolean(previewing)} footer={null} width={860} onCancel={() => setPreviewing(null)} destroyOnClose>
        {previewing?.previewVideoUrl ? <video src={previewing.previewVideoUrl} controls autoPlay preload="metadata" style={{ width: '100%', maxHeight: '70vh', display: 'block', background: '#000', objectFit: 'contain' }} /> : null}
      </Modal>
    </PageContainer>
  );
}
