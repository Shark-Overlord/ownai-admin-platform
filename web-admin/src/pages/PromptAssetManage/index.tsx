import { useEffect, useMemo, useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Descriptions,
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
  Tooltip,
  Typography,
  Upload,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloudUploadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import { listCategory, listTagsByCategory, type CategoryVO } from '../../api/category';
import { addTag, listTag, type TagVO } from '../../api/tag';
import {
  addPromptAsset,
  deletePromptAsset,
  deletePromptAssetBatch,
  getPromptAssetVOById,
  importVisualPromptDb,
  listPromptAssetByPageForAdmin,
  listPromptAssetImportBatchByPage,
  publishPromptAssetBatch,
  syncPromptAssetImagesToCos,
  updatePromptAsset,
  type PromptAssetImportBatch,
  type PromptAssetImportResultVO,
  type PromptAssetVO,
} from '../../api/promptAsset';
import './index.css';

const { Text } = Typography;

const assetTypeOptions = [
  { label: '图片提示词', value: 'image_prompt' },
  { label: '视频提示词', value: 'video_prompt' },
];

const statusValueEnum = {
  0: { text: '草稿', status: 'Default' },
  1: { text: '已发布', status: 'Success' },
  2: { text: '已归档', status: 'Warning' },
};

const renderAssetType = (value?: string) => {
  if (value === 'video_prompt') {
    return <Tag color="purple">视频提示词</Tag>;
  }
  if (value === 'image_prompt') {
    return <Tag color="blue">图片提示词</Tag>;
  }
  return <Tag>未知</Tag>;
};

const renderStatus = (value?: number) => {
  if (value === 1) {
    return <Tag color="green">已发布</Tag>;
  }
  if (value === 2) {
    return <Tag color="orange">已归档</Tag>;
  }
  return <Tag>草稿</Tag>;
};

const renderAiTagStatus = (value?: number) => {
  if (value === 1) {
    return <Tag color="green">已处理</Tag>;
  }
  return <Tag>未处理</Tag>;
};

export default function PromptAssetManage() {
  const actionRef = useRef<any>(null);
  const batchActionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [importForm] = Form.useForm();
  const [categories, setCategories] = useState<CategoryVO[]>([]);
  const [tags, setTags] = useState<TagVO[]>([]);
  const [detail, setDetail] = useState<PromptAssetVO | null>(null);
  const [editing, setEditing] = useState<PromptAssetVO | null>(null);
  const [editMode, setEditMode] = useState<'create' | 'edit'>('edit');
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [coverFileList, setCoverFileList] = useState<UploadFile[]>([]);
  const [previewImage, setPreviewImage] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<PromptAssetVO[]>([]);
  const [importResult, setImportResult] = useState<PromptAssetImportResultVO | null>(null);
  const [tagKeyword, setTagKeyword] = useState('');
  const [customTagName, setCustomTagName] = useState('');
  const [addingTag, setAddingTag] = useState(false);
  const [sceneTags, setSceneTags] = useState<TagVO[]>([]);
  const [editActiveTab, setEditActiveTab] = useState('base');
  const selectedSceneTagIdList = (Form.useWatch('sceneTagIdList', form) || []) as Array<number | string>;
  const selectedAssetTagIdList = (Form.useWatch('assetTagIdList', form) || []) as Array<number | string>;
  const editingCategoryId = Form.useWatch('categoryId', form);

  useEffect(() => {
    listCategory().then((res) => setCategories(res.data || []));
    listTag().then((res) => setTags(res.data || []));
  }, []);

  const categoryOptions = categories.map((item) => ({ label: item.name, value: item.id }));
  const tagOptions = tags.map((item) => ({ label: item.name, value: String(item.id) }));
  const categoryNameMap = new Map(categories.map((item) => [String(item.id), item.name]));
  const selectedSceneTagIdSet = useMemo(
    () => new Set(selectedSceneTagIdList.map((item) => String(item))),
    [selectedSceneTagIdList],
  );
  const selectedAssetTagIdSet = useMemo(
    () => new Set(selectedAssetTagIdList.map((item) => String(item))),
    [selectedAssetTagIdList],
  );
  const selectedSceneTagList = useMemo(
    () =>
      selectedSceneTagIdList
        .map((id) => sceneTags.find((tag) => String(tag.id) === String(id)))
        .filter(Boolean) as TagVO[],
    [selectedSceneTagIdList, sceneTags],
  );
  const selectedAssetTagList = useMemo(
    () =>
      selectedAssetTagIdList
        .map((id) => tags.find((tag) => String(tag.id) === String(id)))
        .filter(Boolean) as TagVO[],
    [selectedAssetTagIdList, tags],
  );
  const visibleTagList = useMemo(() => {
    const keyword = tagKeyword.trim().toLowerCase();
    const sceneTagIds = new Set(sceneTags.map((tag) => String(tag.id)));
    const availableTags = tags.filter((tag) => !sceneTagIds.has(String(tag.id)));
    if (!keyword) {
      return availableTags;
    }
    return availableTags.filter((tag) => tag.name.toLowerCase().includes(keyword));
  }, [tagKeyword, tags, sceneTags]);

  useEffect(() => {
    if (!editing || !editingCategoryId) {
      setSceneTags([]);
      return;
    }
    let active = true;
    listTagsByCategory(String(editingCategoryId)).then((res) => {
      if (!active) {
        return;
      }
      const nextSceneTags = (res.data || []) as TagVO[];
      setSceneTags(nextSceneTags);
      const allowedIds = new Set(nextSceneTags.map((tag) => String(tag.id)));
      const currentSceneIds = (form.getFieldValue('sceneTagIdList') || []) as Array<number | string>;
      const validSceneIds = currentSceneIds.filter((id) => allowedIds.has(String(id)));
      if (validSceneIds.length !== currentSceneIds.length) {
        form.setFieldsValue({ sceneTagIdList: validSceneIds.map((id) => String(id)) });
      }
    });
    return () => {
      active = false;
    };
  }, [editing, editingCategoryId, form]);

  const setSelectedSceneTags = (tagIds: Array<number | string>) => {
    form.setFieldsValue({ sceneTagIdList: Array.from(new Set(tagIds.map((item) => String(item)))) });
  };

  const setSelectedAssetTags = (tagIds: Array<number | string>) => {
    form.setFieldsValue({ assetTagIdList: Array.from(new Set(tagIds.map((item) => String(item)))) });
  };

  const toggleSceneTag = (tagId: number | string) => {
    const id = String(tagId);
    const next = new Set(selectedSceneTagIdList.map((item) => String(item)));
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedSceneTags(Array.from(next));
  };

  const toggleAssetTag = (tagId: number | string) => {
    const id = String(tagId);
    const next = new Set(selectedAssetTagIdList.map((item) => String(item)));
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAssetTags(Array.from(next));
  };

  const createCustomTag = async () => {
    const name = customTagName.trim();
    if (!name) {
      message.warning('请输入标签名称');
      return;
    }
    const existingTag = tags.find((tag) => tag.name.trim().toLowerCase() === name.toLowerCase());
    if (existingTag) {
      setSelectedAssetTags([...selectedAssetTagIdList, existingTag.id]);
      setCustomTagName('');
      message.info('标签已存在，已自动选中');
      return;
    }
    setAddingTag(true);
    try {
      const res = await addTag({ name, description: 'Prompt 资产自定义标签' });
      const newTag = { id: String(res.data), name, description: 'Prompt 资产自定义标签' };
      setTags((prev) => [newTag, ...prev]);
      setSelectedAssetTags([...selectedAssetTagIdList, newTag.id]);
      setCustomTagName('');
      message.success('标签已创建并选中');
    } finally {
      setAddingTag(false);
    }
  };

  const openDetail = async (id: number) => {
    const res = await getPromptAssetVOById(id);
    setDetail(res.data);
  };

  const openCreate = () => {
    setEditMode('create');
    setEditing({
      id: 0,
      assetType: 'image_prompt',
      title: '',
      status: 0,
      memberOnly: 0,
      sort: 0,
      isFeatured: 0,
      featuredSort: 0,
    });
    setEditActiveTab('base');
    form.resetFields();
    form.setFieldsValue({
      assetType: 'image_prompt',
      status: 0,
      memberOnly: false,
      sort: 0,
      isFeatured: false,
      featuredSort: 0,
      sceneTagIdList: [],
      assetTagIdList: [],
    });
    setCoverFileList([]);
    setPreviewImage('');
    setPreviewOpen(false);
    setTagKeyword('');
    setCustomTagName('');
    setSceneTags([]);
  };

  const openEdit = async (id: number, activeTab = 'base') => {
    const res = await getPromptAssetVOById(id);
    const sceneTagIdList = res.data.sceneTagList?.map((item) => String(item.id)) || [];
    const assetTagIdList =
      res.data.assetTagList?.map((item) => String(item.id)) ||
      res.data.tagList?.map((item) => String(item.id)) ||
      [];
    setEditMode('edit');
    setEditing(res.data);
    setEditActiveTab(activeTab);
    form.setFieldsValue({
      ...res.data,
      categoryId: res.data.categoryId ? String(res.data.categoryId) : undefined,
      sceneTagIdList,
      assetTagIdList,
      memberOnly: res.data.memberOnly === 1,
      isFeatured: res.data.isFeatured === 1,
      featuredSort: res.data.featuredSort || 0,
    });
    setCoverFileList(
      res.data.coverUrl
        ? [
            {
              uid: '-1',
              name: 'cover',
              status: 'done',
              url: res.data.coverUrl,
            },
          ]
        : [],
    );
  };

  const closeEdit = () => {
    setEditing(null);
    setEditMode('edit');
    form.resetFields();
    setCoverFileList([]);
    setPreviewImage('');
    setPreviewOpen(false);
    setTagKeyword('');
    setCustomTagName('');
    setSceneTags([]);
    setEditActiveTab('base');
  };

  const reloadTables = () => {
    actionRef.current?.reload();
    batchActionRef.current?.reload();
  };

  const handleImport = async () => {
    const values = await importForm.validateFields();
    if (!importFile) {
      message.error('请先选择 visual_prompt_library.db');
      return;
    }
    setImporting(true);
    try {
      const res = await importVisualPromptDb({
        file: importFile,
        categoryId: values.categoryId,
        dryRun: values.dryRun !== false,
        assetType: values.assetType,
        syncTagsToCategory: values.syncTagsToCategory !== false,
        uploadImagesToCos: values.uploadImagesToCos === true,
      });
      setImportResult(res.data);
      message.success(values.dryRun === false ? '导入完成' : '预检查完成');
      reloadTables();
    } finally {
      setImporting(false);
    }
  };

  const handleImportFileChange = async ({ fileList: nextFileList }: { fileList: UploadFile[] }) => {
    const nextFile = nextFileList[0];
    if (!nextFile?.originFileObj) {
      setFileList([]);
      setImportFile(null);
      return;
    }
    try {
      const rawFile = nextFile.originFileObj as File;
      const buffer = await rawFile.arrayBuffer();
      const stableFile = new File([buffer], rawFile.name, {
        type: rawFile.type || 'application/octet-stream',
        lastModified: Date.now(),
      });
      setImportFile(stableFile);
      setFileList([{ ...nextFile, status: 'done' }]);
    } catch (error) {
      setFileList([]);
      setImportFile(null);
      message.error('文件读取失败，请重新选择 SQLite 文件');
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    if (!editing) {
      return;
    }
    const payload = {
      ...values,
      categoryId: values.categoryId,
      sceneTagIdList: values.sceneTagIdList || [],
      assetTagIdList: values.assetTagIdList || [],
      memberOnly: values.memberOnly ? 1 : 0,
      isFeatured: values.isFeatured ? 1 : 0,
      featuredSort: values.featuredSort || 0,
    };
    if (editMode === 'create') {
      await addPromptAsset(payload);
      message.success('新增成功');
    } else {
      await updatePromptAsset({
        ...payload,
        id: editing.id,
      });
      message.success('保存成功');
    }
    closeEdit();
    reloadTables();
  };

  const handleDelete = async (id: number) => {
    await deletePromptAsset({ id });
    message.success('删除成功');
    reloadTables();
  };

  const handleBatchDelete = async () => {
    await deletePromptAssetBatch({ ids: selectedRows.map((item) => item.id) });
    message.success('批量删除成功');
    setSelectedRows([]);
    reloadTables();
  };

  const handleBatchPublish = async () => {
    await publishPromptAssetBatch({ ids: selectedRows.map((item) => item.id) });
    message.success('批量发布成功');
    setSelectedRows([]);
    reloadTables();
  };

  const handleSyncImages = async () => {
    const res = await syncPromptAssetImagesToCos({ ids: selectedRows.map((item) => item.id) });
    const data = res.data;
    message.success(`同步完成：成功 ${data.successCount}，跳过 ${data.skipCount}，失败 ${data.errorCount}`);
    reloadTables();
  };

  const columns: any[] = [
    {
      title: '关键词',
      dataIndex: 'searchText',
      hideInTable: true,
      search: true,
    },
    {
      title: '序号',
      dataIndex: 'index',
      search: false,
      width: 72,
      render: (_: unknown, _record: PromptAssetVO, index: number) => index + 1,
    },
    {
      title: '封面',
      dataIndex: 'coverUrl',
      search: false,
      width: 96,
      render: (_: unknown, record: PromptAssetVO) =>
        record.coverUrl ? (
          <Image src={record.coverUrl} width={72} height={52} className="prompt-asset-cover" />
        ) : (
          <div className="prompt-asset-cover prompt-asset-cover-empty">无图</div>
        ),
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      valueType: 'select',
      width: 150,
      fieldProps: {
        options: categoryOptions,
        allowClear: true,
        showSearch: true,
        optionFilterProp: 'label',
      },
      render: (_: unknown, record: PromptAssetVO) =>
        record.category?.name ? <Tag color="geekblue">{record.category.name}</Tag> : '-',
    },
    {
      title: '来源仓库',
      dataIndex: 'sourceRepoName',
      width: 260,
      ellipsis: true,
      render: (_: unknown, record: PromptAssetVO) =>
        record.sourceRepoUrl ? (
          <a href={record.sourceRepoUrl} target="_blank" rel="noreferrer">
            {record.sourceRepoName || record.sourceRepoUrl}
          </a>
        ) : (
          record.sourceRepoName || '-'
        ),
    },
    {
      title: '发布状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: statusValueEnum,
      width: 120,
      render: (_: unknown, record: PromptAssetVO) => renderStatus(record.status),
    },
    {
      title: '精选',
      dataIndex: 'isFeatured',
      valueType: 'select',
      valueEnum: {
        0: { text: '普通', status: 'Default' },
        1: { text: '精选', status: 'Success' },
      },
      width: 110,
      render: (_: unknown, record: PromptAssetVO) =>
        record.isFeatured === 1 ? <Tag color="gold">精选</Tag> : <Tag>普通</Tag>,
    },
    {
      title: 'AI处理',
      dataIndex: 'aiTagStatus',
      valueType: 'select',
      valueEnum: {
        0: { text: '未处理', status: 'Default' },
        1: { text: '已处理', status: 'Success' },
      },
      width: 110,
      render: (_: unknown, record: PromptAssetVO) => renderAiTagStatus(record.aiTagStatus),
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
      width: 184,
      fixed: 'right',
      render: (_: unknown, record: PromptAssetVO) => [
        <Button key="detail" type="link" icon={<EyeOutlined />} onClick={() => openDetail(record.id)}>
          详情
        </Button>,
        <Button key="edit" type="link" icon={<EditOutlined />} onClick={() => openEdit(record.id)}>
          编辑
        </Button>,
        <Popconfirm key="delete" title="确认删除这条资产？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  const batchColumns: any[] = [
    {
      title: '批次',
      dataIndex: 'id',
      width: 190,
      render: (_: unknown, record: PromptAssetImportBatch) => (
        <Tooltip title={record.id}>
          <span className="prompt-asset-batch-id">{record.id}</span>
        </Tooltip>
      ),
    },
    {
      title: '模式',
      dataIndex: 'dryRun',
      width: 100,
      render: (_: unknown, record: PromptAssetImportBatch) =>
        record.dryRun === 1 ? <Tag color="gold">预检查</Tag> : <Tag color="green">正式导入</Tag>,
    },
    {
      title: '分类',
      dataIndex: 'categoryId',
      width: 160,
      render: (_: unknown, record: PromptAssetImportBatch) => {
        const categoryName = categoryNameMap.get(String(record.categoryId));
        return categoryName ? <Tag color="geekblue">{categoryName}</Tag> : <Text type="secondary">{record.categoryId || '-'}</Text>;
      },
    },
    {
      title: '类型',
      dataIndex: 'assetTypeFilter',
      width: 120,
      render: (_: unknown, record: PromptAssetImportBatch) => renderAssetType(record.assetTypeFilter || undefined),
    },
    {
      title: '结果统计',
      dataIndex: 'totalCount',
      width: 280,
      render: (_: unknown, record: PromptAssetImportBatch) => (
        <div className="prompt-asset-counts">
          <span>总数 {record.totalCount || 0}</span>
          <span>新增 {record.insertCount || 0}</span>
          <span>更新 {record.updateCount || 0}</span>
          <span>错误 {record.errorCount || 0}</span>
        </div>
      ),
    },
    {
      title: '标签同步',
      dataIndex: 'syncTagsToCategory',
      width: 110,
      render: (_: unknown, record: PromptAssetImportBatch) =>
        record.syncTagsToCategory === 0 ? <Tag>关闭</Tag> : <Tag color="blue">开启</Tag>,
    },
    { title: '开始时间', dataIndex: 'startedAt', valueType: 'dateTime', width: 170 },
  ];

  return (
    <PageContainer title="Prompt 资产库" className="prompt-asset-page">
      <Alert
        showIcon
        type="info"
        className="prompt-asset-tip"
        message="列表只展示管理必需字段，Prompt、标签、标题和图片来源等内容请在详情中查看。"
      />

      <ProTable
        className="prompt-asset-table"
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 72, span: 8 }}
        cardBordered
        scroll={{ x: 1260 }}
        tableLayout="fixed"
        rowSelection={{
          selectedRowKeys: selectedRows.map((item) => item.id),
          onChange: (_keys, rows: PromptAssetVO[]) => setSelectedRows(rows),
        }}
        locale={{
          emptyText: (
            <div className="prompt-asset-empty">
              <div className="prompt-asset-empty-title">暂无正式导入的 Prompt 资产</div>
              <div>如果最近批次是“预检查”，需要关闭“仅预检查”后再导入一次。</div>
            </div>
          ),
        }}
        request={async (params) => {
          const res = await listPromptAssetByPageForAdmin({
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
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
        }}
        toolBarRender={() => [
          <Button key="create" type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增 Prompt
          </Button>,
          <Button key="refresh" icon={<ReloadOutlined />} onClick={reloadTables}>
            刷新
          </Button>,
          <Button
            key="sync-images"
            icon={<CloudUploadOutlined />}
            disabled={selectedRows.length === 0}
            onClick={handleSyncImages}
          >
            同步图片
          </Button>,
          <Popconfirm
            key="batch-publish"
            title="确认批量发布选中的 Prompt 资产？"
            disabled={selectedRows.length === 0}
            onConfirm={handleBatchPublish}
          >
            <Button icon={<CheckCircleOutlined />} disabled={selectedRows.length === 0}>
              批量发布
            </Button>
          </Popconfirm>,
          <Popconfirm
            key="batch-delete"
            title="确认批量删除选中的资产？"
            disabled={selectedRows.length === 0}
            onConfirm={handleBatchDelete}
          >
            <Button danger icon={<DeleteOutlined />} disabled={selectedRows.length === 0}>
              批量删除
            </Button>
          </Popconfirm>,
          <Button
            key="import"
            type="primary"
            icon={<UploadOutlined />}
            onClick={() => {
              setImportResult(null);
              setFileList([]);
              setImportFile(null);
              setImportOpen(true);
            }}
          >
            导入 SQLite
          </Button>,
        ]}
      />

      <ProTable
        className="prompt-asset-table prompt-asset-batch-table"
        actionRef={batchActionRef}
        columns={batchColumns}
        rowKey="id"
        search={false}
        cardBordered
        headerTitle="最近导入批次"
        options={false}
        scroll={{ x: 1130 }}
        pagination={{ pageSize: 5 }}
        request={async (params) => {
          const res = await listPromptAssetImportBatchByPage({
            current: params.current || 1,
            pageSize: params.pageSize || 5,
          });
          return {
            data: res.data.records,
            total: res.data.total,
            success: true,
          };
        }}
      />

      <Modal
        title="导入 visual_prompt_library.db"
        open={importOpen}
        confirmLoading={importing}
        onOk={handleImport}
        onCancel={() => setImportOpen(false)}
        okText="开始"
        destroyOnClose
      >
        <Form
          form={importForm}
          layout="vertical"
          initialValues={{ dryRun: true, syncTagsToCategory: true, uploadImagesToCos: false }}
        >
          <Form.Item label="SQLite 数据库文件" required>
            <Upload.Dragger
              accept=".db"
              maxCount={1}
              beforeUpload={() => false}
              fileList={fileList}
              onChange={handleImportFileChange}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">选择或拖入 visual_prompt_library.db</p>
            </Upload.Dragger>
          </Form.Item>
          <Form.Item label="导入分类" name="categoryId" rules={[{ required: true, message: '请选择导入分类' }]}>
            <Select showSearch placeholder="选择分类" options={categoryOptions} optionFilterProp="label" />
          </Form.Item>
          <Form.Item label="导入类型" name="assetType">
            <Select allowClear placeholder="不选择则导入图片和视频提示词" options={assetTypeOptions} />
          </Form.Item>
          <Form.Item label="同步源库标签到当前分类" name="syncTagsToCategory" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item label="上传图片到对象存储" name="uploadImagesToCos" valuePropName="checked">
            <Switch checkedChildren="开启" unCheckedChildren="关闭" />
          </Form.Item>
          <Form.Item label="仅预检查，不写入列表" name="dryRun" valuePropName="checked">
            <Switch checkedChildren="预检" unCheckedChildren="正式" />
          </Form.Item>
        </Form>
        {importResult ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {importResult.dryRun ? (
              <Alert
                type="warning"
                showIcon
                message="当前是预检查结果，不会写入资产列表，也不会上传图片。确认数量无误后，关闭“仅预检查”再导入一次。"
              />
            ) : null}
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="批次">{importResult.batchId}</Descriptions.Item>
              <Descriptions.Item label="状态">{importResult.status}</Descriptions.Item>
              <Descriptions.Item label="总数">{importResult.totalCount}</Descriptions.Item>
              <Descriptions.Item label="新增">{importResult.insertCount}</Descriptions.Item>
              <Descriptions.Item label="更新">{importResult.updateCount}</Descriptions.Item>
              <Descriptions.Item label="跳过">{importResult.skipCount}</Descriptions.Item>
              <Descriptions.Item label="错误">{importResult.errorCount}</Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Modal>

      <Drawer title="Prompt 资产详情" open={!!detail} width={820} onClose={() => setDetail(null)}>
        {detail ? (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {detail.coverUrl ? <Image src={detail.coverUrl} width={240} /> : null}
            <Descriptions column={2} bordered>
              <Descriptions.Item label="标题" span={2}>
                {detail.title}
              </Descriptions.Item>
              <Descriptions.Item label="分类">{detail.category?.name || '-'}</Descriptions.Item>
              <Descriptions.Item label="类型">{renderAssetType(detail.assetType)}</Descriptions.Item>
              <Descriptions.Item label="状态">{renderStatus(detail.status)}</Descriptions.Item>
              <Descriptions.Item label="来源仓库" span={2}>
                {detail.sourceRepoUrl ? (
                  <a href={detail.sourceRepoUrl} target="_blank" rel="noreferrer">
                    {detail.sourceRepoName || detail.sourceRepoUrl}
                  </a>
                ) : (
                  detail.sourceRepoName || '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="COS Image" span={2}>
                {detail.sourceCloudStorageUrl ? (
                  <a href={detail.sourceCloudStorageUrl} target="_blank" rel="noreferrer">
                    {detail.sourceCloudStorageUrl}
                  </a>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="COS Thumbnail" span={2}>
                {detail.sourceThumbnailCloudStorageUrl ? (
                  <a href={detail.sourceThumbnailCloudStorageUrl} target="_blank" rel="noreferrer">
                    {detail.sourceThumbnailCloudStorageUrl}
                  </a>
                ) : (
                  '-'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Storage">{detail.cloudStorageProvider || '-'}</Descriptions.Item>
              <Descriptions.Item label="Region">{detail.cloudStorageRegion || '-'}</Descriptions.Item>
              <Descriptions.Item label="Bucket" span={2}>
                {detail.cloudStorageBucket || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Object Key" span={2}>
                {detail.cloudStorageKey || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="二级场景标签" span={2}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {detail.sceneTagList?.length ? (
                    <Space size={[0, 4]} wrap>
                      {detail.sceneTagList.map((item) => (
                        <Tag color="geekblue" key={item.id}>
                          {item.name}
                        </Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary">暂无二级场景标签</Text>
                  )}
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setDetail(null);
                      openEdit(detail.id, 'tags');
                    }}
                  >
                    编辑二级场景标签
                  </Button>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="资产描述标签" span={2}>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  {detail.assetTagList?.length ? (
                    <Space size={[0, 4]} wrap>
                      {detail.assetTagList.map((item) => (
                        <Tag key={item.id}>{item.name}</Tag>
                      ))}
                    </Space>
                  ) : (
                    <Text type="secondary">暂无资产描述标签</Text>
                  )}
                  <Button
                    size="small"
                    type="link"
                    onClick={() => {
                      setDetail(null);
                      openEdit(detail.id, 'tags');
                    }}
                  >
                    编辑资产描述标签
                  </Button>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Prompt" span={2}>
                <Input.TextArea value={detail.promptContent} rows={8} readOnly />
              </Descriptions.Item>
              <Descriptions.Item label="中文说明" span={2}>
                <Input.TextArea value={detail.promptCn} rows={5} readOnly />
              </Descriptions.Item>
            </Descriptions>
          </Space>
        ) : null}
      </Drawer>

      <Drawer title={editMode === 'create' ? '新增 Prompt 资产' : '编辑 Prompt 资产'} open={!!editing} width={820} onClose={closeEdit}>
        <Form form={form} layout="vertical">
          <Tabs
            activeKey={editActiveTab}
            onChange={setEditActiveTab}
            items={[
              {
                key: 'base',
                label: '基础信息',
                children: (
                  <>
                    <Form.Item label="资产类型" name="assetType" rules={[{ required: true, message: '请选择资产类型' }]}>
                      <Select options={assetTypeOptions} />
                    </Form.Item>
                    <Form.Item label="标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="分类" name="categoryId" rules={[{ required: true, message: '请选择分类' }]}>
                      <Select showSearch placeholder="选择分类" options={categoryOptions} optionFilterProp="label" />
                    </Form.Item>
                    <Form.Item label="摘要" name="summary">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Space style={{ width: '100%' }} size="large">
                      <Form.Item label="发布状态" name="status" style={{ minWidth: 180 }}>
                        <Select
                          options={[
                            { label: '草稿', value: 0 },
                            { label: '已发布', value: 1 },
                            { label: '已归档', value: 2 },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item label="会员专享" name="memberOnly" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item label="排序" name="sort" extra="数值越大越靠前">
                        <InputNumber />
                      </Form.Item>
                      <Form.Item label="精选" name="isFeatured" valuePropName="checked">
                        <Switch />
                      </Form.Item>
                      <Form.Item label="精选排序" name="featuredSort" extra="仅精选列表使用，数值越大越靠前">
                        <InputNumber />
                      </Form.Item>
                    </Space>
                  </>
                ),
              },
              {
                key: 'content',
                label: 'Prompt 内容',
                children: (
                  <>
                    <Form.Item label="Prompt" name="promptContent">
                      <Input.TextArea rows={8} />
                    </Form.Item>
                    <Form.Item label="中文说明" name="promptCn">
                      <Input.TextArea rows={5} />
                    </Form.Item>
                  </>
                ),
              },
              {
                key: 'tags',
                label: '标签',
                children: (
                  <>
                    <Alert
                      showIcon
                      type="info"
                      message="二级场景标签来自当前分类标签池；资产描述标签是这条 Prompt 自己的自由标注。"
                      style={{ marginBottom: 16 }}
                    />
                    <Form.Item name="sceneTagIdList" hidden>
                      <Select mode="multiple" options={sceneTags.map((item) => ({ label: item.name, value: String(item.id) }))} />
                    </Form.Item>
                    <Form.Item name="assetTagIdList" hidden>
                      <Select mode="multiple" options={tagOptions} />
                    </Form.Item>
                    <div className="prompt-asset-tag-panel">
                      <div className="prompt-asset-tag-section">
                        <div className="prompt-asset-tag-section-title">
                          <Text strong>二级场景标签</Text>
                          <Text type="secondary">{selectedSceneTagIdList.length} 个</Text>
                        </div>
                        <div className="prompt-asset-selected-tags">
                          {selectedSceneTagList.length > 0 ? (
                            selectedSceneTagList.map((tag) => (
                              <Tag
                                key={tag.id}
                                color="geekblue"
                                closable
                                onClose={(event) => {
                                  event.preventDefault();
                                  toggleSceneTag(tag.id);
                                }}
                              >
                                {tag.name}
                              </Tag>
                            ))
                          ) : (
                            <Text type="secondary">暂未选择二级场景标签</Text>
                          )}
                        </div>
                        <div className="prompt-asset-tag-cloud prompt-asset-tag-cloud-compact">
                          {sceneTags.length > 0 ? (
                            sceneTags.map((tag) => (
                              <Tag.CheckableTag
                                key={tag.id}
                                checked={selectedSceneTagIdSet.has(String(tag.id))}
                                className="prompt-asset-checkable-tag"
                                onChange={() => toggleSceneTag(tag.id)}
                              >
                                {tag.name}
                              </Tag.CheckableTag>
                            ))
                          ) : (
                            <div className="prompt-asset-tag-empty">当前分类暂无二级场景标签，请先到分类标签树维护</div>
                          )}
                        </div>
                      </div>
                      <div className="prompt-asset-tag-section">
                        <div className="prompt-asset-tag-section-title">
                          <Text strong>资产描述标签</Text>
                          <Text type="secondary">{selectedAssetTagIdList.length} 个</Text>
                        </div>
                        <div className="prompt-asset-selected-tags">
                          {selectedAssetTagList.length > 0 ? (
                            selectedAssetTagList.map((tag) => (
                              <Tag
                                key={tag.id}
                                color="blue"
                                closable
                                onClose={(event) => {
                                  event.preventDefault();
                                  toggleAssetTag(tag.id);
                                }}
                              >
                                {tag.name}
                              </Tag>
                            ))
                          ) : (
                            <Text type="secondary">暂未选择资产描述标签</Text>
                          )}
                        </div>
                      </div>
                      <div className="prompt-asset-tag-toolbar">
                        <Input.Search
                          allowClear
                          placeholder="搜索已有资产描述标签"
                          value={tagKeyword}
                          onChange={(event) => setTagKeyword(event.target.value)}
                        />
                        <Button disabled={selectedAssetTagIdList.length === 0} onClick={() => setSelectedAssetTags([])}>
                          清空描述标签
                        </Button>
                      </div>
                      <div className="prompt-asset-tag-cloud">
                        {visibleTagList.length > 0 ? (
                          visibleTagList.map((tag) => (
                            <Tag.CheckableTag
                              key={tag.id}
                              checked={selectedAssetTagIdSet.has(String(tag.id))}
                              className="prompt-asset-checkable-tag"
                              onChange={() => toggleAssetTag(tag.id)}
                            >
                              {tag.name}
                            </Tag.CheckableTag>
                          ))
                        ) : (
                          <div className="prompt-asset-tag-empty">没有匹配的描述标签，可以在下方创建自定义标签</div>
                        )}
                      </div>
                      <div className="prompt-asset-custom-tag">
                        <Input
                          placeholder="输入自定义描述标签名称"
                          value={customTagName}
                          onChange={(event) => setCustomTagName(event.target.value)}
                          onPressEnter={createCustomTag}
                        />
                        <Button type="primary" loading={addingTag} onClick={createCustomTag}>
                          创建并选中
                        </Button>
                      </div>
                    </div>
                  </>
                ),
              },
              {
                key: 'media',
                label: '封面与媒体',
                children: (
                  <>
                    <Form.Item label="封面图片">
                      <Upload
                        name="file"
                        action="/api/file/upload?biz=prompt_asset_cover"
                        listType="picture-card"
                        maxCount={1}
                        accept="image/*"
                        headers={{ Authorization: `Bearer ${localStorage.getItem('token') || ''}` }}
                        fileList={coverFileList}
                        onChange={(info) => {
                          setCoverFileList(info.fileList);
                          if (info.file.status === 'done') {
                            const res = info.file.response;
                            if (res?.code === 0) {
                              form.setFieldsValue({
                                coverUrl: res.data,
                                previewMediaUrl: res.data,
                              });
                              message.success('图片上传成功');
                            } else {
                              message.error(res?.message || '上传失败');
                            }
                          }
                          if (info.file.status === 'removed') {
                            form.setFieldsValue({ coverUrl: undefined, previewMediaUrl: undefined });
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
                            <div style={{ marginTop: 8 }}>上传</div>
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
                    <Form.Item label="封面 URL" name="coverUrl">
                      <Input />
                    </Form.Item>
                    <Form.Item label="预览媒体 URL" name="previewMediaUrl">
                      <Input />
                    </Form.Item>
                  </>
                ),
              },
            ]}
          />
          <Space>
            <Button type="primary" onClick={handleSave}>
              保存
            </Button>
            <Button onClick={closeEdit}>取消</Button>
          </Space>
        </Form>
      </Drawer>
    </PageContainer>
  );
}
