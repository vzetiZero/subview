import fs from "fs";
import path from "path";
import { db } from "../db";
import { slugify } from "../utils/html";

export type CatalogSyncSummary = {
  created: number;
  updated: number;
  totalPages: number;
  syncedPages: number;
  skippedPages: number;
  frontendRoot: string;
  happenedAt: string;
};

type CategorySeed = {
  key: string;
  name: string;
  description: string;
};

type PageMetadata = {
  title: string;
  heading: string | null;
  description: string;
};

const EXCLUDED_PAGE_NAMES = new Set([
  "[content_types]",
  "[content_types].html",
  "affiliate",
  "api",
  "bang-gia-dich-vu",
  "buttons",
  "chinh-sach-bao-mat",
  "dieu-khoan-dich-vu",
  "does-not-exist-codex-test",
  "edge-2",
  "gioi-thieu",
  "index",
  "lien-he",
  "login",
  "register",
  "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz0123456789+",
]);

const EXCLUDED_DIRS = new Set(["_repair_backup", "process", "xl"]);

const CATEGORY_SEEDS: CategorySeed[] = [
  { key: "facebook", name: "Facebook", description: "Facebook growth services" },
  { key: "tiktok", name: "TikTok", description: "TikTok growth services" },
  { key: "instagram", name: "Instagram", description: "Instagram growth services" },
  { key: "youtube", name: "YouTube", description: "YouTube growth services" },
  { key: "telegram", name: "Telegram", description: "Telegram growth services" },
  { key: "twitter", name: "Twitter X", description: "Twitter/X growth services" },
  { key: "threads", name: "Threads", description: "Threads growth services" },
  { key: "shopee", name: "Shopee", description: "Shopee growth services" },
  { key: "google-maps", name: "Google Maps", description: "Google Maps review services" },
  { key: "discord", name: "Discord", description: "Discord community services" },
  { key: "traffic", name: "Traffic", description: "Website traffic services" },
  { key: "other", name: "Other Services", description: "Other service pages" },
];

let lastSyncSummary: CatalogSyncSummary | null = null;

function cleanText(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readHtml(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function detectCategoryKey(slug: string): string {
  if (slug.includes("facebook")) return "facebook";
  if (slug.includes("tiktok") || slug.includes("tik-tok")) return "tiktok";
  if (slug.includes("instagram")) return "instagram";
  if (slug.includes("youtube")) return "youtube";
  if (slug.includes("telegram")) return "telegram";
  if (slug.includes("twitter")) return "twitter";
  if (slug.includes("threads")) return "threads";
  if (slug.includes("shopee")) return "shopee";
  if (slug.includes("google-maps") || slug.includes("fanpage-facebook") || slug.includes("danh-gia")) return "google-maps";
  if (slug.includes("discord")) return "discord";
  if (slug.includes("traffic") || slug.includes("user")) return "traffic";
  return "other";
}

function detectUnitName(slug: string): string {
  if (slug.includes("view")) return "views";
  if (slug.includes("like") || slug.includes("tim")) return "likes";
  if (slug.includes("follow") || slug.includes("sub")) return "followers";
  if (slug.includes("member")) return "members";
  if (slug.includes("comment")) return "comments";
  if (slug.includes("share") || slug.includes("retweet")) return "shares";
  if (slug.includes("reaction")) return "reactions";
  if (slug.includes("vote")) return "votes";
  if (slug.includes("danh-gia") || slug.includes("review")) return "reviews";
  if (slug.includes("traffic")) return "visits";
  return "units";
}

function guessPrice(slug: string): number {
  if (slug.includes("mien-phi") || slug.includes("free")) return 0;
  if (slug.includes("traffic")) return 15;
  if (slug.includes("view")) return 20;
  if (slug.includes("like") || slug.includes("tim")) return 45;
  if (slug.includes("comment")) return 90;
  if (slug.includes("follow") || slug.includes("sub") || slug.includes("member")) return 75;
  if (slug.includes("share") || slug.includes("retweet")) return 55;
  if (slug.includes("reaction")) return 35;
  if (slug.includes("danh-gia") || slug.includes("review")) return 120;
  if (slug.includes("vote-poll")) return 65;
  return 50;
}

function inferQuantityRange(slug: string): { min: number; max: number } {
  if (slug.includes("mien-phi") || slug.includes("free")) return { min: 1, max: 100 };
  if (slug.includes("traffic")) return { min: 100, max: 500000 };
  if (slug.includes("view")) return { min: 1000, max: 1000000 };
  if (slug.includes("danh-gia") || slug.includes("review")) return { min: 10, max: 5000 };
  if (slug.includes("comment")) return { min: 10, max: 10000 };
  return { min: 100, max: 50000 };
}

function extractMetadata(filePath: string): PageMetadata {
  const html = readHtml(filePath);
  const title = cleanText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || path.basename(filePath, path.extname(filePath)));
  const heading = cleanText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "") || null;
  const metaDescription = cleanText(html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i)?.[1] || "");
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => cleanText(match[1])).filter(Boolean);
  const fallbackDescription = paragraphs.find((item) => item.length > 40) || heading || title;
  return {
    title,
    heading,
    description: metaDescription || fallbackDescription,
  };
}

