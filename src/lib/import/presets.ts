// County Import Presets for TaxProperty Utah
// IMPORTANT: These are best-guess helpers. County formats change - always verify.

export type PresetConfidence = 'verified' | 'likely' | 'estimated' | 'placeholder'

export type FieldMapping = {
  csvColumn: string
  appField: string
  transform?: 'string' | 'number' | 'currency' | 'date' | 'uppercase' | 'lowercase'
}

export type ImportPreset = {
  name: string
  county: 'utah' | 'salt_lake'
  description: string
  confidence: PresetConfidence
  confidenceNote: string
  expectedColumns: string[]
  mappings: FieldMapping[]
  defaults: Record<string, string | number | null | boolean>
  countyUrls: {
    main: string
    propertyList?: string
    policies?: string
    currentList?: string
  }
}

// Utah County Preset
// Based on public info: https://auditor.utahcounty.gov/may-tax-sale
// NOTE: Platform/deposit amounts are historical - VERIFY with county before bidding
export const utahCountyPreset: ImportPreset = {
  name: 'Utah County',
  county: 'utah',
  description: 'Utah County May Tax Sale property list',
  confidence: 'estimated',
  confidenceNote: 'Based on public county pages. CSV format may vary. Platform/deposit amounts should be verified directly with Utah County. Properties can be redeemed until bidding starts.',
  expectedColumns: [
    'Parcel Number',
    'Owner Name',
    'Mailing Address',
    'Property Address',
    'Legal Description',
    'Amount Due',
    'Assessed Value'
  ],
  mappings: [
    { csvColumn: 'Parcel Number', appField: 'parcel_number', transform: 'string' },
    { csvColumn: 'Owner Name', appField: 'owner_name', transform: 'string' },
    { csvColumn: 'Mailing Address', appField: 'owner_mailing_address', transform: 'string' },
    { csvColumn: 'Property Address', appField: 'property_address', transform: 'string' },
    { csvColumn: 'Legal Description', appField: 'legal_description', transform: 'string' },
    { csvColumn: 'Amount Due', appField: 'total_amount_due', transform: 'currency' },
    { csvColumn: 'Assessed Value', appField: 'assessed_value', transform: 'currency' },
    { csvColumn: 'Estimated Market Value', appField: 'estimated_market_value', transform: 'currency' },
    { csvColumn: 'Property Type', appField: 'property_type', transform: 'lowercase' },
    { csvColumn: 'Status', appField: 'status', transform: 'lowercase' },
    { csvColumn: 'Sale Date', appField: 'sale_date', transform: 'date' },
    { csvColumn: 'Sale Year', appField: 'sale_year', transform: 'number' },
    { csvColumn: 'Notes', appField: 'notes', transform: 'string' }
  ],
  defaults: {
    county: 'utah',
    sale_year: new Date().getFullYear(),
    property_type: 'unknown',
    status: 'new',
    access_risk: 'unknown',
    title_risk: 'unknown',
    legal_risk: 'unknown',
    marketability_risk: 'unknown',
    presale_volatility_risk: 10, // Utah County has high pre-sale instability
    is_active_sale_candidate: true
  },
  countyUrls: {
    main: 'https://www.utahcounty.gov/dept/auditor/taxadmin/taxsale/index.html',
    propertyList: 'https://auditor.utahcounty.gov/may-tax-sale/property-list',
    policies: 'https://auditor.utahcounty.gov/may-tax-sale/policies',
    currentList: 'https://auditor.utahcounty.gov/may-tax-sale/property-list'
  }
}

