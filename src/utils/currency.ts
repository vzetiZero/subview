import { env } from "./env";
import { getSettingValue } from "../repositories/settingsRepository";

export type SupportedCurrencyCode = "VND" | "THB";

function digitsForCurrency(code: SupportedCurrencyCode): number {
  return code === "THB" ? 2 : 0;
}

function symbolForCurrency(code: SupportedCurrencyCode): string {
  return code === "THB" ? "฿" : "₫";
}

function roundCurrency(value: number, code: SupportedCurrencyCode): number {
  const digits = digitsForCurrency(code);
  return Number(value.toFixed(digits));
}

function getEffectiveRate(): number {
  const stored = Number(getSettingValue("exchange_rate_vnd_thb") || "");
  return Number.isFinite(stored) && stored > 0 ? stored : env.vndToThbRate;
}

export function convertBaseToDisplay(amount: number): number {
  const rate = getEffectiveRate();
  if (env.baseCurrencyCode === env.displayCurrencyCode) {
    return roundCurrency(amount || 0, env.displayCurrencyCode);
  }

  if (env.baseCurrencyCode === "VND" && env.displayCurrencyCode === "THB") {
    return roundCurrency((amount || 0) * rate, "THB");
  }

  if (env.baseCurrencyCode === "THB" && env.displayCurrencyCode === "VND") {
    return roundCurrency((amount || 0) / rate, "VND");
  }

  return roundCurrency(amount || 0, env.displayCurrencyCode);
}

export function convertDisplayToBase(amount: number): number {
  const rate = getEffectiveRate();
  if (env.baseCurrencyCode === env.displayCurrencyCode) {
    return roundCurrency(amount || 0, env.baseCurrencyCode);
  }

  if (env.baseCurrencyCode === "VND" && env.displayCurrencyCode === "THB") {
    return Math.round((amount || 0) / rate);
  }

  if (env.baseCurrencyCode === "THB" && env.displayCurrencyCode === "VND") {
    return Math.round((amount || 0) * rate);
  }

  return roundCurrency(amount || 0, env.baseCurrencyCode);
}

export function parseDisplayCurrencyInput(raw: string | number): number {
  const normalized = String(raw ?? "0").replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? convertDisplayToBase(parsed) : 0;
}

export function formatMoneyFromBase(amount: number): string {
  const displayAmount = convertBaseToDisplay(amount || 0);
  return new Intl.NumberFormat(env.locale, {
    style: "currency",
    currency: env.displayCurrencyCode,
    minimumFractionDigits: digitsForCurrency(env.displayCurrencyCode),
    maximumFractionDigits: digitsForCurrency(env.displayCurrencyCode),
  }).format(displayAmount);
}

export function formatNumberFromBase(amount: number): string {
  const displayAmount = convertBaseToDisplay(amount || 0);
  return new Intl.NumberFormat(env.locale, {
    minimumFractionDigits: digitsForCurrency(env.displayCurrencyCode),
    maximumFractionDigits: digitsForCurrency(env.displayCurrencyCode),
  }).format(displayAmount);
}

export function formatDisplayNumber(amount: number): string {
  return new Intl.NumberFormat(env.locale, {
    minimumFractionDigits: digitsForCurrency(env.displayCurrencyCode),
    maximumFractionDigits: digitsForCurrency(env.displayCurrencyCode),
  }).format(amount || 0);
}

export function formatDisplayMoney(amount: number): string {
  return new Intl.NumberFormat(env.locale, {
    style: "currency",
    currency: env.displayCurrencyCode,
    minimumFractionDigits: digitsForCurrency(env.displayCurrencyCode),
    maximumFractionDigits: digitsForCurrency(env.displayCurrencyCode),
  }).format(amount || 0);
}

export function getCurrencyContext() {
  return {
    language: env.appLanguage,
    locale: env.locale,
    base_currency_code: env.baseCurrencyCode,
    currency_code: env.displayCurrencyCode,
    currency_symbol: symbolForCurrency(env.displayCurrencyCode),
    vnd_to_thb_rate: getEffectiveRate(),
  };
}

export function attachMoneyMeta<T extends Record<string, any>>(payload: T, fields: string[]): T {
  const clone: Record<string, any> = { ...payload };
  for (const field of fields) {
    const amount = Number(payload[field] || 0);
    clone[`${field}_base`] = amount;
    clone[`${field}_display`] = convertBaseToDisplay(amount);
    clone[`${field}_formatted`] = formatMoneyFromBase(amount);
  }
  return Object.assign(clone, getCurrencyContext()) as T;
}
