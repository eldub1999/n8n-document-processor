// County data service with US Census Bureau API integration
// Uses official FIPS codes for legal document management

export type County = {
  value: string;
  label: string;
  fipsCode?: string;
};

export type CountyValidationResult = {
  isValid: boolean;
  county?: County;
  fipsCode?: string;
  error?: string;
};

// Cache for API responses to minimize requests
const apiCache = new Map<string, any>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Comprehensive FIPS county data (major counties for each state)
// This provides fast dropdown population while ensuring accuracy
const COUNTIES_BY_STATE: Record<string, County[]> = {
  'AL': [
    { value: 'jefferson', label: 'Jefferson County', fipsCode: '01073' },
    { value: 'mobile', label: 'Mobile County', fipsCode: '01097' },
    { value: 'madison', label: 'Madison County', fipsCode: '01089' },
    { value: 'montgomery', label: 'Montgomery County', fipsCode: '01101' },
    { value: 'tuscaloosa', label: 'Tuscaloosa County', fipsCode: '01125' },
  ],
  'AK': [
    { value: 'anchorage', label: 'Anchorage Municipality', fipsCode: '02020' },
    { value: 'fairbanks-north-star', label: 'Fairbanks North Star Borough', fipsCode: '02090' },
    { value: 'matanuska-susitna', label: 'Matanuska-Susitna Borough', fipsCode: '02170' },
    { value: 'kenai-peninsula', label: 'Kenai Peninsula Borough', fipsCode: '02122' },
  ],
  'AZ': [
    { value: 'maricopa', label: 'Maricopa County', fipsCode: '04013' },
    { value: 'pima', label: 'Pima County', fipsCode: '04019' },
    { value: 'pinal', label: 'Pinal County', fipsCode: '04021' },
    { value: 'yavapai', label: 'Yavapai County', fipsCode: '04025' },
    { value: 'mohave', label: 'Mohave County', fipsCode: '04015' },
    { value: 'cochise', label: 'Cochise County', fipsCode: '04003' },
    { value: 'navajo', label: 'Navajo County', fipsCode: '04017' },
    { value: 'yuma', label: 'Yuma County', fipsCode: '04027' },
  ],
  'AR': [
    { value: 'pulaski', label: 'Pulaski County', fipsCode: '05119' },
    { value: 'washington', label: 'Washington County', fipsCode: '05143' },
    { value: 'benton', label: 'Benton County', fipsCode: '05007' },
    { value: 'sebastian', label: 'Sebastian County', fipsCode: '05131' },
  ],
  'CA': [
    { value: 'los-angeles', label: 'Los Angeles County', fipsCode: '06037' },
    { value: 'san-diego', label: 'San Diego County', fipsCode: '06073' },
    { value: 'orange', label: 'Orange County', fipsCode: '06059' },
    { value: 'riverside', label: 'Riverside County', fipsCode: '06065' },
    { value: 'san-bernardino', label: 'San Bernardino County', fipsCode: '06071' },
    { value: 'santa-clara', label: 'Santa Clara County', fipsCode: '06085' },
    { value: 'alameda', label: 'Alameda County', fipsCode: '06001' },
    { value: 'sacramento', label: 'Sacramento County', fipsCode: '06067' },
    { value: 'contra-costa', label: 'Contra Costa County', fipsCode: '06013' },
    { value: 'fresno', label: 'Fresno County', fipsCode: '06019' },
    { value: 'san-francisco', label: 'San Francisco County', fipsCode: '06075' },
  ],
  'CO': [
    { value: 'denver', label: 'Denver County', fipsCode: '08031' },
    { value: 'jefferson', label: 'Jefferson County', fipsCode: '08059' },
    { value: 'arapahoe', label: 'Arapahoe County', fipsCode: '08005' },
    { value: 'adams', label: 'Adams County', fipsCode: '08001' },
    { value: 'boulder', label: 'Boulder County', fipsCode: '08013' },
    { value: 'el-paso', label: 'El Paso County', fipsCode: '08041' },
    { value: 'larimer', label: 'Larimer County', fipsCode: '08069' },
    { value: 'douglas', label: 'Douglas County', fipsCode: '08035' },
  ],
  'CT': [
    { value: 'fairfield', label: 'Fairfield County', fipsCode: '09001' },
    { value: 'hartford', label: 'Hartford County', fipsCode: '09003' },
    { value: 'new-haven', label: 'New Haven County', fipsCode: '09009' },
    { value: 'new-london', label: 'New London County', fipsCode: '09011' },
  ],
  'DE': [
    { value: 'new-castle', label: 'New Castle County', fipsCode: '10003' },
    { value: 'kent', label: 'Kent County', fipsCode: '10001' },
    { value: 'sussex', label: 'Sussex County', fipsCode: '10005' },
  ],
  'FL': [
    { value: 'miami-dade', label: 'Miami-Dade County', fipsCode: '12086' },
    { value: 'broward', label: 'Broward County', fipsCode: '12011' },
    { value: 'palm-beach', label: 'Palm Beach County', fipsCode: '12099' },
    { value: 'hillsborough', label: 'Hillsborough County', fipsCode: '12057' },
    { value: 'orange', label: 'Orange County', fipsCode: '12095' },
    { value: 'pinellas', label: 'Pinellas County', fipsCode: '12103' },
    { value: 'duval', label: 'Duval County', fipsCode: '12031' },
    { value: 'lee', label: 'Lee County', fipsCode: '12071' },
  ],
  'GA': [
    { value: 'fulton', label: 'Fulton County', fipsCode: '13121' },
    { value: 'gwinnett', label: 'Gwinnett County', fipsCode: '13135' },
    { value: 'dekalb', label: 'DeKalb County', fipsCode: '13089' },
    { value: 'cobb', label: 'Cobb County', fipsCode: '13067' },
    { value: 'clayton', label: 'Clayton County', fipsCode: '13063' },
    { value: 'cherokee', label: 'Cherokee County', fipsCode: '13057' },
  ],
  'HI': [
    { value: 'honolulu', label: 'Honolulu County', fipsCode: '15003' },
    { value: 'hawaii', label: 'Hawaii County', fipsCode: '15001' },
    { value: 'maui', label: 'Maui County', fipsCode: '15009' },
    { value: 'kauai', label: 'Kauai County', fipsCode: '15007' },
  ],
  'ID': [
    { value: 'ada', label: 'Ada County', fipsCode: '16001' },
    { value: 'canyon', label: 'Canyon County', fipsCode: '16027' },
    { value: 'kootenai', label: 'Kootenai County', fipsCode: '16055' },
    { value: 'bonneville', label: 'Bonneville County', fipsCode: '16019' },
  ],
  'IL': [
    { value: 'cook', label: 'Cook County', fipsCode: '17031' },
    { value: 'dupage', label: 'DuPage County', fipsCode: '17043' },
    { value: 'lake', label: 'Lake County', fipsCode: '17097' },
    { value: 'will', label: 'Will County', fipsCode: '17197' },
    { value: 'kane', label: 'Kane County', fipsCode: '17089' },
    { value: 'mchenry', label: 'McHenry County', fipsCode: '17111' },
  ],
  'IN': [
    { value: 'marion', label: 'Marion County', fipsCode: '18097' },
    { value: 'lake', label: 'Lake County', fipsCode: '18089' },
    { value: 'allen', label: 'Allen County', fipsCode: '18003' },
    { value: 'hamilton', label: 'Hamilton County', fipsCode: '18057' },
  ],
  'IA': [
    { value: 'polk', label: 'Polk County', fipsCode: '19153' },
    { value: 'linn', label: 'Linn County', fipsCode: '19113' },
    { value: 'scott', label: 'Scott County', fipsCode: '19163' },
    { value: 'johnson', label: 'Johnson County', fipsCode: '19103' },
  ],
  'KS': [
    { value: 'johnson', label: 'Johnson County', fipsCode: '20091' },
    { value: 'sedgwick', label: 'Sedgwick County', fipsCode: '20173' },
    { value: 'wyandotte', label: 'Wyandotte County', fipsCode: '20209' },
    { value: 'shawnee', label: 'Shawnee County', fipsCode: '20177' },
  ],
  'KY': [
    { value: 'jefferson', label: 'Jefferson County', fipsCode: '21111' },
    { value: 'fayette', label: 'Fayette County', fipsCode: '21067' },
    { value: 'kenton', label: 'Kenton County', fipsCode: '21117' },
    { value: 'boone', label: 'Boone County', fipsCode: '21015' },
  ],
  'LA': [
    { value: 'orleans', label: 'Orleans Parish', fipsCode: '22071' },
    { value: 'jefferson', label: 'Jefferson Parish', fipsCode: '22051' },
    { value: 'east-baton-rouge', label: 'East Baton Rouge Parish', fipsCode: '22033' },
    { value: 'caddo', label: 'Caddo Parish', fipsCode: '22017' },
  ],
  'ME': [
    { value: 'cumberland', label: 'Cumberland County', fipsCode: '23005' },
    { value: 'york', label: 'York County', fipsCode: '23031' },
    { value: 'penobscot', label: 'Penobscot County', fipsCode: '23019' },
    { value: 'kennebec', label: 'Kennebec County', fipsCode: '23011' },
  ],
  'MD': [
    { value: 'montgomery', label: 'Montgomery County', fipsCode: '24031' },
    { value: 'prince-georges', label: 'Prince George\'s County', fipsCode: '24033' },
    { value: 'baltimore', label: 'Baltimore County', fipsCode: '24005' },
    { value: 'anne-arundel', label: 'Anne Arundel County', fipsCode: '24003' },
  ],
  'MA': [
    { value: 'middlesex', label: 'Middlesex County', fipsCode: '25017' },
    { value: 'worcester', label: 'Worcester County', fipsCode: '25027' },
    { value: 'norfolk', label: 'Norfolk County', fipsCode: '25021' },
    { value: 'suffolk', label: 'Suffolk County', fipsCode: '25025' },
  ],
  'MI': [
    { value: 'wayne', label: 'Wayne County', fipsCode: '26163' },
    { value: 'oakland', label: 'Oakland County', fipsCode: '26125' },
    { value: 'macomb', label: 'Macomb County', fipsCode: '26099' },
    { value: 'kent', label: 'Kent County', fipsCode: '26081' },
  ],
  'MN': [
    { value: 'hennepin', label: 'Hennepin County', fipsCode: '27053' },
    { value: 'ramsey', label: 'Ramsey County', fipsCode: '27123' },
    { value: 'dakota', label: 'Dakota County', fipsCode: '27037' },
    { value: 'anoka', label: 'Anoka County', fipsCode: '27003' },
  ],
  'MS': [
    { value: 'hinds', label: 'Hinds County', fipsCode: '28049' },
    { value: 'harrison', label: 'Harrison County', fipsCode: '28047' },
    { value: 'rankin', label: 'Rankin County', fipsCode: '28121' },
    { value: 'jackson', label: 'Jackson County', fipsCode: '28059' },
  ],
  'MO': [
    { value: 'st-louis', label: 'St. Louis County', fipsCode: '29189' },
    { value: 'jackson', label: 'Jackson County', fipsCode: '29095' },
    { value: 'st-charles', label: 'St. Charles County', fipsCode: '29183' },
    { value: 'jefferson', label: 'Jefferson County', fipsCode: '29099' },
  ],
  'MT': [
    { value: 'yellowstone', label: 'Yellowstone County', fipsCode: '30111' },
    { value: 'missoula', label: 'Missoula County', fipsCode: '30063' },
    { value: 'gallatin', label: 'Gallatin County', fipsCode: '30031' },
    { value: 'flathead', label: 'Flathead County', fipsCode: '30029' },
  ],
  'NE': [
    { value: 'douglas', label: 'Douglas County', fipsCode: '31055' },
    { value: 'lancaster', label: 'Lancaster County', fipsCode: '31109' },
    { value: 'sarpy', label: 'Sarpy County', fipsCode: '31153' },
    { value: 'hall', label: 'Hall County', fipsCode: '31079' },
  ],
  'NV': [
    { value: 'clark', label: 'Clark County', fipsCode: '32003' },
    { value: 'washoe', label: 'Washoe County', fipsCode: '32031' },
    { value: 'carson-city', label: 'Carson City', fipsCode: '32510' },
    { value: 'lyon', label: 'Lyon County', fipsCode: '32019' },
    { value: 'douglas', label: 'Douglas County', fipsCode: '32005' },
  ],
  'NH': [
    { value: 'hillsborough', label: 'Hillsborough County', fipsCode: '33011' },
    { value: 'rockingham', label: 'Rockingham County', fipsCode: '33015' },
    { value: 'merrimack', label: 'Merrimack County', fipsCode: '33013' },
    { value: 'strafford', label: 'Strafford County', fipsCode: '33017' },
  ],
  'NJ': [
    { value: 'bergen', label: 'Bergen County', fipsCode: '34003' },
    { value: 'middlesex', label: 'Middlesex County', fipsCode: '34023' },
    { value: 'essex', label: 'Essex County', fipsCode: '34013' },
    { value: 'hudson', label: 'Hudson County', fipsCode: '34017' },
  ],
  'NM': [
    { value: 'bernalillo', label: 'Bernalillo County', fipsCode: '35001' },
    { value: 'dona-ana', label: 'Doña Ana County', fipsCode: '35013' },
    { value: 'santa-fe', label: 'Santa Fe County', fipsCode: '35049' },
    { value: 'sandoval', label: 'Sandoval County', fipsCode: '35043' },
  ],
  'NY': [
    { value: 'new-york', label: 'New York County (Manhattan)', fipsCode: '36061' },
    { value: 'kings', label: 'Kings County (Brooklyn)', fipsCode: '36047' },
    { value: 'queens', label: 'Queens County', fipsCode: '36081' },
    { value: 'bronx', label: 'Bronx County', fipsCode: '36005' },
    { value: 'richmond', label: 'Richmond County (Staten Island)', fipsCode: '36085' },
    { value: 'nassau', label: 'Nassau County', fipsCode: '36059' },
    { value: 'suffolk', label: 'Suffolk County', fipsCode: '36103' },
    { value: 'westchester', label: 'Westchester County', fipsCode: '36119' },
  ],
  'NC': [
    { value: 'mecklenburg', label: 'Mecklenburg County', fipsCode: '37119' },
    { value: 'wake', label: 'Wake County', fipsCode: '37183' },
    { value: 'guilford', label: 'Guilford County', fipsCode: '37081' },
    { value: 'forsyth', label: 'Forsyth County', fipsCode: '37067' },
  ],
  'ND': [
    { value: 'cass', label: 'Cass County', fipsCode: '38017' },
    { value: 'burleigh', label: 'Burleigh County', fipsCode: '38015' },
    { value: 'grand-forks', label: 'Grand Forks County', fipsCode: '38035' },
    { value: 'ward', label: 'Ward County', fipsCode: '38101' },
  ],
  'OH': [
    { value: 'cuyahoga', label: 'Cuyahoga County', fipsCode: '39035' },
    { value: 'franklin', label: 'Franklin County', fipsCode: '39049' },
    { value: 'hamilton', label: 'Hamilton County', fipsCode: '39061' },
    { value: 'montgomery', label: 'Montgomery County', fipsCode: '39113' },
  ],
  'OK': [
    { value: 'oklahoma', label: 'Oklahoma County', fipsCode: '40109' },
    { value: 'tulsa', label: 'Tulsa County', fipsCode: '40143' },
    { value: 'cleveland', label: 'Cleveland County', fipsCode: '40027' },
    { value: 'comanche', label: 'Comanche County', fipsCode: '40031' },
  ],
  'OR': [
    { value: 'multnomah', label: 'Multnomah County', fipsCode: '41051' },
    { value: 'washington', label: 'Washington County', fipsCode: '41067' },
    { value: 'clackamas', label: 'Clackamas County', fipsCode: '41005' },
    { value: 'marion', label: 'Marion County', fipsCode: '41047' },
  ],
  'PA': [
    { value: 'philadelphia', label: 'Philadelphia County', fipsCode: '42101' },
    { value: 'allegheny', label: 'Allegheny County', fipsCode: '42003' },
    { value: 'montgomery', label: 'Montgomery County', fipsCode: '42091' },
    { value: 'bucks', label: 'Bucks County', fipsCode: '42017' },
  ],
  'RI': [
    { value: 'providence', label: 'Providence County', fipsCode: '44007' },
    { value: 'kent', label: 'Kent County', fipsCode: '44003' },
    { value: 'washington', label: 'Washington County', fipsCode: '44009' },
    { value: 'newport', label: 'Newport County', fipsCode: '44005' },
  ],
  'SC': [
    { value: 'greenville', label: 'Greenville County', fipsCode: '45045' },
    { value: 'richland', label: 'Richland County', fipsCode: '45079' },
    { value: 'charleston', label: 'Charleston County', fipsCode: '45019' },
    { value: 'horry', label: 'Horry County', fipsCode: '45051' },
  ],
  'SD': [
    { value: 'minnehaha', label: 'Minnehaha County', fipsCode: '46099' },
    { value: 'pennington', label: 'Pennington County', fipsCode: '46103' },
    { value: 'lincoln', label: 'Lincoln County', fipsCode: '46083' },
    { value: 'brown', label: 'Brown County', fipsCode: '46013' },
  ],
  'TN': [
    { value: 'shelby', label: 'Shelby County', fipsCode: '47157' },
    { value: 'davidson', label: 'Davidson County', fipsCode: '47037' },
    { value: 'knox', label: 'Knox County', fipsCode: '47093' },
    { value: 'hamilton', label: 'Hamilton County', fipsCode: '47065' },
  ],
  'TX': [
    { value: 'harris', label: 'Harris County', fipsCode: '48201' },
    { value: 'dallas', label: 'Dallas County', fipsCode: '48113' },
    { value: 'tarrant', label: 'Tarrant County', fipsCode: '48439' },
    { value: 'bexar', label: 'Bexar County', fipsCode: '48029' },
    { value: 'travis', label: 'Travis County', fipsCode: '48453' },
    { value: 'collin', label: 'Collin County', fipsCode: '48085' },
    { value: 'hidalgo', label: 'Hidalgo County', fipsCode: '48215' },
    { value: 'fort-bend', label: 'Fort Bend County', fipsCode: '48157' },
    { value: 'montgomery', label: 'Montgomery County', fipsCode: '48339' },
  ],
  'UT': [
    { value: 'salt-lake', label: 'Salt Lake County', fipsCode: '49035' },
    { value: 'utah', label: 'Utah County', fipsCode: '49049' },
    { value: 'davis', label: 'Davis County', fipsCode: '49011' },
    { value: 'weber', label: 'Weber County', fipsCode: '49057' },
  ],
  'VT': [
    { value: 'chittenden', label: 'Chittenden County', fipsCode: '50007' },
    { value: 'rutland', label: 'Rutland County', fipsCode: '50021' },
    { value: 'washington', label: 'Washington County', fipsCode: '50023' },
    { value: 'windham', label: 'Windham County', fipsCode: '50025' },
  ],
  'VA': [
    { value: 'fairfax', label: 'Fairfax County', fipsCode: '51059' },
    { value: 'virginia-beach', label: 'Virginia Beach (Independent City)', fipsCode: '51810' },
    { value: 'norfolk', label: 'Norfolk (Independent City)', fipsCode: '51710' },
    { value: 'chesapeake', label: 'Chesapeake (Independent City)', fipsCode: '51550' },
  ],
  'WA': [
    { value: 'king', label: 'King County', fipsCode: '53033' },
    { value: 'pierce', label: 'Pierce County', fipsCode: '53053' },
    { value: 'snohomish', label: 'Snohomish County', fipsCode: '53061' },
    { value: 'spokane', label: 'Spokane County', fipsCode: '53063' },
    { value: 'clark', label: 'Clark County', fipsCode: '53011' },
    { value: 'thurston', label: 'Thurston County', fipsCode: '53067' },
  ],
  'WV': [
    { value: 'kanawha', label: 'Kanawha County', fipsCode: '54039' },
    { value: 'berkeley', label: 'Berkeley County', fipsCode: '54003' },
    { value: 'jefferson', label: 'Jefferson County', fipsCode: '54037' },
    { value: 'monongalia', label: 'Monongalia County', fipsCode: '54061' },
  ],
  'WI': [
    { value: 'milwaukee', label: 'Milwaukee County', fipsCode: '55079' },
    { value: 'dane', label: 'Dane County', fipsCode: '55025' },
    { value: 'waukesha', label: 'Waukesha County', fipsCode: '55133' },
    { value: 'brown', label: 'Brown County', fipsCode: '55009' },
  ],
  'WY': [
    { value: 'laramie', label: 'Laramie County', fipsCode: '56021' },
    { value: 'natrona', label: 'Natrona County', fipsCode: '56025' },
    { value: 'campbell', label: 'Campbell County', fipsCode: '56005' },
    { value: 'sweetwater', label: 'Sweetwater County', fipsCode: '56037' },
  ],
  'DC': [
    { value: 'district-of-columbia', label: 'District of Columbia', fipsCode: '11001' },
  ],
  // US Territories
  'PR': [
    { value: 'san-juan', label: 'San Juan Municipio', fipsCode: '72127' },
    { value: 'bayamon', label: 'Bayamón Municipio', fipsCode: '72021' },
    { value: 'carolina', label: 'Carolina Municipio', fipsCode: '72031' },
    { value: 'ponce', label: 'Ponce Municipio', fipsCode: '72113' },
  ],
  'VI': [
    { value: 'st-croix', label: 'St. Croix Island', fipsCode: '78010' },
    { value: 'st-john', label: 'St. John Island', fipsCode: '78020' },
    { value: 'st-thomas', label: 'St. Thomas Island', fipsCode: '78030' },
  ],
  'GU': [
    { value: 'guam', label: 'Guam', fipsCode: '66010' },
  ],
  'AS': [
    { value: 'american-samoa', label: 'American Samoa', fipsCode: '60010' },
  ],
  'MP': [
    { value: 'northern-mariana-islands', label: 'Northern Mariana Islands', fipsCode: '69085' },
  ],
};

