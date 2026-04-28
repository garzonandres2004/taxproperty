### [2026-04-27] coder — Property count on Generate Investor Report button

**Decisión de código:** Added `bidProperties.length` to the button text to show investors how many BID properties will be included in the report.

**Trampa evitada:** N/A - Simple JSX interpolation, no side effects.

**Patron reusable:** When showing action buttons that operate on a filtered dataset, display the count inline to set user expectations before they click.

### [2026-04-27] coder — Portfolio Overview stats verification

**Decisión de código:** Verified all 6 required stats are present in the Portfolio Overview section. Updated label from "Total Analyzed" to "Total Properties" for clarity. Added "Generated" date to the summary grid alongside Auction Date, Event Date -> Auction Date for consistency.

**Trampa evitada:** Almost left the generated date only in the footer. Moved it to the main stats grid so it's visible at a glance with other key metrics.

**Patron reusable:** When displaying report headers with multiple stats, use a consistent 4-column grid layout and group temporal data (auction date, generated date) together for scannability.

### [2026-04-27] coder — Dark theme landing page transformation

**Decisión de código:** Converted landing page from light to dark professional theme (slate-900 base)

**Cambios aplicados:**
1. Main background: `bg-gradient-to-b from-slate-50 to-white` → `bg-slate-900`
2. Headlines: `text-slate-900` → `text-white`
3. Subheadlines: `text-slate-600` → `text-slate-300`
4. Badge text: `text-blue-800` → `text-blue-300`
5. Feature Cards: `bg-white` → `bg-slate-800 border border-slate-700`, text `text-slate-600` → `text-slate-400`
6. Stats Bar: numbers `text-slate-900` → `text-white`, labels `text-slate-600` → `text-slate-400`
7. How It Works: section title `text-white`, step backgrounds `bg-slate-800`, step text `text-slate-400`, descriptions `text-slate-400`
8. Demo CTA: background `bg-slate-900` → `bg-blue-900/30` for contrast
9. Footer: border-t `border-slate-800`, text `text-slate-400`

**Trampa evitada:** Demo CTA was already `bg-slate-900` which would blend with page background — changed to `bg-blue-900/30` for visual contrast

**Patrón reusable:** 
- Use `text-slate-300` for secondary text on dark backgrounds
- Use `text-slate-400` for tertiary/muted text
- Use `bg-slate-800 border border-slate-700` for elevated cards on dark themes
- Keep colored icon backgrounds (blue-100, green-100, amber-100) — they pop nicely on dark
