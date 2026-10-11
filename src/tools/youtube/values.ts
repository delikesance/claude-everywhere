export type JsonRecord = Record<string, unknown>;

export const asRecord = (value: unknown): JsonRecord => (value && typeof value === "object" ? (value as JsonRecord) : {});

export const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const asText = (value: unknown): string => (typeof value === "string" ? value : "");

export function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function dig(value: unknown, ...keys: string[]): unknown {
  return keys.reduce<unknown>((node, key) => asRecord(node)[key], value);
}
