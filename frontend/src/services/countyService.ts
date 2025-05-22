// County data service for US jurisdictions
// For simplicity, providing major counties for each state
// In a production system, this would likely come from an API or database

export type County = {
  value: string;
  label: string;
};

// Sample major counties by state (abbreviated list for demo)
const COUNTIES_BY_STATE: Record<string, County[]> = {
  'CA': [
    { value: 'los-angeles', label: 'Los Angeles County' },
    { value: 'san-francisco', label: 'San Francisco County' },
    { value: 'san-diego', label: 'San Diego County' },
    { value: 'orange', label: 'Orange County' },
    { value: 'riverside', label: 'Riverside County' },
    { value: 'san-bernardino', label: 'San Bernardino County' },
    { value: 'santa-clara', label: 'Santa Clara County' },
    { value: 'alameda', label: 'Alameda County' },
  ],
  'TX': [
    { value: 'harris', label: 'Harris County' },
    { value: 'dallas', label: 'Dallas County' },
    { value: 'tarrant', label: 'Tarrant County' },
    { value: 'bexar', label: 'Bexar County' },
    { value: 'travis', label: 'Travis County' },
    { value: 'collin', label: 'Collin County' },
    { value: 'hidalgo', label: 'Hidalgo County' },
  ],
  'FL': [
    { value: 'miami-dade', label: 'Miami-Dade County' },
    { value: 'broward', label: 'Broward County' },
    { value: 'palm-beach', label: 'Palm Beach County' },
    { value: 'orange', label: 'Orange County' },
    { value: 'hillsborough', label: 'Hillsborough County' },
    { value: 'pinellas', label: 'Pinellas County' },
  ],
  'NY': [
    { value: 'new-york', label: 'New York County (Manhattan)' },
    { value: 'kings', label: 'Kings County (Brooklyn)' },
    { value: 'queens', label: 'Queens County' },
    { value: 'bronx', label: 'Bronx County' },
    { value: 'richmond', label: 'Richmond County (Staten Island)' },
    { value: 'nassau', label: 'Nassau County' },
    { value: 'suffolk', label: 'Suffolk County' },
    { value: 'westchester', label: 'Westchester County' },
  ],
  'IL': [
    { value: 'cook', label: 'Cook County' },
    { value: 'dupage', label: 'DuPage County' },
    { value: 'lake', label: 'Lake County' },
    { value: 'will', label: 'Will County' },
    { value: 'kane', label: 'Kane County' },
  ],
  // Add more states as needed...
};

/**
 * Get counties for a specific jurisdiction
 */
export function getCountiesByJurisdiction(jurisdiction: string): County[] {
  if (jurisdiction === 'national') {
    return []; // National documents don't have counties
  }
  
  return COUNTIES_BY_STATE[jurisdiction.toUpperCase()] || [
    { value: 'other', label: 'Other County' }
  ];
}

/**
 * Check if a jurisdiction has county data available
 */
export function hasCountyData(jurisdiction: string): boolean {
  if (jurisdiction === 'national') {
    return false;
  }
  
  return !!COUNTIES_BY_STATE[jurisdiction.toUpperCase()];
}

/**
 * Get a county label by value for a specific jurisdiction
 */
export function getCountyLabel(jurisdiction: string, countyValue: string): string {
  const counties = getCountiesByJurisdiction(jurisdiction);
  const county = counties.find(c => c.value === countyValue);
  return county?.label || countyValue;
} 