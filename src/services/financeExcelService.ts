import XLSX from "xlsx";
import { db } from "../db";
import {
  clearFinancialData,
  completeFinancialImportBatch,
  createFinancialImportBatch,
  FinanceFilter,
  getFinancialSummary,
  insertFinancialRecord,
  listFinancialOrderSummaries,
  listFinancialRecords,
} from "../repositories/financeRepository";

type WorkbookCell = string | number | Date | null | undefined;

export type FinanceImportSummary = {
  fileName: string;
  sheetName: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  totalIncome: number;
  totalExpense: number;
  grossProfit: number;
  batchId: number;
};

function normalizeDate(value: WorkbookCell): string | null {
  if (value == null || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getFullYear()).padStart(4, "0")}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && parsed.y && parsed.m && parsed.d) {
      return `${String(parsed.y).padStart(4, "0")}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
    }
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, dd, mm, yyyy] = match;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    return raw;
  }

  const native = new Date(raw);
  if (!Number.isNaN(native.getTime())) {
    return `${String(native.getFullYear()).padStart(4, "0")}-${String(native.getMonth() + 1).padStart(2, "0")}-${String(native.getDate()).padStart(2, "0")}`;
  }

  return null;
}

function normalizeAmount(value: WorkbookCell): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return Number(value.toFixed(2));
  const normalized = String(value).replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function normalizeOrderCode(value: WorkbookCell): string {
  return String(value ?? "").trim();
}

export function importFinancialWorkbook(buffer: Buffer, fileName: string, replaceExisting = true): FinanceImportSummary {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<WorkbookCell[]>(sheet, { header: 1, raw: false, defval: null });
  const dataRows = rows.slice(1);

  let importedRows = 0;
  let skippedRows = 0;
  let totalIncome = 0;
  let totalExpense = 0;

  db.exec("BEGIN");
  try {
    if (replaceExisting) {
      clearFinancialData();
    }

    const batchId = createFinancialImportBatch({
      fileName,
      sourceSheet: sheetName,
      totalRows: dataRows.length,
      replaceExisting,
      currencyCode: "THB",
    });

    for (let index = 0; index < dataRows.length; index += 1) {
      const row = dataRows[index];
      const rawOrderCode = normalizeOrderCode(row[1]);
      const incomeDate = normalizeDate(row[0]);
      const incomeAmount = normalizeAmount(row[2]);
      const expenseDate = normalizeDate(row[3]);
      const expenseAmount = normalizeAmount(row[4]);
      if (!incomeAmount && !expenseAmount) {
        skippedRows += 1;
        continue;
      }

      const isMissingOrderCode = !rawOrderCode;
      const orderCode = rawOrderCode || `NO-CODE-R${index + 2}`;
      insertFinancialRecord({
        importBatchId: batchId,
        orderCode,
        isMissingOrderCode,
        incomeDate,
        incomeAmount,
        expenseDate,
        expenseAmount,
        currencyCode: "THB",
        sourceFileName: fileName,
        sourceSheet: sheetName,
        sourceRowNumber: index + 2,
        note: isMissingOrderCode ? "missing_order_code" : null,
      });
      importedRows += 1;
      totalIncome += incomeAmount;
      totalExpense += expenseAmount;
    }

    completeFinancialImportBatch(batchId, importedRows, skippedRows);
    db.exec("COMMIT");
    return {
      fileName,
      sheetName,
      totalRows: dataRows.length,
      importedRows,
      skippedRows,
      totalIncome: Number(totalIncome.toFixed(2)),
      totalExpense: Number(totalExpense.toFixed(2)),
      grossProfit: Number((totalIncome - totalExpense).toFixed(2)),
      batchId,
    };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function buildFinancialTemplateWorkbook(): Buffer {
  const rows = [
    ["Income Date", "Excel Order Code", "Income Amount (THB)", "Expense Date", "Expense Amount (THB)"],
    ["2026-01-01", "55507012", 1540, "2026-01-01", 4320],
    ["2026-01-01", "55507401", 865, "2026-01-01", 3040],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "FinancialImport");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

export function buildFinancialExportWorkbook(filter: FinanceFilter = {}): Buffer {
  const summary = getFinancialSummary(filter);
  const records = listFinancialRecords(5000, filter).map((row) => ({
    "Excel Order Code": row.order_code,
    "Missing Real Code": Number(row.is_missing_order_code || 0) === 1 ? "yes" : "no",
    "Income Date": row.income_date || "",
    "Income Amount (THB)": Number(row.income_amount || 0),
    "Expense Date": row.expense_date || "",
    "Expense Amount (THB)": Number(row.expense_amount || 0),
    "Gross Profit (THB)": Number((Number(row.income_amount || 0) - Number(row.expense_amount || 0)).toFixed(2)),
    "Matched Order ID": row.matched_order_id || "",
    "Matched Order Code": row.matched_order_code || "",
    "Matched Order Status": row.matched_order_status || "",
  }));
  const orderSummary = listFinancialOrderSummaries(5000, filter).map((row) => ({
    "Excel Order Code": row.order_code,
    "Missing Real Code": Number(row.is_missing_order_code || 0) === 1 ? "yes" : "no",
    "First Date": row.first_date || "",
    "Last Date": row.last_date || "",
    "Total Income (THB)": Number(row.total_income || 0),
    "Total Expense (THB)": Number(row.total_expense || 0),
    "Gross Profit (THB)": Number(row.gross_profit || 0),
    "Matched Order ID": row.matched_order_id || "",
    "Matched Order Code": row.matched_order_code || "",
    "Matched Order Total (THB)": Number(row.matched_order_total_amount || 0),
    "Backend Margin (THB)": Number(row.backend_margin || 0),
    "Revenue Gap (THB)": Number(row.income_gap || 0),
  }));

  const overview = [
    { metric: "Total Rows", value: Number(summary.record_count || 0) },
    { metric: "Total Excel Order Codes", value: Number(summary.order_count || 0) },
    { metric: "Missing Order Code Rows", value: Number(summary.missing_code_rows || 0) },
    { metric: "Total Income (THB)", value: Number(summary.total_income || 0) },
    { metric: "Total Expense (THB)", value: Number(summary.total_expense || 0) },
    { metric: "Gross Profit (THB)", value: Number(summary.gross_profit || 0) },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overview), "Overview");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(orderSummary), "OrderSummary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(records), "RawRecords");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}
