import { Router } from "express";
import multer from "multer";
import { requireAdmin, requireAdminPermission, getAdmin } from "../middleware/adminAuth";
import { listCategories, createCategory, updateCategory, listProducts, createProduct, updateProduct } from "../repositories/catalogRepository";
import {
  getFinancialSummary,
  listFinancialDailySummary,
  listFinancialOrderMappings,
  listFinancialOrderSummariesPage,
  upsertFinancialOrderMapping,
} from "../repositories/financeRepository";
import { listOrders, listOrdersPage, searchOrders, updateOrderStatus, createOrderLog } from "../repositories/orderRepository";
import { listUsers, createUser, updateUserStatus, listWalletTransactions, createWalletTransaction, getUserById, updateUserBalance } from "../repositories/userRepository";
import { getSettingValue, listSettings, upsertSetting } from "../repositories/settingsRepository";
import { buildFinancialExportWorkbook, buildFinancialTemplateWorkbook, importFinancialWorkbook } from "../services/financeExcelService";
import { resetImportedFinancialData, syncImportedOrdersFromFinancialRecords } from "../services/financialOrderSyncService";
import { getLastCatalogSyncSummary, syncFrontendCatalog } from "../services/frontendSyncService";
import { renderAdminPage, money, moneyNumber, tag, esc, slugify } from "../utils/html";
import { createPasswordHash } from "../utils/security";
import { env } from "../utils/env";
import { formatDisplayMoney, getCurrencyContext, parseDisplayCurrencyInput } from "../utils/currency";

export const adminRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

type FinanceFilterInput = {
  startDate: string | null;
  endDate: string | null;
  month: string | null;
  keyword: string | null;
  page: number;
};

function monthRange(month: string): { startDate: string; endDate: string } | null {
  if (!/^\d{4}-\d{2}$/.test(month)) return null;
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return null;
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function normalizeDateParam(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function buildFinanceFilter(query: Record<string, unknown>): FinanceFilterInput {
  const month = String(query.month ?? "").trim() || null;
  const startDate = normalizeDateParam(query.start_date);
  const endDate = normalizeDateParam(query.end_date);
  const keyword = String(query.keyword ?? "").trim() || null;
  const page = Math.max(1, Number(query.page || 1));
  if (month && !startDate && !endDate) {
    const range = monthRange(month);
    if (range) return { startDate: range.startDate, endDate: range.endDate, month, keyword, page };
  }
  return { startDate, endDate, month, keyword, page };
}

function buildFinanceQueryString(filter: FinanceFilterInput): string {
  const params = new URLSearchParams();
  if (filter.month) params.set("month", filter.month);
  if (filter.startDate) params.set("start_date", filter.startDate);
  if (filter.endDate) params.set("end_date", filter.endDate);
  if (filter.keyword) params.set("keyword", filter.keyword);
  if (filter.page > 1) params.set("page", String(filter.page));
  const text = params.toString();
  return text ? `?${text}` : "";
}

function buildPaginationLinks(basePath: string, currentPage: number, totalPages: number, extraParams?: Record<string, string | number | null | undefined>): string {
  return Array.from({ length: totalPages }, (_, index) => index + 1)
    .slice(Math.max(0, currentPage - 4), Math.min(totalPages, currentPage + 3))
    .map((pageNumber) => {
      const params = new URLSearchParams();
      Object.entries(extraParams || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined && String(value).trim() !== "") {
          params.set(key, String(value));
        }
      });
      if (pageNumber > 1) params.set("page", String(pageNumber));
      const query = params.toString();
      return `<a class="btn ${pageNumber === currentPage ? "" : "secondary"}" href="${basePath}${query ? `?${query}` : ""}">${pageNumber}</a>`;
    })
    .join("");
}

function renderFinanceAlert(status: string | undefined, meta: Record<string, string | string[] | undefined>): string {
  if (!status) return "";
  if (status === "imported") {
    return `<div class="alert">นำเข้าไฟล์สำเร็จ: ${esc(meta.file || "")}, เพิ่ม ${esc(meta.rows || "0")} แถว, ข้าม ${esc(meta.skipped || "0")} แถว, ซิงก์คำสั่งซื้อ ${esc(meta.synced_orders || "0")} รายการ</div>`;
  }
  if (status === "deleted") {
    return `<div class="alert">ลบข้อมูลการเงินที่นำเข้าทั้งหมดเรียบร้อยแล้ว</div>`;
  }
  if (status === "mapped") {
    return `<div class="alert">จับคู่รหัส Excel กับคำสั่งซื้อในระบบเรียบร้อยแล้ว</div>`;
  }
  if (status === "error") {
    return `<div class="alert">ดำเนินการไม่สำเร็จ: ${esc(meta.message || "ไม่ทราบสาเหตุ")}</div>`;
  }
  return "";
}

