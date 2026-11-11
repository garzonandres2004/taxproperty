import { loadAssumptions } from "../src/core/assumptions.ts";
import { validateSettings } from "../src/core/settings.ts";
import type { Settings } from "../src/core/types.ts";

export const a = loadAssumptions();

export function settings(over: Partial<Settings> = {}): Settings {
  return { ...validateSettings({ totalCapital: 20000, maxPerDeal: 8000 }), ...over };
}
