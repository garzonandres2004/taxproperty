export function quantile(values: number[], q: number): number {
  if (!values.length) return NaN;
  const s = [...values].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const median = (v: number[]) => quantile(v, 0.5);

export function round(n: number, step = 1): number {
  return Math.round(n / step) * step;
}

export function money(n: number): string {
  if (!Number.isFinite(n)) return "n/a";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.round(Math.abs(n)).toLocaleString("en-US")}`;
}

export function pct(n: number): string {
  if (!Number.isFinite(n)) return "n/a";
  return `${Math.round(n * 100)}%`;
}
