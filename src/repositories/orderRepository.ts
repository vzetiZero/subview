import { db } from "../db";
import { QueryRow } from "../types";

function orderSelectSql(whereClause = ""): string {
  return `
      SELECT
        o.*,
        u.username,
        od.service_name_snapshot,
        od.quantity,
        od.target_link,
        COALESCE(fin.total_income, 0) AS excel_income_amount,
        COALESCE(fin.total_expense, 0) AS excel_expense_amount,
        COALESCE(fin.gross_profit, 0) AS excel_gross_profit
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN order_details od ON od.order_id = o.id
      LEFT JOIN financial_order_mappings fm ON fm.order_id = o.id
      LEFT JOIN (
        SELECT
          order_code,
          SUM(income_amount) AS total_income,
          SUM(expense_amount) AS total_expense,
          SUM(income_amount - expense_amount) AS gross_profit
        FROM financial_records
        GROUP BY order_code
      ) fin ON fin.order_code = COALESCE(fm.excel_order_code, o.order_code)
      ${whereClause}
      ORDER BY o.id DESC
    `;
}

export function listOrders(): QueryRow[] {
  return db.prepare(orderSelectSql()).all() as QueryRow[];
}

export function countOrders(): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM orders").get() as QueryRow;
  return Number(row?.count || 0);
}

export function listOrdersPage(page = 1, pageSize = 100): { items: QueryRow[]; total: number; page: number; pageSize: number } {
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize || 100)));
  const safePage = Math.max(1, Number(page || 1));
  const offset = (safePage - 1) * safePageSize;
  const total = countOrders();
  const items = db.prepare(`${orderSelectSql()} LIMIT ${safePageSize} OFFSET ${offset}`).all() as QueryRow[];
  return { items, total, page: safePage, pageSize: safePageSize };
}

export function searchOrders(term: string, limit = 10): QueryRow[] {
  const query = `%${term.trim()}%`;
  return db
    .prepare(`
      SELECT o.*, u.username, od.service_name_snapshot, od.quantity, od.target_link
      FROM orders o
      JOIN users u ON u.id = o.user_id
      LEFT JOIN order_details od ON od.order_id = o.id
      WHERE CAST(o.id AS TEXT) LIKE ?
         OR o.order_code LIKE ?
         OR u.username LIKE ?
         OR od.service_name_snapshot LIKE ?
      ORDER BY o.id DESC
      LIMIT ${limit}
    `)
    .all(query, query, query, query) as QueryRow[];
}

export function listUserOrders(userId: number): QueryRow[] {
  return db.prepare("SELECT o.*, od.service_name_snapshot, od.quantity, od.target_link, od.detail_status FROM orders o LEFT JOIN order_details od ON od.order_id = o.id WHERE o.user_id = ? ORDER BY o.id DESC").all(userId) as QueryRow[];
}

export function countUserOrders(userId: number): number {
  const row = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE user_id = ?").get(userId) as QueryRow;
  return Number(row?.count || 0);
}

export function listUserOrdersPage(userId: number, page = 1, pageSize = 100): { items: QueryRow[]; total: number; page: number; pageSize: number } {
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize || 100)));
  const safePage = Math.max(1, Number(page || 1));
  const offset = (safePage - 1) * safePageSize;
  const total = countUserOrders(userId);
  const items = db
    .prepare(`
      SELECT o.*, od.service_name_snapshot, od.quantity, od.target_link, od.detail_status
      FROM orders o
      LEFT JOIN order_details od ON od.order_id = o.id
      WHERE o.user_id = ?
      ORDER BY o.id DESC
      LIMIT ${safePageSize} OFFSET ${offset}
    `)
    .all(userId) as QueryRow[];
  return { items, total, page: safePage, pageSize: safePageSize };
}

export function updateOrderStatus(id: number, status: string): string | null {
  const old = db.prepare("SELECT order_status FROM orders WHERE id = ?").get(id) as QueryRow | undefined;
  db.prepare("UPDATE orders SET order_status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
  return old?.order_status ?? null;
}

export function createOrderLog(input: { orderId: number; oldStatus?: string | null; newStatus: string; changedByType: string; changedById?: number | null; note: string }): void {
  db.prepare("INSERT INTO order_logs (order_id, old_status, new_status, changed_by_type, changed_by_id, note, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))").run(input.orderId, input.oldStatus ?? null, input.newStatus, input.changedByType, input.changedById ?? null, input.note);
}
