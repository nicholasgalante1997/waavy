export function asOptionalNumber(data?: string | number): number | undefined {
  if (typeof data === "number") return data;
  if (typeof data === "string") return parseInt(data, 10);
  return undefined;
}
