import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(projectRoot, "dist", "sitemap.xml");
const apiBaseUrl = (process.env.SITEMAP_API_BASE_URL || "https://ownai.icu/api").replace(/\/$/, "");
const siteUrl = "https://ownai.icu";

async function request(pathname, init) {
  const response = await fetch(`${apiBaseUrl}${pathname}`, {
    ...init,
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`${pathname} returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== 0 || !payload.data) {
    throw new Error(payload.message || `${pathname} returned an invalid response`);
  }
  return payload.data;
}

async function pageAll(pathname, body = {}) {
  const records = [];
  let current = 1;
  let pages = 1;
  do {
    const page = await request(pathname, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, current, pageSize: 20 }),
    });
    records.push(...(page.records || []));
    pages = Math.max(1, Number(page.pages) || 1);
    current += 1;
  } while (current <= pages);
  return records;
}

function renderSitemap(urls) {
  const entries = urls.map((url) => `  <url>\n    <loc>${url}</loc>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

try {
  const [books, posts] = await Promise.all([
    pageAll("/blog/front/books/page"),
    pageAll("/blog/front/posts/page", { standaloneOnly: false }),
  ]);
  const publicBookIds = new Set(
    books.filter((book) => Number(book.memberOnly) === 0).map((book) => String(book.id)),
  );
  const urls = [
    `${siteUrl}/`,
    `${siteUrl}/ownai-design`,
    `${siteUrl}/tutorials`,
    ...books
      .filter((book) => publicBookIds.has(String(book.id)))
      .map((book) => `${siteUrl}/tutorials/books/${book.id}`),
    ...posts
      .filter((post) =>
        Number(post.memberOnly) === 0 &&
        (!post.bookId || publicBookIds.has(String(post.bookId))),
      )
      .map((post) => `${siteUrl}/tutorials/posts/${post.id}`),
  ];

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, renderSitemap([...new Set(urls)]), "utf8");
  console.log(`Generated sitemap.xml with ${new Set(urls).size} public URLs`);
} catch (error) {
  // Vite has already copied public/sitemap.xml into dist. Keep that checked-in
  // fallback so an unavailable API never makes the frontend build fail.
  console.warn(`Skipped live sitemap refresh: ${error instanceof Error ? error.message : error}`);
}
