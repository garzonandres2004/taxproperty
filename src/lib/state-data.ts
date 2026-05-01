/**
 * State Guide Data - Tax Sale Information for All 50 States
 * Used by Interactive US Map and State Detail Pages
 */

export type SaleType = 'tax_deed' | 'tax_lien' | 'redeemable_deed' | 'hybrid';

export interface StateData {
  code: string;
  name: string;
  sale_type: SaleType;
  interest_rate?: string;
  redemption_period?: string;
  auction_frequency: string;
  top_counties?: string[];
  notes?: string;
  has_properties: boolean; // Whether we have properties for this state
}

export const SALE_TYPE_COLORS: Record<SaleType, { bg: string; border: string; text: string; fill: string; label: string }> = {
  tax_deed: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    fill: '#3b82f6', // blue-500
    label: 'Tax Deed'
  },
  tax_lien: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    fill: '#10b981', // emerald-500
    label: 'Tax Lien'
  },
  redeemable_deed: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    fill: '#f59e0b', // amber-500
    label: 'Redeemable Deed'
  },
  hybrid: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    fill: '#8b5cf6', // violet-500
    label: 'Hybrid'
  }
};

export const stateData: StateData[] = [
  // Tax Deed States
  {
    code: 'UT',
    name: 'Utah',
    sale_type: 'tax_deed',
    redemption_period: 'None',
    auction_frequency: 'Annual (May) + Monthly OTC',
    top_counties: ['Utah County', 'Salt Lake County', 'Davis County', 'Weber County', 'Washington County'],
    notes: 'Utah is a tax deed state. Properties not redeemed go to auction. OTC (Over The Counter) properties available year-round after auction.',
    has_properties: true
  },
  {
    code: 'CA',
    name: 'California',
    sale_type: 'tax_deed',
    redemption_period: 'None',
    auction_frequency: 'Varies by county',
    notes: 'California counties hold tax deed sales. Most counties auction annually. Redemption period expires before auction.',
    has_properties: false
  },
  {
    code: 'TX',
    name: 'Texas',
    sale_type: 'tax_deed',
    redemption_period: 'None (6 months for homestead/ag)',
    auction_frequency: 'Monthly',
    top_counties: ['Harris County', 'Dallas County', 'Tarrant County', 'Bexar County', 'Travis County'],
    notes: 'Texas holds monthly tax sales. Homestead and agricultural properties have 6-month post-sale redemption with 25% penalty.',
    has_properties: false
  },
  {
    code: 'WA',
    name: 'Washington',
    sale_type: 'tax_deed',
    redemption_period: 'None',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with annual county sales. No redemption period after sale.',
    has_properties: false
  },
  {
    code: 'OR',
    name: 'Oregon',
    sale_type: 'tax_deed',
    redemption_period: 'None',
    auction_frequency: 'Annual',
    notes: 'Annual tax deed sales at county level.',
    has_properties: false
  },
  {
    code: 'NV',
    name: 'Nevada',
    sale_type: 'tax_deed',
    redemption_period: 'None (2 years to redeem before sale)',
    auction_frequency: 'Annual',
    notes: 'Tax deed state. Properties can be redeemed up until auction date.',
    has_properties: false
  },
  {
    code: 'ID',
    name: 'Idaho',
    sale_type: 'tax_deed',
    redemption_period: '14 months after default',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 14-month redemption window after tax default.',
    has_properties: false
  },
  {
    code: 'MT',
    name: 'Montana',
    sale_type: 'tax_deed',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Three-year redemption period before deed issued.',
    has_properties: false
  },
  {
    code: 'ND',
    name: 'North Dakota',
    sale_type: 'tax_deed',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 3-year redemption period.',
    has_properties: false
  },
  {
    code: 'SD',
    name: 'South Dakota',
    sale_type: 'tax_deed',
    redemption_period: 'Varies by county',
    auction_frequency: 'Annual',
    notes: 'Tax deed with varying redemption periods by county.',
    has_properties: false
  },
  {
    code: 'NE',
    name: 'Nebraska',
    sale_type: 'tax_deed',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Three-year redemption period before tax deed issued.',
    has_properties: false
  },
  {
    code: 'KS',
    name: 'Kansas',
    sale_type: 'tax_deed',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 3-year redemption window.',
    has_properties: false
  },
  {
    code: 'OK',
    name: 'Oklahoma',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Two-year redemption period before tax deed auction.',
    has_properties: false
  },
  {
    code: 'AR',
    name: 'Arkansas',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 2-year redemption period.',
    has_properties: false
  },
  {
    code: 'LA',
    name: 'Louisiana',
    sale_type: 'tax_deed',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 3-year redemption window.',
    has_properties: false
  },
  {
    code: 'MS',
    name: 'Mississippi',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Two-year redemption before tax deed sale.',
    has_properties: false
  },
  {
    code: 'AL',
    name: 'Alabama',
    sale_type: 'tax_deed',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 3-year redemption period.',
    has_properties: false
  },
  {
    code: 'TN',
    name: 'Tennessee',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'One-year redemption period before tax deed sale.',
    has_properties: false
  },
  {
    code: 'KY',
    name: 'Kentucky',
    sale_type: 'tax_deed',
    redemption_period: 'Varies',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with varying redemption periods.',
    has_properties: false
  },
  {
    code: 'WV',
    name: 'West Virginia',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 2-year redemption window.',
    has_properties: false
  },
  {
    code: 'VA',
    name: 'Virginia',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 2-year redemption.',
    has_properties: false
  },
  {
    code: 'NC',
    name: 'North Carolina',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 2-year redemption period.',
    has_properties: false
  },
  {
    code: 'SC',
    name: 'South Carolina',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 1-year redemption.',
    has_properties: false
  },
  {
    code: 'GA',
    name: 'Georgia',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Monthly',
    top_counties: ['Fulton County', 'Gwinnett County', 'Cobb County', 'DeKalb County', 'Clayton County'],
    notes: 'Monthly tax deed sales with 1-year redemption period.',
    has_properties: false
  },
  {
    code: 'ME',
    name: 'Maine',
    sale_type: 'tax_deed',
    redemption_period: '18 months',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 18-month redemption period.',
    has_properties: false
  },
  {
    code: 'VT',
    name: 'Vermont',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 1-year redemption.',
    has_properties: false
  },
  {
    code: 'NH',
    name: 'New Hampshire',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 2-year redemption period.',
    has_properties: false
  },
  {
    code: 'MA',
    name: 'Massachusetts',
    sale_type: 'tax_deed',
    redemption_period: '6 months',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 6-month redemption.',
    has_properties: false
  },
  {
    code: 'RI',
    name: 'Rhode Island',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 1-year redemption.',
    has_properties: false
  },
  {
    code: 'CT',
    name: 'Connecticut',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 1-year redemption.',
    has_properties: false
  },
  {
    code: 'DE',
    name: 'Delaware',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 1-year redemption.',
    has_properties: false
  },
  {
    code: 'WI',
    name: 'Wisconsin',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 2-year redemption.',
    has_properties: false
  },
  {
    code: 'MI',
    name: 'Michigan',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 1-year redemption.',
    has_properties: false
  },
  {
    code: 'OH',
    name: 'Ohio',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 1-year redemption period.',
    has_properties: false
  },
  {
    code: 'IN',
    name: 'Indiana',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 1-year redemption.',
    has_properties: false
  },
  {
    code: 'IL',
    name: 'Illinois',
    sale_type: 'tax_deed',
    redemption_period: '2-3 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 2-3 year redemption depending on property type.',
    has_properties: false
  },
  {
    code: 'MO',
    name: 'Missouri',
    sale_type: 'tax_deed',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 3-year redemption.',
    has_properties: false
  },
  {
    code: 'MN',
    name: 'Minnesota',
    sale_type: 'tax_deed',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 3-year redemption period.',
    has_properties: false
  },
  {
    code: 'IA',
    name: 'Iowa',
    sale_type: 'tax_deed',
    redemption_period: '1-2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 1-2 year redemption window.',
    has_properties: false
  },
  {
    code: 'PA',
    name: 'Pennsylvania',
    sale_type: 'tax_deed',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 1-year redemption.',
    has_properties: false
  },
  {
    code: 'NJ',
    name: 'New Jersey',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed with 2-year redemption.',
    has_properties: false
  },
  {
    code: 'NY',
    name: 'New York',
    sale_type: 'tax_deed',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'Tax deed state with 2-year redemption period.',
    has_properties: false
  },

  // Tax Lien States
  {
    code: 'FL',
    name: 'Florida',
    sale_type: 'tax_lien',
    interest_rate: '18%',
    redemption_period: 'Varies by county',
    auction_frequency: 'Annual',
    top_counties: ['Miami-Dade County', 'Broward County', 'Palm Beach County', 'Hillsborough County', 'Orange County'],
    notes: 'Florida offers up to 18% interest on tax lien certificates. High competition in major counties.',
    has_properties: false
  },
  {
    code: 'AZ',
    name: 'Arizona',
    sale_type: 'tax_lien',
    interest_rate: '16%',
    redemption_period: '3 years',
    auction_frequency: 'Annual/February',
    top_counties: ['Maricopa County', 'Pima County', 'Pinal County', 'Mohave County', 'Yavapai County'],
    notes: 'Arizona sells tax lien certificates with 16% interest rate. Sales typically held in February.',
    has_properties: false
  },
  {
    code: 'CO',
    name: 'Colorado',
    sale_type: 'tax_lien',
    interest_rate: '9-15%',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Colorado offers tax lien certificates with rates varying by county (9% to 15%).',
    has_properties: false
  },
  {
    code: 'NM',
    name: 'New Mexico',
    sale_type: 'tax_lien',
    interest_rate: 'Varies',
    redemption_period: '3 years',
    auction_frequency: 'Annual',
    notes: 'Tax lien state with 3-year redemption period.',
    has_properties: false
  },
  {
    code: 'WY',
    name: 'Wyoming',
    sale_type: 'tax_lien',
    interest_rate: '18%',
    redemption_period: '4 years',
    auction_frequency: 'Annual',
    notes: 'Tax lien certificates with up to 18% interest.',
    has_properties: false
  },
  {
    code: 'MD',
    name: 'Maryland',
    sale_type: 'tax_lien',
    interest_rate: '12-24%',
    redemption_period: '2 years',
    auction_frequency: 'Annual',
    notes: 'High interest rates up to 24% in Baltimore City.',
    has_properties: false
  },
  {
    code: 'DC',
    name: 'Washington DC',
    sale_type: 'tax_lien',
    interest_rate: '18%',
    redemption_period: '6 months',
    auction_frequency: 'Annual',
    notes: 'District of Columbia tax lien sales.',
    has_properties: false
  },
  {
    code: 'IN',
    name: 'Indiana',
    sale_type: 'tax_lien',
    interest_rate: '10-15%',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Some Indiana counties use tax lien sales.',
    has_properties: false
  },
  {
    code: 'KY',
    name: 'Kentucky',
    sale_type: 'tax_lien',
    interest_rate: '12%',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Some Kentucky jurisdictions use tax liens.',
    has_properties: false
  },
  {
    code: 'SC',
    name: 'South Carolina',
    sale_type: 'tax_lien',
    interest_rate: '12%',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Some SC jurisdictions use tax lien certificates.',
    has_properties: false
  },

  // Redeemable Deed States
  {
    code: 'TX',
    name: 'Texas (Homestead)',
    sale_type: 'redeemable_deed',
    redemption_period: '6 months (25% penalty)',
    auction_frequency: 'Monthly',
    notes: 'Texas homestead and agricultural properties have 6-month redemption after sale with 25% penalty.',
    has_properties: false
  },

  // Hybrid States (Both lien and deed)
  {
    code: 'HI',
    name: 'Hawaii',
    sale_type: 'hybrid',
    interest_rate: '12%',
    redemption_period: '1 year',
    auction_frequency: 'Annual',
    notes: 'Hawaii uses a hybrid system with elements of both lien and deed sales.',
    has_properties: false
  },
  {
    code: 'AK',
    name: 'Alaska',
    sale_type: 'hybrid',
    redemption_period: 'Varies',
    auction_frequency: 'Annual',
    notes: 'Alaska municipalities may use varying systems.',
    has_properties: false
  }
];

export function getStateByCode(code: string): StateData | undefined {
  return stateData.find(state => state.code.toLowerCase() === code.toLowerCase());
}

export function getStatesBySaleType(saleType: SaleType): StateData[] {
  return stateData.filter(state => state.sale_type === saleType);
}

export function getAllSaleTypes(): { type: SaleType; count: number; label: string; color: typeof SALE_TYPE_COLORS[SaleType] }[] {
  const types: SaleType[] = ['tax_deed', 'tax_lien', 'redeemable_deed', 'hybrid'];
  return types.map(type => ({
    type,
    count: stateData.filter(s => s.sale_type === type).length,
    label: SALE_TYPE_COLORS[type].label,
    color: SALE_TYPE_COLORS[type]
  }));
}