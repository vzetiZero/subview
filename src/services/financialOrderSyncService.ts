import { db } from "../db";
import { getProductBySlug } from "../repositories/catalogRepository";
import { getUserByUsername } from "../repositories/userRepository";
import { createPasswordHash } from "../utils/security";
import { QueryRow } from "../types";

function ensureImportedUserId(): number {
  const existing = getUserByUsername("excel_import_user");
  if (existing) return Number(existing.id);

  db.prepare(`
    INSERT INTO users (username, full_name, email, phone, password_hash, balance, status, register_ip, created_at, updated_at)
    VALUES ('excel_import_user', 'Excel Imported Customer', 'excel-import@example.local', NULL, ?, 0, 'active', '127.0.0.1', datetime('now'), datetime('now'))
  `).run(createPasswordHash("ExcelImport@2026"));
  const row = db.prepare("SELECT id FROM users WHERE username = 'excel_import_user'").get() as QueryRow;
  return Number(row.id);
}

function ensureImportedCategoryId(): number {
  const existing = db.prepare("SELECT id FROM categories WHERE slug = ?").get("excel-import") as QueryRow | undefined;
  if (existing) {
    db.prepare("UPDATE categories SET name = ?, description = ?, updated_at = datetime('now') WHERE id = ?").run("รายการบัญชี", "รายการคำสั่งซื้อที่สร้างจากข้อมูลรายรับรายจ่าย", existing.id);
    return Number(existing.id);
  }

  db.prepare(`
    INSERT INTO categories (name, slug, description, sort_order, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
  `).run("รายการบัญชี", "excel-import", "รายการคำสั่งซื้อที่สร้างจากข้อมูลรายรับรายจ่าย", 999);
  const row = db.prepare("SELECT id FROM categories WHERE slug = ?").get("excel-import") as QueryRow;
  return Number(row.id);
}

function ensureImportedProductId(): number {
  const existing = getProductBySlug("excel-imported-order");
  if (existing) {
    db.prepare("UPDATE products SET name = ?, description = ?, unit_name = ?, updated_at = datetime('now') WHERE id = ?").run("รายการคำสั่งซื้อบัญชี", "คำสั่งซื้อที่สร้างจากข้อมูลบัญชี", "order", existing.id);
    return Number(existing.id);
  }

  const categoryId = ensureImportedCategoryId();
  const count = Number((db.prepare("SELECT COUNT(*) AS count FROM products").get() as QueryRow).count || 0) + 1;
  db.prepare(`
    INSERT INTO products (category_id, name, slug, service_code, description, unit_name, price, min_quantity, max_quantity, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
  `).run(categoryId, "รายการคำสั่งซื้อบัญชี", "excel-imported-order", `SVC${String(count).padStart(4, "0")}`, "คำสั่งซื้อที่สร้างจากข้อมูลบัญชี", "order", 0, 1, 1);
  const row = db.prepare("SELECT id FROM products WHERE slug = ?").get("excel-imported-order") as QueryRow;
  return Number(row.id);
}

function determineOrderStatus(totalIncome: number, totalExpense: number): string {
  if (totalIncome <= 0) return "cancelled";
  if (totalExpense <= 0) return "pending";
  if (totalExpense > totalIncome) return "failed";
  return "completed";
}

export function syncImportedOrdersFromFinancialRecords(): { createdOrders: number; failedOrders: number; pendingOrders: number; completedOrders: number } {
  const importedUserId = ensureImportedUserId();
  const importedProductId = ensureImportedProductId();

  const summaries = db.prepare(`
    SELECT
      order_code,
      MIN(COALESCE(income_date, expense_date)) AS first_date,
      MAX(COALESCE(expense_date, income_date)) AS last_date,
      SUM(income_amount) AS total_income,
      SUM(expense_amount) AS total_expense,
      SUM(income_amount - expense_amount) AS gross_profit,
      MAX(is_missing_order_code) AS is_missing_order_code
    FROM financial_records
    GROUP BY order_code
    HAVING SUM(income_amount) > 0
    ORDER BY first_date, order_code
  `).all() as QueryRow[];

  let createdOrders = 0;
  let failedOrders = 0;
  let pendingOrders = 0;
  let completedOrders = 0;

  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM order_logs WHERE order_id IN (SELECT id FROM orders WHERE source_type = 'system')");
    db.exec("DELETE FROM order_details WHERE order_id IN (SELECT id FROM orders WHERE source_type = 'system')");
    db.exec("DELETE FROM orders WHERE source_type = 'system'");
    db.exec("DELETE FROM order_logs WHERE order_id IN (SELECT id FROM orders WHERE source_type = 'excel_import')");
    db.exec("DELETE FROM order_details WHERE order_id IN (SELECT id FROM orders WHERE source_type = 'excel_import')");
    db.exec("DELETE FROM orders WHERE source_type = 'excel_import'");

    for (const summary of summaries) {
      const totalIncome = Number(summary.total_income || 0);
      const totalExpense = Number(summary.total_expense || 0);
      const status = determineOrderStatus(totalIncome, totalExpense);
      db.prepare(`
        INSERT INTO orders (
          order_code, user_id, total_amount, payment_status, order_status, ordered_at, note, source_type, created_at, updated_at
        ) VALUES (?, ?, ?, 'paid', ?, ?, ?, 'excel_import', datetime('now'), datetime('now'))
      `).run(
        String(summary.order_code),
        importedUserId,
        totalIncome,
        status,
        `${String(summary.first_date)} 00:00:00`,
        null
      );

      const inserted = db.prepare("SELECT id FROM orders WHERE order_code = ?").get(String(summary.order_code)) as QueryRow;
      const orderId = Number(inserted.id);
      db.prepare(`
        INSERT INTO order_details (
          order_id, product_id, service_name_snapshot, service_price_snapshot, target_link, quantity, line_total,
          start_count, current_count, success_count, remain_count, detail_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, NULL, 1, ?, 0, 0, 0, 0, ?, datetime('now'), datetime('now'))
      `).run(orderId, importedProductId, "รายการคำสั่งซื้อบัญชี", totalIncome, totalIncome, status);

      createdOrders += 1;
      if (status === "failed") failedOrders += 1;
      else if (status === "pending") pendingOrders += 1;
      else if (status === "completed") completedOrders += 1;
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return { createdOrders, failedOrders, pendingOrders, completedOrders };
}

export function resetImportedFinancialData(): void {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM financial_order_mappings");
    db.exec("DELETE FROM order_logs WHERE order_id IN (SELECT id FROM orders WHERE source_type = 'excel_import')");
    db.exec("DELETE FROM order_details WHERE order_id IN (SELECT id FROM orders WHERE source_type = 'excel_import')");
    db.exec("DELETE FROM orders WHERE source_type = 'excel_import'");
    db.exec("DELETE FROM financial_records");
    db.exec("DELETE FROM financial_import_batches");
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
