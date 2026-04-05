import { SessionAdmin, SessionUser } from "../types";
import { env } from "./env";
import { formatMoneyFromBase, formatNumberFromBase } from "./currency";

export function esc(value: any): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function money(value: number): string {
  return formatMoneyFromBase(value || 0);
}

export function moneyNumber(value: number): string {
  return formatNumberFromBase(value || 0);
}

export function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function tag(value: string): string {
  return `<span class="tag ${esc(value).toLowerCase()}">${esc(value)}</span>`;
}

function paymentDockStyles(): string {
  return `.payment-dock{position:fixed;top:16px;right:16px;z-index:9999;font-family:inherit}.payment-dock__trigger{appearance:none;border:0;border-radius:999px;background:#4c1d95;color:#fff;padding:10px 14px;font-weight:800;box-shadow:0 14px 35px rgba(76,29,149,.28);cursor:pointer}.payment-dock__modal{display:none;position:fixed;inset:0;background:rgba(15,23,42,.45);padding:16px;align-items:center;justify-content:center}.payment-dock.is-open .payment-dock__modal{display:flex}.payment-dock__card{width:min(360px,100%);background:linear-gradient(180deg,#4c1d95,#6d28d9 29%,#fff 29.5%);border-radius:22px;overflow:hidden;box-shadow:0 20px 45px rgba(15,23,42,.28);border:1px solid rgba(76,29,149,.2)}.payment-dock__header{padding:18px 20px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.payment-dock__bank{font-size:26px;font-weight:900;letter-spacing:.02em}.payment-dock__sub{font-size:13px;opacity:.92;margin-top:4px}.payment-dock__close{appearance:none;border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:999px;width:36px;height:36px;font-size:18px;font-weight:900;cursor:pointer;line-height:1}.payment-dock__body{padding:16px;background:#fff}.payment-dock__qr{display:block;width:100%;max-width:220px;margin:0 auto 14px;border-radius:18px;border:1px solid #e5e7eb;background:#fff}.payment-dock__label{font-size:12px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;margin:10px 0 4px}.payment-dock__value{font-size:20px;font-weight:900;color:#111827;word-break:break-word}.payment-dock__meta{font-size:15px;font-weight:700;color:#334155}.payment-dock__actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.payment-dock__btn{appearance:none;border:0;border-radius:12px;padding:11px 14px;font-weight:800;cursor:pointer;text-decoration:none;background:#4c1d95;color:#fff}.payment-dock__btn.secondary{background:#eef2ff;color:#312e81}.payment-dock__hint{margin-top:10px;font-size:12px;color:#64748b}@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{display:none}.content{padding:16px}.grid.two,.hero{grid-template-columns:1fr}.payment-dock{top:auto;right:12px;left:12px;bottom:12px}.payment-dock__trigger{width:100%}}`;
}

function styleSheet(): string {
  return `body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(180deg,#eef4ff,#f8fbff 35%,#f4f7fb);color:#12263a}*{box-sizing:border-box}.layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh}.sidebar{background:#0f172a;color:#fff;padding:24px 18px}.brand{font-size:26px;font-weight:800;margin-bottom:20px}.sidebar p{color:#b7c4d9}.nav-link{display:block;color:#e2e8f0;text-decoration:none;padding:11px 12px;border-radius:10px;margin-bottom:8px;background:rgba(255,255,255,.03)}.nav-link:hover{background:rgba(255,255,255,.09)}.content{padding:28px}.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;gap:16px}.topbar h1{margin:0;font-size:28px}.auth-box{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:22px}.card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.05);margin-bottom:18px}.metric{font-size:30px;font-weight:800;margin:8px 0 0}.muted{color:#607089;font-size:13px}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ef}th,td{padding:12px 10px;border-bottom:1px solid #dbe3ef;text-align:left;vertical-align:top}th{background:#f8fbff;font-size:13px;text-transform:uppercase;color:#607089}form.inline{display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap}input,select,textarea{width:100%;padding:10px 12px;border:1px solid #c8d3e1;border-radius:10px;background:#fff}textarea{min-height:80px}.grid{display:grid;gap:12px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.btn{border:0;border-radius:10px;padding:10px 14px;background:#0b5fff;color:#fff;cursor:pointer;font-weight:600;text-decoration:none;display:inline-block}.btn.secondary{background:#e7eef9;color:#20324d}.btn.danger{background:#c61f1f}.tag{display:inline-block;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:700}.tag.active,.tag.completed,.tag.paid,.tag.in{background:#e7f8ec;color:#117b34}.tag.pending,.tag.processing{background:#fff4d6;color:#8a5b00}.tag.cancelled,.tag.failed,.tag.inactive,.tag.out{background:#ffe4e8;color:#b42318}.section-title{margin:0 0 12px;font-size:18px}.login-wrap{max-width:520px;margin:70px auto}.login-brand{font-size:34px;font-weight:800;margin-bottom:10px}.alert{padding:12px 14px;border-radius:12px;margin-bottom:14px;background:#fff4d6;color:#6a4b00;border:1px solid #f2d48a}.hero{display:grid;grid-template-columns:1.2fr .8fr;gap:20px}.list-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}${paymentDockStyles()}`;
}

