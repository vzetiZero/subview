import fs from "fs";
import path from "path";
import express, { Router } from "express";
import { env } from "../utils/env";
import { getCurrencyContext } from "../utils/currency";

export const frontendRouter = Router();

const FRONTEND_ROOT = env.frontendRoot;
const STATIC_DIRS = ["dist", "plugins", "css", "js", "xl", "process"];

function safeResolve(requestPath: string): string | null {
  const cleaned = decodeURIComponent(requestPath.split("?")[0]);
  const normalized = cleaned === "/" ? "/index.html" : cleaned;
  const candidates = [normalized];

  if (!path.extname(normalized)) {
    candidates.push(`${normalized}.html`);
    candidates.push(path.join(normalized, "index.html"));
  }

  for (const candidate of candidates) {
    const resolved = path.resolve(FRONTEND_ROOT, `.${candidate}`);
    if (!resolved.startsWith(path.resolve(FRONTEND_ROOT))) continue;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) return resolved;
  }

  return null;
}

function buildRuntimePreloadScript(): string {
  const payload = JSON.stringify(getCurrencyContext());
  return `<script>(function(){window.NODE_RUNTIME_CONFIG=${payload};try{localStorage.setItem('offline-language','th');document.documentElement.setAttribute('lang','th');document.documentElement.setAttribute('data-node-runtime','1');}catch(e){document.documentElement.setAttribute('lang','th');}})();</script><script src="/node-runtime-config.js"></script>`;
}

function injectRuntime(html: string): string {
  const headScript = buildRuntimePreloadScript();
  const bodyScript = `<script src="/node-bridge.js"></script>`;
  let output = html;

  if (!output.includes("/node-runtime-config.js")) {
    if (output.includes("<head>")) {
      output = output.replace("<head>", `<head>${headScript}`);
    } else if (output.includes("</head>")) {
      output = output.replace("</head>", `${headScript}</head>`);
    } else {
      output = `${headScript}${output}`;
    }
  }

  if (!output.includes("/node-bridge.js")) {
    if (output.includes("</body>")) {
      output = output.replace("</body>", `${bodyScript}</body>`);
    } else {
      output = `${output}\n${bodyScript}`;
    }
  }

  return output;
}

frontendRouter.get("/node-bridge.js", (_req, res) => {
  res.sendFile(path.resolve(__dirname, "../../public/node-bridge.js"));
});

frontendRouter.get("/node-runtime-config.js", (_req, res) => {
  const payload = JSON.stringify(getCurrencyContext());
  res.type("application/javascript").send(`(function(){var config=${payload};window.NODE_RUNTIME_CONFIG=config;window.currency=config.currency_code;window.currency_code=config.currency_code;window.currency_symbol=config.currency_symbol;window.currency_position=config.currency_code==='THB'?'left':'right_space';window.locale=config.locale;document.documentElement.setAttribute('lang',config.language||'th');try{localStorage.setItem('offline-language','th');}catch(e){}function digits(){return config.currency_code==='THB'?2:0;}function rate(){return Number(config.vnd_to_thb_rate||1);}function convert(v){var n=Number(v||0);if(!isFinite(n))return 0;if(config.base_currency_code===config.currency_code)return n;if(config.base_currency_code==='VND'&&config.currency_code==='THB')return n*rate();if(config.base_currency_code==='THB'&&config.currency_code==='VND')return n/rate();return n;}function fmt(v){return new Intl.NumberFormat(config.locale,{style:'currency',currency:config.currency_code,minimumFractionDigits:digits(),maximumFractionDigits:digits()}).format(v);}function fmtNumber(v){return new Intl.NumberFormat(config.locale,{minimumFractionDigits:digits(),maximumFractionDigits:digits()}).format(v);}function trimNumeric(v){return digits()===0?String(Math.round(v)):String(Number(v.toFixed(digits())));}function replaceText(node){if(!node||!node.nodeValue)return;var text=node.nodeValue;if(!text.trim())return;text=text.replace(/([0-9][0-9,\.]*)\s*d/g,function(_,num){var n=Number(String(num).replace(/,/g,''));return fmt(convert(n));});text=text.replace(/([0-9][0-9,\.]*)\s*VND/gi,function(_,num){var n=Number(String(num).replace(/,/g,''));return fmt(convert(n));});text=text.replace(/T?ng c?ng:/g,'??????:');text=text.replace(/T?ng n?p t?/g,'??????????????????');text=text.replace(/Giá:\s*/g,'????: ');text=text.replace(/Price:\s*/g,'????: ');node.nodeValue=text;}function walk(root){var tree=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(node){if(!node.parentNode)return NodeFilter.FILTER_REJECT;var tag=node.parentNode.nodeName;if(tag==='SCRIPT'||tag==='STYLE'||tag==='NOSCRIPT'||tag==='TEXTAREA')return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});var current;while(current=tree.nextNode()){replaceText(current);}}function patchDataPrice(){document.querySelectorAll('[data-price]').forEach(function(el){var raw=Number(el.getAttribute('data-price')||0);if(!el.hasAttribute('data-price-vnd')){el.setAttribute('data-price-vnd',String(raw));}var displayValue=convert(Number(el.getAttribute('data-price-vnd')||raw));el.setAttribute('data-price',trimNumeric(displayValue));});}function patchLocaleMeta(){document.querySelectorAll('meta[property="og:locale"]').forEach(function(meta){meta.setAttribute('content','th_TH');});}function forceThaiUi(){var modalLabel=document.getElementById('modalLanguageLabel');if(modalLabel)modalLabel.textContent='?????????';document.querySelectorAll('#btn-language span,.offline-i18n-current,.offline-i18n-hint').forEach(function(node){if(node.textContent&&/language|ngôn ng?/i.test(node.textContent)){node.textContent='?????????';}});}function run(){patchLocaleMeta();patchDataPrice();walk(document.body);forceThaiUi();}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run);}else{run();}})();`);
});

for (const dir of STATIC_DIRS) {
  frontendRouter.use(`/${dir}`, express.static(path.resolve(FRONTEND_ROOT, dir), { fallthrough: true }));
}

frontendRouter.get(/^\/fonts\.googleapis\.com\/(.+)$/, (req, res) => {
  const assetPath = String((req.params as Record<string, string>)[0] || "");
  const normalizedPath = /^css[0-9a-z]+\.css$/i.test(assetPath) ? "css" : assetPath;
  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(302, `https://fonts.googleapis.com/${normalizedPath}${query}`);
});

frontendRouter.get(/^\/cdn\.vinafabo\.net\/(.+)$/, (req, res) => {
  const assetPath = String((req.params as Record<string, string>)[0] || "");
  res.redirect(302, `https://cdn.vinafabo.net/${assetPath}`);
});

frontendRouter.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/admin") || req.path.startsWith("/user")) {
    next();
    return;
  }

  const filePath = safeResolve(req.path);
  if (!filePath) {
    next();
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html" || ext === ".htm") {
    const html = fs.readFileSync(filePath, "utf-8");
    res.type("html").send(injectRuntime(html));
    return;
  }

  res.sendFile(filePath);
});


