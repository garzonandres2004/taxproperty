// County Recorder Catalog
// For each Utah county: recorder URL, automation level, and what signal we can extract.
// Level A = scraper exists or AGRC provides signal.
// Level B = online recorder exists, needs playbook/adapter.
// Level C = no online access (login, CAPTCHA, PDF-only, or no portal at all).

export interface RecorderEntry {
  countyId: string
  recorderUrl: string | null
  automationLevel: 'A' | 'B' | 'C'
  vendor: string | null                 // "Fidlar" | "Tyler" | "Kofile" | null
  supportsParcelSearch: boolean
  requiresLogin: boolean
  hasCaptcha: boolean
  notes: string
  basicSignalsAvailable: string[]       // which fields we can extract with a playbook
}

// Research basis: public county recorder websites, as of May 2026.
// Verify URLs before use — county portals change vendors.
export const RECORDER_CATALOG: Record<string, RecorderEntry> = {
  utah: {
    countyId: 'utah',
    recorderUrl: 'https://recorder.utahcounty.gov/search',
    automationLevel: 'B',   // we already have a scraper; promote to A when fully wired
    vendor: null,
    supportsParcelSearch: true,
    requiresLogin: false,
    hasCaptcha: false,
    notes: 'Utah County Recorder online. TitleAnalysis scraper already implemented.',
    basicSignalsAvailable: ['yearsSameOwner', 'mortgageStatus', 'activeLiens', 'ownershipChain']
  },
  weber: {
    countyId: 'weber',
    recorderUrl: 'https://recdocrs.webercounty.org/webexternalaccess/',
    automationLevel: 'B',
    vendor: 'Kofile',
    supportsParcelSearch: true,
    requiresLogin: false,
    hasCaptcha: false,
    notes: 'Weber County uses Kofile external access portal. Search by parcel or name.',
    basicSignalsAvailable: ['yearsSameOwner', 'mortgageStatus', 'activeLiens']
  },
  tooele: {
    countyId: 'tooele',
    recorderUrl: 'https://erecording.tooeleco.gov/eaglesoftware/web/',
    automationLevel: 'B',
    vendor: 'EagleSoftware',
    supportsParcelSearch: true,
    requiresLogin: true,
    hasCaptcha: false,
    notes: 'Eagle Software e-recording portal. Login required — no public parcel search. Search by AGRC SERIAL_NUM (e.g. R021854). Manual access only until credentials obtained.',
    basicSignalsAvailable: ['yearsSameOwner', 'mortgageStatus']
  },
  davis: {
    countyId: 'davis',
    recorderUrl: 'https://recorder.daviscountyutah.gov/',
    automationLevel: 'B',
    vendor: null,
    supportsParcelSearch: true,
    requiresLogin: false,
    hasCaptcha: false,
    notes: 'Davis County Recorder online search. Parcel search available.',
    basicSignalsAvailable: ['yearsSameOwner', 'mortgageStatus', 'activeLiens']
  },
  rich: {
    countyId: 'rich',
    recorderUrl: 'http://search.richcounty.gov/RecordingsSearch.aspx',
    automationLevel: 'B',
    vendor: null,
    supportsParcelSearch: true,
    requiresLogin: true,
    hasCaptcha: false,
    notes: 'Custom ASP.NET + DevExpress app at search.richcounty.gov. FREE guest account (email/name/password, no payment). Computer index from 2019-01-01. Scraper IMPLEMENTED in src/lib/title/scrapers/rich-county.ts — Playwright-based, session-persisted. Search strategy: owner name via PropertyTaxSearch.aspx then grantor search on RecordingsSearch.aspx. Set RICH_COUNTY_RECORDER_EMAIL + RICH_COUNTY_RECORDER_PASSWORD env vars.',
    basicSignalsAvailable: ['lastTransferDate', 'lastTransferType', 'mortgageStatus', 'documentCount5yr']
  },
  salt_lake: {
    countyId: 'salt_lake',
    recorderUrl: 'https://slcrecorder.com/',
    automationLevel: 'B',
    vendor: null,
    supportsParcelSearch: true,
    requiresLogin: false,
    hasCaptcha: false,
    notes: 'Salt Lake County Recorder online. Document search available.',
    basicSignalsAvailable: ['yearsSameOwner', 'mortgageStatus', 'activeLiens']
  },
  sanpete: {
    countyId: 'sanpete',
    recorderUrl: null,
    automationLevel: 'C',
    vendor: null,
    supportsParcelSearch: false,
    requiresLogin: false,
    hasCaptcha: false,
    notes: 'Sanpete County recorder status unknown. Manual research required.',
    basicSignalsAvailable: []
  }
}

export function getRecorderEntry(countyId: string): RecorderEntry {
  return RECORDER_CATALOG[countyId] ?? {
    countyId,
    recorderUrl: null,
    automationLevel: 'C',
    vendor: null,
    supportsParcelSearch: false,
    requiresLogin: false,
    hasCaptcha: false,
    notes: `No recorder catalog entry for county "${countyId}". Research needed.`,
    basicSignalsAvailable: []
  }
}
