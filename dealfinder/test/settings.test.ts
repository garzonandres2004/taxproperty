import { test } from "node:test";
import assert from "node:assert/strict";
import { validateSettings, SettingsError } from "../src/core/settings.ts";

test("budget is required: no default capital or per deal limit", () => {
  assert.throws(() => validateSettings({}), SettingsError);
  assert.throws(() => validateSettings({ totalCapital: 10000 }), /maxPerDeal/);
  assert.throws(() => validateSettings({ totalCapital: null, maxPerDeal: 5000 }), /totalCapital/);
  assert.throws(() => validateSettings({ totalCapital: 0, maxPerDeal: 0 }), SettingsError);
});

test("max per deal cannot exceed capital", () => {
  assert.throws(() => validateSettings({ totalCapital: 5000, maxPerDeal: 6000 }), /cannot be more/);
});

test("accepts strings with $ and commas, fills only preference defaults", () => {
  const s = validateSettings({ totalCapital: "$12,500", maxPerDeal: "5,000" });
  assert.equal(s.totalCapital, 12500);
  assert.equal(s.maxPerDeal, 5000);
  assert.equal(s.reservePct, 0.2);
  assert.ok(s.strategies.length === 5);
});

test("rejects unknown strategies", () => {
  assert.throws(() => validateSettings({ totalCapital: 1, maxPerDeal: 1, strategies: ["lottery"] }), /unknown strategies/);
});
