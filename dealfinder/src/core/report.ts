// Reports: Markdown for reading anywhere, HTML (light theme) for the browser,
// JSON for other tools. Every report prints the settings and assumptions used.

import type { Analysis, Settings } from "./types.ts";
import type { Assumptions } from "./assumptions.ts";
import type { RawListing } from "./listings.ts";

type UnmatchedLine = RawListing & { reason?: string };
import { money, pct } from "./stats.ts";

export const VERDICT_LABEL: Record<Analysis["verdict"], string> = {
  buy_candidate: "Buy candidate",
  needs_quote: "Get a quote",
  watch: "Watch",
  pass: "Pass",
  avoid: "Avoid",
};

function verdictLabel(a: Analysis): string {
  if (a.verdict === "buy_candidate" && a.listing.channel === "auction") return "Bid candidate";
  return VERDICT_LABEL[a.verdict];
}

export interface ReportMeta {
  title: string;
  generatedAt: Date;
  nalFiles: string[];
  listFiles: string[];
  parcelsScanned: number;
  compsFound: number;
  referenceYear: number;
  unmatched: UnmatchedLine[];
  publicMode?: boolean;
}

function settingsLine(settings: Settings, meta: ReportMeta): string {
  const prefs = `minimum profit ${money(settings.minProfit)} and ${pct(settings.minReturnPct)} return`;
  if (meta.publicMode) return `Public report: no budget applied, so verdicts reflect the deal only (${prefs}). Run it privately with your settings file to apply your budget.`;
  return `Your settings: capital ${money(settings.totalCapital)}, max per deal ${money(settings.maxPerDeal)} all in, reserve ${pct(settings.reservePct)}, ${prefs}.`;
}

function profitText(a: Analysis): string {
  const b = a.best;
  if (!b) return "n/a";
  if (Number.isFinite(b.profit)) return `${money(b.profit)} (${pct(b.returnPct)})`;
  return `if all in ≤ ${money(b.maxAllIn)}`;
}

function maxToPay(a: Analysis): string {
  if (a.verdict === "pass" || a.verdict === "avoid" || a.offer.walkAway <= 0) return "do not buy";
  return money(a.offer.walkAway);
}

function addr(a: Analysis): string {
  const p = a.parcel;
  return [p.situsAddress, p.situsCity].filter(Boolean).join(", ") || "No street address";
}

function visible(analyses: Analysis[], settings: Settings): { main: Analysis[]; avoided: Analysis[] } {
  return {
    main: analyses.filter((a) => a.verdict !== "avoid"),
    avoided: settings.showAvoid ? analyses.filter((a) => a.verdict === "avoid") : [],
  };
}

export function renderMarkdown(analyses: Analysis[], settings: Settings, a: Assumptions, meta: ReportMeta): string {
  const { main, avoided } = visible(analyses, settings);
  const counts = countVerdicts(analyses);
  const L: string[] = [];
  L.push(`# ${meta.title}`, "");
  L.push(`Generated ${meta.generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC. Tax roll year ${meta.referenceYear}. ${meta.parcelsScanned.toLocaleString()} parcels scanned, ${meta.compsFound.toLocaleString()} usable sales found.`, "");
  L.push(settingsLine(settings, meta), "");
  L.push(`Results: ${counts}.`, "");
  if (meta.unmatched.length) L.push(`${meta.unmatched.length} list line(s) could not be matched to exactly one parcel. They are listed at the end with the reason.`, "");

  L.push("## Ranked list", "");
  L.push("| # | Verdict | Score | Parcel | County | Type | Address | Value | Price all in | Best plan | Profit | Max to pay |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|---|");
  main.forEach((x, i) => {
    L.push(
      `| ${i + 1} | ${verdictLabel(x)} | ${x.score} | ${x.parcel.parcelId} | ${x.parcel.countyName} | ${x.parcel.useDescription} | ${addr(x)} | ${money(x.value.market)} | ${x.costs ? money(x.costs.allIn) : "quote needed"} | ${x.best?.label ?? "none"} | ${profitText(x)} | ${maxToPay(x)} |`,
    );
  });
  L.push("");

  for (const [i, x] of main.entries()) L.push(...detailMd(x, i + 1));

  if (avoided.length) {
    L.push("## Avoided", "");
    for (const x of avoided) L.push(`- ${x.parcel.parcelId} (${x.parcel.useDescription}, ${addr(x)}): ${x.flags.filter((f) => f.severity === "avoid").map((f) => f.message).join(" ")}`);
    L.push("");
  }
  if (meta.unmatched.length) {
    L.push("## List lines not analyzed", "");
    for (const u of meta.unmatched.slice(0, 200)) L.push(`- ${u.sourceLine}${u.reason ? ` (${u.reason})` : ""}`);
    L.push("");
  }
  L.push("## Assumptions used", "", "```json", JSON.stringify(a, null, 2), "```", "");
  L.push("Estimates only. Not an appraisal, title search, or legal advice. Verify liens, access, and value before paying.");
  return L.join("\n");
}

