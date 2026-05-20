import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  listCategoryByPage,
  updateCategory,
  deleteCategory,
  addCategory,
  type CategoryVO,
} from '../../api/category';

export default function CategoryManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<CategoryVO | null>(null);

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
    },
    {
      title: '分类名称',
      dataIndex: 'name',
    },
    {
      title: '描述',
      dataIndex: 'description',
      search: false,
      ellipsis: true,
    },
    {
      title: '排序',
      dataIndex: 'sort',
      search: false,
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
      render: (_: any, record: CategoryVO) => [
        <Button
          key="edit"
          type="link"
          onClick={() => {
            setEditing(record);
            form.setFieldsValue(record);
            setModalVisible(true);
          }}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确认删除？"
          onConfirm={async () => {
            await deleteCategory({ id: record.id });
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

  const handleSave = async (values: any) => {
    if (editing) {
      await updateCategory({ ...values, id: editing.id });
      message.success('更新成功');
    } else {
      await addCategory(values);
      message.success('添加成功');
    }
    setModalVisible(false);
    setEditing(null);
    form.resetFields();
    actionRef.current?.reload();
  };

  return (
    <PageContainer title="分类管理">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        request={async (params) => {
          const res = await listCategoryByPage({
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
            新建分类
          </Button>,
        ]}
      />
      <Modal
        title={editing ? '编辑分类' : '新建分类'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="分类名称" name="name" rules={[{ required: true, message: '请输入分类名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="排序" name="sort">
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
