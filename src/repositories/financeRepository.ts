import { db } from "../db";
import { QueryRow } from "../types";

export type FinanceFilter = {
  startDate?: string | null;
  endDate?: string | null;
};

export type FinancialSummaryFilter = FinanceFilter & {
  keyword?: string | null;
};

function buildFinanceFilterClause(filter: FinanceFilter = {}): { where: string; params: Array<string> } {
  const clauses: string[] = [];
  const params: Array<string> = [];

  if (filter.startDate) {
    clauses.push("COALESCE(fr.income_date, fr.expense_date) >= ?");
    params.push(filter.startDate);
  }
  if (filter.endDate) {
    clauses.push("COALESCE(fr.income_date, fr.expense_date) <= ?");
    params.push(filter.endDate);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

function joinedOrderSelect(): string {
  return `
    LEFT JOIN financial_order_mappings fm ON fm.excel_order_code = fr.order_code
    LEFT JOIN orders odirect ON odirect.order_code = fr.order_code
    LEFT JOIN orders omap ON omap.id = fm.order_id
  `;
}

function matchedOrderFields(): string {
  return `
    COALESCE(omap.id, odirect.id) AS matched_order_id,
    COALESCE(omap.order_code, odirect.order_code) AS matched_order_code,
    COALESCE(omap.total_amount, odirect.total_amount) AS matched_order_total_amount,
    COALESCE(omap.order_status, odirect.order_status) AS matched_order_status
  `;
}

export function clearFinancialData(): void {
  db.exec("DELETE FROM financial_records; DELETE FROM financial_import_batches;");
}

export function createFinancialImportBatch(input: {
  fileName: string;
  sourceSheet: string | null;
  totalRows: number;
  replaceExisting: boolean;
  currencyCode?: string;
}): number {
  db
    .prepare("INSERT INTO financial_import_batches (file_name, source_sheet, total_rows, imported_rows, skipped_rows, currency_code, replace_existing, created_at) VALUES (?, ?, ?, 0, 0, ?, ?, datetime('now'))")
    .run(input.fileName, input.sourceSheet, input.totalRows, input.currencyCode ?? "THB", input.replaceExisting ? 1 : 0);
  const row = db.prepare("SELECT last_insert_rowid() AS id").get() as QueryRow;
  return Number(row.id);
}

export function completeFinancialImportBatch(batchId: number, importedRows: number, skippedRows: number): void {
  db.prepare("UPDATE financial_import_batches SET imported_rows = ?, skipped_rows = ?, completed_at = datetime('now') WHERE id = ?").run(importedRows, skippedRows, batchId);
}

export function insertFinancialRecord(input: {
  importBatchId: number;
  orderCode: string;
  isMissingOrderCode?: boolean;
  incomeDate: string | null;
  incomeAmount: number;
  expenseDate: string | null;
  expenseAmount: number;
  currencyCode?: string;
  sourceFileName?: string | null;
  sourceSheet?: string | null;
  sourceRowNumber?: number | null;
  note?: string | null;
}): void {
  db.prepare(`
    INSERT INTO financial_records (
      import_batch_id, order_code, income_date, income_amount, expense_date, expense_amount,
      currency_code, source_file_name, source_sheet, source_row_number, is_missing_order_code, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    input.importBatchId,
    input.orderCode,
    input.incomeDate,
    input.incomeAmount,
    input.expenseDate,
    input.expenseAmount,
    input.currencyCode ?? "THB",
    input.sourceFileName ?? null,
    input.sourceSheet ?? null,
    input.sourceRowNumber ?? null,
    input.isMissingOrderCode ? 1 : 0,
    input.note ?? null
  );
}

export function upsertFinancialOrderMapping(excelOrderCode: string, orderId: number, note?: string | null): void {
  const existing = db.prepare("SELECT id FROM financial_order_mappings WHERE excel_order_code = ?").get(excelOrderCode) as QueryRow | undefined;
  if (existing) {
    db.prepare("UPDATE financial_order_mappings SET order_id = ?, note = ?, updated_at = datetime('now') WHERE id = ?").run(orderId, note ?? null, existing.id);
    return;
  }
  db.prepare("INSERT INTO financial_order_mappings (excel_order_code, order_id, note, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))").run(excelOrderCode, orderId, note ?? null);
}

export function listFinancialImportBatches(limit = 20): QueryRow[] {
  return db.prepare(`SELECT * FROM financial_import_batches ORDER BY id DESC LIMIT ${limit}`).all() as QueryRow[];
}

export function listFinancialOrderMappings(limit = 300): QueryRow[] {
  return db.prepare(`
    SELECT fm.*, o.order_code AS system_order_code, o.total_amount AS system_order_total_amount, o.order_status AS system_order_status
    FROM financial_order_mappings fm
    JOIN orders o ON o.id = fm.order_id
    ORDER BY fm.updated_at DESC, fm.id DESC
    LIMIT ${limit}
  `).all() as QueryRow[];
}

export function listFinancialRecords(limit = 300, filter: FinanceFilter = {}): QueryRow[] {
  const { where, params } = buildFinanceFilterClause(filter);
  return db.prepare(`
    SELECT
      fr.*,
      ${matchedOrderFields()}
    FROM financial_records fr
    ${joinedOrderSelect()}
    ${where}
    ORDER BY COALESCE(fr.income_date, fr.expense_date, fr.created_at) DESC, fr.id DESC
    LIMIT ${limit}
  `).all(...params) as QueryRow[];
}

export function listFinancialOrderSummaries(limit = 300, filter: FinanceFilter = {}): QueryRow[] {
  return listFinancialOrderSummariesPage({ ...filter, page: 1, pageSize: limit }).items;
}

export function countFinancialOrderSummaries(filter: FinancialSummaryFilter = {}): number {
  const { where, params } = buildFinancialSummaryFilterClause(filter);
  const row = db.prepare(`
    SELECT COUNT(*) AS count
    FROM (
      SELECT fr.order_code
      FROM financial_records fr
      ${joinedOrderSelect()}
      LEFT JOIN users udirect ON udirect.id = odirect.user_id
      LEFT JOIN users umap ON umap.id = omap.user_id
      LEFT JOIN order_details odetail_direct ON odetail_direct.order_id = odirect.id
      LEFT JOIN order_details odetail_map ON odetail_map.order_id = omap.id
      ${where}
      GROUP BY fr.order_code
    ) summary
  `).get(...params) as QueryRow;
  return Number(row?.count || 0);
}

function buildFinancialSummaryFilterClause(filter: FinancialSummaryFilter = {}): { where: string; params: Array<string> } {
  const { where, params } = buildFinanceFilterClause(filter);
  const clauses = where ? [where.replace(/^WHERE\s+/i, "")] : [];
  if (filter.keyword) {
    clauses.push(`(
      fr.order_code LIKE ?
      OR COALESCE(omap.order_code, odirect.order_code, '') LIKE ?
      OR COALESCE(umap.username, udirect.username, '') LIKE ?
      OR COALESCE(odetail_map.service_name_snapshot, odetail_direct.service_name_snapshot, '') LIKE ?
    )`);
    const query = `%${filter.keyword}%`;
    params.push(query, query, query, query);
  }
  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    params,
  };
}

export function listFinancialOrderSummariesPage(input: FinancialSummaryFilter & { page?: number; pageSize?: number } = {}): { items: QueryRow[]; total: number; page: number; pageSize: number } {
  const pageSize = Math.max(1, Math.min(100, Number(input.pageSize || 100)));
  const page = Math.max(1, Number(input.page || 1));
  const offset = (page - 1) * pageSize;
  const { where, params } = buildFinancialSummaryFilterClause(input);
  const total = countFinancialOrderSummaries(input);
  const items = db.prepare(`
    SELECT
      fr.order_code,
      MIN(COALESCE(fr.income_date, fr.expense_date)) AS first_date,
      MAX(COALESCE(fr.expense_date, fr.income_date)) AS last_date,
      SUM(fr.income_amount) AS total_income,
      SUM(fr.expense_amount) AS total_expense,
      SUM(fr.income_amount - fr.expense_amount) AS gross_profit,
      COUNT(*) AS row_count,
      MAX(fr.is_missing_order_code) AS is_missing_order_code,
      MAX(COALESCE(omap.id, odirect.id)) AS matched_order_id,
      MAX(COALESCE(omap.order_code, odirect.order_code)) AS matched_order_code,
      MAX(COALESCE(omap.total_amount, odirect.total_amount)) AS matched_order_total_amount,
      MAX(COALESCE(omap.order_status, odirect.order_status)) AS matched_order_status,
      MAX(COALESCE(umap.username, udirect.username)) AS matched_username,
      MAX(COALESCE(odetail_map.service_name_snapshot, odetail_direct.service_name_snapshot)) AS matched_service_name,
      MAX(fm.id) AS mapping_id,
      MAX(COALESCE(omap.total_amount, odirect.total_amount)) - SUM(fr.expense_amount) AS backend_margin,
      SUM(fr.income_amount) - MAX(COALESCE(omap.total_amount, odirect.total_amount, 0)) AS income_gap
    FROM financial_records fr
    ${joinedOrderSelect()}
    LEFT JOIN users udirect ON udirect.id = odirect.user_id
    LEFT JOIN users umap ON umap.id = omap.user_id
    LEFT JOIN order_details odetail_direct ON odetail_direct.order_id = odirect.id
    LEFT JOIN order_details odetail_map ON odetail_map.order_id = omap.id
    ${where}
    GROUP BY fr.order_code
    ORDER BY last_date DESC, fr.order_code DESC
    LIMIT ${pageSize} OFFSET ${offset}
  `).all(...params) as QueryRow[];
  return { items, total, page, pageSize };
}

export function listFinancialDailySummary(limit = 120, filter: FinanceFilter = {}): QueryRow[] {
  const { where, params } = buildFinanceFilterClause(filter);
  return db.prepare(`
    SELECT
      COALESCE(fr.income_date, fr.expense_date) AS summary_date,
      SUM(fr.income_amount) AS total_income,
      SUM(fr.expense_amount) AS total_expense,
      SUM(fr.income_amount - fr.expense_amount) AS gross_profit
    FROM financial_records fr
    ${where}
    GROUP BY COALESCE(fr.income_date, fr.expense_date)
    ORDER BY summary_date DESC
    LIMIT ${limit}
  `).all(...params) as QueryRow[];
}

export function getFinancialSummary(filter: FinanceFilter = {}): QueryRow {
  const { where, params } = buildFinanceFilterClause(filter);
  return (
    db.prepare(`
      SELECT
        COUNT(*) AS record_count,
        COUNT(DISTINCT order_code) AS order_count,
        COALESCE(SUM(CASE WHEN is_missing_order_code = 1 THEN 1 ELSE 0 END), 0) AS missing_code_rows,
        COALESCE(SUM(income_amount), 0) AS total_income,
        COALESCE(SUM(expense_amount), 0) AS total_expense,
        COALESCE(SUM(income_amount - expense_amount), 0) AS gross_profit
      FROM financial_records fr
      ${where}
    `).get(...params) as QueryRow
  ) ?? { record_count: 0, order_count: 0, missing_code_rows: 0, total_income: 0, total_expense: 0, gross_profit: 0 };
}
