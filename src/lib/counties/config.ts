// County Import Presets for TaxProperty Utah
// IMPORTANT: These are best-guess helpers based on public county information.
// Always verify current sale procedures directly with the county before bidding.

export type CountyConfig = {
  name: string
  saleMonth: string
  saleDate?: string // YYYY-MM-DD format if known
  // Auction platform info - may change, always verify with county
  auctionPlatform?: {
    name: string
    verified: boolean // false if based on historical/old info
    note?: string
  }
  depositRequired?: {
    amount: number
    verified: boolean
    note?: string
  }
  // Sale terms
  buyerPremium?: number // percentage (e.g., 8 for 8%)
  paymentDueDays?: number
  deedType?: 'tax_deed' | 'warranty_deed' | 'sheriff_deed'
  titleGuarantee?: boolean
  // Redemption behavior (critical for risk scoring)
  redemptionUntilBiddingStarts?: boolean // Utah County - can redeem until bidding opens
  redemptionUntilSale?: boolean // Salt Lake County - can pay until sale
  redemptionDeadline?: string // e.g., "3 years" or "until sale"
  // Pre-sale volatility (affects risk score)
  preSaleInstability: 'low' | 'medium' | 'high' | 'very_high'
  liveListBehavior: boolean // true if list changes in real-time
  removalReasons: string[] // reasons properties may be removed
  // URLs for verification
  urls: {
    main: string
    propertyList?: string
    policies?: string
    saleInfo?: string
    currentList?: string
    recorderSearch?: string
    medicilandSearch?: string
    publicSurplus?: string
    [key: string]: string | undefined
  }
  // CSV import helper
  expectedCsvColumns?: string[]
  // Parcel format
  parcelIdFormat?: string
  parcelIdExample?: string
  // Additional info
  notes?: string
}

