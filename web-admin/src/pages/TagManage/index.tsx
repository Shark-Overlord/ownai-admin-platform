import { useRef, useState } from 'react';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, InputNumber, message, Popconfirm } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  listTagByPage,
  updateTag,
  deleteTag,
  addTag,
  type TagVO,
} from '../../api/tag';

export default function TagManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<TagVO | null>(null);

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
    },
    {
      title: '标签名称',
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
      render: (_: any, record: TagVO) => [
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
            await deleteTag({ id: record.id });
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
      await updateTag({ ...values, id: editing.id });
      message.success('更新成功');
    } else {
      await addTag(values);
      message.success('添加成功');
    }
    setModalVisible(false);
    setEditing(null);
    form.resetFields();
    actionRef.current?.reload();
  };

  return (
    <PageContainer title="标签管理">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        request={async (params) => {
          const res = await listTagByPage({
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
            新建标签
          </Button>,
        ]}
      />
      <Modal
        title={editing ? '编辑标签' : '新建标签'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onOk={() => form.submit()}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="标签名称" name="name" rules={[{ required: true, message: '请输入标签名称' }]}>
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