/**
 * Get counties for a specific jurisdiction using static FIPS data
 */
export function getCountiesByJurisdiction(jurisdiction: string): County[] {
  if (jurisdiction === 'national') {
    return []; // National documents don't have counties
  }
  
  const counties = COUNTIES_BY_STATE[jurisdiction.toUpperCase()];
  if (counties && counties.length > 0) {
    // Add "All Counties" option as first choice
    return [
      { value: 'all', label: 'All Counties', fipsCode: '' },
      ...counties
    ];
  }
  
  // Fallback for states without data
  return [
    { value: 'all', label: 'All Counties', fipsCode: '' },
    { value: 'other', label: 'Other County', fipsCode: '' }
  ];
}

/**
 * Check if a jurisdiction has comprehensive county data available
 */
export function hasCountyData(jurisdiction: string): boolean {
  if (jurisdiction === 'national') {
    return false;
  }
  
  const counties = COUNTIES_BY_STATE[jurisdiction.toUpperCase()];
  return counties && counties.length > 1; // More than just "other"
}

/**
 * Get a county label by value for a specific jurisdiction
 */
export function getCountyLabel(jurisdiction: string, countyValue: string): string {
  if (countyValue === 'all') {
    return 'All Counties';
  }
  const counties = getCountiesByJurisdiction(jurisdiction);
  const county = counties.find(c => c.value === countyValue);
  return county?.label || countyValue;
}

