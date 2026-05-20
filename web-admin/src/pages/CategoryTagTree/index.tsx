import { useEffect, useState, useCallback } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { Tree, Button, Modal, Form, Input, InputNumber, message, Tag, Space, Popconfirm } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
  AppstoreOutlined,
  LinkOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import {
  getCategoryTree,
  addCategory,
  updateCategory,
  deleteCategory,
  listTagsByCategory,
  addTagToCategory,
  unbindTagFromCategory,
  type CategoryVO,
  type TagItem,
} from '../../api/category';
import { updateTag } from '../../api/tag';

interface TreeNode {
  title: React.ReactNode;
  key: string;
  isLeaf?: boolean;
  children?: TreeNode[];
}

export default function CategoryTagTree() {
  const [treeData, setTreeData] = useState<TreeNode[]>([]);


  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catForm] = Form.useForm();
  const [editingCat, setEditingCat] = useState<CategoryVO | null>(null);

  const [bindModalVisible, setBindModalVisible] = useState(false);
  const [bindForm] = Form.useForm();
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [catTags, setCatTags] = useState<TagItem[]>([]);

  const [tagModalVisible, setTagModalVisible] = useState(false);
  const [tagForm] = Form.useForm();
  const [editingTag, setEditingTag] = useState<{ id: string; name: string } | null>(null);

  const loadTree = useCallback(async () => {
    const res = await getCategoryTree();
    setTreeData(buildTreeNodes(res.data));
  }, []);

  useEffect(() => {
    loadTree();

  }, [loadTree]);

  const buildTreeNodes = (list: CategoryVO[]): TreeNode[] => {
    return list.map((cat) => {
      const children: TreeNode[] = [];
      if (cat.tags && cat.tags.length > 0) {
        children.push(
          ...cat.tags.map((tag) => ({
            title: (
              <Space>
                <Tag color="blue" icon={<TagOutlined />}>
                  {tag.name}
                </Tag>
                <Button
                  type="link"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTag({ id: tag.id, name: tag.name });
                    tagForm.setFieldsValue({ name: tag.name });
                    setTagModalVisible(true);
                  }}
                >
                  编辑
                </Button>
                <Popconfirm
                  title="确认删除该标签？"
                  onConfirm={() => handleUnbindTag(cat.id, tag.id)}
                >
                  <Button type="link" danger size="small" icon={<DisconnectOutlined />}>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
            key: `tag-${cat.id}-${tag.id}`,
            isLeaf: true,
          }))
        );
      }
      return {
        title: (
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <AppstoreOutlined />
              <span style={{ fontWeight: 600 }}>{cat.name}</span>
              <span style={{ color: '#999', fontSize: 12 }}>ID:{cat.id}</span>
            </Space>
            <Space>
              <Button
                type="link"
                size="small"
                icon={<LinkOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedCatId(cat.id);
                  bindForm.resetFields();
                  setBindModalVisible(true);
                }}
              >
                添加标签
              </Button>
              <Button
                type="link"
                size="small"
                icon={<EditOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingCat(cat);
                  catForm.setFieldsValue({
                    name: cat.name,
                    description: cat.description,
                    sort: cat.sort,
                  });
                  setCatModalVisible(true);
                }}
              >
                编辑
              </Button>
              <Popconfirm
                title="确认删除该分类？"
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDeleteCategory(cat.id);
                }}
              >
                <Button type="link" danger size="small" icon={<DeleteOutlined />} onClick={(e) => e.stopPropagation()}>
                  删除
                </Button>
              </Popconfirm>
            </Space>
          </Space>
        ),
        key: `cat-${cat.id}`,
        children: children.length > 0 ? children : undefined,
      };
    });
  };

  const handleDeleteCategory = async (id: string) => {
    await deleteCategory({ id });
    message.success('删除成功');
    loadTree();
  };

  const handleUnbindTag = async (categoryId: string, tagId: string) => {
    await unbindTagFromCategory({ categoryId, tagId });
    message.success('移除成功');
    loadTree();
    if (selectedCatId === categoryId) {
      const res = await listTagsByCategory(categoryId);
      setCatTags(res.data);
    }
  };

  const handleCatSave = async (values: any) => {
    if (editingCat) {
      await updateCategory({ ...values, id: editingCat.id });
      message.success('更新分类成功');
    } else {
      await addCategory(values);
      message.success('新增分类成功');
    }
    setCatModalVisible(false);
    setEditingCat(null);
    catForm.resetFields();
    loadTree();
  };

  const onSelect = async (selectedKeys: React.Key[]) => {
    if (selectedKeys.length === 0) return;
    const key = String(selectedKeys[0]);
    if (key.startsWith('cat-')) {
      const catId = key.replace('cat-', '');
      setSelectedCatId(catId);
      const res = await listTagsByCategory(catId);
      setCatTags(res.data);
    }
  };

  const handleBind = async (values: any) => {
    const catId = selectedCatId;
    if (!catId) {
      message.warning('请先选择一个分类');
      return;
    }
    await addTagToCategory({ categoryId: catId, tagName: values.tagName, sort: values.sort || 0 });
    message.success('添加标签成功');
    setBindModalVisible(false);
    bindForm.resetFields();
    loadTree();
    const res = await listTagsByCategory(catId);
    setCatTags(res.data);
  };

  const handleTagSave = async (values: any) => {
    if (!editingTag) return;
    await updateTag({ id: editingTag.id, name: values.name.trim() });
    message.success('标签修改成功');
    setTagModalVisible(false);
    setEditingTag(null);
    tagForm.resetFields();
    loadTree();
    if (selectedCatId) {
      const res = await listTagsByCategory(selectedCatId);
      setCatTags(res.data);
    }
  };

  return (
    <PageContainer
      title="分类标签树"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingCat(null);
            catForm.resetFields();
            setCatModalVisible(true);
          }}
        >
          新增分类
        </Button>
      }
    >
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ flex: 1, background: '#fff', padding: 16, borderRadius: 8 }}>
          <Tree
            treeData={treeData}
            onSelect={onSelect}
            defaultExpandAll
            blockNode
            showLine
          />
        </div>
        <div style={{ width: 320, background: '#fff', padding: 16, borderRadius: 8 }}>
          <h4 style={{ marginBottom: 16 }}>
            {selectedCatId ? `分类 ID: ${selectedCatId} 的标签` : '请选择一个分类'}
          </h4>
          {catTags.length > 0 ? (
            <Space wrap>
              {catTags.map((tag) => (
                <Tag color="blue" key={tag.id}>
                  {tag.name}
                </Tag>
              ))}
            </Space>
          ) : (
            <div style={{ color: '#999' }}>暂无标签</div>
          )}
        </div>
      </div>

      {/* 分类编辑弹窗 */}
      <Modal
        title={editingCat ? '编辑分类' : '新增分类'}
        open={catModalVisible}
        onCancel={() => {
          setCatModalVisible(false);
          setEditingCat(null);
        }}
        onOk={() => catForm.submit()}
        destroyOnClose
      >
        <Form form={catForm} layout="vertical" onFinish={handleCatSave}>
          <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 绑定标签弹窗 */}
      <Modal
        title="添加标签到分类"
        open={bindModalVisible}
        onCancel={() => setBindModalVisible(false)}
        onOk={() => bindForm.submit()}
        destroyOnClose
      >
        <Form form={bindForm} layout="vertical" onFinish={handleBind}>
          <Form.Item label="标签名称" name="tagName" rules={[{ required: true, message: '请输入标签名称' }]}>
            <Input placeholder="输入标签名称，不存在则自动创建" />
          </Form.Item>
          <Form.Item label="排序" name="sort" initialValue={0}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑标签弹窗 */}
      <Modal
        title="编辑标签"
        open={tagModalVisible}
        onCancel={() => {
          setTagModalVisible(false);
          setEditingTag(null);
        }}
        onOk={() => tagForm.submit()}
        destroyOnClose
      >
        <Form form={tagForm} layout="vertical" onFinish={handleTagSave}>
          <Form.Item label="标签名称" name="name" rules={[{ required: true, message: '请输入标签名称' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
