import { NextFunction, Request, Response } from "express";
import { SessionAdmin } from "../types";
import { renderPublicPage } from "../utils/html";

export function getAdmin(req: Request): SessionAdmin | null {
  return ((req.session as any).admin as SessionAdmin) || null;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!getAdmin(req)) {
    if (req.path.startsWith("/api/")) {
      res.status(401).json({ ok: false, message: "กรุณาเข้าสู่ระบบแอดมิน" });
      return;
    }
    res.redirect("/admin/login");
    return;
  }
  next();
}

export function requireAdminPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = getAdmin(req);
    if (!admin) {
      if (req.path.startsWith("/api/")) {
        res.status(401).json({ ok: false, message: "กรุณาเข้าสู่ระบบแอดมิน" });
        return;
      }
      res.redirect("/admin/login");
      return;
    }
    if (admin.permissions.includes("*") || admin.permissions.includes(permission)) {
      next();
      return;
    }
    if (req.path.startsWith("/api/")) {
      res.status(403).json({ ok: false, message: `ไม่มีสิทธิ์ที่ต้องการ: ${permission}` });
      return;
    }
    res.status(403).send(renderPublicPage("ปฏิเสธการเข้าถึง", `<div class="login-wrap"><div class="card"><h2>ปฏิเสธการเข้าถึง</h2><p>ไม่มีสิทธิ์ที่ต้องการ: ${permission}</p></div></div>`));
  };
}
