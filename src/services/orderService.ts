import { db } from "../db";
import { getProductById } from "../repositories/catalogRepository";
import { createOrderLog } from "../repositories/orderRepository";
import { createWalletTransaction, getUserById, updateUserBalance } from "../repositories/userRepository";
import { QueryRow } from "../types";

export function createUserOrder(input: { userId: number; productId: number; quantity: number; targetLink: string; note?: string | null }): { orderCode: string } {
  db.exec("BEGIN");
  try {
    const user = getUserById(input.userId);
    const product = getProductById(input.productId);
    if (!user) throw new Error("ไม่พบผู้ใช้");
    if (!product) throw new Error("ไม่พบบริการ");
    if (product.status !== "active") throw new Error("บริการนี้ยังไม่พร้อมใช้งาน");
    if (input.quantity < product.min_quantity || input.quantity > product.max_quantity) throw new Error("จำนวนอยู่นอกช่วงที่ระบบกำหนด");
    const total = Number(product.price) * input.quantity;
    const before = Number(user.balance);
    if (before < total) throw new Error("ยอดเงินคงเหลือไม่เพียงพอ");
    const after = before - total;
    const nextOrderId = ((db.prepare("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM orders").get() as QueryRow).id as number);
    const orderCode = `ORD${String(nextOrderId).padStart(6, "0")}`;
    updateUserBalance(user.id, after);
    db.prepare("INSERT INTO orders (id, order_code, user_id, total_amount, payment_status, order_status, ordered_at, note, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, 'paid', 'pending', datetime('now'), ?, 'web', datetime('now'), datetime('now'))").run(nextOrderId, orderCode, user.id, total, input.note ?? null);
    db.prepare("INSERT INTO order_details (order_id, product_id, service_name_snapshot, service_price_snapshot, target_link, quantity, line_total, start_count, current_count, success_count, remain_count, detail_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, ?, 'pending', datetime('now'), datetime('now'))").run(nextOrderId, product.id, product.name, product.price, input.targetLink, input.quantity, total, input.quantity);
    createWalletTransaction({ userId: user.id, transactionCode: `PAY-${orderCode}`, transactionType: "order_payment", direction: "out", amount: total, balanceBefore: before, balanceAfter: after, note: `Payment for order ${orderCode}`, source: "user_panel" });
    createOrderLog({ orderId: nextOrderId, oldStatus: null, newStatus: "pending", changedByType: "user", changedById: user.id, note: "Order created from user panel" });
    db.exec("COMMIT");
    return { orderCode };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
