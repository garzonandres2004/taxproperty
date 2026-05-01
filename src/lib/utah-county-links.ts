/**
 * Utah County Recorder Link Generators
 *
 * Provides direct URLs to county resources for title research and due diligence.
 * All links open in new tab for external research workflow.
 */

/**
 * Normalize parcel number for Utah County Land Records
 * Removes colons and formats for the av_serial parameter
 * Example: "01:002:0003" -> "010020003"
 */
export function normalizeParcelId(parcelNumber: string): string {
  return parcelNumber.replace(/:/g, '').trim()
}

/**
 * Generate County Recorder Deed Search URL by Owner Name
 * https://www.utahcounty.gov/LandRecords/NameSearch.asp
 *
 * Note: This requires the search form to be submitted with av_name parameter
 */
export function generateOwnerSearchUrl(ownerName: string): string {
  const encodedName = encodeURIComponent(ownerName.trim())
  // Using NameSearch.asp (capital N) as confirmed by Utah County website
  return `https://www.utahcounty.gov/LandRecords/NameSearch.asp?av_name=${encodedName}`
}

/**
 * Generate County Recorder Parcel Lookup URL
 * https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=[PARCEL_ID_NORMALIZED]
 *
 * Uses normalized parcel format (no colons)
 */
export function generateParcelLookupUrl(parcelNumber: string): string {
  const normalized = normalizeParcelId(parcelNumber)
  return `https://www.utahcounty.gov/LandRecords/Property.asp?av_serial=${normalized}`
}

/**
 * Get Document Index URL - Main Land Records Portal
 * https://www.utahcounty.gov/LandRecords/Index.asp
 */
export function getDocumentIndexUrl(): string {
  return 'https://www.utahcounty.gov/LandRecords/Index.asp'
}

/**
 * Get Utah State Court Records URL
 * For lawsuit and judgment searches
 * https://www.utcourts.gov/
 */
export function getCourtRecordsUrl(): string {
  return 'https://www.utcourts.gov/'
}

/**
 * Get Utah County GIS / Parcel Map URL
 *
 * Updated April 2025: Utah County changed their map URLs
 * Old: maps.utahcounty.gov/UtahCountyMap/ (404)
 * New: maps.utahcounty.gov/ParcelMap/ParcelMap.html
 *
 * Note: Parcel-specific deep linking is not supported.
 * Users must search manually using the parcel ID.
 */
export function getGISUrl(parcelNumber?: string): string {
  return 'https://maps.utahcounty.gov/ParcelMap/ParcelMap.html'
}

/**
 * Get Utah County Official Recorder's Office Website
 * General information about recording documents
 * https://www.utahcounty.gov/dept/Recorder/ (capital R)
 */
export function getRecordersOfficeUrl(): string {
  return 'https://www.utahcounty.gov/dept/Recorder/'
}

/**
 * Get Utah County Parcel Map (Aerial View) URL
 * Updated April 2025: New URL is ParcelMap/ParcelMap.html
 * Shows parcel boundaries with aerial imagery
 */
export function getParcelMapUrl(): string {
  return 'https://maps.utahcounty.gov/ParcelMap/ParcelMap.html'
}

/**
 * Get Utah County Assessor URL
 * For property valuation and assessment records
 * https://www.utahcounty.gov/dept/Assessor/
 */
export function getAssessorUrl(): string {
  return 'https://www.utahcounty.gov/dept/Assessor/'
}

/**
 * Generate Serial Number Search URL
 * For searching by parcel serial number
 * https://www.utahcounty.gov/LandRecords/SerialSearch.asp
 */
export function generateSerialSearchUrl(parcelNumber: string): string {
  const normalized = normalizeParcelId(parcelNumber)
  return `https://www.utahcounty.gov/LandRecords/SerialSearch.asp?av_serial=${normalized}`
}

/**
 * Interface for all generated links
 */
export interface CountyLinks {
  ownerSearch: string | null
  parcelLookup: string
  serialSearch: string
  documentIndex: string
  courtRecords: string
  gisMap: string
  parcelMap: string
  recordersOffice: string
  assessor: string
}

/**
 * Generate all county links for a property
 *
 * @param parcelNumber - Required parcel ID (e.g., "01:002:0003")
 * @param ownerName - Optional owner name for name search
 * @returns Object with all generated URLs
 */
export function generateAllCountyLinks(
  parcelNumber: string,
  ownerName?: string | null
): CountyLinks {
  const normalized = normalizeParcelId(parcelNumber)

  return {
    ownerSearch: ownerName ? generateOwnerSearchUrl(ownerName) : null,
    parcelLookup: generateParcelLookupUrl(parcelNumber),
    serialSearch: generateSerialSearchUrl(parcelNumber),
    documentIndex: getDocumentIndexUrl(),
    courtRecords: getCourtRecordsUrl(),
    gisMap: getGISUrl(),
    parcelMap: getParcelMapUrl(),
    recordersOffice: getRecordersOfficeUrl(),
    assessor: getAssessorUrl()
  }
}

/**
 * Predefined link metadata for UI display
 */
export const COUNTY_LINK_METADATA = {
  ownerSearch: {
    label: 'Deed Search by Owner',
    description: 'Search property records by owner name',
    icon: 'UserSearch',
    requiresOwner: true
  },
  parcelLookup: {
    label: 'Parcel Records',
    description: 'View tax, deed, and assessment records',
    icon: 'FileText',
    requiresOwner: false
  },
  serialSearch: {
    label: 'Serial Number Search',
    description: 'Search by parcel serial number',
    icon: 'Search',
    requiresOwner: false
  },
  documentIndex: {
    label: 'Document Index',
    description: 'Browse all recorded documents',
    icon: 'FolderOpen',
    requiresOwner: false
  },
  courtRecords: {
    label: 'Court Records',
    description: 'Search for lawsuits and judgments',
    icon: 'Scale',
    requiresOwner: false
  },
  gisMap: {
    label: 'Parcel Map',
    description: 'Official county parcel viewer with boundaries and aerial imagery',
    icon: 'Map',
    requiresOwner: false
  },
  parcelMap: {
    label: 'Parcel Map (Aerial)',
    description: 'Same as above - official parcel boundaries viewer',
    icon: 'Satellite',
    requiresOwner: false
  },
  recordersOffice: {
    label: "Recorder's Office",
    description: 'Official recorder information',
    icon: 'Building',
    requiresOwner: false
  },
  assessor: {
    label: 'Assessor Office',
    description: 'Property valuations and assessments',
    icon: 'Calculator',
    requiresOwner: false
  }
} as const

/**
 * Get external link labels and help text
 */
export const LINK_HELP_TEXT = {
  ownerSearch: 'Search recorded documents by owner name',
  parcelLookup: 'Direct link to property tax and deed records',
  gisMap: 'Interactive map - search for parcel in the map viewer',
  parcelMap: 'View parcel boundaries with aerial/satellite imagery'
}
