import { Router } from "express";
import { authenticateAdmin, authenticateUser } from "../services/authService";
import { createUser } from "../repositories/userRepository";
import { renderPublicPage } from "../utils/html";
import { createPasswordHash } from "../utils/security";

export const authRouter = Router();

authRouter.get("/admin/login", (req, res) => {
  if ((req.session as any).admin) return res.redirect("/admin");
  const error = req.query.error ? `<div class="alert">${req.query.error}</div>` : "";
  res.send(renderPublicPage("เข้าสู่ระบบแอดมิน", `<div class="login-wrap"><div class="card"><div class="login-brand">เข้าสู่ระบบแอดมิน</div>${error}<form method="post" action="/admin/login" class="grid"><div><label>ชื่อผู้ใช้</label><input name="username" required></div><div><label>รหัสผ่าน</label><input name="password" type="password" required></div><button class="btn" type="submit">เข้าสู่ระบบ</button></form></div></div>`));
});

authRouter.post("/admin/login", (req, res) => {
  const admin = authenticateAdmin(String(req.body.username || "").trim(), String(req.body.password || ""));
  if (!admin) return res.redirect("/admin/login?error=ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  (req.session as any).admin = admin;
  res.redirect("/admin");
});

authRouter.post("/admin/logout", (req, res) => req.session.destroy(() => res.redirect("/admin/login")));

authRouter.get("/user/login", (req, res) => {
  if ((req.session as any).user) return res.redirect("/user/dashboard");
  const error = req.query.error ? `<div class="alert">${req.query.error}</div>` : "";
  res.send(renderPublicPage("เข้าสู่ระบบ", `<div class="login-wrap"><div class="card"><div class="login-brand">เข้าสู่ระบบผู้ใช้</div>${error}<form method="post" action="/user/login" class="grid"><div><label>ชื่อผู้ใช้</label><input name="username" required></div><div><label>รหัสผ่าน</label><input name="password" type="password" required></div><button class="btn" type="submit">เข้าสู่ระบบ</button></form><p><a class="btn secondary" href="/user/register">สมัครสมาชิกใหม่</a></p></div></div>`));
});

authRouter.post("/user/login", (req, res) => {
  const user = authenticateUser(String(req.body.username || "").trim(), String(req.body.password || ""));
  if (!user) return res.redirect("/user/login?error=ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
  (req.session as any).user = user;
  res.redirect("/user/dashboard");
});

authRouter.get("/user/register", (_req, res) => {
  res.send(renderPublicPage("สมัครสมาชิก", `<div class="login-wrap"><div class="card"><div class="login-brand">สร้างบัญชีผู้ใช้</div><form method="post" action="/user/register" class="grid"><div><label>ชื่อผู้ใช้</label><input name="username" required></div><div><label>ชื่อเต็ม</label><input name="full_name" required></div><div><label>อีเมล</label><input name="email"></div><div><label>เบอร์โทร</label><input name="phone"></div><div><label>รหัสผ่าน</label><input name="password" type="password" required></div><button class="btn" type="submit">สมัครสมาชิก</button></form></div></div>`));
});

authRouter.get("/forgot-password.html", (_req, res) => {
  res.send(
    renderPublicPage(
      "ลืมรหัสผ่าน",
      `<div class="login-wrap"><div class="card"><div class="login-brand">ลืมรหัสผ่าน</div><p>หน้านี้ยังเป็นเวอร์ชันพื้นฐานสำหรับเว็บที่นำขึ้นใช้งานชั่วคราว</p><p>หากต้องการรีเซ็ตรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบหรือเพิ่ม flow reset password ใน backend ภายหลัง</p><div class="auth-box"><a class="btn" href="/login.html">กลับไปหน้าเข้าสู่ระบบ</a><a class="btn secondary" href="/register.html">สมัครสมาชิก</a></div></div></div>`
    )
  );
});

authRouter.post("/user/register", (req, res) => {
  createUser({ username: String(req.body.username || "").trim(), fullName: String(req.body.full_name || "").trim(), email: String(req.body.email || "").trim() || null, phone: String(req.body.phone || "").trim() || null, passwordHash: createPasswordHash(String(req.body.password || "")), status: "active" });
  res.redirect("/user/login");
});

authRouter.post("/user/logout", (req, res) => req.session.destroy(() => res.redirect("/user/login")));
