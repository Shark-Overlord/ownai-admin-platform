import { useRef, useState } from 'react';
import { Button, ColorPicker, Divider, Select, Space, Tooltip, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import {
  BoldOutlined,
  ClearOutlined,
  CodeOutlined,
  FileImageOutlined,
  FontColorsOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  UploadOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { mergeAttributes, Node } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import FileHandler from '@tiptap/extension-file-handler';
import Image from '@tiptap/extension-image';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { uploadBlogMedia } from '../../api/blog';
import './index.css';

const lowlight = createLowlight(common);
const BLOG_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BLOG_IMAGE_MAX_SIZE = 20 * 1024 * 1024;
const TEXT_COLOR_PRESETS = [
  '#1f2329',
  '#8c8c8c',
  '#f5222d',
  '#fa541c',
  '#faad14',
  '#52c41a',
  '#13c2c2',
  '#1677ff',
  '#2f54eb',
  '#722ed1',
  '#eb2f96',
];

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

function parseContent(value?: string, html?: string) {
  if (value) {
    try {
      return JSON.parse(value);
    } catch {
      // Fall through to the HTML representation for rich-text fields that do not store editor JSON.
    }
  }
  return html || JSON.parse(EMPTY_DOCUMENT);
}

export interface BlogEditorProps {
  initialContentJson?: string;
  initialContentHtml?: string;
  onChange: (contentJson: string, contentHtml: string) => void;
  variant?: 'default' | 'workspace' | 'compact';
}

export default function BlogEditor({ initialContentJson, initialContentHtml, onChange, variant = 'default' }: BlogEditorProps) {
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false, autolink: true },
      }),
      TextStyle,
      Color,
      Image.configure({ resize: { enabled: true }, allowBase64: false }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext', enableTabIndentation: true, tabSize: 2 }),
      Video,
      FileHandler.configure({
        allowedMimeTypes: BLOG_IMAGE_MIME_TYPES,
        consumePasteEvent: true,
        onPaste: (currentEditor, files) => {
          const images = files.filter((file) => BLOG_IMAGE_MIME_TYPES.includes(file.type));
          if (!images.length) return;

          const validImages = images.filter((file) => {
            if (file.size <= BLOG_IMAGE_MAX_SIZE) return true;
            message.error(`${file.name || '截图'} 超过 20MB，无法插入`);
            return false;
          });
          if (!validImages.length) return;

          let insertPosition = currentEditor.state.selection.from;
          setUploading(true);
          void (async () => {
            let insertedCount = 0;
            try {
              for (const file of validImages) {
                const res = await uploadBlogMedia(file, 'image');
                currentEditor
                  .chain()
                  .focus()
                  .insertContentAt(insertPosition, {
                    type: 'image',
                    attrs: { src: res.data, alt: file.name || '粘贴的截图' },
                  })
                  .run();
                insertPosition += 1;
                insertedCount += 1;
              }
              message.success(insertedCount > 1 ? `${insertedCount} 张截图已插入` : '截图已插入');
            } catch {
              message.error('截图上传失败，请重试');
            } finally {
              setUploading(false);
            }
          })();
        },
      }),
    ],
    content: parseContent(initialContentJson, initialContentHtml),
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
    <div className={`blog-editor${variant === 'workspace' ? ' blog-editor--workspace' : ''}${variant === 'compact' ? ' blog-editor--compact' : ''}`}>
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
          <Tooltip title="文字颜色">
            <ColorPicker
              value={editor.getAttributes('textStyle').color || '#1f2329'}
              disabledAlpha
              presets={[{ label: '常用颜色', colors: TEXT_COLOR_PRESETS }]}
              onChangeComplete={(color) => editor.chain().focus().setColor(color.toHexString()).run()}
            >
              <Button
                aria-label="设置文字颜色"
                size="small"
                type="text"
                icon={<FontColorsOutlined style={{ color: editor.getAttributes('textStyle').color || undefined }} />}
              />
            </ColorPicker>
          </Tooltip>
          <Tooltip title="清除文字颜色">
            <Button
              aria-label="清除文字颜色"
              size="small"
              type="text"
              icon={<ClearOutlined />}
              disabled={!editor.getAttributes('textStyle').color}
              onClick={() => editor.chain().focus().unsetColor().run()}
            />
          </Tooltip>
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
              if (file.size > BLOG_IMAGE_MAX_SIZE) message.error('博客图片不能超过 20MB');
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
