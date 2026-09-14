import fs from "fs/promises";
import path from "path";

const DIST_DIR = "./dist";
const OUTPUT_FILE = path.join(DIST_DIR, "static-posts.json");
const BASE_URL = "https://yourwebsite.com";
const TARGET_DIRS = ["articles", "archive"];

async function getHtmlFiles(dir) {
  let files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(await getHtmlFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".html")) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    // Directory might not exist yet
  }
  return files;
}

async function generateManifest() {
  const posts = [];

  for (const targetDir of TARGET_DIRS) {
    const dirPath = path.join(DIST_DIR, targetDir);
    const htmlFiles = await getHtmlFiles(dirPath);

    for (const filePath of htmlFiles) {
      const html = await fs.readFile(filePath, "utf-8");

      // 1. Extract <h1> Title
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      if (!h1Match) continue;
      const title = h1Match[1]
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // 2. Extract <time id="date-published" datetime="...">
      let dateMs = null;
      const timeMatch =
        html.match(/<time[^>]*id=["']date-published["'][^>]*datetime=["']([^"']+)["']/i) ||
        html.match(/<time[^>]*datetime=["']([^"']+)["'][^>]*id=["']date-published["']/i);

      if (timeMatch) {
        const dateStr = timeMatch[1].trim();
        const parsedDate = Date.parse(dateStr);
        if (!isNaN(parsedDate)) {
          dateMs = parsedDate;
        }
      }

      // Convert path to URL route
      const relativePath = filePath
        .replace(/^dist/, "")
        .replace(/\/index\.html$/, "")
        .replace(/\.html$/, "");

      posts.push({
        title,
        url: `${BASE_URL}${relativePath}`,
        guid: `static-${relativePath}`,
        date: dateMs,
      });
    }
  }

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(posts, null, 2));
  console.log(`Static RSS manifest successfully created at ${OUTPUT_FILE}`);
}

generateManifest();
