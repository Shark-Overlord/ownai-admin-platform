import { useRef, useState } from 'react';
import { Button, Divider, Select, Space, Tooltip, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import {
  BoldOutlined,
  CodeOutlined,
  FileImageOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  UploadOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { mergeAttributes, Node } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { uploadBlogMedia } from '../../api/blog';
import './index.css';

const lowlight = createLowlight(common);

const Video = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      poster: { default: null },
      controls: { default: true },
      preload: { default: 'metadata' },
    };
  },
  parseHTML() {
    return [{ tag: 'video[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes({ controls: 'controls', preload: 'metadata' }, HTMLAttributes)];
  },
});

const EMPTY_DOCUMENT = JSON.stringify({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

function parseContent(value?: string) {
  if (!value) return JSON.parse(EMPTY_DOCUMENT);
  try {
    return JSON.parse(value);
  } catch {
    return JSON.parse(EMPTY_DOCUMENT);
  }
}

export interface BlogEditorProps {
  initialContentJson?: string;
  onChange: (contentJson: string, contentHtml: string) => void;
  variant?: 'default' | 'workspace';
}

export default function BlogEditor({ initialContentJson, onChange, variant = 'default' }: BlogEditorProps) {
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false, autolink: true },
      }),
      Image.configure({ resize: { enabled: true }, allowBase64: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext', enableTabIndentation: true, tabSize: 2 }),
      Video,
    ],
    content: parseContent(initialContentJson),
    editorProps: {
      attributes: { class: 'blog-editor__content' },
    },
    onCreate: ({ editor: currentEditor }) => {
      onChange(JSON.stringify(currentEditor.getJSON()), currentEditor.getHTML());
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(JSON.stringify(currentEditor.getJSON()), currentEditor.getHTML());
    },
  });

  if (!editor) return null;

  const uploadAndInsert = async (file: File, type: 'image' | 'video') => {
    setUploading(true);
    try {
      const res = await uploadBlogMedia(file, type);
      if (type === 'image') {
        editor.chain().focus().setImage({ src: res.data, alt: file.name }).run();
      } else {
        editor.commands.insertContent({ type: 'video', attrs: { src: res.data, controls: true, preload: 'metadata' } });
      }
      message.success(type === 'image' ? '图片已插入' : '视频已插入');
    } finally {
      setUploading(false);
    }
  };

  const videoUploadProps: UploadProps = {
    accept: 'video/mp4,video/webm,video/x-m4v,.mp4,.webm,.m4v',
    showUploadList: false,
    beforeUpload: (file) => {
      if (file.size > 100 * 1024 * 1024) {
        message.error('博客视频不能超过 100MB');
        return Upload.LIST_IGNORE;
      }
      void uploadAndInsert(file as File, 'video');
      return false;
    },
  };

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('请输入 HTTPS 链接', previousUrl);
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={`blog-editor${variant === 'workspace' ? ' blog-editor--workspace' : ''}`}>
      <div className="blog-editor__toolbar">
        <Space size={4} wrap>
          <Select
            size="small"
            value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
            style={{ width: 100 }}
            options={[
              { label: '正文', value: 'p' },
              { label: '标题 1', value: 'h1' },
              { label: '标题 2', value: 'h2' },
              { label: '标题 3', value: 'h3' },
            ]}
            onChange={(value) => {
              if (value === 'p') editor.chain().focus().setParagraph().run();
              else editor.chain().focus().toggleHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
            }}
          />
          <Tooltip title="粗体"><Button size="small" type={editor.isActive('bold') ? 'primary' : 'default'} icon={<BoldOutlined />} onClick={() => editor.chain().focus().toggleBold().run()} /></Tooltip>
          <Tooltip title="斜体"><Button size="small" type={editor.isActive('italic') ? 'primary' : 'default'} icon={<ItalicOutlined />} onClick={() => editor.chain().focus().toggleItalic().run()} /></Tooltip>
          <Tooltip title="链接"><Button size="small" type={editor.isActive('link') ? 'primary' : 'default'} icon={<LinkOutlined />} onClick={setLink} /></Tooltip>
          <Divider type="vertical" />
          <Tooltip title="无序列表"><Button size="small" type={editor.isActive('bulletList') ? 'primary' : 'default'} icon={<UnorderedListOutlined />} onClick={() => editor.chain().focus().toggleBulletList().run()} /></Tooltip>
          <Tooltip title="有序列表"><Button size="small" type={editor.isActive('orderedList') ? 'primary' : 'default'} icon={<OrderedListOutlined />} onClick={() => editor.chain().focus().toggleOrderedList().run()} /></Tooltip>
          <Tooltip title="代码块"><Button size="small" type={editor.isActive('codeBlock') ? 'primary' : 'default'} icon={<CodeOutlined />} onClick={() => editor.chain().focus().toggleCodeBlock().run()} /></Tooltip>
          <Divider type="vertical" />
          <Button size="small" icon={<FileImageOutlined />} loading={uploading} onClick={() => imageInputRef.current?.click()}>插入图片</Button>
          <Upload {...videoUploadProps}><Button size="small" icon={<VideoCameraOutlined />} loading={uploading}>插入视频</Button></Upload>
          <Button size="small" icon={<UploadOutlined />} onClick={() => editor.chain().focus().setHorizontalRule().run()}>分割线</Button>
        </Space>
        <input
          ref={imageInputRef}
          type="file"
          hidden
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              if (file.size > 20 * 1024 * 1024) message.error('博客图片不能超过 20MB');
              else void uploadAndInsert(file, 'image');
            }
            event.target.value = '';
          }}
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
