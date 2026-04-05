import { Router } from "express";
import { getAdmin, requireAdmin, requireAdminPermission } from "../middleware/adminAuth";
import { getUser, requireUser } from "../middleware/userAuth";
import { getProductById, getProductBySlug, listActiveProducts } from "../repositories/catalogRepository";
import { listOrders, listUserOrders, updateOrderStatus, createOrderLog } from "../repositories/orderRepository";
import { createUser, getUserById, listUsers, listUserWalletTransactions, listWalletTransactions } from "../repositories/userRepository";
import { authenticateAdmin, authenticateUser } from "../services/authService";
import { getLastCatalogSyncSummary, syncFrontendCatalog } from "../services/frontendSyncService";
import { createUserOrder } from "../services/orderService";
import { servicePageMap } from "../utils/frontendMap";
import { optionalString, requirePositiveInt, requireString } from "../utils/validation";
import { createPasswordHash } from "../utils/security";
import { env } from "../utils/env";
import { attachMoneyMeta, getCurrencyContext } from "../utils/currency";

export const apiRouter = Router();

function normalizePageSlug(pageSlug: string): string[] {
  const variants = new Set<string>([pageSlug]);
  variants.add(pageSlug.replace(/-tik-tok/g, "-tiktok"));
  variants.add(pageSlug.replace(/^buff-/, "tang-"));
  variants.add(pageSlug.replace(/^auto-/, "tang-"));
  variants.add(pageSlug.replace(/^vip-/, "tang-"));
  variants.add(pageSlug.replace(/-mien-phi$/, ""));
  variants.add(pageSlug.replace(/^buff-/, "").replace(/^tang-/, "").replace(/^auto-/, ""));
  return [...variants];
}

function decorateProduct(product: Record<string, any>) {
  return attachMoneyMeta(product, ["price"]);
}

function decorateOrder(order: Record<string, any>) {
  return attachMoneyMeta(order, ["total_amount", "service_price_snapshot", "line_total"]);
}

function decorateTransaction(item: Record<string, any>) {
  return attachMoneyMeta(item, ["amount", "balance_before", "balance_after"]);
}

apiRouter.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "node-admin-ts-mvp", ...getCurrencyContext() });
});

apiRouter.get("/api/runtime/config", (_req, res) => {
  res.json({ ok: true, item: getCurrencyContext() });
});