/**
 * Get FIPS code for a specific county
 */
export function getCountyFipsCode(jurisdiction: string, countyValue: string): string | undefined {
  const counties = getCountiesByJurisdiction(jurisdiction);
  const county = counties.find(c => c.value === countyValue);
  return county?.fipsCode;
}

/**
 * Validate an address using US Census Bureau Geocoding API
 * This provides authoritative county determination for address validation
 */
export async function validateAddressAndGetCounty(
  street: string,
  city: string,
  state: string,
  zip?: string
): Promise<CountyValidationResult> {
  const cacheKey = `${street}_${city}_${state}_${zip || ''}`.toLowerCase();
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }
  
  try {
    // Build Census Bureau API URL
    const baseUrl = 'https://geocoding.geo.census.gov/geocoder/geographies/address';
    const params = new URLSearchParams({
      street: street,
      city: city,
      state: state,
      benchmark: 'Public_AR_Current',
      vintage: 'Current_Current',
      format: 'json'
    });
    
    if (zip) {
      params.append('zip', zip);
    }
    
    const response = await fetch(`${baseUrl}?${params}`);
    
    if (!response.ok) {
      throw new Error(`Census API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.result?.addressMatches?.length > 0) {
      const match = data.result.addressMatches[0];
      const geographies = match.geographies;
      
      if (geographies?.Counties?.length > 0) {
        const censusCounty = geographies.Counties[0];
        const countyName = censusCounty.NAME;
        const fipsCode = censusCounty.COUNTY;
        const stateFips = censusCounty.STATE;
        
        const result: CountyValidationResult = {
          isValid: true,
          county: {
            value: countyName.toLowerCase().replace(/\s+/g, '-'),
            label: `${countyName} County`,
            fipsCode: `${stateFips}${fipsCode}`
          },
          fipsCode: `${stateFips}${fipsCode}`
        };
        
        // Cache the result
        apiCache.set(cacheKey, {
          result,
          timestamp: Date.now()
        });
        
        return result;
      }
    }
    
    return {
      isValid: false,
      error: 'Address not found or county could not be determined'
    };
    
  } catch (error) {
    console.warn('Census Bureau API error:', error);
    
    // Fallback to static data based on state
    const counties = getCountiesByJurisdiction(state);
    if (counties.length > 0) {
      return {
        isValid: false,
        error: 'API unavailable, please select county manually'
      };
    }
    
    return {
      isValid: false,
      error: 'Unable to validate address and determine county'
    };
  }
}

/**
 * Get all available states/jurisdictions
 */
export function getAvailableJurisdictions(): string[] {
  return Object.keys(COUNTIES_BY_STATE);
}

/**
 * Check if a county value represents "all counties" in a jurisdiction
 */
export function isAllCounties(countyValue: string): boolean {
  return countyValue === 'all';
}

/**
 * Get comprehensive county statistics
 */
export function getCountyStats(): { totalStates: number; totalCounties: number; statesWithData: number } {
  const totalStates = Object.keys(COUNTIES_BY_STATE).length;
  const totalCounties = Object.values(COUNTIES_BY_STATE).reduce((sum, counties) => sum + counties.length, 0);
  const statesWithData = Object.values(COUNTIES_BY_STATE).filter(counties => counties.length > 1).length;
  
  return {
    totalStates,
    totalCounties,
    statesWithData
  };
} 