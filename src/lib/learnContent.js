import { parseFrontmatter } from "./parseFrontmatter.js";

// Eager + raw: every .md file under content/learn is bundled at build time as
// a plain string — no runtime fetch, no CMS.
const files = import.meta.glob("../content/learn/*.md", { eager: true, query: "?raw", import: "default" });

function slugFromPath(path) {
  return path.split("/").pop().replace(/\.md$/, "");
}

export const ARTICLES = Object.entries(files)
  .map(([path, raw]) => {
    const { data, content } = parseFrontmatter(raw);
    return {
      slug: slugFromPath(path),
      title: data.title || slugFromPath(path),
      emoji: data.emoji || "🌿",
      category: data.category || "General",
      order: data.order ? Number(data.order) : 999,
      content,
    };
  })
  .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

export const ARTICLES_BY_CATEGORY = ARTICLES.reduce((acc, article) => {
  if (!acc[article.category]) acc[article.category] = [];
  acc[article.category].push(article);
  return acc;
}, {});
