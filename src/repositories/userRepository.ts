import { db } from "../db";
import { QueryRow } from "../types";

export function listUsers(): QueryRow[] {
  return db.prepare("SELECT * FROM users ORDER BY id DESC").all() as QueryRow[];
}

export function getUserById(id: number): QueryRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as QueryRow | undefined;
}

export function getUserByUsername(username: string): QueryRow | undefined {
  return db.prepare("SELECT * FROM users WHERE username = ?").get(username) as QueryRow | undefined;
}

export function createUser(input: { username: string; fullName: string; email?: string | null; phone?: string | null; passwordHash: string; status: string }): void {
  db.prepare("INSERT INTO users (username, full_name, email, phone, password_hash, balance, status, register_ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, '127.0.0.1', datetime('now'), datetime('now'))").run(input.username, input.fullName, input.email ?? null, input.phone ?? null, input.passwordHash, input.status);
}

export function updateUserStatus(id: number, status: string): void {
  db.prepare("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
}

export function updateUserBalance(id: number, nextBalance: number): void {
  db.prepare("UPDATE users SET balance = ?, updated_at = datetime('now') WHERE id = ?").run(nextBalance, id);
}

export function listWalletTransactions(limit = 300): QueryRow[] {
  return db.prepare(`SELECT wt.*, u.username FROM wallet_transactions wt LEFT JOIN users u ON u.id = wt.user_id ORDER BY wt.id DESC LIMIT ${limit}`).all() as QueryRow[];
}

export function listUserWalletTransactions(userId: number, limit = 100): QueryRow[] {
  return db.prepare(`SELECT * FROM wallet_transactions WHERE user_id = ? ORDER BY id DESC LIMIT ${limit}`).all(userId) as QueryRow[];
}

export function createWalletTransaction(input: { userId: number; transactionCode: string; transactionType: string; direction: string; amount: number; balanceBefore: number; balanceAfter: number; note?: string | null; source: string }): void {
  db.prepare("INSERT INTO wallet_transactions (user_id, transaction_code, transaction_type, direction, amount, balance_before, balance_after, transaction_date, note, source, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, 'completed', datetime('now'), datetime('now'))").run(input.userId, input.transactionCode, input.transactionType, input.direction, input.amount, input.balanceBefore, input.balanceAfter, input.note ?? null, input.source);
}