function detailMd(x: Analysis, n: number): string[] {
  const p = x.parcel;
  const L: string[] = [];
  L.push(`## ${n}. ${p.parcelId}, ${addr(x)}`, "");
  L.push(`**${verdictLabel(x)}** · score ${x.score} · ${p.countyName} County · ${x.listing.channel === "auction" ? "Tax deed auction" : "Lands Available (fixed price)"}${x.listing.caseNumber ? ` · case ${x.listing.caseNumber}` : ""}${x.listing.saleDate ? ` · ${x.listing.saleDate}` : ""}`, "");
  L.push("**Why**", "");
  for (const w of x.why) L.push(`- ${w}`);
  L.push("");
  L.push(`**Property:** ${p.useDescription} (use code ${p.useCode}). Land ${p.landSqft ? Math.round(p.landSqft).toLocaleString() + " sq ft" : "size unknown"}${p.livingSqft ? `, living area ${p.livingSqft.toLocaleString()} sq ft` : ""}${p.yearBuilt ? `, built ${p.yearBuilt}` : ""}. Just value ${money(p.justValue)}. Owner ${p.ownerName || "unknown"}.`, "");
  L.push(`**Value estimate:** ${money(x.value.market)} (range ${money(x.value.low)} to ${money(x.value.high)}), ${x.value.confidence} confidence. ${x.value.notes.join(" ")}`, "");
  if (x.costs) {
    const c = x.costs;
    L.push(`**Cost to get the deed:** ${money(c.allIn)} = price ${money(c.price)}${c.otherFees ? ` + later taxes and interest ${money(c.otherFees)}` : ""}${c.docStamps ? ` + doc stamps ${money(c.docStamps)}` : ""}${c.recording ? ` + recording ${money(c.recording)}` : ""}.`, "");
  }
  L.push(`**Offer:** ${x.offer.note}`, "");
  L.push(`**Competition:** ${x.competition.level}. ${x.competition.explanation}`, "");
  if (x.strategies.length) {
    L.push("**Strategies**", "");
    L.push("| Plan | Sell or value | Costs after buying | Months | Profit | Return | Cash needed | Max all in | Fits budget |");
    L.push("|---|---|---|---|---|---|---|---|---|");
    for (const s of x.strategies) {
      L.push(`| ${s.label}${s === x.best ? " (best)" : ""} | ${money(s.exitPrice)} | ${money(s.extraCosts)} | ${s.months} | ${Number.isFinite(s.profit) ? money(s.profit) : "n/a"} | ${Number.isFinite(s.returnPct) ? pct(s.returnPct) : "n/a"} | ${Number.isFinite(s.cashNeeded) ? money(s.cashNeeded) : "n/a"} | ${money(s.maxAllIn)} | ${s.fitsBudget ? "yes" : "no"} |`);
    }
    L.push("");
    if (x.best) {
      L.push(`**Best plan cost lines:** ${x.best.costLines.map((c) => `${c.label} ${money(c.amount)}`).join("; ")}.`, "");
      L.push(`**Financing:** ${x.best.financing}`, "");
      if (x.best.notes.length) L.push(`**Notes:** ${x.best.notes.join(" ")}`, "");
    }
  }
  if (x.neighbors.length) {
    L.push("**Likely buyers nearby**", "");
    for (const nb of x.neighbors) L.push(`- ${nb.parcelId}: ${nb.ownerName}${nb.situsAddress ? `, ${nb.situsAddress}` : ""} (${nb.reason})`);
    L.push("");
  }
  const checks = x.flags; // every flag is shown, info included
  if (checks.length) {
    L.push("**Risks and checks before paying**", "");
    for (const f of checks) L.push(`- [${f.severity}] ${f.message}${f.check ? ` Check: ${f.check}` : ""}`);
    L.push("");
  }
  return L;
}

