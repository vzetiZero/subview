import fs from "fs";
import path from "path";
import { importFinancialWorkbook } from "../services/financeExcelService";
import { syncImportedOrdersFromFinancialRecords } from "../services/financialOrderSyncService";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: npm run import:finance -- <xlsx-file-path>");
  process.exit(1);
}

const resolvedPath = path.resolve(inputPath);
const buffer = fs.readFileSync(resolvedPath);
const summary = importFinancialWorkbook(buffer, path.basename(resolvedPath), true);
const sync = syncImportedOrdersFromFinancialRecords();

console.log(JSON.stringify({ summary, sync }, null, 2));
