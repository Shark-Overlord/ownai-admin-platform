import { useRef, useState } from 'react';
import { ProTable, type ActionType } from '@ant-design/pro-components';
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Space, Switch, Tag, message } from 'antd';
import { community, getCommunityTerms, type CommunityTerm } from '../../api/community';

export default function TaxonomyPanel({ kind }: { kind: 'category' | 'tag' }) {
  const label = kind === 'category' ? '分类' : '标签';
  const table = useRef<ActionType>(undefined);
  const [form] = Form.useForm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CommunityTerm>();
  const [saving, setSaving] = useState(false);
  function edit(row?: CommunityTerm) {
    setEditing(row); form.resetFields(); form.setFieldsValue(row ? { ...row, enabled: !!row.enabled } : { enabled: true, sort: 0 }); setOpen(true);
  }
  async function save() {
    const values = await form.validateFields(); setSaving(true);
    try { await community(`admin/taxonomy/${kind}/save`, { ...values, id: editing?.id }); message.success(`${label}已保存`); setOpen(false); table.current?.reload(); }
    finally { setSaving(false); }
  }
  return <>
    <ProTable<CommunityTerm> rowKey="id" actionRef={table} search={false} pagination={{ pageSize: 20 }} scroll={{ x: 650 }}
      headerTitle={`帖子${label}（独立于教程）`} toolBarRender={() => [<Button key="add" type="primary" onClick={() => edit()}>新增{label}</Button>]}
      request={async () => { const records = await getCommunityTerms(kind); return { data: records, total: records.length, success: true }; }}
      columns={[
        { title: '名称', dataIndex: 'name' }, { title: '描述', dataIndex: 'description', ellipsis: true },
        { title: '排序', dataIndex: 'sort', width: 80 }, { title: '公开帖子', dataIndex: 'postCount', width: 100 },
        { title: '状态', render: (_, row) => <Tag color={row.enabled ? 'green' : 'default'}>{row.enabled ? '启用' : '停用'}</Tag> },
        { title: '操作', render: (_, row) => <Space><Button type="link" onClick={() => edit(row)}>编辑</Button>
          <Popconfirm title={`删除${label}？已被内容版本引用的${label}无法删除。`} onConfirm={async () => { await community(`admin/taxonomy/${kind}/delete`, { id: row.id }); table.current?.reload(); }}><Button type="link" danger>删除</Button></Popconfirm></Space> },
      ]} />
    <Modal title={`${editing ? '编辑' : '新增'}${label}`} open={open} onCancel={() => setOpen(false)} onOk={() => void save().catch(() => {})} confirmLoading={saving}>
      <Form name={`community-${kind}-editor`} form={form} layout="vertical"><Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true }]}><Input maxLength={60} /></Form.Item>
        <Form.Item name="description" label="描述"><Input.TextArea maxLength={300} /></Form.Item>
        <Form.Item name="sort" label="排序（越大越靠前）" rules={[{ required: true }]}><InputNumber precision={0} /></Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked" extra="停用后不能新增关联，已有帖子仍然保留此分类或标签。"><Switch /></Form.Item>
      </Form>
    </Modal>
  </>;
}