// Salt Lake County Preset
// Based on public info: https://www.saltlakecounty.gov/property-tax/property-tax-sale/
// NOTE: Verify current procedures at saltlakecounty.gov before bidding
export const saltLakeCountyPreset: ImportPreset = {
  name: 'Salt Lake County',
  county: 'salt_lake',
  description: 'Salt Lake County Tax Sale property list',
  confidence: 'estimated',
  confidenceNote: 'Based on public county pages. CSV format may vary. Current list published before sale. Verify deposit/platform with county directly. Properties can be redeemed until sale. Medium pre-sale instability.',
  expectedColumns: [
    'Parcel ID',
    'Owner',
    'Address',
    'Legal Desc',
    'Tax Amount',
    'Assessed'
  ],
  mappings: [
    { csvColumn: 'Parcel ID', appField: 'parcel_number', transform: 'string' },
    { csvColumn: 'Parcel Number', appField: 'parcel_number', transform: 'string' }, // Alternate
    { csvColumn: 'Owner', appField: 'owner_name', transform: 'string' },
    { csvColumn: 'Owner Name', appField: 'owner_name', transform: 'string' }, // Alternate
    { csvColumn: 'Mailing Address', appField: 'owner_mailing_address', transform: 'string' },
    { csvColumn: 'Address', appField: 'property_address', transform: 'string' },
    { csvColumn: 'Property Address', appField: 'property_address', transform: 'string' }, // Alternate
    { csvColumn: 'Legal Desc', appField: 'legal_description', transform: 'string' },
    { csvColumn: 'Legal Description', appField: 'legal_description', transform: 'string' }, // Alternate
    { csvColumn: 'Tax Amount', appField: 'total_amount_due', transform: 'currency' },
    { csvColumn: 'Amount Due', appField: 'total_amount_due', transform: 'currency' }, // Alternate
    { csvColumn: 'Assessed', appField: 'assessed_value', transform: 'currency' },
    { csvColumn: 'Assessed Value', appField: 'assessed_value', transform: 'currency' }, // Alternate
    { csvColumn: 'Market Value', appField: 'estimated_market_value', transform: 'currency' },
    { csvColumn: 'Type', appField: 'property_type', transform: 'lowercase' },
    { csvColumn: 'Property Type', appField: 'property_type', transform: 'lowercase' }, // Alternate
    { csvColumn: 'Sale Date', appField: 'sale_date', transform: 'date' },
    { csvColumn: 'Sale Year', appField: 'sale_year', transform: 'number' },
    { csvColumn: 'Notes', appField: 'notes', transform: 'string' }
  ],
  defaults: {
    county: 'salt_lake',
    sale_year: new Date().getFullYear(),
    property_type: 'unknown',
    status: 'new',
    access_risk: 'unknown',
    title_risk: 'unknown',
    legal_risk: 'unknown',
    marketability_risk: 'unknown',
    presale_volatility_risk: 5, // Salt Lake has medium pre-sale instability
    is_active_sale_candidate: true
  },
  countyUrls: {
    main: 'https://www.saltlakecounty.gov/property-tax/property-tax-sale/',
    propertyList: 'https://www.saltlakecounty.gov/property-tax/property-tax-sale/current-tax-sale-list/',
    policies: 'https://www.saltlakecounty.gov/property-tax/property-tax-sale/procedures-and-rules/',
    currentList: 'https://www.saltlakecounty.gov/property-tax/property-tax-sale/current-tax-sale-list/'
  }
}

export const importPresets: Record<string, ImportPreset> = {
  utah: utahCountyPreset,
  salt_lake: saltLakeCountyPreset
}

export const getPreset = (key: string): ImportPreset | undefined => {
  return importPresets[key]
}

export const getAllPresets = (): ImportPreset[] => {
  return Object.values(importPresets)
}

// Get confidence badge color
export const getConfidenceColor = (confidence: PresetConfidence): string => {
  switch (confidence) {
    case 'verified': return 'bg-green-100 text-green-800'
    case 'likely': return 'bg-blue-100 text-blue-800'
    case 'estimated': return 'bg-yellow-100 text-yellow-800'
    case 'placeholder': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

// Get confidence label
export const getConfidenceLabel = (confidence: PresetConfidence): string => {
  switch (confidence) {
    case 'verified': return 'Verified'
    case 'likely': return 'Likely'
    case 'estimated': return 'Estimated'
    case 'placeholder': return 'Placeholder'
    default: return 'Unknown'
  }
}
