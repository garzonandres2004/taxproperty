// Universal CSV Column Detector
// Auto-detects which columns map to Property fields
// Works with ANY Utah county's CSV format

export const COLUMN_ALIASES: Record<string, string[]> = {
  parcel_number: [
    'parcel number', 'parcel_number', 'parcel no', 'parcel id',
    'serial number', 'serial_number', 'account number', 'tax id',
    'parcel', 'serial', 'pin', 'apn', 'tax serial', 'serial num',
    'tax parcel', 'parcelid', 'parcelno', 'accountno'
  ],
  owner_name: [
    'name', 'owner', 'owner name', 'taxpayer', 'property owner',
    'grantee', 'owner_name', 'taxpayer name', 'ownername', 'taxpayername',
    'current owner', 'deed holder', 'title holder'
  ],
  total_amount_due: [
    'estimated starting bid', 'total due', 'amount due', 'taxes due',
    'total amount due', 'starting bid', 'minimum bid', 'delinquent amount',
    'total taxes', 'amount owed', 'tax amount', 'est starting bid',
    'opening bid', 'startingbid', 'amountdue', 'taxdue'
  ],
  property_address: [
    'address', 'property address', 'situs address', 'location',
    'street address', 'prop address', 'site address', 'propertyaddress',
    'situs', 'property location', 'streetaddress'
  ],
  property_type: [
    'property type', 'type', 'class', 'land use', 'property class',
    'use code', 'prop type', 'propertytype', 'landuse', 'usetype'
  ],
  legal_description: [
    'legal', 'legal description', 'legal desc', 'description',
    'taxing description', 'property description', 'legaldescription',
    'legaldesc', 'tax description'
  ],
  city: [
    'city', 'municipality', 'town', 'situs city', 'city name'
  ],
  assessed_value: [
    'assessed value', 'assessed', 'assessedvalue', 'taxable value',
    'taxable', 'value', 'total value'
  ],
  estimated_market_value: [
    'market value', 'estimated market value', 'appraised value',
    'full cash value', 'fmv', 'marketvalue', 'estimatedvalue',
    'estimated market', 'total market value'
  ]
}

// Required fields for import
export const REQUIRED_FIELDS = ['parcel_number']

// Important fields that improve scoring but aren't required
export const IMPORTANT_FIELDS = ['total_amount_due', 'owner_name', 'property_address']

/**
 * Auto-detect column mappings from CSV headers
 * Returns: { fieldName: 'Original CSV Header' }
 */
export function detectColumns(headers: string[]): Record<string, string> {
  const normalized = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, ' '))
  const mapping: Record<string, string> = {}
  const usedHeaders = new Set<string>()

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (let i = 0; i < normalized.length; i++) {
      const header = normalized[i]
      const originalHeader = headers[i]

      // Skip already mapped headers
      if (usedHeaders.has(originalHeader)) continue

      // Check if this header matches any alias
      const matches = aliases.some(alias => {
        // Exact match
        if (header === alias) return true
        // Contains alias
        if (header.includes(alias)) return true
        // Alias contains header (for short abbreviations)
        if (alias.length > 5 && header.length > 5 && alias.includes(header)) return true
        // Fuzzy match for common variations
        const headerWords = header.split(/\s+|_/)
        const aliasWords = alias.split(/\s+|_/)
        return headerWords.some(hw => aliasWords.includes(hw))
      })

      if (matches) {
        mapping[field] = originalHeader
        usedHeaders.add(originalHeader)
        break
      }
    }
  }

  return mapping
}

/**
 * Get list of missing required fields
 */
export function getMissingRequiredFields(mapping: Record<string, string>): string[] {
  return REQUIRED_FIELDS.filter(f => !mapping[f])
}

/**
 * Get list of missing important fields
 */
export function getMissingImportantFields(mapping: Record<string, string>): string[] {
  return IMPORTANT_FIELDS.filter(f => !mapping[f])
}

/**
 * Calculate confidence score for the mapping
 * 0-100 based on how many fields were detected
 */
export function calculateMappingConfidence(mapping: Record<string, string>): number {
  const allFields = Object.keys(COLUMN_ALIASES)
  const detected = Object.keys(mapping).length
  return Math.round((detected / allFields.length) * 100)
}

/**
 * Apply column mapping to transform CSV row to Property fields
 */
export function applyMapping(
  row: Record<string, string>,
  mapping: Record<string, string>,
  county: string
): Record<string, any> {
  const result: Record<string, any> = {
    county,
    sale_year: new Date().getFullYear(),
    status: 'new'
  }

  // Map each field
  for (const [field, csvHeader] of Object.entries(mapping)) {
    const value = row[csvHeader]
    if (!value) continue

    switch (field) {
      case 'total_amount_due':
      case 'assessed_value':
      case 'estimated_market_value':
        // Parse currency: remove $, commas, handle parentheses for negative
        const cleanValue = value.replace(/[$,]/g, '').trim()
        result[field] = cleanValue ? parseFloat(cleanValue) : null
        break

      case 'parcel_number':
        // Clean parcel number - remove extra spaces
        result[field] = value.trim().replace(/\s+/g, ' ')
        break

      case 'owner_name':
      case 'property_address':
      case 'legal_description':
        // Clean up HTML entities and extra whitespace
        result[field] = value.trim().replace(/\s+/g, ' ')
        break

      default:
        result[field] = value.trim()
    }
  }

  return result
}

/**
 * Detect county from file name or headers
 * Returns county name or null if can't detect
 */
export function detectCountyFromFile(
  filename: string,
  headers: string[]
): string | null {
  const lowerName = filename.toLowerCase()
  const lowerHeaders = headers.map(h => h.toLowerCase())

  // Check filename
  if (lowerName.includes('tooele')) return 'tooele'
  if (lowerName.includes('utah')) return 'utah'
  if (lowerName.includes('salt lake') || lowerName.includes('saltlake')) return 'salt_lake'
  if (lowerName.includes('davis')) return 'davis'
  if (lowerName.includes('weber')) return 'weber'
  if (lowerName.includes('washington')) return 'washington'
  if (lowerName.includes('cache')) return 'cache'
  if (lowerName.includes('summit')) return 'summit'

  // Check headers for county-specific patterns
  if (lowerHeaders.some(h => h.includes('tooele'))) return 'tooele'
  if (lowerHeaders.some(h => h.includes('utah county'))) return 'utah'

  // Default to null if can't detect
  return null
}

/**
 * Generate import preview from first few rows
 */
export function generateImportPreview(
  rows: Record<string, string>[],
  mapping: Record<string, string>,
  county: string,
  maxRows: number = 3
): Array<Record<string, any>> {
  return rows.slice(0, maxRows).map(row =>
    applyMapping(row, mapping, county)
  )
}