export const countyConfigs: Record<string, CountyConfig> = {
  utah: {
    name: "Utah County",
    saleMonth: "May",
    // NOTE: Platform info from historical sources - VERIFY with county
    auctionPlatform: {
      name: "Public Surplus (verify current)",
      verified: false,
      note: "Platform may change. Verify at treasurer.utahcounty.gov"
    },
    depositRequired: {
      amount: 500,
      verified: false,
      note: "Verify deposit amount on county website before sale"
    },
    // Critical for risk: redemption possible until bidding starts
    redemptionUntilBiddingStarts: true,
    redemptionUntilSale: false,
    redemptionDeadline: "Until bidding opens on sale day",
    // High pre-sale instability: properties disappear from list
    preSaleInstability: 'high',
    liveListBehavior: true,
    removalReasons: [
      "Redemption - owner paid taxes",
      "Notice issues",
      "Erroneous legal description",
      "Duplicate assessment",
      "Bankruptcy",
      "Approved temporary removal",
      "Other administrative reasons"
    ],
    urls: {
      main: "https://www.utahcounty.gov/dept/auditor/taxadmin/taxsale/index.html",
      propertyList: "https://auditor.utahcounty.gov/may-tax-sale/property-list",
      policies: "https://auditor.utahcounty.gov/may-tax-sale/policies",
      saleInfo: "https://treasurer.utahcounty.gov/tax-information",
      currentList: "https://auditor.utahcounty.gov/may-tax-sale/property-list"
    },
    expectedCsvColumns: [
      "Parcel Number",
      "Owner Name",
      "Mailing Address",
      "Property Address",
      "Legal Description",
      "Amount Due",
      "Assessed Value"
    ]
  },

  tooele: {
    name: "Tooele County",
    saleMonth: "May",
    saleDate: "2026-05-07",
    auctionPlatform: {
      name: "Public Surplus (tooele.publicsurplus.com)",
      verified: true,
      note: "Sale Date: May 7, 2026. Wire transfer deposit $500 required. 8% buyer premium."
    },
    depositRequired: {
      amount: 500,
      verified: true,
      note: "Wire to PayMac, Inc. $500 deposit required to bid."
    },
    buyerPremium: 8,
    paymentDueDays: 3,
    deedType: 'tax_deed',
    titleGuarantee: false,
    // CRITICAL: Redemption until auction begins
    redemptionUntilBiddingStarts: true,
    redemptionUntilSale: false,
    redemptionDeadline: "Until auction begins on May 7, 2026",
    // High instability - list changes until sale
    preSaleInstability: 'high',
    liveListBehavior: true,
    removalReasons: [
      "Redemption - owner paid taxes before auction",
      "Bankruptcy filing",
      "Legal restrictions identified",
      "Administrative removal by county"
    ],
    urls: {
      main: "https://tooeleco.gov/departments/administration/auditor/",
      propertyList: "https://tooeleco.gov/departments/administration/auditor/may_tax_sale.php",
      policies: "https://tooeleco.gov/departments/administration/auditor/",
      saleInfo: "https://tooeleco.gov/departments/administration/auditor/may_tax_sale.php",
      currentList: "https://tooeleco.gov/departments/administration/auditor/may_tax_sale.php",
      recorderSearch: "https://tooeleco.gov/departments/administration/recorder_surveyor/property_records_search.php",
      medicilandSearch: "https://search.tooeleco.gov.mediciland.com/",
      publicSurplus: "https://www.publicsurplus.com"
    },
    expectedCsvColumns: [
      "Serial Number",
      "Tax ID",
      "Owner Name",
      "Property Address",
      "City",
      "Legal Description",
      "Assessed Value",
      "Amount Due"
    ],
    // Parcel format: Serial Number is 12+ digits
    parcelIdFormat: "############",
    parcelIdExample: "1305000014",
    notes: "Public Surplus platform. 8% buyer premium added. Wire transfer only. High redemption risk until auction begins. Tax deed sale - no title guarantee. Possible federal tax liens survive sale."
  },

  rich: {
    name: "Rich County",
    saleMonth: "May",
    // RESEARCH NEEDED: All details
    auctionPlatform: {
      name: "Verify with County",
      verified: false,
      note: "Contact Rich County Clerk/Auditor for sale procedures"
    },
    depositRequired: {
      amount: 0,
      verified: false,
      note: "TBD - verify with Rich County"
    },
    redemptionUntilBiddingStarts: false,
    redemptionUntilSale: true, // TBD
    redemptionDeadline: "TBD - verify with county",
    preSaleInstability: 'medium',
    liveListBehavior: true,
    removalReasons: [
      "Redemption",
      "Payment arrangement",
      "Administrative removal"
    ],
    urls: {
      main: "https://www.richcountyut.org/",
      propertyList: "TBD",
      policies: "TBD",
      saleInfo: "TBD",
      currentList: "TBD"
    },
    expectedCsvColumns: [
      "TBD - research needed"
    ],
    notes: "Rich County is rural with lower property volume. Smaller sale expected. Contact Clerk directly for CSV/data access."
  },

  sanpete: {
    name: "Sanpete County",
    saleMonth: "May",
    // RESEARCH NEEDED: All details
    auctionPlatform: {
      name: "Verify with County",
      verified: false,
      note: "Contact Sanpete County Auditor for sale procedures"
    },
    depositRequired: {
      amount: 0,
      verified: false,
      note: "TBD - verify with Sanpete County"
    },
    redemptionUntilBiddingStarts: false,
    redemptionUntilSale: true, // TBD
    redemptionDeadline: "TBD - verify with county",
    preSaleInstability: 'medium',
    liveListBehavior: true,
    removalReasons: [
      "Redemption",
      "Payment arrangement",
      "Administrative removal"
    ],
    urls: {
      main: "https://www.sanpete.com/",
      propertyList: "TBD",
      policies: "TBD",
      saleInfo: "TBD",
      currentList: "TBD"
    },
    expectedCsvColumns: [
      "TBD - research needed"
    ],
    notes: "Sanpete County - Central Utah. Smaller rural county. Contact Auditor directly for tax sale information and property data."
  },

  salt_lake: {
    name: "Salt Lake County",
    saleMonth: "May",
    // NOTE: Verify current platform with county
    auctionPlatform: {
      name: "Verify on county website",
      verified: false,
      note: "Check current procedures at saltlakecounty.gov/property-tax"
    },
    depositRequired: {
      amount: 500,
      verified: false,
      note: "Historically $500 but verify for current sale"
    },
    // Redemption until sale
    redemptionUntilBiddingStarts: false,
    redemptionUntilSale: true,
    redemptionDeadline: "Until Auditor's tax sale in late May",
    // Medium-high instability: publishes list, may have changes
    preSaleInstability: 'medium',
    liveListBehavior: true,
    removalReasons: [
      "Redemption - owner paid taxes",
      "Payment arrangement",
      "Administrative removal",
      "Bankruptcy",
      "Other legal reasons"
    ],
    urls: {
      main: "https://www.saltlakecounty.gov/property-tax/property-tax-sale/",
      policies: "https://www.saltlakecounty.gov/property-tax/property-tax-sale/procedures-and-rules/",
      saleInfo: "https://www.saltlakecounty.gov/property-tax/property-tax-sale/current-tax-sale-list/",
      currentList: "https://www.saltlakecounty.gov/property-tax/property-tax-sale/current-tax-sale-list/"
    },
    expectedCsvColumns: [
      "Parcel ID",
      "Owner",
      "Address",
      "Legal Desc",
      "Tax Amount",
      "Assessed"
    ]
  }
}

