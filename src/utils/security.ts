import crypto from "crypto";

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, iterText, salt, hashHex] = stored.split("$");
  if (scheme !== "pbkdf2_sha256") return false;
  const iterations = Number(iterText);
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(hashHex, "hex"));
}

export function createPasswordHash(password: string): string {
  const salt = crypto.randomBytes(8).toString("hex");
  const iterations = 200000;
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256").toString("hex");
  return `pbkdf2_sha256$${iterations}$${salt}$${derived}`;
}