apiRouter.post("/api/auth/admin/login", (req, res) => {
  const admin = authenticateAdmin(requireString(req.body.username, "username"), requireString(req.body.password, "password"));
  if (!admin) return res.status(401).json({ ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านแอดมินไม่ถูกต้อง" });
  (req.session as any).admin = admin;
  res.json({ ok: true, admin, ...getCurrencyContext() });
});

apiRouter.post("/api/auth/admin/logout", (req, res) => {
  delete (req.session as any).admin;
  res.json({ ok: true, message: "ออกจากระบบแอดมินแล้ว" });
});

apiRouter.get("/api/auth/admin/me", requireAdmin, (req, res) => {
  res.json({ ok: true, admin: getAdmin(req), ...getCurrencyContext() });
});

apiRouter.post("/api/auth/user/login", (req, res) => {
  const user = authenticateUser(requireString(req.body.username, "username"), requireString(req.body.password, "password"));
  if (!user) return res.status(401).json({ ok: false, message: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  (req.session as any).user = user;
  res.json({ ok: true, user, ...getCurrencyContext() });
});

apiRouter.post("/api/auth/user/register", (req, res) => {
  try {
    createUser({
      username: requireString(req.body.username ?? req.body.name, "username"),
      fullName: requireString(req.body.full_name ?? req.body.name, "full_name"),
      email: optionalString(req.body.email),
      phone: optionalString(req.body.phone),
      passwordHash: createPasswordHash(requireString(req.body.password, "password", 6)),
      status: "active",
    });
    res.status(201).json({ ok: true, message: "สมัครสมาชิกสำเร็จ", ...getCurrencyContext() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "สมัครสมาชิกไม่สำเร็จ";
    res.status(422).json({ ok: false, message });
  }
});

apiRouter.post("/api/auth/user/logout", (req, res) => {
  delete (req.session as any).user;
  res.json({ ok: true, message: "ออกจากระบบแล้ว" });
});

apiRouter.get("/api/auth/user/me", (req, res) => {
  const user = getUser(req);
  const profile = user ? getUserById(user.id) : null;
  res.json({ ok: true, authenticated: Boolean(user), user, profile: profile ? attachMoneyMeta(profile, ["balance"]) : null, ...getCurrencyContext() });
});

apiRouter.get("/api/services", (_req, res) => {
  res.json({ ok: true, items: listActiveProducts().map((item) => decorateProduct(item)), ...getCurrencyContext() });
});

apiRouter.get("/api/services/:id", (req, res) => {
  const product = getProductById(Number(req.params.id));
  if (!product) return res.status(404).json({ ok: false, message: "ไม่พบบริการ" });
  res.json({ ok: true, item: decorateProduct(product), ...getCurrencyContext() });
});

apiRouter.get("/api/services/slug/:slug", (req, res) => {
  const product = getProductBySlug(req.params.slug);
  if (!product) return res.status(404).json({ ok: false, message: "ไม่พบบริการ" });
  res.json({ ok: true, item: decorateProduct(product), ...getCurrencyContext() });
});

apiRouter.get("/api/frontend/page-map/:pageSlug", (req, res) => {
  const pageSlug = req.params.pageSlug;
  const directCandidates = normalizePageSlug(pageSlug);
  const mappedCandidates = [
    ...directCandidates,
    servicePageMap[pageSlug],
    ...directCandidates.map((variant) => servicePageMap[variant]),
  ].filter(Boolean) as string[];
  const uniqueCandidates = [...new Set(mappedCandidates)];

  for (const candidate of uniqueCandidates) {
    const product = getProductBySlug(candidate);
    if (product) {
      res.json({ ok: true, pageSlug, matchedSlug: candidate, product: decorateProduct(product), ...getCurrencyContext() });
      return;
    }
  }

  res.status(404).json({ ok: false, message: "ยังไม่ได้แมปหน้านี้เข้ากับบริการในระบบ", pageSlug, ...getCurrencyContext() });
});

apiRouter.get("/api/wallet/me", requireUser, (req, res) => {
  const user = getUser(req)!;
  const profile = getUserById(user.id);
  res.json({ ok: true, user: profile ? attachMoneyMeta(profile, ["balance"]) : null, transactions: listUserWalletTransactions(user.id, 100).map((item) => decorateTransaction(item)), ...getCurrencyContext() });
});

apiRouter.get("/api/orders/me", requireUser, (req, res) => {
  const user = getUser(req)!;
  res.json({ ok: true, items: listUserOrders(user.id).map((item) => decorateOrder(item)), ...getCurrencyContext() });
});

apiRouter.post("/api/orders", requireUser, (req, res) => {
  try {
    const user = getUser(req)!;
    const result = createUserOrder({
      userId: user.id,
      productId: requirePositiveInt(req.body.product_id, "product_id"),
      quantity: requirePositiveInt(req.body.quantity, "quantity"),
      targetLink: requireString(req.body.target_link, "target_link"),
      note: optionalString(req.body.note),
    });
    res.status(201).json({ ok: true, message: "สร้างคำสั่งซื้อสำเร็จ", ...result, ...getCurrencyContext() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "สร้างคำสั่งซื้อไม่สำเร็จ";
    res.status(422).json({ ok: false, message, ...getCurrencyContext() });
  }
});

apiRouter.get("/api/admin/dashboard", requireAdmin, requireAdminPermission("dashboard.read"), (_req, res) => {
  res.json({
    ok: true,
    users: listUsers().length,
    services: listActiveProducts().length,
    orders: listOrders().length,
    transactions: listWalletTransactions(100).length,
    catalogSync: getLastCatalogSyncSummary(),
    ...getCurrencyContext(),
  });
});

apiRouter.get("/api/admin/catalog/sync-status", requireAdmin, requireAdminPermission("dashboard.read"), (_req, res) => {
  res.json({ ok: true, item: getLastCatalogSyncSummary(), ...getCurrencyContext() });
});

apiRouter.post("/api/admin/catalog/sync", requireAdmin, requireAdminPermission("dashboard.read"), (_req, res) => {
  const summary = syncFrontendCatalog(env.frontendRoot);
  res.json({ ok: true, message: "ซิงก์แคตตาล็อกสำเร็จ", item: summary, ...getCurrencyContext() });
});

apiRouter.get("/api/admin/users", requireAdmin, requireAdminPermission("users.read"), (_req, res) => {
  res.json({ ok: true, items: listUsers().map((item) => attachMoneyMeta(item, ["balance"])), ...getCurrencyContext() });
});

apiRouter.get("/api/admin/orders", requireAdmin, requireAdminPermission("orders.read"), (_req, res) => {
  res.json({ ok: true, items: listOrders().map((item) => decorateOrder(item)), ...getCurrencyContext() });
});

apiRouter.patch("/api/admin/orders/:id/status", requireAdmin, requireAdminPermission("orders.update"), (req, res) => {
  const newStatus = requireString(req.body.order_status, "order_status");
  const oldStatus = updateOrderStatus(Number(req.params.id), newStatus);
  createOrderLog({
    orderId: Number(req.params.id),
    oldStatus,
    newStatus,
    changedByType: "admin",
    changedById: getAdmin(req)!.id,
    note: "อัปเดตสถานะจากแอดมิน API",
  });
  res.json({ ok: true, message: "อัปเดตสถานะคำสั่งซื้อแล้ว", ...getCurrencyContext() });
});