function ensureCategories(): Map<string, number> {
  const map = new Map<string, number>();

  CATEGORY_SEEDS.forEach((seed, index) => {
    const slug = slugify(seed.key);
    const existing = db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug) as { id: number } | undefined;
    if (existing) {
      db.prepare("UPDATE categories SET name = ?, description = ?, sort_order = ?, updated_at = datetime('now') WHERE id = ?")
        .run(seed.name, seed.description, index + 1, existing.id);
      map.set(seed.key, existing.id);
      return;
    }
    const result = db
      .prepare("INSERT INTO categories (name, slug, description, sort_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))")
      .run(seed.name, slug, seed.description, index + 1);
    map.set(seed.key, Number(result.lastInsertRowid));
  });

  return map;
}

function collectHtmlPages(frontendRoot: string): string[] {
  const result: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name.toLowerCase())) continue;
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
        result.push(fullPath);
      }
    }
  };
  walk(frontendRoot);
  return result;
}

function buildProductSlug(relativePath: string): string {
  const base = relativePath.replace(/\.html?$/i, "").replace(/\\/g, "/");
  const fileName = path.basename(base);
  return slugify(fileName);
}

function buildServiceCode(slug: string): string {
  return `AUTO_${slug.replace(/-/g, "_").toUpperCase().slice(0, 40)}`;
}

function isServicePage(relativePath: string, fileSlug: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const rawBaseName = path.basename(normalized, path.extname(normalized));
  if (normalized.startsWith("service/")) return true;
  if (normalized.includes("/")) return false;
  return !EXCLUDED_PAGE_NAMES.has(rawBaseName) && !EXCLUDED_PAGE_NAMES.has(fileSlug);
}

export function getLastCatalogSyncSummary(): CatalogSyncSummary | null {
  return lastSyncSummary;
}

export function syncFrontendCatalog(frontendRoot: string): CatalogSyncSummary {
  const categoryMap = ensureCategories();
  const pages = collectHtmlPages(frontendRoot);
  let created = 0;
  let updated = 0;
  let syncedPages = 0;
  let skippedPages = 0;

  for (const filePath of pages) {
    const relative = path.relative(frontendRoot, filePath).replace(/\\/g, "/");
    const fileSlug = slugify(path.basename(relative, path.extname(relative)));
    if (!isServicePage(relative, fileSlug)) {
      skippedPages += 1;
      continue;
    }

    const slug = buildProductSlug(relative);
    const categoryKey = detectCategoryKey(slug);
    const categoryId = categoryMap.get(categoryKey) ?? categoryMap.get("other") ?? 1;
    const metadata = extractMetadata(filePath);
    const price = guessPrice(slug);
    const range = inferQuantityRange(slug);
    const unitName = detectUnitName(slug);
    const description = `${metadata.description} [source=${relative}]`;
    const existing = db.prepare("SELECT id FROM products WHERE slug = ?").get(slug) as { id: number } | undefined;

    if (existing) {
      db.prepare("UPDATE products SET category_id = ?, name = ?, description = ?, unit_name = ?, price = ?, min_quantity = ?, max_quantity = ?, updated_at = datetime('now') WHERE id = ?")
        .run(categoryId, metadata.heading || metadata.title, description, unitName, price, range.min, range.max, existing.id);
      updated += 1;
      syncedPages += 1;
      continue;
    }

    db.prepare("INSERT INTO products (category_id, name, slug, service_code, description, unit_name, price, min_quantity, max_quantity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))")
      .run(categoryId, metadata.heading || metadata.title, slug, buildServiceCode(slug), description, unitName, price, range.min, range.max);
    created += 1;
    syncedPages += 1;
  }

  lastSyncSummary = {
    created,
    updated,
    totalPages: pages.length,
    syncedPages,
    skippedPages,
    frontendRoot,
    happenedAt: new Date().toISOString(),
  };

  return lastSyncSummary;
}
