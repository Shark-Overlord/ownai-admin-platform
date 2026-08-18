export function generateBlogSlug(title: string | undefined, prefix: 'article' | 'book', seed: string) {
  const readable = (title || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return readable || `${prefix}-${seed}`;
}
