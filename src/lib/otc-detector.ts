// OTC (Over The Counter) Detection Utility
// Detects unsold properties from previous auctions based on notes/content

/**
 * Check if a property is OTC (Over The Counter) based on notes or other indicators
 * OTC properties are unsold from previous auctions and available for direct purchase
 *
 * @param notes - Property notes field content
 * @returns boolean indicating if property is OTC
 */
export function detectOTCFromNotes(notes: string | null | undefined): boolean {
  if (!notes) return false;

  const lowerNotes = notes.toLowerCase();

  // Keywords that indicate OTC status
  const otcIndicators = [
    'otc',
    'over the counter',
    'over-the-counter',
    'unsold',
    'struck off',
    'passed at auction',
    'not sold',
    'remaining',
    'leftover',
    'surplus',
    'available for direct purchase'
  ];

  return otcIndicators.some(indicator => lowerNotes.includes(indicator));
}

/**
 * Auto-detect OTC status from multiple property fields
 * Used during import/processing to set is_otc flag
 *
 * @param data - Object containing property data
 * @returns boolean indicating if property should be marked as OTC
 */
export function autoDetectOTC(data: {
  notes?: string | null;
  status?: string | null;
  is_otc?: boolean | null;
}): boolean {
  // Already explicitly marked as OTC
  if (data.is_otc === true) return true;

  // Check status field
  if (data.status) {
    const statusLower = data.status.toLowerCase();
    if (statusLower === 'struck_off' || statusLower === 'passed') {
      return true;
    }
  }

  // Check notes for OTC indicators
  if (detectOTCFromNotes(data.notes)) {
    return true;
  }

  return false;
}

/**
 * Process an array of properties and mark OTC status
 * @param properties - Array of property objects to process
 * @returns Properties with updated is_otc field
 */
export function processOTCProperties<T extends { notes?: string | null; status?: string | null; is_otc?: boolean | null }>(
  properties: T[]
): (T & { is_otc: boolean })[] {
  return properties.map(property => ({
    ...property,
    is_otc: autoDetectOTC(property)
  }));
}
