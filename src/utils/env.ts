import "dotenv/config";
import path from "path";

type SameSiteMode = "lax" | "strict" | "none";
type CurrencyCode = "VND" | "THB";

function readBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function readInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function readFloat(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

function readSameSite(name: string, fallback: SameSiteMode): SameSiteMode {
  const raw = (process.env[name] || "").toLowerCase();
  if (raw === "lax" || raw === "strict" || raw === "none") return raw;
  return fallback;
}

function readCurrencyCode(name: string, fallback: CurrencyCode): CurrencyCode {
  const raw = (process.env[name] || "").toUpperCase();
  if (raw === "VND" || raw === "THB") return raw;
  return fallback;
}

const projectRoot = path.resolve(__dirname, "../..");

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: (process.env.NODE_ENV || "development") === "production",
  port: readInt("PORT", 3000),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  appLanguage: process.env.APP_LANGUAGE || "th",
  locale: process.env.APP_LOCALE || "th-TH",
  trustProxy: readBool("TRUST_PROXY", false),
  dbPath: process.env.DB_PATH || path.resolve(projectRoot, "data/mvp.sqlite"),
  frontendRoot: process.env.FRONTEND_ROOT || path.resolve(projectRoot, "frontend"),
  autoSyncFrontend: readBool("AUTO_SYNC_FRONTEND", true),
  baseCurrencyCode: readCurrencyCode("BASE_CURRENCY_CODE", "VND"),
  displayCurrencyCode: readCurrencyCode("DISPLAY_CURRENCY_CODE", "THB"),
  vndToThbRate: readFloat("VND_TO_THB_RATE", 0.0013),
  sessionSecret: process.env.SESSION_SECRET || "change-this-in-production",
  sessionName: process.env.SESSION_NAME || "node_admin_ts.sid",
  sessionMaxAgeMs: readInt("SESSION_MAX_AGE_MS", 1000 * 60 * 60 * 8),
  sessionSecure: readBool("SESSION_SECURE", false),
  sessionSameSite: readSameSite("SESSION_SAME_SITE", "lax"),
  sessionDomain: process.env.SESSION_DOMAIN || undefined,
};

export function requireProductionSecret(): void {
  if (env.isProduction && env.sessionSecret === "change-this-in-production") {
    throw new Error("SESSION_SECRET must be set in production");
  }
}
