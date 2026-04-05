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

function buildPaymentDock(): string {
  return `<style id="payment-dock-style">
    .payment-header-slot{display:flex;align-items:center}
    .payment-dock{position:relative;font-family:Roboto,Arial,sans-serif}
    .payment-dock__trigger{appearance:none;border:0;border-radius:999px;background:#4c1d95;color:#fff;padding:7px 12px;font-size:13px;font-weight:800;box-shadow:0 10px 24px rgba(76,29,149,.22);cursor:pointer;white-space:nowrap}
    .payment-dock__modal{display:none;position:fixed;inset:0;background:rgba(15,23,42,.45);padding:16px;align-items:center;justify-content:center;z-index:99999}
    .payment-dock.is-open .payment-dock__modal{display:flex}
    .payment-dock__card{width:min(920px,100%);background:linear-gradient(180deg,#102a43,#1d4f91 24%,#fff 24.5%);border-radius:24px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,.28);border:1px solid rgba(16,42,67,.18)}
    .payment-dock__header{padding:18px 20px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
    .payment-dock__bank{font-size:26px;font-weight:900;letter-spacing:.02em}
    .payment-dock__sub{font-size:13px;opacity:.92;margin-top:4px}
    .payment-dock__close{appearance:none;border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:999px;width:36px;height:36px;font-size:18px;font-weight:900;cursor:pointer;line-height:1}
    .payment-dock__body{padding:20px;background:#f8fafc}
    .payment-dock__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
    .payment-dock__panel{background:#fff;border:1px solid #dbe6f2;border-radius:20px;padding:16px;box-shadow:0 10px 24px rgba(15,23,42,.08)}
    .payment-dock__panel-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px}
    .payment-dock__panel-bank{font-size:22px;font-weight:900;color:#102a43}
    .payment-dock__panel-sub{font-size:13px;color:#52606d;margin-top:4px}
    .payment-dock__badge{display:inline-flex;align-items:center;border-radius:999px;background:#e0f2fe;color:#0f4c81;padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}
    .payment-dock__qr{display:block;width:100%;max-width:250px;aspect-ratio:1/1;margin:0 auto 14px;border-radius:18px;border:1px solid #e5e7eb;background:#fff;object-fit:cover}
    .payment-dock__label{font-size:12px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px}
    .payment-dock__value{font-size:20px;font-weight:900;color:#111827;word-break:break-word}
    .payment-dock__meta{font-size:15px;font-weight:700;color:#334155}
    .payment-dock__actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    .payment-dock__btn{appearance:none;border:0;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer;text-decoration:none;background:#1d4f91;color:#fff}
    .payment-dock__btn.secondary{background:#eef2ff;color:#312e81}
    .payment-dock__hint{margin-top:10px;font-size:12px;color:#64748b}
    @media(max-width:900px){.payment-dock__trigger{font-size:12px;padding:7px 10px}.payment-dock__grid{grid-template-columns:1fr}}
  </style>
  <script id="payment-dock-script">
    (function(){
      function initPaymentDock(){
        if(document.getElementById('payment-dock-mounted')) return;
        var nav=document.querySelector('.main-header .navbar-nav.ml-auto');
        if(!nav) return;
        var item=document.createElement('li');
        item.className='nav-item payment-header-slot';
        item.id='payment-dock-mounted';
        item.innerHTML='' +
          '<div class="payment-dock" data-payment-dock>' +
            '<button class="payment-dock__trigger" type="button" data-payment-open>QR / ชำระเงิน</button>' +
            '<div class="payment-dock__modal" data-payment-close>' +
              '<section class="payment-dock__card" aria-label="ข้อมูลการชำระเงิน" onclick="event.stopPropagation()">' +
                '<div class="payment-dock__header">' +
                  '<div>' +
                    '<div class="payment-dock__bank">บัญชีชำระเงิน</div>' +
                    '<div class="payment-dock__sub">เลือกโอนผ่าน 1 ใน 2 บัญชีด้านล่าง</div>' +
                  '</div>' +
                  '<button class="payment-dock__close" type="button" aria-label="ปิด" title="ปิด" data-payment-close>&times;</button>' +
                '</div>' +
                '<div class="payment-dock__body">' +
                  '<div class="payment-dock__grid">' +
                    '<article class="payment-dock__panel">' +
                      '<div class="payment-dock__panel-header">' +
                        '<div>' +
                          '<div class="payment-dock__panel-bank">SCB</div>' +
                          '<div class="payment-dock__panel-sub">ชำระเงินผ่าน QR หรือโอนเข้าบัญชี</div>' +
                        '</div>' +
                        '<span class="payment-dock__badge">1/2</span>' +
                      '</div>' +
                      '<img class="payment-dock__qr" src="/payment/qr.jpg" alt="SCB QR Payment">' +
                      '<div class="payment-dock__label">เลขที่บัญชี</div>' +
                      '<div class="payment-dock__value">0334421279</div>' +
                      '<div class="payment-dock__label">ชื่อเจ้าของบัญชี</div>' +
                      '<div class="payment-dock__meta">นิตยา</div>' +
                      '<div class="payment-dock__label">ธนาคาร</div>' +
                      '<div class="payment-dock__meta">SCB - ธนาคารไทยพาณิชย์</div>' +
                      '<div class="payment-dock__actions">' +
                        '<button class="payment-dock__btn" type="button" data-copy-account="0334421279">คัดลอกเลขบัญชี</button>' +
                        '<a class="payment-dock__btn secondary" href="/payment/qr.jpg" target="_blank" rel="noreferrer">เปิด QR</a>' +
                      '</div>' +
                      '<div class="payment-dock__hint">ชำระเงินเข้าบัญชีเลขที่ : 0334421279</div>' +
                    '</article>' +
                    '<article class="payment-dock__panel">' +
                      '<div class="payment-dock__panel-header">' +
                        '<div>' +
                          '<div class="payment-dock__panel-bank">Bangkok Bank</div>' +
                          '<div class="payment-dock__panel-sub">PromptPay / โอนเข้าบัญชีธนาคาร</div>' +
                        '</div>' +
                        '<span class="payment-dock__badge">2/2</span>' +
                      '</div>' +
                      '<img class="payment-dock__qr" src="/payment/bangkok-bank.jpg" alt="Bangkok Bank PromptPay QR">' +
                      '<div class="payment-dock__label">เลขที่บัญชี</div>' +
                      '<div class="payment-dock__value">098-7-631488</div>' +
                      '<div class="payment-dock__label">ชื่อเจ้าของบัญชี</div>' +
                      '<div class="payment-dock__meta">นิตยา</div>' +
                      '<div class="payment-dock__label">ธนาคาร</div>' +
                      '<div class="payment-dock__meta">Bangkok Bank</div>' +
                      '<div class="payment-dock__actions">' +
                        '<button class="payment-dock__btn" type="button" data-copy-account="098-7-631488">คัดลอกเลขบัญชี</button>' +
                        '<a class="payment-dock__btn secondary" href="/payment/bangkok-bank.jpg" target="_blank" rel="noreferrer">เปิด QR</a>' +
                      '</div>' +
                      '<div class="payment-dock__hint">ชำระเงินเข้าบัญชีเลขที่ : 098-7-631488</div>' +
                    '</article>' +
                  '</div>' +
                '</div>' +
              '</section>' +
            '</div>' +
          '</div>';
        nav.appendChild(item);
        var dock=item.querySelector('[data-payment-dock]');
        var open=dock.querySelector('[data-payment-open]');
        var closeEls=dock.querySelectorAll('[data-payment-close]');
        var copyButtons=dock.querySelectorAll('[data-copy-account]');
        var autoCloseTimer=null;

        function closeModal(){
          dock.classList.remove('is-open');
          if(autoCloseTimer){
            clearTimeout(autoCloseTimer);
            autoCloseTimer=null;
          }
        }

        function openModal(auto){
          dock.classList.add('is-open');
          if(auto){
            if(autoCloseTimer){
              clearTimeout(autoCloseTimer);
            }
            var timeoutMs=7000+Math.floor(Math.random()*1001);
            autoCloseTimer=setTimeout(closeModal,timeoutMs);
          }
        }

        open.addEventListener('click',function(){openModal(false);});
        closeEls.forEach(function(el){el.addEventListener('click',closeModal);});
        copyButtons.forEach(function(button){
          button.addEventListener('click',function(){
            var value=button.getAttribute('data-copy-account')||'';
            if(!value) return;
            var original=button.textContent;
            var done=function(){
              button.textContent='คัดลอกแล้ว';
              setTimeout(function(){button.textContent=original;},1600);
            };
            if(navigator.clipboard&&navigator.clipboard.writeText){
              navigator.clipboard.writeText(value).then(done);
            }else{
              var input=document.createElement('input');
              input.value=value;
              document.body.appendChild(input);
              input.select();
              document.execCommand('copy');
              input.remove();
              done();
            }
          });
        });

        setTimeout(function(){openModal(true);},350);
      }

      if(document.readyState==='loading'){
        document.addEventListener('DOMContentLoaded',initPaymentDock);
      }else{
        initPaymentDock();
      }
    })();
  </script>`;
}

