import fs from "fs";
import path from "path";
import { AddressInfo } from "net";
import { JSDOM } from "jsdom";
import { createApp } from "../app";

type IssueKind = "mojibake" | "vietnamese";

type AuditIssue = {
  kind: IssueKind;
  location: string;
  text: string;
};

type PageAuditResult = {
  page: string;
  url: string;
  status: number;
  ok: boolean;
  title: string;
  issueCount: number;
  issues: AuditIssue[];
};

type AuditSummary = {
  scannedAt: string;
  baseUrl: string;
  pageCount: number;
  failingPageCount: number;
  totalIssueCount: number;
  results: PageAuditResult[];
};

const FRONTEND_ROOT = path.resolve(process.cwd(), "frontend");
const REPORT_JSON_PATH = path.resolve(process.cwd(), "frontend-language-audit-report.json");
const REPORT_HTML_PATH = path.resolve(process.cwd(), "frontend-language-audit-report.html");
const I18N_DATA_PATH = path.resolve(FRONTEND_ROOT, "js", "offline-i18n-data.js");
const I18N_SCRIPT_PATH = path.resolve(FRONTEND_ROOT, "js", "offline-i18n.js");
const MAX_ISSUES_PER_PAGE = 25;
const MOJIBAKE_PATTERN = /(?:\u00c3|\u00c2|\u00c4|\u00c5|\u00c6|\u00c7|\u00d0|\u00d1|\u00e1|\u00e2|\ufffd)/u;
const VIETNAMESE_CHAR_PATTERN = /[ăâđêôơưĂÂĐÊÔƠƯáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/u;
const VIETNAMESE_WORD_PATTERN = /\b(?:Trang chủ|Đăng nhập|Đăng ký|Bước|Hệ thống|Giới thiệu|Liên hệ|Điều khoản|Chính sách|Dịch vụ|Miễn phí|Tăng|Hỗ trợ|Chọn ngôn ngữ|Tài liệu API)\b/u;

function listPages(): string[] {
  return fs
    .readdirSync(FRONTEND_ROOT)
    .filter((name) => name.toLowerCase().endsWith(".html"))
    .sort((left, right) => left.localeCompare(right))
    .map((name) => (name === "index.html" ? "/" : `/${name}`));
}

async function fetchText(url: string): Promise<{ status: number; body: string; error?: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(url);
      return {
        status: response.status,
        body: response.status >= 400 ? "" : await response.text(),
      };
    } catch (error) {
      if (attempt === 2) {
        return {
          status: 0,
          body: "",
          error: error instanceof Error ? error.message : String(error),
        };
      }
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  return { status: 0, body: "", error: "fetch failed" };
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSnippet(value: string): string {
  var snippet = compactWhitespace(value);
  if (snippet.length <= 180) {
    return snippet;
  }
  return `${snippet.slice(0, 177)}...`;
}

function classifyText(value: string): IssueKind[] {
  const issues: IssueKind[] = [];
  if (!value) {
    return issues;
  }
  if (MOJIBAKE_PATTERN.test(value)) {
    issues.push("mojibake");
  }
  if (VIETNAMESE_CHAR_PATTERN.test(value) || VIETNAMESE_WORD_PATTERN.test(value)) {
    issues.push("vietnamese");
  }
  return issues;
}

function pushIssues(target: AuditIssue[], seen: Set<string>, location: string, value: string): void {
  const normalized = compactWhitespace(value);
  if (!normalized) {
    return;
  }
  const kinds = classifyText(normalized);
  for (const kind of kinds) {
    const key = `${kind}|${location}|${normalized}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    target.push({
      kind,
      location,
      text: normalizeSnippet(normalized),
    });
    if (target.length >= MAX_ISSUES_PER_PAGE) {
      return;
    }
  }
}

function collectIssues(document: Document): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const seen = new Set<string>();
  const view = document.defaultView;
  const nodeFilter = view?.NodeFilter;
  const showText = nodeFilter?.SHOW_TEXT ?? 4;
  const filterAccept = nodeFilter?.FILTER_ACCEPT ?? 1;
  const filterReject = nodeFilter?.FILTER_REJECT ?? 2;

  pushIssues(issues, seen, "title", document.title);

  const metaNodes = Array.from(
    document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')
  );
  for (const meta of metaNodes) {
    if (issues.length >= MAX_ISSUES_PER_PAGE) {
      break;
    }
    const descriptor = meta.getAttribute("name") || meta.getAttribute("property") || "meta";
    pushIssues(issues, seen, `meta:${descriptor}`, meta.getAttribute("content") || "");
  }

  const attributeNodes = Array.from(document.querySelectorAll("[placeholder], [title], [aria-label], [value]"));
  for (const node of attributeNodes) {
    if (issues.length >= MAX_ISSUES_PER_PAGE) {
      break;
    }
    for (const attribute of ["placeholder", "title", "aria-label", "value"]) {
      if (issues.length >= MAX_ISSUES_PER_PAGE) {
        break;
      }
      if (!node.hasAttribute(attribute)) {
        continue;
      }
      pushIssues(issues, seen, `attr:${attribute}`, node.getAttribute(attribute) || "");
    }
  }

  const container = document.body || document.documentElement;
  const walker = document.createTreeWalker(container, showText, {
    acceptNode(node) {
      const parentName = node.parentElement?.tagName || "";
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return filterReject;
      }
      if (["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA", "SVG"].includes(parentName)) {
        return filterReject;
      }
      return filterAccept;
    },
  });

  let current: Node | null;
  while ((current = walker.nextNode()) && issues.length < MAX_ISSUES_PER_PAGE) {
    pushIssues(issues, seen, current.parentElement?.tagName?.toLowerCase() || "text", current.nodeValue || "");
  }

  return issues;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHtmlReport(summary: AuditSummary): string {
  const rows = summary.results
    .map((result) => {
      const statusClass = result.ok ? "ok" : "fail";
      const issues = result.issues.length
        ? `<ul>${result.issues
            .map(
              (issue) =>
                `<li><strong>${escapeHtml(issue.kind)}</strong> <code>${escapeHtml(issue.location)}</code> ${escapeHtml(issue.text)}</li>`
            )
            .join("")}</ul>`
        : "<div>No issues found.</div>";
      return `<tr class="${statusClass}">
        <td><a href="${escapeHtml(result.url)}" target="_blank" rel="noreferrer">${escapeHtml(result.page)}</a></td>
        <td>${result.status}</td>
        <td>${escapeHtml(result.title || "(empty)")}</td>
        <td>${result.issueCount}</td>
        <td>${issues}</td>
      </tr>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Frontend Language Audit</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; background: #f8fafc; color: #0f172a; }
    h1, h2 { margin: 0 0 12px; }
    .summary { margin-bottom: 24px; padding: 16px; background: #fff; border: 1px solid #cbd5e1; border-radius: 12px; }
    table { width: 100%; border-collapse: collapse; background: #fff; }
    th, td { border: 1px solid #cbd5e1; padding: 10px; vertical-align: top; text-align: left; }
    th { background: #e2e8f0; }
    tr.ok { background: #f0fdf4; }
    tr.fail { background: #fff7ed; }
    ul { margin: 0; padding-left: 18px; }
    code { background: #e2e8f0; padding: 1px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="summary">
    <h1>Frontend Language Audit</h1>
    <div>Scanned at: ${escapeHtml(summary.scannedAt)}</div>
    <div>Base URL: <a href="${escapeHtml(summary.baseUrl)}">${escapeHtml(summary.baseUrl)}</a></div>
    <div>Pages: ${summary.pageCount}</div>
    <div>Failing pages: ${summary.failingPageCount}</div>
    <div>Total issues: ${summary.totalIssueCount}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Page</th>
        <th>Status</th>
        <th>Title</th>
        <th>Issues</th>
        <th>Samples</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}

async function auditPage(baseUrl: string, page: string, i18nDataScript: string, i18nScript: string): Promise<PageAuditResult> {
  const url = new URL(page, baseUrl).toString();
  const response = await fetchText(url);

  if (response.status !== 200) {
    return {
      page,
      url,
      status: response.status,
      ok: false,
      title: "",
      issueCount: 1,
      issues: [{ kind: "mojibake", location: "http", text: response.error ? `FETCH ${response.error}` : `HTTP ${response.status}` }],
    };
  }

  const dom = new JSDOM(response.body, {
    url,
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });

  try {
    const window = dom.window as unknown as {
      eval(code: string): unknown;
      localStorage: Storage;
      offlineI18n?: { setLanguage(lang: string): void };
      document: Document;
      setTimeout(handler: () => void, timeout?: number): number;
    };

    window.localStorage.setItem("offline-language", "th");
    window.eval(i18nDataScript);
    window.eval(i18nScript);

    if (window.offlineI18n && typeof window.offlineI18n.setLanguage === "function") {
      window.offlineI18n.setLanguage("th");
    }

    await new Promise((resolve) => window.setTimeout(resolve as () => void, 20));

    const issues = collectIssues(window.document);
    return {
      page,
      url,
      status: response.status,
      ok: issues.length === 0,
      title: compactWhitespace(window.document.title),
      issueCount: issues.length,
      issues,
    };
  } finally {
    dom.window.close();
  }
}

async function main(): Promise<void> {
  const requestedPages = process.argv.slice(2);
  const pages = requestedPages.length ? requestedPages : listPages();
  const i18nDataScript = fs.readFileSync(I18N_DATA_PATH, "utf8");
  const i18nScript = fs.readFileSync(I18N_SCRIPT_PATH, "utf8");
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const results: PageAuditResult[] = [];
    for (const page of pages) {
      results.push(await auditPage(baseUrl, page, i18nDataScript, i18nScript));
    }

    const summary: AuditSummary = {
      scannedAt: new Date().toISOString(),
      baseUrl,
      pageCount: results.length,
      failingPageCount: results.filter((result) => !result.ok).length,
      totalIssueCount: results.reduce((total, result) => total + result.issueCount, 0),
      results,
    };

    fs.writeFileSync(REPORT_JSON_PATH, JSON.stringify(summary, null, 2));
    fs.writeFileSync(REPORT_HTML_PATH, buildHtmlReport(summary));
    console.log(JSON.stringify(summary, null, 2));
    console.log(`HTML report: ${REPORT_HTML_PATH}`);
    console.log(`JSON report: ${REPORT_JSON_PATH}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
