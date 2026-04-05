import { NextFunction, Request, Response } from "express";
import { SessionUser } from "../types";

export function getUser(req: Request): SessionUser | null {
  return ((req.session as any).user as SessionUser) || null;
}

export function requireUser(req: Request, res: Response, next: NextFunction): void {
  if (!getUser(req)) {
    if (req.path.startsWith("/api/")) {
      res.status(401).json({ ok: false, message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" });
      return;
    }
    res.redirect("/user/login");
    return;
  }
  next();
}
