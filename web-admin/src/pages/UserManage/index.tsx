import { useRef, useState } from 'react';
import { PageContainer } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import { Alert, Button, Modal, Form, Input, Select, message, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { listUserByPage, updateUser, deleteUser, deleteUserBatch, addUser, type UserVO } from '../../api/user';

export default function UserManage() {
  const actionRef = useRef<any>(null);
  const [form] = Form.useForm();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserVO | null>(null);
  const [selectedRows, setSelectedRows] = useState<UserVO[]>([]);

  const columns: any[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      search: false,
    },
    {
      title: '账号',
      dataIndex: 'userAccount',
    },
    {
      title: '昵称',
      dataIndex: 'userName',
      search: false,
    },
    {
      title: '角色',
      dataIndex: 'userRole',
      valueType: 'select',
      valueEnum: {
        user: { text: '普通用户' },
        admin: { text: '管理员' },
      },
    },
    {
      title: '会员等级',
      dataIndex: 'memberLevel',
      search: false,
      valueEnum: {
        normal: { text: '普通用户' },
        plus: { text: 'Plus 会员' },
        pro: { text: 'Pro 会员' },
      },
    },
    {
      title: '套餐类型',
      dataIndex: 'memberPlanType',
      search: false,
      valueEnum: {
        month: { text: '月费', status: 'Processing' },
        year: { text: '年费', status: 'Success' },
      },
    },
    {
      title: '会员到期时间',
      dataIndex: 'memberExpireTime',
      search: false,
      valueType: 'dateTime',
    },
    {
      title: '积分余额',
      dataIndex: 'pointBalance',
      search: false,
    },
    {
      title: '注册时间',
      dataIndex: 'createTime',
      search: false,
      valueType: 'date',
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_: any, record: UserVO) => [
        <Button
          key="edit"
          type="link"
          onClick={() => {
            setEditingUser(record);
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
            await deleteUser({ id: record.id });
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
    if (editingUser) {
      await updateUser({ ...values, id: editingUser.id });
      message.success('更新成功');
    } else {
      await addUser(values);
      message.success('添加成功');
    }
    setModalVisible(false);
    setEditingUser(null);
    form.resetFields();
    actionRef.current?.reload();
  };

  return (
    <PageContainer title="用户管理">
      <ProTable
        actionRef={actionRef}
        columns={columns}
        rowKey="id"
        search={{ labelWidth: 'auto' }}
        cardBordered
        request={async (params) => {
          const res = await listUserByPage({
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
          onChange: (_, rows: UserVO[]) => {
            setSelectedRows(rows);
          },
        }}
        toolBarRender={() => [
          <Button
            key="add"
            icon={<PlusOutlined />}
            type="primary"
            onClick={() => {
              setEditingUser(null);
              form.resetFields();
              setModalVisible(true);
            }}
          >
            新建用户
          </Button>,
          <Popconfirm
            key="batch-delete"
            title="确认批量删除？"
            disabled={selectedRows.length === 0}
            onConfirm={async () => {
              await deleteUserBatch({ ids: selectedRows.map((r) => r.id) });
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
      <Modal
        title={editingUser ? '编辑用户' : '新建用户'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingUser(null);
        }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          {!editingUser && (
            <Form.Item
              label="账号"
              name="userAccount"
              rules={[{ required: true, message: '请输入账号' }]}
            >
              <Input />
            </Form.Item>
          )}
          <Form.Item label="昵称" name="userName">
            <Input />
          </Form.Item>
          <Form.Item label="角色" name="userRole" rules={[{ required: true }]}>
            <Select
              options={[
                { label: '普通用户', value: 'user' },
                { label: '管理员', value: 'admin' },
              ]}
            />
          </Form.Item>
          <Form.Item label="会员等级" name="memberLevel">
            <Select
              options={[
                { label: '普通用户', value: 'normal' },
                { label: 'Plus 会员', value: 'plus' },
                { label: 'Pro 会员', value: 'pro' },
              ]}
            />
          </Form.Item>
          <Form.Item label="套餐类型" name="memberPlanType">
            <Select
              options={[
                { label: '月费', value: 'month' },
                { label: '年费', value: 'year' },
              ]}
              placeholder="请选择套餐类型"
              allowClear
            />
          </Form.Item>
          <Form.Item label="会员到期时间" name="memberExpireTime">
            <Input type="datetime-local" />
          </Form.Item>
          <Alert
            style={{ marginBottom: 16 }}
            type="info"
            showIcon
            message="日常发放或扣减积分建议使用“积分管理”页面；这里填写的是用户最终积分余额。"
          />
          <Form.Item label="积分余额" name="pointBalance">
            <Input type="number" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
