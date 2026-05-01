/**
 * Document Classifier for Title Analysis
 * Maps document types to their meaning and risk levels
 */

export interface DocumentTypeInfo {
  name: string
  category: DocumentCategory
  risk: 'critical' | 'high' | 'medium' | 'low' | 'neutral' | 'positive'
  note?: string
}

export type DocumentCategory =
  | 'ownership_transfer'
  | 'probate'
  | 'mortgage'
  | 'mortgage_transfer'
  | 'lien_release'
  | 'mortgage_activity'
  | 'lien'
  | 'lawsuit'
  | 'judgment'
  | 'federal_lien'
  | 'plat'
  | 'declaration'
  | 'court_order'
  | 'restriction'
  | 'unknown'

export const DOCUMENT_TYPES: Record<string, DocumentTypeInfo> = {
  // Ownership transfers
  'WD': { name: 'Warranty Deed', category: 'ownership_transfer', risk: 'low' },
  'QCD': { name: 'Quitclaim Deed', category: 'ownership_transfer', risk: 'medium', note: 'No warranty - possible dispute or gift' },
  'SP WD': { name: 'Special Warranty Deed', category: 'ownership_transfer', risk: 'low' },
  'BARG': { name: 'Bargain and Sale Deed', category: 'ownership_transfer', risk: 'low' },

  // Probate / Death
  'AF DC': { name: 'Affidavit of Death', category: 'probate', risk: 'high', note: 'Recent death - heirs may redeem' },
  'PERREPDP': { name: 'Personal Representative Deed', category: 'probate', risk: 'high' },
  'PROB': { name: 'Probate Document', category: 'probate', risk: 'high' },
  'INHTX': { name: 'Inheritance Tax Document', category: 'probate', risk: 'medium' },

  // Mortgages / Liens (get wiped by tax deed in Utah)
  'D TR': { name: 'Deed of Trust', category: 'mortgage', risk: 'neutral', note: 'Mortgage - wiped by tax deed in Utah' },
  'TR D': { name: 'Trust Deed', category: 'mortgage', risk: 'neutral', note: 'Mortgage - wiped by tax deed in Utah' },
  'MTGE': { name: 'Mortgage', category: 'mortgage', risk: 'neutral', note: 'Mortgage - wiped by tax deed in Utah' },
  'AS': { name: 'Assignment', category: 'mortgage_transfer', risk: 'neutral', note: 'Mortgage transferred to new lender' },
  'ASMT': { name: 'Assignment of Mortgage', category: 'mortgage_transfer', risk: 'neutral' },

  // Releases (GOOD - means debt was paid)
  'REC': { name: 'Reconveyance', category: 'lien_release', risk: 'positive', note: 'Mortgage/lien was paid off' },
  'REL': { name: 'Release', category: 'lien_release', risk: 'positive' },
  'RC': { name: 'Reconveyance/Release', category: 'lien_release', risk: 'positive' },
  'RREL': { name: 'Release of Lien', category: 'lien_release', risk: 'positive' },
  'RESOL': { name: 'Resolution', category: 'court_order', risk: 'neutral', note: 'Resolution/Agreement document' },

  // Trustee substitutions (mortgage activity - neutral)
  'RSUBTEE': { name: 'Reconveyance Sub Trustee', category: 'mortgage_activity', risk: 'neutral', note: 'Trustee substitution on mortgage' },
  'SUB TEE': { name: 'Substitute Trustee', category: 'mortgage_activity', risk: 'neutral', note: 'Trustee substitution on mortgage' },
  'SUBTR': { name: 'Substitution of Trustee', category: 'mortgage_activity', risk: 'neutral' },

  // Foreclosure/legal (BAD)
  'N LN': { name: 'Notice of Lien', category: 'lien', risk: 'high', note: 'Active lien - verify if it survives tax deed' },
  'NTC LIEN': { name: 'Notice of Lien', category: 'lien', risk: 'high' },
  'LIS': { name: 'Lis Pendens', category: 'lawsuit', risk: 'critical', note: 'Active lawsuit - major title cloud' },
  'LIS PEN': { name: 'Lis Pendens', category: 'lawsuit', risk: 'critical' },
  'JUDG': { name: 'Judgment', category: 'judgment', risk: 'high' },
  'JMT': { name: 'Judgment', category: 'judgment', risk: 'high' },
  'DECREE': { name: 'Court Decree', category: 'judgment', risk: 'high' },

  // Federal liens (CRITICAL - may NOT be wiped by state tax deed)
  'IRS': { name: 'IRS Federal Tax Lien', category: 'federal_lien', risk: 'critical', note: 'Federal lien - may NOT be wiped by state tax deed' },
  'FEDTX': { name: 'Federal Tax Lien', category: 'federal_lien', risk: 'critical' },
  'US LIEN': { name: 'US Government Lien', category: 'federal_lien', risk: 'critical' },

  // Plats/subdivisions
  'S PLAT': { name: 'Subdivision Plat', category: 'plat', risk: 'neutral' },
  'C PLAT': { name: 'Condo Plat', category: 'plat', risk: 'neutral' },
  'PLAT': { name: 'Plat', category: 'plat', risk: 'neutral' },
  'AM PLAT': { name: 'Amended Plat', category: 'plat', risk: 'neutral' },

  // Restrictions/Covenants
  'PRO COV': { name: 'Protective Covenant', category: 'restriction', risk: 'medium', note: 'May have use restrictions' },
  'CC&R': { name: 'Covenants Conditions & Restrictions', category: 'restriction', risk: 'medium' },
  'DECL': { name: 'Declaration', category: 'declaration', risk: 'low' },

  // Court orders
  'ORDINS': { name: 'Court Order/Ordinance', category: 'court_order', risk: 'medium' },
  'ORD': { name: 'Order', category: 'court_order', risk: 'medium' },

  // Mechanic's liens (survive tax deed in some states)
  'MECH LN': { name: 'Mechanic\'s Lien', category: 'lien', risk: 'high' },
  'M_LIEN': { name: 'Mechanic\'s Lien', category: 'lien', risk: 'high' },

  // Easements
  'EASE': { name: 'Easement', category: 'restriction', risk: 'low', note: 'May have access restrictions' },
  'EASEMENT': { name: 'Easement', category: 'restriction', risk: 'low' },

  // UCC filings (commercial liens)
  'UCC': { name: 'UCC Filing', category: 'lien', risk: 'medium' },
  'UCC FIN': { name: 'UCC Financing Statement', category: 'lien', risk: 'medium' },
}

