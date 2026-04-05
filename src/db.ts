import { DatabaseSync } from "node:sqlite";
import { env } from "./utils/env";

export const db = new DatabaseSync(env.dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA synchronous = NORMAL");
db.exec("PRAGMA busy_timeout = 5000");

function ensureSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS financial_import_batches (
      id INTEGER PRIMARY KEY,
      file_name TEXT NOT NULL,
      source_sheet TEXT,
      total_rows INTEGER NOT NULL DEFAULT 0,
      imported_rows INTEGER NOT NULL DEFAULT 0,
      skipped_rows INTEGER NOT NULL DEFAULT 0,
      currency_code TEXT NOT NULL DEFAULT 'THB',
      replace_existing INTEGER NOT NULL DEFAULT 0,
      created_at TEXT,
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS financial_records (
      id INTEGER PRIMARY KEY,
      import_batch_id INTEGER,
      order_code TEXT NOT NULL,
      income_date TEXT,
      income_amount REAL NOT NULL DEFAULT 0,
      expense_date TEXT,
      expense_amount REAL NOT NULL DEFAULT 0,
      currency_code TEXT NOT NULL DEFAULT 'THB',
      source_file_name TEXT,
      source_sheet TEXT,
      source_row_number INTEGER,
      note TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(import_batch_id) REFERENCES financial_import_batches(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS financial_order_mappings (
      id INTEGER PRIMARY KEY,
      excel_order_code TEXT NOT NULL UNIQUE,
      order_id INTEGER NOT NULL,
      note TEXT,
      created_at TEXT,
      updated_at TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_financial_records_order_code ON financial_records(order_code);
    CREATE INDEX IF NOT EXISTS idx_financial_records_income_date ON financial_records(income_date);
    CREATE INDEX IF NOT EXISTS idx_financial_records_expense_date ON financial_records(expense_date);
    CREATE INDEX IF NOT EXISTS idx_financial_records_import_batch_id ON financial_records(import_batch_id);
    CREATE INDEX IF NOT EXISTS idx_financial_order_mappings_order_id ON financial_order_mappings(order_id);
  `);

  const financialColumns = db.prepare("PRAGMA table_info(financial_records)").all() as Array<{ name: string }>;
  const financialColumnNames = new Set(financialColumns.map((column) => column.name));
  if (!financialColumnNames.has("is_missing_order_code")) {
    db.exec("ALTER TABLE financial_records ADD COLUMN is_missing_order_code INTEGER NOT NULL DEFAULT 0");
  }

  const orderColumns = db.prepare("PRAGMA table_info(orders)").all() as Array<{ name: string }>;
  const orderColumnNames = new Set(orderColumns.map((column) => column.name));
  if (!orderColumnNames.has("source_type")) {
    db.exec("ALTER TABLE orders ADD COLUMN source_type TEXT NOT NULL DEFAULT 'system'");
  }
}

ensureSchema();

export const databasePath = env.dbPath;
