/**
 * Static data adapter for Cloudflare Pages deployment
 * Uses exported JSON instead of SQLite database
 */

import propertiesData from '../../public/data/properties.json';
import statsData from '../../public/data/stats.json';

export interface Property {
  id: string;
  county: string;
  parcel_number: string;
  owner_name?: string | null;
  owner_mailing_address?: string | null;
  property_address?: string | null;
  legal_description?: string | null;
  total_amount_due?: number | null;
  assessed_value?: number | null;
  estimated_market_value?: number | null;
  property_type: string;
  zoning?: string | null;
  lot_size_sqft?: number | null;
  building_sqft?: number | null;
  year_built?: number | null;
  photo_url?: string | null;
  aerial_url?: string | null;
  opportunity_score?: number | null;
  risk_score?: number | null;
  final_score?: number | null;
  recommendation?: string | null;
  max_bid?: number | null;
  absentee_owner?: boolean | null;
  micro_parcel?: boolean | null;
  status: string;
  created_at: string;
  updated_at: string;
  zoningProfile?: ZoningProfile | null;
  sources?: Source[];
}

export interface ZoningProfile {
  id: string;
  property_id: string;
  jurisdiction: string;
  zoning_code?: string | null;
  zoning_name?: string | null;
  land_use_designation?: string | null;
  min_lot_size_sqft?: number | null;
  min_lot_size_acres?: number | null;
  front_setback_ft?: number | null;
  side_setback_ft?: number | null;
  rear_setback_ft?: number | null;
  max_height_ft?: number | null;
  max_lot_coverage_percent?: number | null;
  has_slope_restrictions: boolean;
  has_floodplain_restrictions: boolean;
  buildability_score: number;
  best_use_ideas?: string | null;
  notes?: string | null;
}

export interface Source {
  id: string;
  property_id: string;
  label: string;
  url?: string | null;
  source_type: string;
}

// Type assertion for imported JSON
const properties = (propertiesData as any[]) as Property[];
const stats = statsData as {
  total: number;
  bid: number;
  research: number;
  avoid: number;
  withImages: number;
  avgScore: number;
  saleDate: string;
  county: string;
};

export const StaticData = {
  // Get all properties
  getProperties: (): Property[] => {
    return properties;
  },

  // Get property by ID
  getPropertyById: (id: string): Property | undefined => {
    return properties.find(p => p.id === id);
  },

  // Get property by parcel number
  getPropertyByParcel: (parcel: string): Property | undefined => {
    return properties.find(p => p.parcel_number === parcel);
  },

  // Get stats
  getStats: () => stats,

  // Search properties
  searchProperties: (query: string): Property[] => {
    const q = query.toLowerCase();
    return properties.filter(p =>
      p.parcel_number.toLowerCase().includes(q) ||
      p.property_address?.toLowerCase().includes(q) ||
      p.owner_name?.toLowerCase().includes(q) ||
      p.legal_description?.toLowerCase().includes(q)
    );
  },

  // Filter by recommendation
  getByRecommendation: (rec: string): Property[] => {
    return properties.filter(p => p.recommendation === rec);
  },

  // Get top opportunities
  getTopOpportunities: (limit: number = 10): Property[] => {
    return properties
      .filter(p => p.recommendation === 'bid' || p.recommendation === 'research_more')
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
      .slice(0, limit);
  },
};
