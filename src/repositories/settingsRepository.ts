import { db } from "../db";
import { QueryRow } from "../types";

export function listSettings(): QueryRow[] {
  return db.prepare("SELECT * FROM settings ORDER BY setting_key").all() as QueryRow[];
}

export function getSettingValue(key: string): string | null {
  const row = db.prepare("SELECT setting_value FROM settings WHERE setting_key = ?").get(key) as QueryRow | undefined;
  return row ? String(row.setting_value ?? "") : null;
}

export function upsertSetting(key: string, value: string): void {
  const existing = db.prepare("SELECT id FROM settings WHERE setting_key = ?").get(key) as QueryRow | undefined;
  if (existing) {
    db.prepare("UPDATE settings SET setting_value = ?, updated_at = datetime('now') WHERE id = ?").run(value, existing.id);
    return;
  }

  db.prepare("INSERT INTO settings (setting_key, setting_value, created_at, updated_at) VALUES (?, ?, datetime('now'), datetime('now'))")
    .run(key, value);
}