function paymentDock(): string {
  return `<div class="payment-dock" data-payment-dock><button class="payment-dock__trigger" type="button" data-payment-open>QR / ชำระเงิน</button><div class="payment-dock__modal" data-payment-close><section class="payment-dock__card" aria-label="ข้อมูลการชำระเงิน" onclick="event.stopPropagation()"><div class="payment-dock__header"><div><div class="payment-dock__bank">SCB</div><div class="payment-dock__sub">ชำระเงินผ่าน QR หรือโอนเข้าบัญชี</div></div><button class="payment-dock__close" type="button" aria-label="ปิด" title="ปิด" data-payment-close>&times;</button></div><div class="payment-dock__body"><img class="payment-dock__qr" src="/payment/qr.jpg" alt="Thai QR Payment"><div class="payment-dock__label">เลขที่บัญชี</div><div class="payment-dock__value">0334421279</div><div class="payment-dock__label">ชื่อเจ้าของบัญชี</div><div class="payment-dock__meta">นิตยา</div><div class="payment-dock__label">ธนาคาร</div><div class="payment-dock__meta">SCB - ธนาคารไทยพาณิชย์</div><div class="payment-dock__actions"><button class="payment-dock__btn" type="button" data-copy-account="0334421279">คัดลอกเลขบัญชี</button><a class="payment-dock__btn secondary" href="/payment/qr.jpg" target="_blank" rel="noreferrer">เปิด QR</a></div><div class="payment-dock__hint">ชำระเงินเข้าบัญชีเลขที่ : 0334421279</div></div></section></div></div><script>(function(){var dock=document.querySelector('[data-payment-dock]');if(!dock)return;var open=dock.querySelector('[data-payment-open]');var closeEls=dock.querySelectorAll('[data-payment-close]');var copy=dock.querySelector('[data-copy-account]');var autoCloseTimer=null;function closeModal(){dock.classList.remove('is-open');if(autoCloseTimer){clearTimeout(autoCloseTimer);autoCloseTimer=null;}}function openModal(auto){dock.classList.add('is-open');if(auto){if(autoCloseTimer){clearTimeout(autoCloseTimer);}autoCloseTimer=setTimeout(closeModal,5000);}}if(open){open.addEventListener('click',function(){openModal(false);});}closeEls.forEach(function(el){el.addEventListener('click',closeModal);});if(copy){copy.addEventListener('click',function(){var value=copy.getAttribute('data-copy-account')||'';if(!value)return;var done=function(){copy.textContent='คัดลอกแล้ว';setTimeout(function(){copy.textContent='คัดลอกเลขบัญชี';},1600);};if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(value).then(done);}else{var input=document.createElement('input');input.value=value;document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();done();}});}setTimeout(function(){openModal(true);},350);})();</script>`;
}

function shell(title: string, left: string, right: string, includePaymentDock = false): string {
  return `<!doctype html><html lang="${esc(env.appLanguage)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${styleSheet()}</style></head><body><div class="layout"><aside class="sidebar">${left}</aside><main class="content">${right}</main></div>${includePaymentDock ? paymentDock() : ""}</body></html>`;
}

export function renderAdminPage(title: string, admin: SessionAdmin, body: string): string {
  const nav = [["/admin", "แดชบอร์ด"],["/admin/users", "ผู้ใช้"],["/admin/categories", "หมวดหมู่"],["/admin/products", "บริการ"],["/admin/orders", "คำสั่งซื้อ"],["/admin/transactions", "ธุรกรรมกระเป๋า"],["/admin/finance", "บัญชีรายรับรายจ่าย"],["/admin/settings", "ตั้งค่า"]].map(([href, label]) => `<a class="nav-link" href="${href}">${label}</a>`).join("");
  return shell(title, `<div class="brand">แอดมิน</div>${nav}`, `<div class="topbar"><h1>${esc(title)}</h1><div class="auth-box"><span>${esc(admin.fullName)} (${esc(admin.roles.join(", "))})</span><form method="post" action="/admin/logout"><button class="btn danger" type="submit">ออกจากระบบ</button></form></div></div>${body}`);
}

export function renderUserPage(title: string, user: SessionUser, body: string): string {
  const nav = [["/user/dashboard", "แดชบอร์ด"],["/services", "บริการ"],["/user/orders", "คำสั่งซื้อของฉัน"],["/user/wallet", "กระเป๋าเงิน"]].map(([href, label]) => `<a class="nav-link" href="${href}">${label}</a>`).join("");
  return shell(title, `<div class="brand">ผู้ใช้งาน</div><p>สั่งบริการ ชำระเงิน และติดตามคำสั่งซื้อ</p>${nav}`, `<div class="topbar"><h1>${esc(title)}</h1><div class="auth-box"><span>${esc(user.fullName)} (${esc(user.username)})</span><form method="post" action="/user/logout"><button class="btn danger" type="submit">ออกจากระบบ</button></form></div></div>${body}`, true);
}

export function renderPublicPage(title: string, body: string): string {
  return `<!doctype html><html lang="${esc(env.appLanguage)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${styleSheet()}</style></head><body><main class="content">${body}</main>${paymentDock()}</body></html>`;
}
