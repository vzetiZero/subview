import fs from "fs";
import path from "path";
import { AddressInfo } from "net";
import { createApp } from "../app";

type ScanResult = {
  page: string;
  status: number;
  ok: boolean;
  failedAssets: string[];
  checkedAssets: number;
};

type FetchResult = {
  url: string;
  status: number;
  contentType: string;
  body: string;
  redirectedTo?: string | null;
};

const DEFAULT_PAGES = ["/", "/buff-like-facebook.html", "/login.html", "/register.html"];
const REPORT_PATH = path.resolve(process.cwd(), "smoke-frontend-assets-report.json");

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function extractHtmlAssets(html: string): string[] {
  const assets: string[] = [];
  const attrPattern = /(?:href|src)=["']([^"'#]+)["']/gi;
  const inlineStylePattern = /url\((['"]?)([^'")]+)\1\)/gi;
  let match: RegExpExecArray | null;

  while ((match = attrPattern.exec(html))) {
    assets.push(match[1]);
  }

  while ((match = inlineStylePattern.exec(html))) {
    assets.push(match[2]);
  }

  return unique(
    assets.filter((value) => value && !value.startsWith("javascript:") && !value.startsWith("mailto:") && !value.startsWith("data:"))
  );
}

function extractCssAssets(css: string): string[] {
  const assets: string[] = [];
  const pattern = /url\((['"]?)([^'")]+)\1\)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css))) {
    assets.push(match[2]);
  }
  return unique(assets.filter((value) => value && !value.startsWith("data:")));
}

async function fetchText(url: string): Promise<FetchResult> {
  const response = await fetch(url, { redirect: "manual" });
  const contentType = response.headers.get("content-type") || "";
  const location = response.headers.get("location");
  const body = response.status >= 300 && response.status < 400 ? "" : await response.text();
  return {
    url,
    status: response.status,
    contentType,
    body,
    redirectedTo: location,
  };
}

async function scanPage(baseUrl: string, pagePath: string): Promise<ScanResult> {
  const pageUrl = new URL(pagePath, baseUrl).toString();
  const pageResponse = await fetchText(pageUrl);
  const queue = extractHtmlAssets(pageResponse.body).map((value) => new URL(value, pageUrl).toString());
  const visited = new Set<string>();
  const failedAssets: string[] = [];

  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const asset = await fetchText(current);
    if (asset.status >= 400 || asset.status === 0) {
      failedAssets.push(`${asset.status} ${current}`);
      continue;
    }

    if (asset.status >= 300 && asset.status < 400) {
      continue;
    }

    if (asset.contentType.includes("text/css")) {
      const nestedAssets = extractCssAssets(asset.body).map((value) => new URL(value, current).toString());
      for (const nested of nestedAssets) {
        if (!visited.has(nested)) queue.push(nested);
      }
    }
  }

  return {
    page: pagePath,
    status: pageResponse.status,
    ok: pageResponse.status === 200 && failedAssets.length === 0,
    failedAssets,
    checkedAssets: visited.size,
  };
}

async function main(): Promise<void> {
  const app = createApp();
  const server = app.listen(0, "127.0.0.1");

  await new Promise<void>((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", reject);
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const pages = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_PAGES;

  try {
    const results: ScanResult[] = [];
    for (const page of pages) {
      results.push(await scanPage(baseUrl, page));
    }

    const summary = {
      scannedAt: new Date().toISOString(),
      baseUrl,
      pageCount: results.length,
      failedPageCount: results.filter((item) => !item.ok).length,
      results,
    };

    fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary, null, 2));
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