function renderFinanceChart(rows: Array<Record<string, any>>): string {
  const points = rows.slice().reverse().map((row) => ({
    label: String(row.summary_date || ""),
    income: Number(row.total_income || 0),
    expense: Number(row.total_expense || 0),
    profit: Number(row.gross_profit || 0),
  }));

  if (!points.length) {
    return `<div class="card"><h2 class="section-title">กราฟรายวัน</h2><p class="muted">ยังไม่มีข้อมูลสำหรับช่วงเวลาที่เลือก</p></div>`;
  }

  const width = 900;
  const height = 260;
  const padding = 28;
  const maxValue = Math.max(...points.flatMap((point) => [point.income, point.expense, point.profit, 1]));
  const xStep = points.length === 1 ? 0 : (width - padding * 2) / (points.length - 1);
  const y = (value: number) => height - padding - (value / maxValue) * (height - padding * 2);
  const line = (key: "income" | "expense" | "profit") => points.map((point, index) => `${padding + index * xStep},${y(point[key])}`).join(" ");
  const labels = points
    .filter((_, index) => index === 0 || index === points.length - 1 || index % Math.max(1, Math.floor(points.length / 6)) === 0)
    .map((point) => `<span class="muted">${esc(point.label)}</span>`)
    .join(" ");

  return `<div class="card"><h2 class="section-title">กราฟรายวัน</h2><svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;background:#f8fbff;border:1px solid #dbe3ef;border-radius:12px"><line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#c8d3e1" /><polyline fill="none" stroke="#0b5fff" stroke-width="3" points="${line("income")}" /><polyline fill="none" stroke="#d92d20" stroke-width="3" points="${line("expense")}" /><polyline fill="none" stroke="#16a34a" stroke-width="3" points="${line("profit")}" /></svg><div class="auth-box" style="margin-top:10px"><span class="tag active">น้ำเงิน รายรับ</span><span class="tag cancelled">แดง รายจ่าย</span><span class="tag completed">เขียว กำไร</span></div><div class="auth-box" style="margin-top:8px;flex-wrap:wrap">${labels}</div></div>`;
}

function renderFinanceMappingScript(): string {
  return `<script>
    (() => {
      const forms = document.querySelectorAll('.js-finance-mapping-form');
      for (const form of forms) {
        const searchInput = form.querySelector('.js-order-search');
        const orderIdInput = form.querySelector('.js-order-id');
        const resultBox = form.querySelector('.js-order-search-results');
        let timer = null;
        if (!searchInput || !orderIdInput || !resultBox) continue;

        const renderEmpty = (text) => {
          resultBox.innerHTML = text ? '<div class="muted">' + text + '</div>' : '';
        };

        const renderResults = (items) => {
          if (!items.length) {
            renderEmpty('ไม่พบคำสั่งซื้อ');
            return;
          }
          resultBox.innerHTML = items.map((item) => {
            const service = item.service_name_snapshot || '';
            const amount = item.total_amount_formatted || item.total_amount || '';
            return '<button type="button" class="btn secondary js-order-result" data-order-id="' + item.id + '" style="text-align:left;width:100%;margin-bottom:6px">#' + item.id + ' / ' + item.order_code + '<div class="muted">' + item.username + ' / ' + amount + (service ? ' / ' + service : '') + '</div></button>';
          }).join('');
          resultBox.querySelectorAll('.js-order-result').forEach((button) => {
            button.addEventListener('click', () => {
              orderIdInput.value = button.getAttribute('data-order-id') || '';
              searchInput.value = button.textContent ? button.textContent.trim() : '';
              resultBox.innerHTML = '';
            });
          });
        };

        searchInput.addEventListener('input', () => {
          const q = searchInput.value.trim();
          if (timer) clearTimeout(timer);
          if (q.length < 2) {
            renderEmpty('');
            return;
          }
          timer = setTimeout(async () => {
            try {
              const response = await fetch('/admin/orders/search?q=' + encodeURIComponent(q), { credentials: 'same-origin' });
              const payload = await response.json();
              renderResults(Array.isArray(payload.items) ? payload.items : []);
            } catch (_error) {
              renderEmpty('ค้นหาไม่สำเร็จ');
            }
          }, 250);
        });
      }
    })();
  </script>`;
}

