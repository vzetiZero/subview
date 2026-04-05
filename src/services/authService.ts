import { getAdminWithRoles, loadPermissions } from "../repositories/adminRepository";
import { getUserByUsername } from "../repositories/userRepository";
import { SessionAdmin, SessionUser } from "../types";
import { verifyPassword } from "../utils/security";

export function authenticateAdmin(username: string, password: string): SessionAdmin | null {
  const record = getAdminWithRoles(username);
  if (!record || record.status !== "active" || !verifyPassword(password, record.password_hash)) return null;
  return {
    id: record.id,
    username: record.username,
    fullName: record.full_name,
    roles: record.role_slugs ? String(record.role_slugs).split(",").filter(Boolean) : [],
    permissions: loadPermissions(record.permission_chunks ?? null),
  };
}

export function authenticateUser(username: string, password: string): SessionUser | null {
  const record = getUserByUsername(username);
  if (!record || record.status !== "active" || !verifyPassword(password, record.password_hash)) return null;
  return { id: record.id, username: record.username, fullName: record.full_name };
}
