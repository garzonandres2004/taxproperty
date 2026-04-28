// CSV Import Parser and Normalizer

import { ImportPreset, FieldMapping } from './presets'

export type ParseResult = {
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
}

export type ImportError = {
  rowIndex: number
  row: Record<string, string>
  reason: string
}

export type ImportRow = {
  county: string
  sale_year: number
  sale_date: string | null
  parcel_number: string
  owner_name: string | null
  owner_mailing_address: string | null
  property_address: string | null
  legal_description: string | null
  total_amount_due: number | null
  assessed_value: number | null
  estimated_market_value: number | null
  property_type: string
  status: string
  notes: string | null
  auction_platform: string | null
  deposit_required: number | null
  access_risk: string
  title_risk: string
  legal_risk: string
  marketability_risk: string
}

export type NormalizedResult = {
  valid: ImportRow[]
  errors: ImportError[]
}

// Parse CSV string into rows
export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.split('\n').filter(line => line.trim() !== '')

  if (lines.length === 0) {
    return { headers: [], rows: [], rowCount: 0 }
  }

  // Parse headers (first line)
  const headers = parseCSVLine(lines[0])

  // Parse data rows
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length > 0) {
      const row: Record<string, string> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }
  }

  return { headers, rows, rowCount: rows.length }
}

// Parse a single CSV line respecting quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Add last field
  result.push(current.trim())

  return result
}

// Transform value based on type
function transformValue(value: string, transform?: string): string | number | null {
  if (!value || value.trim() === '') return null

  const trimmed = value.trim()

  switch (transform) {
    case 'string':
      return trimmed

    case 'uppercase':
      return trimmed.toUpperCase()

    case 'lowercase':
      return trimmed.toLowerCase()

    case 'number':
      const num = parseFloat(trimmed.replace(/[^0-9.-]/g, ''))
      return isNaN(num) ? null : num

    case 'currency':
      // Remove currency symbols and commas, keep decimal
      const cleaned = trimmed.replace(/[$,]/g, '').replace(/[^0-9.-]/g, '')
      const currencyNum = parseFloat(cleaned)
      return isNaN(currencyNum) ? null : currencyNum

    case 'date':
      // Try to parse date
      const date = new Date(trimmed)
      return isNaN(date.getTime()) ? trimmed : date.toISOString().split('T')[0]

    default:
      return trimmed
  }
}

// Normalize county value
function normalizeCounty(value: string): string {
  const lower = value.toLowerCase().trim()
  if (lower.includes('salt') && lower.includes('lake')) return 'salt_lake'
  if (lower === 'utah' || lower === 'utah county') return 'utah'
  return lower.replace(/\s+/g, '_')
}

// Normalize property type
function normalizePropertyType(value: string): string {
  const lower = value.toLowerCase().trim()

  // Map common variations to standard types
  if (lower.includes('single') || lower.includes('sf') || lower.includes('residential')) {
    return 'single_family'
  }
  if (lower.includes('condo') || lower.includes('townhome') || lower.includes('townhouse')) {
    return 'condo'
  }
  if (lower.includes('multi') || lower.includes('duplex') || lower.includes('triplex') || lower.includes('apartment')) {
    return 'multifamily'
  }
  if (lower.includes('commercial') || lower.includes('retail') || lower.includes('office')) {
    return 'commercial'
  }
  if (lower.includes('vacant') || lower.includes('land') || lower.includes('lot')) {
    return 'vacant_land'
  }
  if (lower.includes('mobile') || lower.includes('manufactured')) {
    return 'mobile_home'
  }

  return 'unknown'
}

// Normalize status
function normalizeStatus(value: string): string {
  const lower = value.toLowerCase().trim()

  const statusMap: Record<string, string> = {
    'new': 'new',
    'active': 'new',
    'listed': 'new',
    'researching': 'researching',
    'research': 'researching',
    'pending': 'researching',
    'ready': 'ready',
    'bid': 'ready',
    'approved': 'ready',
    'redeemed': 'redeemed',
    'paid': 'redeemed',
    'removed': 'removed',
    'withdrawn': 'removed',
    'deleted': 'removed',
    'sold': 'sold',
    'won': 'sold',
    'purchased': 'sold',
    'passed': 'passed',
    'skip': 'passed',
    'declined': 'passed',
    'struck off': 'struck_off',
    'struck_off': 'struck_off',
    'county': 'struck_off',
    'unsold': 'struck_off'
  }

  return statusMap[lower] || 'new'
}

// Apply mappings to convert CSV row to app format
export function applyMappings(
  row: Record<string, string>,
  mappings: FieldMapping[],
  defaults: Record<string, string | number | null>
): ImportRow {
  const result: Partial<ImportRow> = { ...defaults }

  for (const mapping of mappings) {
    const csvValue = row[mapping.csvColumn]
    if (csvValue !== undefined && csvValue !== '') {
      const transformed = transformValue(csvValue, mapping.transform)

      // Handle special normalization
      if (mapping.appField === 'county' && typeof transformed === 'string') {
        result[mapping.appField as keyof ImportRow] = normalizeCounty(transformed) as any
      } else if (mapping.appField === 'property_type' && typeof transformed === 'string') {
        result[mapping.appField as keyof ImportRow] = normalizePropertyType(transformed) as any
      } else if (mapping.appField === 'status' && typeof transformed === 'string') {
        result[mapping.appField as keyof ImportRow] = normalizeStatus(transformed) as any
      } else {
        result[mapping.appField as keyof ImportRow] = transformed as any
      }
    }
  }

  return result as ImportRow
}

// Validate required fields
function validateRow(row: ImportRow): string | null {
  if (!row.county) return 'Missing required field: county'
  if (!row.parcel_number) return 'Missing required field: parcel_number'
  if (!['utah', 'salt_lake'].includes(row.county)) return `Invalid county: ${row.county}`
  return null
}

// Normalize all rows using preset
export function normalizeRows(
  rows: Record<string, string>[],
  preset: ImportPreset
): NormalizedResult {
  const valid: ImportRow[] = []
  const errors: ImportError[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Skip completely empty rows
    const hasValues = Object.values(row).some(v => v.trim() !== '')
    if (!hasValues) continue

    // Apply mappings and defaults
    const normalized = applyMappings(row, preset.mappings, preset.defaults)

    // Validate required fields
    const error = validateRow(normalized)
    if (error) {
      errors.push({ rowIndex: i + 1, row, reason: error })
    } else {
      valid.push(normalized)
    }
  }

  return { valid, errors }
}

// Generate auto-mappings based on CSV headers
export function autoMapHeaders(headers: string[], preset: ImportPreset): Record<string, string> {
  const mappings: Record<string, string> = {}

  for (const header of headers) {
    const headerLower = header.toLowerCase().trim()

    // Find matching mapping in preset
    for (const mapping of preset.mappings) {
      const mappingLower = mapping.csvColumn.toLowerCase().trim()

      // Exact match
      if (headerLower === mappingLower) {
        mappings[header] = mapping.appField
        break
      }

      // Partial match for common variations
      if (
        (headerLower.includes('parcel') && mappingLower.includes('parcel')) ||
        (headerLower.includes('owner') && mappingLower.includes('owner')) ||
        (headerLower.includes('address') && mappingLower.includes('address')) ||
        (headerLower.includes('amount') && mappingLower.includes('amount')) ||
        (headerLower.includes('value') && mappingLower.includes('value'))
      ) {
        if (!mappings[header]) {
          mappings[header] = mapping.appField
        }
      }
    }
  }

  return mappings
}
