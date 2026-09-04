import { useRef, useState } from 'react';
import { Button, ColorPicker, Divider, Dropdown, Modal, Select, Space, Spin, Tooltip, Upload, message } from 'antd';
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
  TableOutlined,
  UploadOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { Extension, mergeAttributes, Node } from '@tiptap/core';
import type { Editor, JSONContent } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { Color, TextStyle } from '@tiptap/extension-text-style';
import { Markdown } from '@tiptap/markdown';
import { Plugin } from '@tiptap/pm/state';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { common, createLowlight } from 'lowlight';
import { importRemoteBlogImages, uploadBlogMedia } from '../../api/blog';
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

function looksLikeMarkdown(text: string) {
  if (!text.trim()) return false;
  if (/!\[[^\]]*]\([^\s)]+(?:\s+["'][^"']*["'])?\)/.test(text)) return true;
  if (/^\s*```[\w-]*\s*$/m.test(text)) return true;
  if (/^#{1,6}\s+\S/m.test(text)) return true;
  if (/^\s{0,3}>\s+\S/m.test(text)) return true;
  if (/^\s{0,3}(?:[-+*]|\d+[.)])\s+\S/m.test(text) && text.includes('\n')) return true;
  if (/^\s*\|?.+\|.+\s*$\n\s*\|?\s*:?-{3,}:?\s*\|/m.test(text)) return true;
  if (/^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/m.test(text)) return true;
  return text.includes('\n') && (/\*\*[^*]+\*\*/.test(text) || /\[[^\]]+]\([^\s)]+\)/.test(text));
}

function collectImageSources(content: JSONContent) {
  const sources: string[] = [];
  const visit = (node: JSONContent) => {
    if (node.type === 'image' && typeof node.attrs?.src === 'string') sources.push(node.attrs.src);
    node.content?.forEach(visit);
  };
  visit(content);
  return [...new Set(sources)];
}

function replaceEditorImageSources(editor: Editor, replacements: Map<string, string>) {
  if (!replacements.size || editor.isDestroyed) return;
  const transaction = editor.state.tr;
  let changed = false;

  editor.state.doc.descendants((node, position) => {
    if (node.type.name !== 'image' || typeof node.attrs.src !== 'string') return;
    const replacement = replacements.get(node.attrs.src);
    if (!replacement || replacement === node.attrs.src) return;
    transaction.setNodeMarkup(position, undefined, { ...node.attrs, src: replacement }, node.marks);
    changed = true;
  });

  if (changed) {
    transaction.setMeta('addToHistory', false);
    editor.view.dispatch(transaction);
  }
}

export interface BlogEditorProps {
  initialContentJson?: string;
  initialContentHtml?: string;
  onChange: (contentJson: string, contentHtml: string) => void;
  variant?: 'default' | 'workspace' | 'compact';
}

export default function BlogEditor({ initialContentJson, initialContentHtml, onChange, variant = 'default' }: BlogEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [importingMarkdown, setImportingMarkdown] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const showImageImportFailures = (failures: Array<{ sourceUrl: string; message: string }>) => {
    if (!failures.length) return;
    Modal.warning({
      title: `${failures.length} 张图片未能迁移`,
      width: 640,
      content: (
        <div>
          <p>正文已正常导入；HTTPS 图片继续使用原地址，其他地址保留原始标记。</p>
          <ul className="blog-editor__import-errors">
            {failures.slice(0, 10).map((failure) => (
              <li key={`${failure.sourceUrl}-${failure.message}`}>
                <span>{failure.sourceUrl}</span>
                <small>{failure.message}</small>
              </li>
            ))}
          </ul>
          {failures.length > 10 ? <p>另有 {failures.length - 10} 项未显示。</p> : null}
        </div>
      ),
    });
  };

  const importMarkdownAtSelection = async (currentEditor: Editor, markdown: string, from: number, to: number) => {
    setImportingMarkdown(true);
    try {
      const document = currentEditor.markdown?.parse(markdown);
      if (!document) throw new Error('Markdown 解析器未就绪');

      const insertedContent = document.type === 'doc' ? document.content || [] : document;
      if (Array.isArray(insertedContent) && !insertedContent.length) {
        throw new Error('Markdown 解析结果为空');
      }
      const inserted = currentEditor.commands.insertContentAt(
        { from, to },
        insertedContent,
        { errorOnInvalidContent: true },
      );
      if (!inserted) throw new Error('无法将 Markdown 插入当前位置');

      // Insert the document before awaiting uploads. This keeps text and tables visible even if
      // remote image migration is slow or fails, and avoids applying an old selection afterward.
      currentEditor.setEditable(false, false);

      const imageSources = collectImageSources(document);
      const httpsSources = imageSources.filter((source) => /^https:\/\//i.test(source));
      const importableSources = httpsSources.slice(0, 50);
      const failures = imageSources
        .filter((source) => !/^https:\/\//i.test(source))
        .map((sourceUrl) => ({ sourceUrl, message: '粘贴文本无法读取本地或非 HTTPS 图片' }));
      httpsSources.slice(50).forEach((sourceUrl) => failures.push({ sourceUrl, message: '单次最多迁移 50 张图片' }));

      const replacements = new Map<string, string>();
      if (importableSources.length) {
        try {
          const response = await importRemoteBlogImages(importableSources);
          response.data.items.forEach((item) => {
            if (item.success && item.storedUrl) replacements.set(item.sourceUrl, item.storedUrl);
            else failures.push({ sourceUrl: item.sourceUrl, message: item.message || '图片迁移失败' });
          });
        } catch (error) {
          const reason = error instanceof Error ? error.message : '远程图片迁移请求失败';
          importableSources.forEach((sourceUrl) => failures.push({ sourceUrl, message: reason }));
        }
      }
      replaceEditorImageSources(currentEditor, replacements);
      message.success(
        replacements.size
          ? `Markdown 已导入，${replacements.size} 张图片已迁移`
          : 'Markdown 已按原格式导入',
      );
      showImageImportFailures(failures);
    } catch (error) {
      message.error(error instanceof Error ? `Markdown 导入失败：${error.message}` : 'Markdown 导入失败');
    } finally {
      if (!currentEditor.isDestroyed) {
        currentEditor.setEditable(true, false);
        currentEditor.commands.focus();
      }
      setImportingMarkdown(false);
    }
  };

  const pasteImageFilesAtSelection = async (currentEditor: Editor, files: File[], from: number, to: number) => {
    const validImages = files.filter((file) => {
      if (!BLOG_IMAGE_MIME_TYPES.includes(file.type)) return false;
      if (file.size <= BLOG_IMAGE_MAX_SIZE) return true;
      message.error(`${file.name || '截图'} 超过 20MB，无法插入`);
      return false;
    });
    if (!validImages.length) return;

    setUploading(true);
    currentEditor.setEditable(false);
    try {
      const results = await Promise.allSettled(validImages.map((file) => uploadBlogMedia(file, 'image')));
      const images: JSONContent[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          images.push({ type: 'image', attrs: { src: result.value.data, alt: validImages[index].name || '粘贴的截图' } });
        }
      });
      if (images.length) currentEditor.chain().insertContentAt({ from, to }, images).focus().run();
      const failedCount = results.length - images.length;
      if (images.length) message.success(images.length > 1 ? `${images.length} 张截图已插入` : '截图已插入');
      if (failedCount) message.warning(`${failedCount} 张截图上传失败，请重试`);
    } finally {
      currentEditor.setEditable(true);
      currentEditor.commands.focus();
      setUploading(false);
    }
  };

  const UnifiedPasteHandler = Extension.create({
    name: 'unifiedPasteHandler',
    addProseMirrorPlugins() {
      const currentEditor = this.editor;
      return [
        new Plugin({
          props: {
            handlePaste: (_view, event) => {
              const markdown = event.clipboardData?.getData('text/plain') || '';
              const files = Array.from(event.clipboardData?.files || []).filter((file) =>
                BLOG_IMAGE_MIME_TYPES.includes(file.type),
              );
              const { from, to } = currentEditor.state.selection;
              if (looksLikeMarkdown(markdown)) {
                event.preventDefault();
                void importMarkdownAtSelection(currentEditor, markdown, from, to);
                return true;
              }
              if (files.length) {
                event.preventDefault();
                void pasteImageFilesAtSelection(currentEditor, files, from, to);
                return true;
              }
              return false;
            },
          },
        }),
      ];
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false, autolink: true },
      }),
      TextStyle,
      Color,
      Image.configure({ resize: { enabled: true }, allowBase64: false }),
      TableKit.configure({ table: { resizable: false, renderWrapper: false } }),
      Markdown.configure({ markedOptions: { gfm: true, breaks: false } }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: 'plaintext', enableTabIndentation: true, tabSize: 2 }),
      Video,
      UnifiedPasteHandler,
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

  const tableMenuItems = [
    { key: 'add-column-before', label: '左侧增加列', onClick: () => editor.chain().focus().addColumnBefore().run() },
    { key: 'add-column-after', label: '右侧增加列', onClick: () => editor.chain().focus().addColumnAfter().run() },
    { key: 'delete-column', label: '删除当前列', onClick: () => editor.chain().focus().deleteColumn().run() },
    { type: 'divider' as const },
    { key: 'add-row-before', label: '上方增加行', onClick: () => editor.chain().focus().addRowBefore().run() },
    { key: 'add-row-after', label: '下方增加行', onClick: () => editor.chain().focus().addRowAfter().run() },
    { key: 'delete-row', label: '删除当前行', onClick: () => editor.chain().focus().deleteRow().run() },
    { type: 'divider' as const },
    { key: 'toggle-header-row', label: '切换表头行', onClick: () => editor.chain().focus().toggleHeaderRow().run() },
    { key: 'merge-cells', label: '合并单元格', onClick: () => editor.chain().focus().mergeCells().run() },
    { key: 'split-cell', label: '拆分单元格', onClick: () => editor.chain().focus().splitCell().run() },
    { type: 'divider' as const },
    { key: 'delete-table', danger: true, label: '删除表格', onClick: () => editor.chain().focus().deleteTable().run() },
  ];

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
          <Tooltip title="插入 3 × 3 表格">
            <Button size="small" icon={<TableOutlined />} onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>表格</Button>
          </Tooltip>
          {editor.isActive('table') ? (
            <Dropdown menu={{ items: tableMenuItems }} trigger={['click']}>
              <Button size="small" type="primary" ghost>表格操作</Button>
            </Dropdown>
          ) : null}
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
      {importingMarkdown ? (
        <div className="blog-editor__importing">
          <Spin />
          <span>正在解析 Markdown 并迁移图片，请稍候…</span>
        </div>
      ) : null}
    </div>
  );
}
