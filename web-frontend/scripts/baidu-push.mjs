import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sitemapPath = path.join(projectRoot, "public", "sitemap.xml");
const siteUrl = "https://ownai.icu";
const token = process.env.BAIDU_PUSH_TOKEN || "hziPOILWEz4hUzxV";
const pushApi = `http://data.zz.baidu.com/urls?site=${siteUrl}&token=${token}`;

async function main() {
  const content = await readFile(sitemapPath, "utf8");
  const urls = [...content.matchAll(/<loc>(https:\/\/ownai\.icu[^<]+)<\/loc>/g)].map(
    (m) => m[1],
  );

  if (urls.length === 0) {
    console.error("No URLs found in sitemap.xml");
    process.exit(1);
  }

  // Baidu new site daily quota is typically 10
  const limit = Number(process.env.LIMIT || 10);
  const selected = urls.slice(0, limit);

  console.log(`Pushing ${selected.length} URLs to Baidu (${siteUrl})...`);
  const response = await fetch(pushApi, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: selected.join("\n"),
  });

  const result = await response.json();
  if (result.error === 400 && result.message === "over quota") {
    console.warn("⚠️ 今日百度主动推送配额已用完（新站初始配额通常为 10 条/天），明日重置后再试。");
    console.log("提示：可直接在百度搜索资源平台【普通收录 -> sitemap】提交 https://ownai.icu/sitemap.xml，不占用 API 配额。");
    return;
  }
  console.log("Baidu API response:", JSON.stringify(result, null, 2));

  if (result.error) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Failed to push URLs to Baidu:", err);
  process.exitCode = 1;
});
