import { db } from "../db";
import { QueryRow } from "../types";

export function listCategories(): QueryRow[] {
  return db.prepare("SELECT * FROM categories ORDER BY sort_order, id").all() as QueryRow[];
}

export function createCategory(input: { name: string; slug: string; description?: string | null; sortOrder: number; status: string }): void {
  db.prepare("INSERT INTO categories (name, slug, description, sort_order, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))").run(input.name, input.slug, input.description ?? null, input.sortOrder, input.status);
}

export function updateCategory(id: number, input: { name: string; slug: string; status: string }): void {
  db.prepare("UPDATE categories SET name = ?, slug = ?, status = ?, updated_at = datetime('now') WHERE id = ?").run(input.name, input.slug, input.status, id);
}

export function listProducts(): QueryRow[] {
  return db.prepare("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.id DESC").all() as QueryRow[];
}

export function listActiveProducts(): QueryRow[] {
  return db.prepare("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.status = 'active' ORDER BY p.id DESC").all() as QueryRow[];
}

export function getProductById(id: number): QueryRow | undefined {
  return db.prepare("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.id = ?").get(id) as QueryRow | undefined;
}

export function getProductBySlug(slug: string): QueryRow | undefined {
  return db.prepare("SELECT p.*, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id WHERE p.slug = ?").get(slug) as QueryRow | undefined;
}

export function createProduct(input: { categoryId: number; name: string; slug: string; description?: string | null; unitName: string; price: number; minQuantity: number; maxQuantity: number; status: string }): void {
  const count = (db.prepare("SELECT COUNT(*) AS count FROM products").get() as QueryRow).count + 1;
  db.prepare("INSERT INTO products (category_id, name, slug, service_code, description, unit_name, price, min_quantity, max_quantity, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))").run(input.categoryId, input.name, input.slug, `SVC${String(count).padStart(4, "0")}`, input.description ?? null, input.unitName, input.price, input.minQuantity, input.maxQuantity, input.status);
}

export function updateProduct(id: number, input: { name: string; slug: string; price: number; status: string }): void {
  db.prepare("UPDATE products SET name = ?, slug = ?, price = ?, status = ?, updated_at = datetime('now') WHERE id = ?").run(input.name, input.slug, input.price, input.status, id);
}