export const getCountyConfig = (county: string): CountyConfig | undefined => {
  return countyConfigs[county]
}

// Get pre-sale volatility score (0-15) for risk calculation
export const getPresaleVolatilityScore = (county: string): number => {
  const config = countyConfigs[county]
  if (!config) return 10 // default medium-high for unknown counties

  switch (config.preSaleInstability) {
    case 'low': return 0
    case 'medium': return 5
    case 'high': return 10
    case 'very_high': return 15
    default: return 10
  }
}

// Helper to determine if property is in unstable window
export const isInUnstableWindow = (county: string, daysUntilSale?: number): boolean => {
  const config = countyConfigs[county]
  if (!config) return true // assume unstable if unknown

  // If redemption is allowed until bidding starts, property is unstable until sale
  if (config.redemptionUntilBiddingStarts) return true

  // If redemption until sale, still unstable
  if (config.redemptionUntilSale) return true

  return false
}

export const propertyTypeLabels: Record<string, string> = {
  single_family: "Single Family",
  condo: "Condo/Townhome",
  multifamily: "Multifamily",
  vacant_land: "Vacant Land",
  commercial: "Commercial",
  mobile_home: "Mobile Home",
  unknown: "Unknown"
}

export const occupancyLabels: Record<string, string> = {
  owner_occupied: "Owner Occupied",
  tenant: "Tenant Occupied",
  vacant: "Vacant",
  unknown: "Unknown"
}

export const riskLevelLabels: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  unknown: "Unknown"
}

// Status semantics - IMPORTANT distinctions:
// redeemed = owner paid delinquency before sale (keeps property)
// removed = pulled for legal/process/admin reasons (not redemption)
// sold = successfully purchased at auction
// passed = decided not to bid
// struck_off = unsold, transferred to county
export const statusLabels: Record<string, string> = {
  new: "New",
  researching: "Researching",
  ready: "Ready to Bid",
  redeemed: "Redeemed (Owner Paid)",
  removed: "Removed (Process Issue)",
  sold: "Sold (You Won)",
  passed: "Passed",
  struck_off: "Struck Off to County"
}

export const statusDescriptions: Record<string, string> = {
  new: "Recently added, not yet reviewed",
  researching: "Under investigation",
  ready: "Approved for bidding",
  redeemed: "Owner paid delinquent taxes before sale",
  removed: "Removed from sale list (legal/process reason)",
  sold: "Successfully purchased at auction",
  passed: "Decided not to bid",
  struck_off: "Unsold - transferred to county"
}

export const recommendationLabels: Record<string, string> = {
  bid: "Bid",
  research_more: "Research More",
  avoid: "Avoid"
}

// Outcome event types and their property status mappings
export const outcomeToStatusMap: Record<string, string> = {
  redeemed: 'redeemed',
  removed: 'removed',
  sold: 'sold',
  passed: 'passed',
  struck_off: 'struck_off',
  note: 'new' // notes don't change status
}

// Outcome type labels with descriptions
export const outcomeTypeInfo: Record<string, { label: string; description: string; isDistinction: boolean }> = {
  redeemed: {
    label: "Redeemed",
    description: "Owner paid delinquent taxes before sale",
    isDistinction: true
  },
  removed: {
    label: "Removed",
    description: "Pulled from sale for legal/process/admin reason (NOT redemption)",
    isDistinction: true
  },
  sold: {
    label: "Sold",
    description: "Successfully purchased at auction",
    isDistinction: false
  },
  passed: {
    label: "Passed",
    description: "Decided not to bid",
    isDistinction: false
  },
  struck_off: {
    label: "Struck Off",
    description: "Unsold property transferred to county",
    isDistinction: false
  },
  note: {
    label: "Note",
    description: "General observation or update",
    isDistinction: false
  }
}
