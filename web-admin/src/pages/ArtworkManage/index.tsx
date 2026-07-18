import { useRef, useState, useEffect } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Drawer, Form, Input, InputNumber, Select, Switch, Tabs, Upload, Row, Col, message, Popconfirm, Image, Tag } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
  CheckOutlined,
  StopOutlined,
  LockOutlined,
  UnlockOutlined,
} from '@ant-design/icons';
import {
  listArtworkByPageForAdmin,
  updateArtwork,
  deleteArtwork,
  deleteArtworkBatch,
  publishArtworkBatch,
  offlineArtworkBatch,
  updateArtworkMemberOnlyBatch,
  addArtwork,
  type ArtworkVO,
} from '../../api/artwork';
import { listCategory, type CategoryVO } from '../../api/category';
import { listTag, type TagVO } from '../../api/tag';

export default function ArtworkManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const currentVideoUrl = Form.useWatch('videoUrl', form);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<ArtworkVO | null>(null);
  const [categories, setCategories] = useState<CategoryVO[]>([]);
  const [tags, setTags] = useState<TagVO[]>([]);
  const [selectedRows, setSelectedRows] = useState<ArtworkVO[]>([]);
  const [coverFileList, setCoverFileList] = useState<any[]>([]);
  const [videoFileList, setVideoFileList] = useState<any[]>([]);
  const [sourceFileList, setSourceFileList] = useState<any[]>([]);
  const [previewImage, setPreviewImage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    listCategory().then((res) => setCategories(res.data));
    listTag().then((res) => setTags(res.data));
  }, []);

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
      width: 60,
    },
    {
      title: '封面',
      dataIndex: 'coverUrl',
      search: false,
      render: (_: any, record: ArtworkVO) =>
        record.coverUrl ? <Image src={record.coverUrl} width={60} preview /> : '-',
    },
    {
      title: '视频',
      dataIndex: 'videoUrl',
      search: false,
      width: 180,
      render: (_: any, record: ArtworkVO) =>
        record.videoUrl ? (
          <video
            src={record.videoUrl}
            controls
            preload="none"
            style={{ width: 160, height: 90, display: 'block', background: '#000', objectFit: 'contain' }}
          >
            当前浏览器不支持视频播放
          </video>
        ) : (
          '-'
        ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      search: {
        transform: (value: string) => ({ searchText: value }),
      },
    },
    {
      title: '源码',
      dataIndex: 'hasSourceCode',
      search: false,
      width: 80,
      render: (_: any, record: ArtworkVO) =>
        record.hasSourceCode || record.sourceZipUrl ? <Tag color="green">有源码</Tag> : <Tag>无源码</Tag>,
    },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      search: false,
    },
    {
      title: '标签',
      dataIndex: 'tagList',
      search: false,
      render: (_: any, record: ArtworkVO) =>
        record.tagList?.length ? (
          <>
            {record.tagList.map((t) => (
              <Tag color="blue" key={t.id} style={{ marginRight: 4 }}>
                {t.name}
              </Tag>
            ))}
          </>
        ) : (
          '-'
        ),
    },
    {
      title: '现金价',
      dataIndex: 'cashPrice',
      search: false,
      valueType: 'money',
    },
    {
      title: '积分价',
      dataIndex: 'pointsPrice',
      search: false,
    },
    {
      title: '会员专享',
      dataIndex: 'memberOnly',
      valueType: 'select',
      valueEnum: {
        0: { text: '否', status: 'Default' },
        1: { text: '是', status: 'Success' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: '下架', status: 'Error' },
        1: { text: '上架', status: 'Success' },
      },
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      valueType: 'select',
      hideInTable: true,
      fieldProps: {
        options: categories.map((c) => ({ label: c.name, value: c.id })),
        allowClear: true,
        placeholder: '请选择分类',
      },
    },
    {
      title: '标签',
      dataIndex: 'tagIdList',
      valueType: 'select',
      hideInTable: true,
      fieldProps: {
        options: tags.map((t) => ({ label: t.name, value: t.id })),
        mode: 'multiple',
        allowClear: true,
        placeholder: '请选择标签',
        showSearch: true,
        filterOption: (input: string, option?: any) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase()),
      },
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_: any, record: ArtworkVO) => [
        <Button
          key="preview"
          type="link"
          onClick={() => {
            window.open(`/artwork/view/${record.id}`, '_blank');
          }}
        >
          预览
        </Button>,
        <Button
          key="edit"
          type="link"
          onClick={() => {
            setEditing(record);
            setModalVisible(true);
          }}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确认删除？"
          onConfirm={async () => {
            await deleteArtwork({ id: record.id });
            message.success('删除成功');
            actionRef.current?.reload();
          }}
        >
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  useEffect(() => {
    if (modalVisible && editing) {
      form.setFieldsValue({
        title: editing.title,
        summary: editing.summary,
        description: editing.description,
        coverUrl: editing.coverUrl,
        videoUrl: editing.videoUrl,
        promptContent: editing.promptContent,
        categoryId: editing.categoryId,
        tagIdList: editing.tagList?.map((t) => t.id) || [],
        cashPrice: editing.cashPrice,
        pointsPrice: editing.pointsPrice,
        memberOnly: editing.memberOnly === 1,
        status: editing.status,
        htmlUrl: editing.htmlUrl,
        sourceZipUrl: editing.sourceZipUrl,
      });
      setCoverFileList(
        editing.coverUrl
          ? [
              {
                uid: '-1',
                name: 'cover',
                status: 'done',
                url: editing.coverUrl,
              },
            ]
          : []
      );
      setVideoFileList(
        editing.videoUrl
          ? [
              {
                uid: '-2',
                name: 'video',
                status: 'done',
                url: editing.videoUrl,
              },
            ]
          : []
      );
      setSourceFileList(
        editing.sourceZipUrl
          ? [
              {
                uid: '-3',
                name: 'source.zip',
                status: 'done',
                url: editing.sourceZipUrl,
              },
            ]
          : []
      );
    } else if (!modalVisible) {
      setCoverFileList([]);
      setVideoFileList([]);
      setSourceFileList([]);
    }
  }, [modalVisible, editing, form]);

  const handleSave = async (values: any) => {
    const payload = {
      ...values,
      memberOnly: values.memberOnly ? 1 : 0,
      tagIdList: values.tagIdList || [],
    };
    if (editing) {
      await updateArtwork({ ...payload, id: editing.id });
      message.success('更新成功');
    } else {
      await addArtwork(payload);
      message.success('添加成功');
    }
    setModalVisible(false);
    setEditing(null);
    form.resetFields();
    actionRef.current?.reload();
  };

  return (
    <PageContainer title="作品管理">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        request={async (params) => {
          const res = await listArtworkByPageForAdmin({
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
        rowSelection={{
          onChange: (_, rows: ArtworkVO[]) => {
            setSelectedRows(rows);
          },
        }}
        toolBarRender={() => [
          <Button
            key="add"
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新建作品
          </Button>,
          <Popconfirm
            key="batch-publish"
            title="确认批量发布选中的作品？"
            disabled={selectedRows.length === 0}
            onConfirm={async () => {
              await publishArtworkBatch({ ids: selectedRows.map((r) => r.id) });
              message.success('批量发布成功');
              setSelectedRows([]);
              actionRef.current?.reload();
            }}
          >
            <Button icon={<CheckOutlined />} disabled={selectedRows.length === 0}>
              批量发布
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="batch-offline"
            title="确认批量下架选中的作品？下架不会删除作品数据。"
            disabled={selectedRows.length === 0}
            onConfirm={async () => {
              await offlineArtworkBatch({ ids: selectedRows.map((r) => r.id) });
              message.success('批量下架成功');
              setSelectedRows([]);
              actionRef.current?.reload();
            }}
          >
            <Button icon={<StopOutlined />} disabled={selectedRows.length === 0}>
              批量下架
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="batch-member-only"
            title="确认将选中的作品设为会员专享？"
            disabled={selectedRows.length === 0}
            onConfirm={async () => {
              await updateArtworkMemberOnlyBatch({
                ids: selectedRows.map((r) => r.id),
                memberOnly: 1,
              });
              message.success('已批量设为会员专享');
              setSelectedRows([]);
              actionRef.current?.reload();
            }}
          >
            <Button icon={<LockOutlined />} disabled={selectedRows.length === 0}>
              设为会员专享
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="batch-public"
            title="确认取消选中作品的会员专享限制？"
            disabled={selectedRows.length === 0}
            onConfirm={async () => {
              await updateArtworkMemberOnlyBatch({
                ids: selectedRows.map((r) => r.id),
                memberOnly: 0,
              });
              message.success('已批量取消会员专享');
              setSelectedRows([]);
              actionRef.current?.reload();
            }}
          >
            <Button icon={<UnlockOutlined />} disabled={selectedRows.length === 0}>
              取消会员专享
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="batch-delete"
            title="确认批量删除？"
            disabled={selectedRows.length === 0}
            onConfirm={async () => {
              await deleteArtworkBatch({ ids: selectedRows.map((r) => r.id) });
              message.success('批量删除成功');
              setSelectedRows([]);
              actionRef.current?.reload();
            }}
          >
            <Button danger icon={<DeleteOutlined />} disabled={selectedRows.length === 0}>
              批量删除
            </Button>
          </Popconfirm>,
        ]}
      />
      <Drawer
        title={editing ? '编辑作品' : '新建作品'}
        open={modalVisible}
        width={720}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        destroyOnClose
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button
              style={{ marginRight: 8 }}
              onClick={() => {
                setModalVisible(false);
                setEditing(null);
              }}
            >
              取消
            </Button>
            <Button type="primary" onClick={() => form.submit()}>
              保存
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: '1',
                forceRender: true,
                label: '基本信息',
                children: (
                  <>
                    <Form.Item label="作品标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="一句话简介" name="summary">
                      <Input />
                    </Form.Item>
                    <Form.Item label="详细描述" name="description">
                      <Input.TextArea rows={4} />
                    </Form.Item>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item label="状态" name="status" rules={[{ required: true }]} initialValue={1}>
                          <Select
                            options={[
                              { label: '下架', value: 0 },
                              { label: '上架', value: 1 },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item label="会员专享" name="memberOnly" valuePropName="checked">
                          <Switch />
                        </Form.Item>
                      </Col>
                    </Row>
                  </>
                ),
              },
              {
                key: '2',
                forceRender: true,
                label: '内容描述',
                children: (
                  <>
                    <Form.Item label="Prompt内容" name="promptContent">
                      <Input.TextArea
                        rows={10}
                        placeholder='{"prompt":"xxx"}'
                        onBlur={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          try {
                            const obj = JSON.parse(val);
                            form.setFieldsValue({ promptContent: JSON.stringify(obj, null, 2) });
                          } catch (err) {
                            // 不是合法 JSON，静默不处理
                          }
                        }}
                      />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: '3',
                forceRender: true,
                label: '作品上传',
                children: (
                  <>
                    <Form.Item label="ZIP压缩包">
                      <Upload
                        name="file"
                        action="/api/artwork/upload/html"
                        maxCount={1}
                        accept=".zip"
                        headers={{ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }}
                        onChange={(info) => {
                          if (info.file.status === 'done') {
                            const res = info.file.response;
                            if (res?.code === 0) {
                              const { htmlUrl, sourceZipUrl } = res.data;
                              form.setFieldsValue({ htmlUrl, sourceZipUrl });
                              if (sourceZipUrl) {
                                setSourceFileList([
                                  { uid: '-3', name: 'source.zip', status: 'done', url: sourceZipUrl },
                                ]);
                              }
                              message.success('上传成功，已保存预览文件和源码压缩包');
                            } else {
                              message.error(res?.message || '上传失败');
                            }
                          } else if (info.file.status === 'error') {
                            message.error('上传失败');
                          }
                        }}
                      >
                        <Button icon={<UploadOutlined />}>上传 ZIP 压缩包</Button>
                      </Upload>
                    </Form.Item>
                    <Form.Item label="源码压缩包" extra="仅支持 ZIP，最大 50MB；用户下载前会校验登录和会员权限">
                      <Upload
                        name="file"
                        action="/api/file/upload?biz=artwork_source"
                        maxCount={1}
                        accept=".zip,application/zip"
                        headers={{ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }}
                        fileList={sourceFileList}
                        beforeUpload={(file) => {
                          if (!file.name.toLowerCase().endsWith('.zip')) {
                            message.error('源码文件仅支持 ZIP');
                            return Upload.LIST_IGNORE;
                          }
                          if (file.size > 50 * 1024 * 1024) {
                            message.error('源码压缩包不能超过 50MB');
                            return Upload.LIST_IGNORE;
                          }
                          return true;
                        }}
                        onChange={(info) => {
                          setSourceFileList(info.fileList);
                          if (info.file.status === 'done') {
                            const res = info.file.response;
                            if (res?.code === 0) {
                              form.setFieldsValue({ sourceZipUrl: res.data });
                              message.success('源码压缩包上传成功');
                            } else {
                              message.error(res?.message || '源码压缩包上传失败');
                            }
                          } else if (info.file.status === 'error') {
                            message.error('源码压缩包上传失败');
                          }
                          if (info.file.status === 'removed') {
                            form.setFieldsValue({ sourceZipUrl: undefined });
                          }
                        }}
                      >
                        <Button icon={<UploadOutlined />}>上传源码 ZIP</Button>
                      </Upload>
                    </Form.Item>
                    <Form.Item name="sourceZipUrl" hidden />
                    {editing ? (
                      <Form.Item label="前端访问地址">
                        <Input
                          readOnly
                          value={`${window.location.origin}/artwork/view/${editing.id}`}
                          addonAfter={
                            <Button
                              type="link"
                              size="small"
                              style={{ padding: 0 }}
                              onClick={() => {
                                window.open(`/artwork/view/${editing.id}`, '_blank');
                              }}
                            >
                              打开
                            </Button>
                          }
                        />
                      </Form.Item>
                    ) : (
                      <Form.Item label="前端访问地址">
                        <Input readOnly value="保存作品后自动生成" />
                      </Form.Item>
                    )}
                    <Form.Item label="封面图片">
                      <Upload
                        name="file"
                        action="/api/file/upload?biz=artwork_cover"
                        listType="picture-card"
                        maxCount={1}
                        accept=".jpg,.jpeg,.png,.gif,.webp,image/jpeg,image/png,image/gif,image/webp"
                        headers={{ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }}
                        fileList={coverFileList}
                        beforeUpload={(file) => {
                          const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
                          if (!allowedTypes.includes(file.type)) {
                            message.error('封面仅支持 JPG、PNG、GIF、WebP');
                            return Upload.LIST_IGNORE;
                          }
                          if (file.size > 10 * 1024 * 1024) {
                            message.error('封面文件不能超过 10MB');
                            return Upload.LIST_IGNORE;
                          }
                          return true;
                        }}
                        onChange={(info) => {
                          setCoverFileList(info.fileList);
                          if (info.file.status === 'done') {
                            const res = info.file.response;
                            if (res?.code === 0) {
                              form.setFieldsValue({ coverUrl: res.data });
                            } else {
                              message.error(res?.message || '上传失败');
                            }
                          }
                          if (info.file.status === 'removed') {
                            form.setFieldsValue({ coverUrl: undefined });
                          }
                        }}
                        showUploadList={{ showPreviewIcon: true, showRemoveIcon: true }}
                        onPreview={(file) => {
                          const url = file.url || file.response?.data;
                          if (url) {
                            setPreviewImage(url);
                            setPreviewOpen(true);
                          }
                        }}
                      >
                        {coverFileList.length >= 1 ? null : (
                          <div>
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>上传封面</div>
                          </div>
                        )}
                      </Upload>
                      <Image
                        wrapperStyle={{ display: 'none' }}
                        src={previewImage}
                        preview={{
                          visible: previewOpen,
                          onVisibleChange: (visible) => setPreviewOpen(visible),
                        }}
                      />
                    </Form.Item>
                    <Form.Item name="coverUrl" hidden />
                    <Form.Item label="作品视频" extra="支持 MP4、MOV、WebM、M4V，文件最大 50MB">
                      <Upload
                        name="file"
                        action="/api/file/upload?biz=artwork_video"
                        maxCount={1}
                        accept=".mp4,.mov,.webm,.m4v,video/mp4,video/quicktime,video/webm,video/x-m4v"
                        headers={{ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }}
                        fileList={videoFileList}
                        beforeUpload={(file) => {
                          const suffix = file.name.split('.').pop()?.toLowerCase();
                          if (!suffix || !['mp4', 'mov', 'webm', 'm4v'].includes(suffix)) {
                            message.error('视频仅支持 MP4、MOV、WebM、M4V');
                            return Upload.LIST_IGNORE;
                          }
                          if (file.size > 50 * 1024 * 1024) {
                            message.error('视频文件不能超过 50MB');
                            return Upload.LIST_IGNORE;
                          }
                          return true;
                        }}
                        onChange={(info) => {
                          setVideoFileList(info.fileList);
                          if (info.file.status === 'done') {
                            const res = info.file.response;
                            if (res?.code === 0) {
                              form.setFieldsValue({ videoUrl: res.data });
                              message.success('视频上传成功');
                            } else {
                              message.error(res?.message || '视频上传失败');
                            }
                          } else if (info.file.status === 'error') {
                            message.error('视频上传失败');
                          }
                          if (info.file.status === 'removed') {
                            form.setFieldsValue({ videoUrl: undefined });
                          }
                        }}
                      >
                        <Button icon={<UploadOutlined />}>上传视频</Button>
                      </Upload>
                      {currentVideoUrl ? (
                        <video
                          key={currentVideoUrl}
                          src={currentVideoUrl}
                          controls
                          preload="metadata"
                          style={{
                            width: '100%',
                            maxHeight: 360,
                            marginTop: 12,
                            display: 'block',
                            background: '#000',
                            objectFit: 'contain',
                          }}
                        >
                          当前浏览器不支持视频播放
                        </video>
                      ) : null}
                    </Form.Item>
                    <Form.Item name="videoUrl" hidden />
                    <Form.Item label="HTML原型地址" name="htmlUrl">
                      <Input placeholder="上传 ZIP 后会自动回填，也可手动填写" />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: '4',
                forceRender: true,
                label: '分类标签',
                children: (
                  <>
                    <Form.Item label="分类" name="categoryId">
                      <Select
                        options={categories.map((c) => ({ label: c.name, value: c.id }))}
                        placeholder="请选择分类"
                        allowClear
                      />
                    </Form.Item>
                    <Form.Item label="标签" name="tagIdList">
                      <Select
                        mode="multiple"
                        options={tags.map((t) => ({ label: t.name, value: t.id }))}
                        placeholder="请选择标签"
                        allowClear
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: '5',
                forceRender: true,
                label: '定价权限',
                children: (
                  <>
                    <Form.Item label="现金价" name="cashPrice">
                      <InputNumber style={{ width: '100%' }} min={0} precision={2} />
                    </Form.Item>
                    <Form.Item label="积分价" name="pointsPrice">
                      <InputNumber style={{ width: '100%' }} min={0} precision={0} />
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
