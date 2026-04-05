export class ValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 422) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
  }
}

export function requireString(value: unknown, field: string, min = 1): string {
  const text = String(value ?? "").trim();
  if (text.length < min) {
    throw new ValidationError(`กรุณากรอก ${field}`);
  }
  return text;
}

export function optionalString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

export function requirePositiveInt(value: unknown, field: string): number {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new ValidationError(`${field} ต้องเป็นจำนวนเต็มบวก`);
  }
  return number;
}

export function requireEnum<T extends string>(value: unknown, field: string, allowed: T[]): T {
  const text = String(value ?? "").trim() as T;
  if (!allowed.includes(text)) {
    throw new ValidationError(`${field} ไม่ถูกต้อง`);
  }
  return text;
}
