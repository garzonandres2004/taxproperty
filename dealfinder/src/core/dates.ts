// Calendar date helpers. Dates from county lists are plain calendar days, compared at UTC midnight.

/** Plain calendar date at UTC midnight, or null. */
export function utcDate(isoDate: string): Date | null {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function utcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Same calendar day N years later. Feb 29 maps to Feb 28 (the earlier day, so the escheat warning is never late). */
export function addYears(d: Date, years: number): Date {
  const y = d.getUTCFullYear() + years;
  const m = d.getUTCMonth();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay)));
}

export function addMonths(d: Date, months: number): Date {
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + months;
  const y = Math.floor(total / 12);
  const m = total % 12;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), lastDay)));
}

export const iso = (d: Date) => d.toISOString().slice(0, 10);