function injectRuntime(html: string): string {
  const headScript = buildRuntimePreloadScript();
  const bodyScript = `<script src="/node-bridge.js"></script>${buildPaymentDock()}`;
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

  if (!output.includes("payment-dock-style")) {
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

frontendRouter.use("/payment", express.static(path.resolve(__dirname, "../../public/payment"), { fallthrough: true }));

frontendRouter.get("/node-runtime-config.js", (_req, res) => {
  const payload = JSON.stringify(getCurrencyContext());
  res.type("application/javascript").send(`(function(){var config=${payload};window.NODE_RUNTIME_CONFIG=config;window.currency=config.currency_code;window.currency_code=config.currency_code;window.currency_symbol=config.currency_symbol;window.currency_position=config.currency_code==='THB'?'left':'right_space';window.locale=config.locale;document.documentElement.setAttribute('lang',config.language||'th');try{localStorage.setItem('offline-language','th');}catch(e){}function digits(){return config.currency_code==='THB'?2:0;}function rate(){return Number(config.vnd_to_thb_rate||1);}function convert(v){var n=Number(v||0);if(!isFinite(n))return 0;if(config.base_currency_code===config.currency_code)return n;if(config.base_currency_code==='VND'&&config.currency_code==='THB')return n*rate();if(config.base_currency_code==='THB'&&config.currency_code==='VND')return n/rate();return n;}function fmt(v){return new Intl.NumberFormat(config.locale,{style:'currency',currency:config.currency_code,minimumFractionDigits:digits(),maximumFractionDigits:digits()}).format(v);}function trimNumeric(v){return digits()===0?String(Math.round(v)):String(Number(v.toFixed(digits())));}function replaceText(node){if(!node||!node.nodeValue)return;var text=node.nodeValue;if(!text.trim())return;text=text.replace(/([0-9][0-9,\.]*)\s*d/g,function(_,num){var n=Number(String(num).replace(/,/g,''));return fmt(convert(n));});text=text.replace(/([0-9][0-9,\.]*)\s*VND/gi,function(_,num){var n=Number(String(num).replace(/,/g,''));return fmt(convert(n));});node.nodeValue=text;}function walk(root){var tree=document.createTreeWalker(root||document.body,NodeFilter.SHOW_TEXT,{acceptNode:function(node){if(!node.parentNode)return NodeFilter.FILTER_REJECT;var tag=node.parentNode.nodeName;if(tag==='SCRIPT'||tag==='STYLE'||tag==='NOSCRIPT'||tag==='TEXTAREA')return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});var current;while(current=tree.nextNode()){replaceText(current);}}function patchDataPrice(){document.querySelectorAll('[data-price]').forEach(function(el){var raw=Number(el.getAttribute('data-price')||0);if(!el.hasAttribute('data-price-vnd')){el.setAttribute('data-price-vnd',String(raw));}var displayValue=convert(Number(el.getAttribute('data-price-vnd')||raw));el.setAttribute('data-price',trimNumeric(displayValue));});}function patchLocaleMeta(){document.querySelectorAll('meta[property="og:locale"]').forEach(function(meta){meta.setAttribute('content','th_TH');});}function run(){patchLocaleMeta();patchDataPrice();walk(document.body);}if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',run);}else{run();}})();`);
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

frontendRouter.get(/^\/www\.facebook\.com\/(.+)$/, (req, res) => {
  const assetPath = String((req.params as Record<string, string>)[0] || "");
  res.redirect(302, `https://www.facebook.com/${assetPath}`);
});

frontendRouter.get(/^\/www\.youtube\.com\/(.+)$/, (req, res) => {
  const assetPath = String((req.params as Record<string, string>)[0] || "");
  res.redirect(302, `https://www.youtube.com/${assetPath}`);
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
