import { Router } from "express";
import { requireUser, getUser } from "../middleware/userAuth";
import { listActiveProducts, getProductById } from "../repositories/catalogRepository";
import { listUserOrders, listUserOrdersPage } from "../repositories/orderRepository";
import { getUserById, listUserWalletTransactions } from "../repositories/userRepository";
import { createUserOrder } from "../services/orderService";
import { esc, money, renderUserPage, tag } from "../utils/html";
import { getCurrencyContext } from "../utils/currency";

export const userRouter = Router();

function buildPaginationLinks(basePath: string, currentPage: number, totalPages: number, extraParams?: Record<string, string | number | null | undefined>): string {
  return Array.from({ length: totalPages }, (_, index) => index + 1)
    .slice(Math.max(0, currentPage - 4), Math.min(totalPages, currentPage + 3))
    .map((pageNumber) => {
      const params = new URLSearchParams();
      Object.entries(extraParams || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined && String(value).trim() !== "") {
          params.set(key, String(value));
        }
      });
      if (pageNumber > 1) params.set("page", String(pageNumber));
      const query = params.toString();
      return `<a class="btn ${pageNumber === currentPage ? "" : "secondary"}" href="${basePath}${query ? `?${query}` : ""}">${pageNumber}</a>`;
    })
    .join("");
}

userRouter.get("/user/dashboard", requireUser, (req, res) => {
  const user = getUser(req)!;
  const profile = getUserById(user.id)!;
  const orders = listUserOrders(user.id);
  const transactions = listUserWalletTransactions(user.id, 20);
  const currency = getCurrencyContext();
  res.send(renderUserPage("??????????????", user, `<div class="cards"><div class="card"><div class="muted">?????????? (${currency.currency_code})</div><div class="metric">${money(profile.balance)}</div></div><div class="card"><div class="muted">???????????????</div><div class="metric">${orders.length}</div></div><div class="card"><div class="muted">?????????????</div><div class="metric">${transactions.length}</div></div></div><div class="hero"><div class="card"><h2 class="section-title">??????????</h2><p><a class="btn" href="/services">??????????????</a></p></div><div class="card"><h2 class="section-title">????????????????</h2><table><thead><tr><th>????</th><th>??????</th><th>?????</th></tr></thead><tbody>${orders.slice(0, 6).map((r) => `<tr><td>${esc(r.order_code)}</td><td>${esc(r.service_name_snapshot || "")}</td><td>${tag(r.order_status)}</td></tr>`).join("")}</tbody></table></div></div>`));
});

userRouter.get("/services", requireUser, (req, res) => {
  const user = getUser(req)!;
  const products = listActiveProducts();
  const currency = getCurrencyContext();
  res.send(renderUserPage("??????", user, `<div class="list-grid">${products.map((p) => `<div class="card"><div class="muted">${esc(p.category_name)}</div><h2 class="section-title">${esc(p.name)}</h2><p>${esc(p.description || "")}</p><p><strong>????:</strong> ${money(p.price)}</p><p><strong>?????????:</strong> ${p.min_quantity} - ${p.max_quantity}</p><p><strong>????????:</strong> ${currency.currency_code}</p><a class="btn" href="/services/${p.id}">????????</a></div>`).join("")}</div>`));
});

userRouter.get("/services/:id", requireUser, (req, res) => {
  const user = getUser(req)!;
  const product = getProductById(Number(req.params.id));
  if (!product) return res.status(404).send(renderUserPage("???????????", user, `<div class="card"><h2>?????????????????????</h2></div>`));
  const unitName = esc(product.unit_name || "?????");
  res.send(renderUserPage(product.name, user, `<div class="hero"><div class="card"><div class="muted">${esc(product.category_name)}</div><h2 class="section-title">${esc(product.name)}</h2><p>${esc(product.description || "")}</p><p><strong>????:</strong> ${money(product.price)} / ${unitName}</p><p><strong>?????????:</strong> ${product.min_quantity} - ${product.max_quantity}</p></div><div class="card"><h2 class="section-title">???????????????</h2><form method="post" action="/services/${product.id}/order" class="grid"><div><label>?????????????</label><input name="target_link" required></div><div><label>?????</label><input name="quantity" type="number" min="${product.min_quantity}" max="${product.max_quantity}" value="${product.min_quantity}" required></div><div><label>????????</label><textarea name="note"></textarea></div><button class="btn" type="submit">??????????????</button></form></div></div>`));
});

userRouter.post("/services/:id/order", requireUser, (req, res) => {
  const user = getUser(req)!;
  try {
    const result = createUserOrder({ userId: user.id, productId: Number(req.params.id), quantity: Number(req.body.quantity || 0), targetLink: String(req.body.target_link || "").trim(), note: String(req.body.note || "").trim() || null });
    res.redirect(`/user/orders?created=${result.orderCode}`);
  } catch (error) {
    res.status(422).send(renderUserPage("????????????????????????", user, `<div class="card"><h2>????????????????????????</h2><p>${esc((error as Error).message)}</p><p><a class="btn secondary" href="/services/${req.params.id}">????????</a></p></div>`));
  }
});

userRouter.get("/user/orders", requireUser, (req, res) => {
  const user = getUser(req)!;
  const page = Math.max(1, Number(req.query.page || 1));
  const orderPage = listUserOrdersPage(user.id, page, 100);
  const totalPages = Math.max(1, Math.ceil(orderPage.total / orderPage.pageSize));
  const pageLinks = buildPaginationLinks("/user/orders", orderPage.page, totalPages, req.query.created ? { created: String(req.query.created) } : undefined);
  const created = req.query.created ? `<div class="alert">?????????????????????: ${esc(req.query.created)}</div>` : "";
  res.send(renderUserPage("????????????????", user, `${created}<div class="card"><table><thead><tr><th>????</th><th>??????</th><th>?????</th><th>???????</th><th>?????</th><th>?????</th></tr></thead><tbody>${orderPage.items.map((r) => `<tr><td>${esc(r.order_code)}</td><td>${esc(r.service_name_snapshot || "")}</td><td>${esc(r.quantity || "")}</td><td>${money(r.total_amount)}</td><td>${tag(r.order_status)}</td><td>${esc(r.target_link || "")}</td></tr>`).join("")}</tbody></table><div class="auth-box" style="justify-content:space-between;margin-top:16px"><div class="muted">???? ${orderPage.page} / ${totalPages} , ??????? ${orderPage.total} ??????, ??????????? ${orderPage.pageSize}</div><div class="auth-box">${pageLinks}</div></div></div>`));
});

userRouter.get("/user/wallet", requireUser, (req, res) => {
  const user = getUser(req)!;
  const profile = getUserById(user.id)!;
  const transactions = listUserWalletTransactions(user.id, 100);
  res.send(renderUserPage("?????????????????", user, `<div class="cards"><div class="card"><div class="muted">??????????????????</div><div class="metric">${money(profile.balance)}</div></div></div><div class="card"><h2 class="section-title">??????????????????</h2><table><thead><tr><th>????</th><th>??????</th><th>??????</th><th>?????????</th><th>????????????</th><th>????????????</th><th>??????</th></tr></thead><tbody>${transactions.map((r) => `<tr><td>${esc(r.transaction_code || "")}</td><td>${esc(r.transaction_type)}</td><td>${tag(r.direction)}</td><td>${money(r.amount)}</td><td>${money(r.balance_before)}</td><td>${money(r.balance_after)}</td><td>${esc(r.transaction_date || "")}</td></tr>`).join("")}</tbody></table></div>`));
});