adminRouter.get("/admin", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const admin = getAdmin(req)!;
  const users = listUsers();
  const products = listProducts();
  const orders = listOrders();
  const finance = getFinancialSummary();
  const transactions = listWalletTransactions(100);
  const deposits = Number(finance.total_income || 0) || transactions.filter((t) => t.direction === "in").reduce((sum, item) => sum + Number(item.amount), 0);
  const payouts = Number(finance.total_expense || 0) || transactions.filter((t) => t.direction === "out").reduce((sum, item) => sum + Number(item.amount), 0);
  const grossProfit = Number(finance.gross_profit || 0);
  const sync = getLastCatalogSyncSummary();
  const syncCard = sync
    ? `<div class="card"><div class="muted">ซิงก์แคตตาล็อก</div><div class="metric">${sync.syncedPages}</div><p class="muted">สร้าง ${sync.created}, อัปเดต ${sync.updated}, ข้าม ${sync.skippedPages}</p><p class="muted">${esc(sync.happenedAt)}</p><form method="post" action="/admin/catalog/sync"><button class="btn secondary" type="submit">ซิงก์จาก Frontend</button></form></div>`
    : `<div class="card"><div class="muted">ซิงก์แคตตาล็อก</div><div class="metric">0</div><p class="muted">ยังไม่มีข้อมูลการซิงก์</p><form method="post" action="/admin/catalog/sync"><button class="btn secondary" type="submit">ซิงก์จาก Frontend</button></form></div>`;
  const financeCard = `<div class="card"><div class="muted">บัญชีรายรับรายจ่าย</div><div class="metric">${formatDisplayMoney(grossProfit)}</div><p class="muted">รายรับ ${formatDisplayMoney(deposits)} / รายจ่าย ${formatDisplayMoney(payouts)}</p><div class="auth-box"><a class="btn" href="/admin/finance">เปิดหน้าการเงิน</a><a class="btn secondary" href="/admin/finance/template">แม่แบบ Excel</a></div></div>`;
  res.send(renderAdminPage("แดชบอร์ด", admin, `<div class="cards"><div class="card"><div class="muted">ผู้ใช้</div><div class="metric">${users.length}</div></div><div class="card"><div class="muted">บริการ</div><div class="metric">${products.length}</div></div><div class="card"><div class="muted">คำสั่งซื้อ</div><div class="metric">${orders.length}</div></div><div class="card"><div class="muted">รายรับรวม (THB)</div><div class="metric">${formatDisplayMoney(deposits)}</div></div><div class="card"><div class="muted">รายจ่ายรวม (THB)</div><div class="metric">${formatDisplayMoney(payouts)}</div></div>${financeCard}${syncCard}</div>`));
});

adminRouter.post("/admin/catalog/sync", requireAdmin, requireAdminPermission("dashboard.read"), (_req, res) => {
  syncFrontendCatalog(env.frontendRoot);
  res.redirect("/admin");
});

adminRouter.get("/admin/orders/search", requireAdmin, requireAdminPermission("orders.read"), (req, res) => {
  const q = String(req.query.q || "").trim();
  if (q.length < 2) {
    return res.json({ ok: true, items: [] });
  }
  const items = searchOrders(q, 12).map((item) => ({
    id: item.id,
    order_code: item.order_code,
    username: item.username,
    service_name_snapshot: item.service_name_snapshot || "",
    total_amount: item.total_amount,
    total_amount_formatted: formatDisplayMoney(Number(item.total_amount || 0)),
    order_status: item.order_status,
  }));
  res.json({ ok: true, items });
});