function countVerdicts(analyses: Analysis[]): string {
  const c: Record<string, number> = {};
  for (const x of analyses) c[x.verdict] = (c[x.verdict] ?? 0) + 1;
  const order: Analysis["verdict"][] = ["buy_candidate", "needs_quote", "watch", "pass", "avoid"];
  const parts = order.filter((v) => c[v]).map((v) => `${c[v]} ${VERDICT_LABEL[v].toLowerCase()}`);
  return parts.length ? parts.join(", ") : "no parcels matched";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderHtml(analyses: Analysis[], settings: Settings, a: Assumptions, meta: ReportMeta): string {
  const { main, avoided } = visible(analyses, settings);
  const badge = (x: Analysis) => `<span class="badge v-${x.verdict}">${esc(verdictLabel(x))}</span>`;
  const rows = main
    .map(
      (x, i) => `<tr>
<td>${i + 1}</td><td>${badge(x)}</td><td class="num">${x.score}</td>
<td><a href="#p${i + 1}">${esc(x.parcel.parcelId)}</a></td><td>${esc(x.parcel.countyName)}</td><td>${esc(x.parcel.useDescription)}</td><td>${esc(addr(x))}</td>
<td class="num">${money(x.value.market)}</td><td class="num">${x.costs ? money(x.costs.allIn) : "quote needed"}</td>
<td>${esc(x.best?.label ?? "none")}</td><td class="num">${esc(profitText(x))}</td><td class="num">${maxToPay(x)}</td></tr>`,
    )
    .join("\n");

  const cards = main
    .map((x, i) => {
      const p = x.parcel;
      const strat = x.strategies
        .map(
          (s) => `<tr class="${s === x.best ? "best" : ""}"><td>${esc(s.label)}${s === x.best ? " <b>(best)</b>" : ""}</td><td class="num">${money(s.exitPrice)}</td><td class="num">${money(s.extraCosts)}</td><td class="num">${s.months}</td><td class="num">${Number.isFinite(s.profit) ? money(s.profit) : "n/a"}</td><td class="num">${Number.isFinite(s.returnPct) ? pct(s.returnPct) : "n/a"}</td><td class="num">${Number.isFinite(s.cashNeeded) ? money(s.cashNeeded) : "n/a"}</td><td class="num">${money(s.maxAllIn)}</td><td>${s.fitsBudget ? "yes" : "no"}</td></tr>`,
        )
        .join("");
      const flags = x.flags
        .map((f) => `<li class="sev-${f.severity}"><b>${f.severity}</b> ${esc(f.message)}${f.check ? ` <i>Check: ${esc(f.check)}</i>` : ""}</li>`)
        .join("");
      const nbs = x.neighbors.map((nb) => `<li>${esc(nb.parcelId)}: ${esc(nb.ownerName)}${nb.situsAddress ? `, ${esc(nb.situsAddress)}` : ""} <span class="muted">(${esc(nb.reason)})</span></li>`).join("");
      const c = x.costs;
      return `<section class="card" id="p${i + 1}">
<h2>${i + 1}. ${esc(p.parcelId)} <span class="muted">${esc(addr(x))}</span></h2>
<p>${badge(x)} score ${x.score} · ${esc(p.countyName)} County · ${x.listing.channel === "auction" ? "Tax deed auction" : "Lands Available (fixed price)"}${x.listing.caseNumber ? ` · case ${esc(x.listing.caseNumber)}` : ""}${x.listing.saleDate ? ` · ${esc(x.listing.saleDate)}` : ""}</p>
<div class="grid">
<div><div class="k">Estimated value</div><div class="v">${money(x.value.market)}</div><div class="muted">${money(x.value.low)} to ${money(x.value.high)}, ${x.value.confidence} confidence</div></div>
<div><div class="k">${x.listing.channel === "auction" ? "Expected price all in" : "Price all in"}</div><div class="v">${c ? money(c.allIn) : "quote needed"}</div></div>
<div><div class="k">Max to pay</div><div class="v">${maxToPay(x)}</div></div>
<div><div class="k">Best plan</div><div class="v">${esc(x.best?.label ?? "none")}</div><div class="muted">${esc(profitText(x))}</div></div>
</div>
<h3>Why</h3><ul>${x.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
<p><b>Value estimate:</b> ${money(x.value.market)} (range ${money(x.value.low)} to ${money(x.value.high)}), ${x.value.confidence} confidence. ${esc(x.value.notes.join(" "))}</p>
<p><b>Property:</b> ${esc(p.useDescription)} (use code ${p.useCode}). Land ${p.landSqft ? Math.round(p.landSqft).toLocaleString() + " sq ft" : "size unknown"}${p.livingSqft ? `, living area ${p.livingSqft.toLocaleString()} sq ft` : ""}${p.yearBuilt ? `, built ${p.yearBuilt}` : ""}. Just value ${money(p.justValue)}. Owner ${esc(p.ownerName || "unknown")}.</p>
${c ? `<p><b>Cost to get the deed:</b> ${money(c.allIn)} = price ${money(c.price)}${c.otherFees ? ` + later taxes and interest ${money(c.otherFees)}` : ""}${c.docStamps ? ` + doc stamps ${money(c.docStamps)}` : ""}${c.recording ? ` + recording ${money(c.recording)}` : ""}.</p>` : ""}
<p><b>Offer:</b> ${esc(x.offer.note)}</p>
<p><b>Competition (${x.competition.level}):</b> ${esc(x.competition.explanation)}</p>
${strat ? `<h3>Strategies</h3><div class="table-wrap"><table><thead><tr><th>Plan</th><th>Sell or value</th><th>Costs after buying</th><th>Months</th><th>Profit</th><th>Return</th><th>Cash needed</th><th>Max all in</th><th>Fits budget</th></tr></thead><tbody>${strat}</tbody></table></div>` : ""}
${x.best ? `<p><b>Best plan costs:</b> ${x.best.costLines.map((cl) => `${esc(cl.label)} ${money(cl.amount)}`).join("; ")}.</p><p><b>Financing:</b> ${esc(x.best.financing)}</p>${x.best.notes.length ? `<p><b>Notes:</b> ${esc(x.best.notes.join(" "))}</p>` : ""}` : ""}
${nbs ? `<h3>Likely buyers nearby</h3><ul>${nbs}</ul>` : ""}
${flags ? `<h3>Risks and checks before paying</h3><ul class="flags">${flags}</ul>` : ""}
</section>`;
    })
    .join("\n");

  const avoidedHtml = avoided.length
    ? `<section class="card"><h2>Avoided</h2><ul>${avoided.map((x) => `<li>${esc(x.parcel.parcelId)} (${esc(x.parcel.useDescription)}, ${esc(addr(x))}): ${esc(x.flags.filter((f) => f.severity === "avoid").map((f) => f.message).join(" "))}</li>`).join("")}</ul></section>`
    : "";
  const unmatchedHtml = meta.unmatched.length
    ? `<section class="card"><h2>List lines not analyzed</h2><ul>${meta.unmatched.slice(0, 200).map((u) => `<li><code>${esc(u.sourceLine)}</code>${u.reason ? ` <span class="muted">${esc(u.reason)}</span>` : ""}</li>`).join("")}</ul></section>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)}</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--ink:#1d1d1b;--muted:#6b6b66;--line:#e4e3de;--good:#1f7a4d;--goodbg:#e3f3ea;--warn:#8a5a00;--warnbg:#fbf0d9;--bad:#a1271b;--badbg:#f8e1de;--info:#285a8f;--infobg:#e3edf8}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:1200px;margin:0 auto;padding:24px 16px 64px}h1{font-size:26px;margin:0 0 6px}h2{font-size:19px;margin:0 0 8px}h3{font-size:15px;margin:16px 0 6px}
.muted{color:var(--muted);font-weight:normal}.card{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:18px;margin:16px 0}
.table-wrap{overflow-x:auto;max-width:100%}code{word-break:break-all}table{border-collapse:collapse;width:100%;font-size:13.5px}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}th{background:#fafaf8;font-weight:600}
td.num{text-align:right;white-space:nowrap}tr.best td{background:#f3faf6}a{color:var(--info)}
.badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:600;white-space:nowrap}
.v-buy_candidate{background:var(--goodbg);color:var(--good)}.v-needs_quote{background:var(--infobg);color:var(--info)}.v-watch{background:var(--warnbg);color:var(--warn)}.v-pass{background:#eee;color:#555}.v-avoid{background:var(--badbg);color:var(--bad)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin:12px 0}.grid>div{border:1px solid var(--line);border-radius:8px;padding:10px}.k{font-size:12px;color:var(--muted)}.v{font-size:20px;font-weight:650}
ul.flags li{margin:3px 0}.sev-avoid b,.sev-danger b{color:var(--bad)}.sev-caution b{color:var(--warn)}.sev-info b{color:var(--info)}
details pre{white-space:pre-wrap;font-size:12px;background:#fafaf8;padding:10px;border-radius:6px}
</style></head><body><main>
<h1>${esc(meta.title)}</h1>
<p class="muted">Generated ${meta.generatedAt.toISOString().slice(0, 16).replace("T", " ")} UTC · tax roll year ${meta.referenceYear} · ${meta.parcelsScanned.toLocaleString()} parcels scanned · ${meta.compsFound.toLocaleString()} usable sales</p>
<div class="card">${esc(settingsLine(settings, meta))}<br><b>Results:</b> ${esc(countVerdicts(analyses))}.${meta.unmatched.length ? ` ${meta.unmatched.length} list line(s) could not be matched (see the end).` : ""}</div>
<div class="card table-wrap"><table><thead><tr><th>#</th><th>Verdict</th><th>Score</th><th>Parcel</th><th>County</th><th>Type</th><th>Address</th><th>Value</th><th>Price all in</th><th>Best plan</th><th>Profit</th><th>Max to pay</th></tr></thead><tbody>
${rows || `<tr><td colspan="12">Nothing to show.</td></tr>`}
</tbody></table></div>
${cards}
${avoidedHtml}
${unmatchedHtml}
<section class="card"><details><summary>Assumptions used</summary><pre>${esc(JSON.stringify(a, null, 2))}</pre></details>
<p class="muted">Estimates only. Not an appraisal, title search, or legal advice. Verify liens, access, and value before paying.</p></section>
</main></body></html>`;
}
