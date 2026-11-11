// User settings. Budget numbers are required and never defaulted: the tool
// refuses to run until the user says how much money they have.

import { readFileSync } from "node:fs";
import type { Settings, StrategyName } from "./types.ts";

export const ALL_STRATEGIES: StrategyName[] = ["sell_to_neighbor", "quiet_title_and_list", "wholesale", "flip", "rent"];

export class SettingsError extends Error {}

function positive(v: unknown, name: string): number {
  const n = typeof v === "string" ? Number(v.replace(/[$,]/g, "")) : Number(v);
  if (v === undefined || v === null || v === "" || !Number.isFinite(n) || n <= 0) {
    throw new SettingsError(`Settings: "${name}" is required and must be a positive number. Put your own number in your settings file.`);
  }
  return n;
}

function optNum(v: unknown, fallback: number, name: string, min = 0, max = Infinity): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new SettingsError(`Settings: "${name}" must be a number between ${min} and ${max}.`);
  return n;
}

/** Validate a raw settings object. Only preference fields get defaults; money limits never do. */
export function validateSettings(raw: Record<string, unknown>): Settings {
  const totalCapital = positive(raw.totalCapital, "totalCapital");
  const maxPerDeal = positive(raw.maxPerDeal, "maxPerDeal");
  if (maxPerDeal > totalCapital) throw new SettingsError(`Settings: "maxPerDeal" cannot be more than "totalCapital".`);
  let strategies = ALL_STRATEGIES;
  if (Array.isArray(raw.strategies) && raw.strategies.length) {
    const bad = raw.strategies.filter((s) => !ALL_STRATEGIES.includes(s as StrategyName));
    if (bad.length) throw new SettingsError(`Settings: unknown strategies ${bad.join(", ")}. Use: ${ALL_STRATEGIES.join(", ")}.`);
    strategies = raw.strategies as StrategyName[];
  }
  return {
    totalCapital,
    maxPerDeal,
    reservePct: optNum(raw.reservePct, 0.2, "reservePct", 0, 0.9),
    minProfit: optNum(raw.minProfit, 1000, "minProfit"),
    minReturnPct: optNum(raw.minReturnPct, 0.3, "minReturnPct", 0, 10),
    strategies,
    counties: Array.isArray(raw.counties) ? raw.counties.map(String) : [],
    showAvoid: raw.showAvoid !== false, // shown by default: knowing why a parcel was knocked out is useful
  };
}

/**
 * Public mode (reports posted on GitHub): no budget at all. Limits are Infinity,
 * which every comparison treats as "no cap", so no stand in number can ever be printed.
 * Preference fields (targets, strategies, counties) still come from the file if given.
 */
export function publicSettings(path: string): Settings {
  const raw: Record<string, unknown> = path ? JSON.parse(readFileSync(path, "utf8")) : {};
  const base = validateSettings({ ...raw, totalCapital: 1, maxPerDeal: 1 });
  return { ...base, totalCapital: Infinity, maxPerDeal: Infinity };
}

export function loadSettings(path: string, overrides: Record<string, unknown> = {}): Settings {
  let raw: Record<string, unknown> = {};
  if (path) raw = JSON.parse(readFileSync(path, "utf8"));
  return validateSettings({ ...raw, ...Object.fromEntries(Object.entries(overrides).filter(([, v]) => v !== undefined)) });
}