adminRouter.get("/admin/finance", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const admin = getAdmin(req)!;
  const filter = buildFinanceFilter(req.query as Record<string, unknown>);
  const summary = getFinancialSummary(filter);
  const summaryPage = listFinancialOrderSummariesPage({ ...filter, page: filter.page, pageSize: 100 });
  const orderSummaries = summaryPage.items;
  const dailySummary = listFinancialDailySummary(120, filter);
  const mappings = listFinancialOrderMappings(100);
  const orders = listOrders();
  const orderOptions = orders.slice(0, 500).map((row) => `<option value="${row.id}">#${row.id} - ${esc(row.order_code)} - ${esc(row.username)} - ${formatDisplayMoney(Number(row.total_amount || 0))}</option>`).join("");
  const queryString = buildFinanceQueryString(filter);
  const alert = renderFinanceAlert(typeof req.query.status === "string" ? req.query.status : undefined, req.query as Record<string, string | string[] | undefined>);
  const totalPages = Math.max(1, Math.ceil(summaryPage.total / summaryPage.pageSize));
  const rowStart = (summaryPage.page - 1) * summaryPage.pageSize;
  const pageLinks = Array.from({ length: totalPages }, (_, index) => index + 1)
    .slice(Math.max(0, summaryPage.page - 4), Math.min(totalPages, summaryPage.page + 3))
    .map((pageNumber) => {
      const pageFilter = { ...filter, page: pageNumber };
      return `<a class="btn ${pageNumber === summaryPage.page ? '' : 'secondary'}" href="/admin/finance${buildFinanceQueryString(pageFilter)}">${pageNumber}</a>`;
    })
    .join('');

  res.send(renderAdminPage("บัญชีรายรับรายจ่าย", admin, `${alert}<div class="card"><h2 class="section-title">ตัวกรองหลัก</h2><form method="get" action="/admin/finance" class="grid two"><div><label>เดือน</label><input type="month" name="month" value="${esc(filter.month || "")}"></div><div><label>วันที่เริ่มต้น</label><input type="date" name="start_date" value="${esc(filter.startDate || "")}"></div><div><label>วันที่สิ้นสุด</label><input type="date" name="end_date" value="${esc(filter.endDate || "")}"></div><div class="auth-box" style="align-items:flex-end"><button class="btn" type="submit">กรองข้อมูล</button><a class="btn secondary" href="/admin/finance">ล้างตัวกรอง</a><a class="btn secondary" href="/admin/finance/export${queryString}">ส่งออกตามตัวกรอง</a></div></form></div><div class="cards"><div class="card"><div class="muted">จำนวนแถวทั้งหมด</div><div class="metric">${Number(summary.record_count || 0)}</div></div><div class="card"><div class="muted">จำนวนรหัสคำสั่งซื้อ</div><div class="metric">${Number(summary.order_count || 0)}</div></div><div class="card"><div class="muted">แถวที่ไม่มีรหัสจริง</div><div class="metric">${Number(summary.missing_code_rows || 0)}</div></div><div class="card"><div class="muted">รายรับรวม (THB)</div><div class="metric">${formatDisplayMoney(Number(summary.total_income || 0))}</div></div><div class="card"><div class="muted">รายจ่ายรวม (THB)</div><div class="metric">${formatDisplayMoney(Number(summary.total_expense || 0))}</div></div><div class="card"><div class="muted">กำไรขั้นต้น (THB)</div><div class="metric">${formatDisplayMoney(Number(summary.gross_profit || 0))}</div></div></div>${renderFinanceChart(dailySummary)}<div class="card"><h2 class="section-title">นำเข้า / ส่งออก Excel</h2><form method="post" action="/admin/finance/import" enctype="multipart/form-data" class="grid two"><div><label>ไฟล์ Excel</label><input type="file" name="excel_file" accept=".xlsx,.xls" required></div><div><label>โหมดนำเข้า</label><select name="replace_existing"><option value="1">ล้างข้อมูลเก่าแล้วแทนที่ทั้งหมด</option><option value="0">เพิ่มต่อจากข้อมูลเดิม</option></select></div><div style="grid-column:1/-1"><p class="muted">รองรับคอลัมน์: วันที่รับ, รหัสคำสั่งซื้อ, จำนวนเงินรับ, วันที่จ่าย, จำนวนเงินจ่าย โดยเก็บค่าเป็น THB ตามไฟล์ และจะสร้างคำสั่งซื้อให้อัตโนมัติ</p></div><div style="grid-column:1/-1" class="auth-box"><button class="btn" type="submit">นำเข้า Excel</button><a class="btn secondary" href="/admin/finance/export${queryString}">ส่งออก Excel</a><a class="btn secondary" href="/admin/finance/template">ดาวน์โหลดแม่แบบ</a></div></form><form method="post" action="/admin/finance/reset" onsubmit="return confirm('ยืนยันการลบข้อมูลการเงินและคำสั่งซื้อที่สร้างจากไฟล์ทั้งหมด?')" style="margin-top:12px"><button class="btn danger" type="submit">ลบข้อมูลที่ import ทั้งหมด</button></form></div><div class="card"><h2 class="section-title">สรุปตามรหัสคำสั่งซื้อ</h2><form method="get" action="/admin/finance" class="grid two" style="margin-bottom:16px"><input type="hidden" name="month" value="${esc(filter.month || "")}"><input type="hidden" name="start_date" value="${esc(filter.startDate || "")}"><input type="hidden" name="end_date" value="${esc(filter.endDate || "")}"><div><label>ค้นหาตามชื่อ / ผู้ใช้ / รหัส</label><input name="keyword" value="${esc(filter.keyword || "")}" placeholder="เช่น excel code, order code, username, service name"></div><div class="auth-box" style="align-items:flex-end"><button class="btn" type="submit">กรองตารางนี้</button><a class="btn secondary" href="/admin/finance${buildFinanceQueryString({ ...filter, keyword: null, page: 1 })}">ล้างคำค้น</a></div></form><datalist id="order-id-options">${orderOptions}</datalist><table><thead><tr><th>#</th><th>รหัส Excel</th><th>วันแรก</th><th>วันสุดท้าย</th><th>รายรับ</th><th>รายจ่าย</th><th>กำไรจาก Excel</th><th>ออเดอร์ในระบบ</th><th>กำไรเทียบออเดอร์จริง</th><th>จับคู่</th></tr></thead><tbody>${orderSummaries.map((row, index) => `<tr><td>${rowStart + index + 1}</td><td>${esc(row.order_code)}${Number(row.is_missing_order_code || 0) === 1 ? `<div class="muted">missing code</div>` : ""}</td><td>${esc(row.first_date || "")}</td><td>${esc(row.last_date || "")}</td><td>${formatDisplayMoney(Number(row.total_income || 0))}</td><td>${formatDisplayMoney(Number(row.total_expense || 0))}</td><td>${formatDisplayMoney(Number(row.gross_profit || 0))}</td><td>${row.matched_order_id ? `#${esc(row.matched_order_id)} / ${esc(row.matched_order_code || "")}<div class="muted">${esc(row.matched_order_status || "")} / ${formatDisplayMoney(Number(row.matched_order_total_amount || 0))}</div>` : `<span class="muted">ยังไม่จับคู่</span>`}</td><td>${row.matched_order_id ? `<div>${formatDisplayMoney(Number(row.backend_margin || 0))}</div><div class="muted">gap รายรับ ${formatDisplayMoney(Number(row.income_gap || 0))}</div>` : `-`}</td><td><form method="post" action="/admin/finance/mappings" class="js-finance-mapping-form"><input type="hidden" name="redirect_query" value="${esc(queryString)}"><input type="hidden" name="excel_order_code" value="${esc(row.order_code)}"><div class="grid"><input class="js-order-search" type="text" placeholder="ค้นหา order_id / order_code / username"><div class="js-order-search-results"></div><input class="js-order-id" name="order_id" type="number" min="1" list="order-id-options" value="${row.matched_order_id ? esc(row.matched_order_id) : ""}" placeholder="order id"><button class="btn secondary" type="submit">บันทึก</button></div></form></td></tr>`).join("") || `<tr><td colspan="10">ยังไม่มีข้อมูล</td></tr>`}</tbody></table><div class="auth-box" style="justify-content:space-between;margin-top:16px"><div class="muted">หน้า ${summaryPage.page} / ${totalPages} , ทั้งหมด ${summaryPage.total} รายการ, แสดงครั้งละ ${summaryPage.pageSize}</div><div class="auth-box">${pageLinks}</div></div></div><div class="card"><h2 class="section-title">รายการ mapping ที่บันทึกไว้</h2><table><thead><tr><th>รหัส Excel</th><th>Order ID</th><th>Order Code</th><th>ยอดคำสั่งซื้อ</th><th>สถานะ</th><th>อัปเดตล่าสุด</th></tr></thead><tbody>${mappings.map((row) => `<tr><td>${esc(row.excel_order_code)}</td><td>${esc(row.order_id)}</td><td>${esc(row.system_order_code)}</td><td>${formatDisplayMoney(Number(row.system_order_total_amount || 0))}</td><td>${esc(row.system_order_status || "")}</td><td>${esc(row.updated_at || row.created_at || "")}</td></tr>`).join("") || `<tr><td colspan="6">ยังไม่มี mapping</td></tr>`}</tbody></table></div>${renderFinanceMappingScript()}`));
});

