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

function styleSheet(): string {
  return `body{margin:0;font-family:Segoe UI,Arial,sans-serif;background:linear-gradient(180deg,#eef4ff,#f8fbff 35%,#f4f7fb);color:#12263a}*{box-sizing:border-box}.layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh}.sidebar{background:#0f172a;color:#fff;padding:24px 18px}.brand{font-size:26px;font-weight:800;margin-bottom:20px}.sidebar p{color:#b7c4d9}.nav-link{display:block;color:#e2e8f0;text-decoration:none;padding:11px 12px;border-radius:10px;margin-bottom:8px;background:rgba(255,255,255,.03)}.nav-link:hover{background:rgba(255,255,255,.09)}.content{padding:28px}.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px;gap:16px}.topbar h1{margin:0;font-size:28px}.auth-box{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:22px}.card{background:#fff;border:1px solid #dbe3ef;border-radius:16px;padding:18px;box-shadow:0 10px 30px rgba(15,23,42,.05);margin-bottom:18px}.metric{font-size:30px;font-weight:800;margin:8px 0 0}.muted{color:#607089;font-size:13px}table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ef}th,td{padding:12px 10px;border-bottom:1px solid #dbe3ef;text-align:left;vertical-align:top}th{background:#f8fbff;font-size:13px;text-transform:uppercase;color:#607089}form.inline{display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap}input,select,textarea{width:100%;padding:10px 12px;border:1px solid #c8d3e1;border-radius:10px;background:#fff}textarea{min-height:80px}.grid{display:grid;gap:12px}.grid.two{grid-template-columns:repeat(2,minmax(0,1fr))}.btn{border:0;border-radius:10px;padding:10px 14px;background:#0b5fff;color:#fff;cursor:pointer;font-weight:600;text-decoration:none;display:inline-block}.btn.secondary{background:#e7eef9;color:#20324d}.btn.danger{background:#c61f1f}.tag{display:inline-block;padding:5px 9px;border-radius:999px;font-size:12px;font-weight:700}.tag.active,.tag.completed,.tag.paid,.tag.in{background:#e7f8ec;color:#117b34}.tag.pending,.tag.processing{background:#fff4d6;color:#8a5b00}.tag.cancelled,.tag.failed,.tag.inactive,.tag.out{background:#ffe4e8;color:#b42318}.section-title{margin:0 0 12px;font-size:18px}.login-wrap{max-width:520px;margin:70px auto}.login-brand{font-size:34px;font-weight:800;margin-bottom:10px}.alert{padding:12px 14px;border-radius:12px;margin-bottom:14px;background:#fff4d6;color:#6a4b00;border:1px solid #f2d48a}.hero{display:grid;grid-template-columns:1.2fr .8fr;gap:20px}.list-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}@media(max-width:900px){.layout{grid-template-columns:1fr}.sidebar{display:none}.content{padding:16px}.grid.two,.hero{grid-template-columns:1fr}}`;
}

function shell(title: string, left: string, right: string): string {
  return `<!doctype html><html lang="${esc(env.appLanguage)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${styleSheet()}</style></head><body><div class="layout"><aside class="sidebar">${left}</aside><main class="content">${right}</main></div></body></html>`;
}

export function renderAdminPage(title: string, admin: SessionAdmin, body: string): string {
  const nav = [["/admin", "แดชบอร์ด"],["/admin/users", "ผู้ใช้"],["/admin/categories", "หมวดหมู่"],["/admin/products", "บริการ"],["/admin/orders", "คำสั่งซื้อ"],["/admin/transactions", "ธุรกรรมกระเป๋า"],["/admin/finance", "บัญชีรายรับรายจ่าย"],["/admin/settings", "ตั้งค่า"]].map(([href, label]) => `<a class="nav-link" href="${href}">${label}</a>`).join("");
  return shell(title, `<div class="brand">แอดมิน</div>${nav}`, `<div class="topbar"><h1>${esc(title)}</h1><div class="auth-box"><span>${esc(admin.fullName)} (${esc(admin.roles.join(", "))})</span><form method="post" action="/admin/logout"><button class="btn danger" type="submit">ออกจากระบบ</button></form></div></div>${body}`);
}

export function renderUserPage(title: string, user: SessionUser, body: string): string {
  const nav = [["/user/dashboard", "แดชบอร์ด"],["/services", "บริการ"],["/user/orders", "คำสั่งซื้อของฉัน"],["/user/wallet", "กระเป๋าเงิน"]].map(([href, label]) => `<a class="nav-link" href="${href}">${label}</a>`).join("");
  return shell(title, `<div class="brand">ผู้ใช้งาน</div><p>สั่งบริการ ชำระเงิน และติดตามคำสั่งซื้อ</p>${nav}`, `<div class="topbar"><h1>${esc(title)}</h1><div class="auth-box"><span>${esc(user.fullName)} (${esc(user.username)})</span><form method="post" action="/user/logout"><button class="btn danger" type="submit">ออกจากระบบ</button></form></div></div>${body}`);
}

export function renderPublicPage(title: string, body: string): string {
  return `<!doctype html><html lang="${esc(env.appLanguage)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>${styleSheet()}</style></head><body><main class="content">${body}</main></body></html>`;
}