/**
 * Classify a document by its type code
 */
export function classifyDocument(typeCode: string): DocumentTypeInfo {
  const normalized = typeCode.trim().toUpperCase()

  // Direct match
  if (DOCUMENT_TYPES[normalized]) {
    return DOCUMENT_TYPES[normalized]
  }

  // Try partial match (some type codes have extra characters)
  for (const [key, info] of Object.entries(DOCUMENT_TYPES)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return info
    }
  }

  // Unknown type
  return {
    name: typeCode,
    category: 'unknown',
    risk: 'medium',
    note: 'Unknown document type - manual review recommended'
  }
}

/**
 * Check if a document type is a red flag
 */
export function isRedFlag(typeCode: string): boolean {
  const classification = classifyDocument(typeCode)
  return classification.risk === 'critical' || classification.risk === 'high'
}

/**
 * Check if a document type is a positive signal
 */
export function isPositiveSignal(typeCode: string): boolean {
  const classification = classifyDocument(typeCode)
  return classification.risk === 'positive'
}

/**
 * Get risk score adjustment for a document type
 */
export function getRiskAdjustment(typeCode: string): number {
  const classification = classifyDocument(typeCode)
  switch (classification.risk) {
    case 'critical': return -50
    case 'high': return -25
    case 'medium': return -10
    case 'low': return -2
    case 'neutral': return 0
    case 'positive': return +5
    default: return 0
  }
}
