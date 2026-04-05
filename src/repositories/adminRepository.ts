import { db } from "../db";
import { QueryRow } from "../types";

export function getAdminWithRoles(username: string): QueryRow | undefined {
  return db.prepare(`SELECT a.*, GROUP_CONCAT(r.slug) AS role_slugs, GROUP_CONCAT(COALESCE(r.permissions_json, '[]')) AS permission_chunks FROM admins a LEFT JOIN admin_role_assignments ara ON ara.admin_id = a.id LEFT JOIN roles r ON r.id = ara.role_id WHERE a.username = ? GROUP BY a.id`).get(username) as QueryRow | undefined;
}

export function loadPermissions(permissionChunks: string | null): string[] {
  if (!permissionChunks) return [];
  const result = new Set<string>();
  for (const chunk of permissionChunks.split(",")) {
    try {
      const parsed = JSON.parse(chunk);
      if (Array.isArray(parsed)) parsed.forEach((item) => result.add(String(item)));
    } catch {}
  }
  return [...result];
}