adminRouter.post("/admin/finance/import", requireAdmin, requireAdminPermission("dashboard.read"), upload.single("excel_file"), (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.redirect("/admin/finance?status=error&message=กรุณาเลือกไฟล์%20Excel");
    }
    const summary = importFinancialWorkbook(req.file.buffer, req.file.originalname, String(req.body.replace_existing || "1") === "1");
    const syncResult = syncImportedOrdersFromFinancialRecords();
    res.redirect(`/admin/finance?status=imported&file=${encodeURIComponent(summary.fileName)}&rows=${summary.importedRows}&skipped=${summary.skippedRows}&synced_orders=${syncResult.createdOrders}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถนำเข้าไฟล์ได้";
    res.redirect(`/admin/finance?status=error&message=${encodeURIComponent(message)}`);
  }
});

adminRouter.post("/admin/finance/reset", requireAdmin, requireAdminPermission("dashboard.read"), (_req, res) => {
  try {
    resetImportedFinancialData();
    res.redirect("/admin/finance?status=deleted");
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถลบข้อมูลที่นำเข้าได้";
    res.redirect(`/admin/finance?status=error&message=${encodeURIComponent(message)}`);
  }
});

adminRouter.post("/admin/finance/mappings", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const excelOrderCode = String(req.body.excel_order_code || "").trim();
  const orderId = Number(req.body.order_id || 0);
  const redirectQuery = String(req.body.redirect_query || "");
  if (!excelOrderCode || !Number.isInteger(orderId) || orderId <= 0) {
    return res.redirect(`/admin/finance${redirectQuery || "?status=error&message=ข้อมูล%20mapping%20ไม่ถูกต้อง"}`);
  }
  upsertFinancialOrderMapping(excelOrderCode, orderId, "manual_mapping_from_admin");
  res.redirect(`/admin/finance${redirectQuery ? `${redirectQuery}${redirectQuery.includes("?") ? "&" : "?"}status=mapped` : "?status=mapped"}`);
});

adminRouter.get("/admin/finance/export", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const filter = buildFinanceFilter(req.query as Record<string, unknown>);
  const buffer = buildFinancialExportWorkbook(filter);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="financial-export-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(buffer);
});

adminRouter.get("/admin/finance/template", requireAdmin, requireAdminPermission("dashboard.read"), (_req, res) => {
  const buffer = buildFinancialTemplateWorkbook();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", 'attachment; filename="financial-import-template.xlsx"');
  res.send(buffer);
});
adminRouter.get("/admin/settings", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const admin = getAdmin(req)!;
  const currency = getCurrencyContext();
  const settings = listSettings();
  const exchangeRate = getSettingValue("exchange_rate_vnd_thb") || String(currency.vnd_to_thb_rate);

  res.send(renderAdminPage("ตั้งค่า", admin, `<div class="card"><h2 class="section-title">ตั้งค่าอัตราแลกเปลี่ยน</h2><form method="post" action="/admin/settings/exchange-rate" class="grid two"><div><label>สกุลเงินฐาน</label><input value="${esc(currency.base_currency_code)}" disabled></div><div><label>สกุลเงินที่แสดง</label><input value="${esc(currency.currency_code)}" disabled></div><div><label>อัตราแลกเปลี่ยน VND -> THB</label><input name="exchange_rate_vnd_thb" type="number" step="0.0000001" min="0.0000001" value="${esc(exchangeRate)}" required></div><div><label>ตัวอย่าง</label><input value="1 VND = ${esc(Number(exchangeRate).toFixed(7))} THB" disabled></div><div style="grid-column:1/-1"><button class="btn" type="submit">บันทึกอัตราแลกเปลี่ยน</button></div></form></div><div class="card"><h2 class="section-title">ค่าที่บันทึกในระบบ</h2><table><thead><tr><th>คีย์</th><th>ค่า</th><th>อัปเดตล่าสุด</th></tr></thead><tbody>${settings.map((item) => `<tr><td>${esc(item.setting_key)}</td><td>${esc(item.setting_value || "")}</td><td>${esc(item.updated_at || "")}</td></tr>`).join("")}</tbody></table></div>`));
});

adminRouter.post("/admin/settings/exchange-rate", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const rate = Number(String(req.body.exchange_rate_vnd_thb || "").trim());
  if (!Number.isFinite(rate) || rate <= 0) {
    return res.status(422).send(renderAdminPage("ตั้งค่า", getAdmin(req)!, `<div class="card"><h2>บันทึกไม่สำเร็จ</h2><p>อัตราแลกเปลี่ยนต้องเป็นตัวเลขที่มากกว่า 0</p><p><a class="btn secondary" href="/admin/settings">ย้อนกลับ</a></p></div>`));
  }

  upsertSetting("exchange_rate_vnd_thb", String(rate));
  res.redirect("/admin/settings");
});

adminRouter.get("/admin/users", requireAdmin, requireAdminPermission("users.read"), (req, res) => {
  const admin = getAdmin(req)!;
  const users = listUsers();
  res.send(renderAdminPage("ผู้ใช้", admin, `<div class="card"><h2 class="section-title">สร้างผู้ใช้</h2><form method="post" action="/admin/users" class="grid two"><div><label>ชื่อผู้ใช้</label><input name="username" required></div><div><label>ชื่อเต็ม</label><input name="full_name" required></div><div><label>อีเมล</label><input name="email"></div><div><label>เบอร์โทร</label><input name="phone"></div><div><label>รหัสผ่าน</label><input name="password" value="User1234@" required></div><div><label>สถานะ</label><select name="status"><option value="active">active</option><option value="inactive">inactive</option></select></div><div style="grid-column:1/-1"><button class="btn" type="submit">สร้างผู้ใช้</button></div></form></div><div class="card"><h2 class="section-title">รายการผู้ใช้</h2><table><thead><tr><th>ID</th><th>ชื่อผู้ใช้</th><th>ชื่อ</th><th>อีเมล</th><th>ยอดเงิน</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${users.map((r) => `<tr><td>${r.id}</td><td>${esc(r.username)}</td><td>${esc(r.full_name)}</td><td>${esc(r.email || "")}</td><td>${money(r.balance)}</td><td>${tag(r.status)}</td><td><form method="post" action="/admin/users/${r.id}/status" class="inline"><select name="status"><option value="active" ${r.status === "active" ? "selected" : ""}>active</option><option value="inactive" ${r.status === "inactive" ? "selected" : ""}>inactive</option></select><button class="btn secondary" type="submit">อัปเดต</button></form></td></tr>`).join("")}</tbody></table></div>`));
});

adminRouter.post("/admin/users", requireAdmin, requireAdminPermission("users.read"), (req, res) => {
  createUser({ username: String(req.body.username || "").trim(), fullName: String(req.body.full_name || "").trim(), email: String(req.body.email || "").trim() || null, phone: String(req.body.phone || "").trim() || null, passwordHash: createPasswordHash(String(req.body.password || "User1234@")), status: String(req.body.status || "active") });
  res.redirect("/admin/users");
});

adminRouter.post("/admin/users/:id/status", requireAdmin, requireAdminPermission("users.read"), (req, res) => {
  updateUserStatus(Number(req.params.id), String(req.body.status || "active"));
  res.redirect("/admin/users");
});

adminRouter.get("/admin/categories", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const admin = getAdmin(req)!;
  const categories = listCategories();
  res.send(renderAdminPage("หมวดหมู่", admin, `<div class="card"><h2 class="section-title">สร้างหมวดหมู่</h2><form method="post" action="/admin/categories" class="grid two"><div><label>ชื่อหมวดหมู่</label><input name="name" required></div><div><label>คำอธิบาย</label><input name="description"></div><div><label>ลำดับ</label><input name="sort_order" type="number" value="99"></div><div><label>สถานะ</label><select name="status"><option value="active">active</option><option value="inactive">inactive</option></select></div><div style="grid-column:1/-1"><button class="btn" type="submit">สร้างหมวดหมู่</button></div></form></div><div class="card"><h2 class="section-title">รายการหมวดหมู่</h2><table><thead><tr><th>ID</th><th>ชื่อ</th><th>Slug</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${categories.map((r) => `<tr><td>${r.id}</td><td>${esc(r.name)}</td><td>${esc(r.slug)}</td><td>${tag(r.status)}</td><td><form method="post" action="/admin/categories/${r.id}" class="inline"><input type="text" name="name" value="${esc(r.name)}"><select name="status"><option value="active" ${r.status === "active" ? "selected" : ""}>active</option><option value="inactive" ${r.status === "inactive" ? "selected" : ""}>inactive</option></select><button class="btn secondary" type="submit">บันทึก</button></form></td></tr>`).join("")}</tbody></table></div>`));
});

adminRouter.post("/admin/categories", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const name = String(req.body.name || "").trim();
  createCategory({ name, slug: slugify(name), description: String(req.body.description || "").trim() || null, sortOrder: Number(req.body.sort_order || 99), status: String(req.body.status || "active") });
  res.redirect("/admin/categories");
});

adminRouter.post("/admin/categories/:id", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const name = String(req.body.name || "").trim();
  updateCategory(Number(req.params.id), { name, slug: slugify(name), status: String(req.body.status || "active") });
  res.redirect("/admin/categories");
});

adminRouter.get("/admin/products", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const admin = getAdmin(req)!;
  const products = listProducts();
  const categories = listCategories().filter((c) => c.status === "active");
  const options = categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  res.send(renderAdminPage("บริการ", admin, `<div class="card"><h2 class="section-title">สร้างบริการ</h2><form method="post" action="/admin/products" class="grid two"><div><label>หมวดหมู่</label><select name="category_id">${options}</select></div><div><label>ชื่อบริการ</label><input name="name" required></div><div><label>ราคา (${env.displayCurrencyCode})</label><input name="price" type="number" step="0.01" value="10.00"></div><div><label>หน่วย</label><input name="unit_name" value="หน่วย"></div><div><label>จำนวนขั้นต่ำ</label><input name="min_quantity" type="number" value="100"></div><div><label>จำนวนสูงสุด</label><input name="max_quantity" type="number" value="50000"></div><div><label>คำอธิบาย</label><input name="description"></div><div><label>สถานะ</label><select name="status"><option value="active">active</option><option value="inactive">inactive</option></select></div><div style="grid-column:1/-1"><button class="btn" type="submit">สร้างบริการ</button></div></form></div><div class="card"><h2 class="section-title">รายการบริการ</h2><table><thead><tr><th>ID</th><th>หมวดหมู่</th><th>ชื่อ</th><th>ราคา</th><th>ขั้นต่ำ / สูงสุด</th><th>สถานะ</th><th>จัดการ</th></tr></thead><tbody>${products.map((r) => `<tr><td>${r.id}</td><td>${esc(r.category_name)}</td><td>${esc(r.name)}</td><td>${money(r.price)}</td><td>${r.min_quantity} / ${r.max_quantity}</td><td>${tag(r.status)}</td><td><form method="post" action="/admin/products/${r.id}" class="inline"><input type="text" name="name" value="${esc(r.name)}"><input type="number" step="0.01" name="price" value="${moneyNumber(r.price)}"><select name="status"><option value="active" ${r.status === "active" ? "selected" : ""}>active</option><option value="inactive" ${r.status === "inactive" ? "selected" : ""}>inactive</option></select><button class="btn secondary" type="submit">บันทึก</button></form></td></tr>`).join("")}</tbody></table></div>`));
});

adminRouter.post("/admin/products", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const name = String(req.body.name || "").trim();
  createProduct({ categoryId: Number(req.body.category_id || 1), name, slug: slugify(name), description: String(req.body.description || "").trim() || null, unitName: String(req.body.unit_name || "หน่วย"), price: parseDisplayCurrencyInput(req.body.price || 0), minQuantity: Number(req.body.min_quantity || 1), maxQuantity: Number(req.body.max_quantity || 100000), status: String(req.body.status || "active") });
  res.redirect("/admin/products");
});

adminRouter.post("/admin/products/:id", requireAdmin, requireAdminPermission("dashboard.read"), (req, res) => {
  const name = String(req.body.name || "").trim();
  updateProduct(Number(req.params.id), { name, slug: slugify(name), price: parseDisplayCurrencyInput(req.body.price || 0), status: String(req.body.status || "active") });
  res.redirect("/admin/products");
});
adminRouter.get("/admin/orders", requireAdmin, requireAdminPermission("orders.read"), (req, res) => {
  const admin = getAdmin(req)!;
  const page = Math.max(1, Number(req.query.page || 1));
  const orderPage = listOrdersPage(page, 100);
  const totalPages = Math.max(1, Math.ceil(orderPage.total / orderPage.pageSize));
  const pageLinks = buildPaginationLinks("/admin/orders", orderPage.page, totalPages);
  res.send(
    renderAdminPage(
      "คำสั่งซื้อ",
      admin,
      `<div class="card"><h2 class="section-title">คำสั่งซื้อ</h2><table><thead><tr><th>รหัส</th><th>วันที่สั่งซื้อ</th><th>ผู้ใช้</th><th>บริการ</th><th>จำนวน</th><th>ยอดรวม</th><th>รายรับจาก Excel</th><th>รายจ่ายจาก Excel</th><th>กำไร</th><th>สถานะ</th><th>แหล่งที่มา</th><th>ลิงก์</th><th>จัดการ</th></tr></thead><tbody>${orderPage.items.map((r) => `<tr><td>${esc(r.order_code)}</td><td>${esc(r.ordered_at || "")}</td><td>${esc(r.username)}</td><td>${esc(r.service_name_snapshot || "")}</td><td>${esc(r.quantity || "")}</td><td>${money(r.total_amount)}</td><td>${formatDisplayMoney(Number(r.excel_income_amount || 0))}</td><td>${formatDisplayMoney(Number(r.excel_expense_amount || 0))}</td><td>${formatDisplayMoney(Number(r.excel_gross_profit || 0))}</td><td>${tag(r.order_status)}</td><td>${esc(r.source_type || "web")}</td><td>${esc(r.target_link || "")}</td><td><form method="post" action="/admin/orders/${r.id}/status" class="inline"><select name="order_status">${["pending", "processing", "completed", "cancelled", "failed"].map((s) => `<option value="${s}" ${r.order_status === s ? "selected" : ""}>${s}</option>`).join("")}</select><button class="btn secondary" type="submit">อัปเดต</button></form></td></tr>`).join("")}</tbody></table><div class="auth-box" style="justify-content:space-between;margin-top:16px"><div class="muted">หน้า ${orderPage.page} / ${totalPages} , ทั้งหมด ${orderPage.total} รายการ, แสดงครั้งละ ${orderPage.pageSize}</div><div class="auth-box">${pageLinks}</div></div></div>`
    )
  );
});

adminRouter.post("/admin/orders/:id/status", requireAdmin, requireAdminPermission("orders.update"), (req, res) => {
  const newStatus = String(req.body.order_status || "pending");
  const oldStatus = updateOrderStatus(Number(req.params.id), newStatus);
  createOrderLog({ orderId: Number(req.params.id), oldStatus, newStatus, changedByType: "admin", changedById: getAdmin(req)!.id, note: "อัปเดตสถานะจากแอดมิน" });
  res.redirect("/admin/orders");
});

adminRouter.get("/admin/transactions", requireAdmin, requireAdminPermission("wallet.read"), (req, res) => {
  const admin = getAdmin(req)!;
  const transactions = listWalletTransactions(300);
  const users = listUsers();
  const options = users.map((u) => `<option value="${u.id}">${esc(u.username)}</option>`).join("");
  res.send(renderAdminPage("ธุรกรรมกระเป๋า", admin, `<div class="card"><h2 class="section-title">เพิ่มธุรกรรมกระเป๋าแบบแมนนวล</h2><form method="post" action="/admin/transactions" class="grid two"><div><label>ผู้ใช้</label><select name="user_id">${options}</select></div><div><label>ทิศทาง</label><select name="direction"><option value="in">in</option><option value="out">out</option></select></div><div><label>ประเภท</label><select name="transaction_type"><option value="manual_adjustment">manual_adjustment</option><option value="deposit">deposit</option><option value="withdraw">withdraw</option></select></div><div><label>จำนวนเงิน (${env.displayCurrencyCode})</label><input name="amount" type="number" step="0.01" value="100.00"></div><div style="grid-column:1/-1"><label>หมายเหตุ</label><textarea name="note">ปรับยอดจากหน้าแอดมิน</textarea></div><div style="grid-column:1/-1"><button class="btn" type="submit">บันทึกธุรกรรม</button></div></form></div><div class="card"><h2 class="section-title">รายการธุรกรรม</h2><table><thead><tr><th>รหัส</th><th>ผู้ใช้</th><th>ประเภท</th><th>ทิศทาง</th><th>จำนวนเงิน</th><th>ก่อนทำรายการ</th><th>หลังทำรายการ</th><th>วันที่</th></tr></thead><tbody>${transactions.map((r) => `<tr><td>${esc(r.transaction_code || "")}</td><td>${esc(r.username || "N/A")}</td><td>${esc(r.transaction_type)}</td><td>${tag(r.direction)}</td><td>${money(r.amount)}</td><td>${money(r.balance_before)}</td><td>${money(r.balance_after)}</td><td>${esc(r.transaction_date || "")}</td></tr>`).join("")}</tbody></table></div>`));
});

adminRouter.post("/admin/transactions", requireAdmin, requireAdminPermission("wallet.create"), (req, res) => {
  const userId = Number(req.body.user_id);
  const user = getUserById(userId);
  if (!user) return res.redirect("/admin/transactions");
  const amount = Math.max(0, parseDisplayCurrencyInput(req.body.amount || 0));
  const direction = String(req.body.direction || "in");
  const before = Number(user.balance || 0);
  const after = direction === "in" ? before + amount : before - amount;
  updateUserBalance(userId, after);
  createWalletTransaction({ userId, transactionCode: `MAN-${Date.now()}`, transactionType: String(req.body.transaction_type || "manual_adjustment"), direction, amount, balanceBefore: before, balanceAfter: after, note: String(req.body.note || "").trim(), source: "admin_panel" });
  res.redirect("/admin/transactions");
});
