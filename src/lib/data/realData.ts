import type { Activity, FoodOption } from '../types';
import { getCityActivities, getCityFood } from './mockData';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  categories: { name: string; id: number }[];
  location: {
    formatted_address: string;
    neighborhood?: string[];
    locality?: string;
  };
  distance?: number;
  popularity?: number;
  price?: number; // 1-4 scale
  rating?: number;
  description?: string;
}

// ─── Nominatim geocoding (free, no key required) ──────────────────────────────

export async function geocodeCity(city: string): Promise<GeoResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'PerfectSaturdayPlanner/1.0 (contact@example.com)',
        'Accept-Language': 'en',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data || data.length === 0) return null;

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch {
    return null;
  }
}

// ─── Foursquare category IDs ──────────────────────────────────────────────────

// Category IDs from Foursquare taxonomy
const INTEREST_CATEGORY_MAP: Record<string, string[]> = {
  food:        ['13000', '13003', '13009', '13040', '13145'],  // dining, cafes, restaurants
  coffee:      ['13032', '13034'],                               // coffee shops
  music:       ['10032', '10025', '10026'],                      // music venues
  art:         ['10027', '10007', '10009'],                      // art galleries, museums
  culture:     ['10004', '10024', '10027'],                      // cultural venues
  nature:      ['16000', '16020', '16025', '16032'],             // parks, gardens
  walks:       ['16000', '16032'],                               // parks, trails
  books:       ['17014', '17069'],                               // bookstores
  shopping:    ['17000', '17069'],                               // retail
  history:     ['10004', '10024'],                               // historic sites
  photography: ['10027', '16032', '10009'],                      // galleries, parks
  sports:      ['18000', '18015', '18019'],                      // sports venues
};

function categoriesToQuery(interests: string[]): string {
  const ids = new Set<string>();
  for (const interest of interests) {
    const cats = INTEREST_CATEGORY_MAP[interest.toLowerCase()] || [];
    cats.forEach((id) => ids.add(id));
  }
  return Array.from(ids).join(',');
}

// ─── Foursquare search ────────────────────────────────────────────────────────

async function searchFoursquare(
  lat: number,
  lng: number,
  categories: string,
  query?: string,
  limit = 8
): Promise<FoursquarePlace[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) return [];

  const params = new URLSearchParams({
    ll: `${lat},${lng}`,
    radius: '5000',
    limit: String(limit),
    sort: 'POPULARITY',
  });

  if (categories) params.set('categories', categories);
  if (query) params.set('query', query);

  try {
    const res = await fetch(`https://api.foursquare.com/v3/places/search?${params}`, {
      headers: {
        Authorization: apiKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(7000),
    });

    if (!res.ok) {
      console.warn(`[Foursquare] ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return (data.results || []) as FoursquarePlace[];
  } catch (err) {
    console.warn('[Foursquare] fetch error:', err);
    return [];
  }
}

// ─── Map Foursquare → Activity ─────────────────────────────────────────────────

function priceToEstimate(price: number | undefined, type: 'activity' | 'food'): number {
  // Foursquare price: 1 (cheap) to 4 (expensive)
  if (!price) return type === 'activity' ? 0 : 300;
  if (type === 'food') {
    return [0, 200, 400, 700, 1200][price] || 400;
  }
  return [0, 0, 100, 300, 600][price] || 0;
}

function mapToActivity(place: FoursquarePlace, index: number): Activity {
  const category = place.categories[0]?.name || 'attraction';
  const neighbourhood = place.location.neighborhood?.[0] || place.location.locality || 'Local area';

  return {
    id: `fsq-act-${place.fsq_id}`,
    name: place.name,
    category: category.toLowerCase(),
    location: place.location.formatted_address || place.name,
    neighbourhood,
    duration: '1.5 hours',
    cost: priceToEstimate(place.price, 'activity'),
    description:
      place.description ||
      `${place.name} is a popular ${category.toLowerCase()} in ${neighbourhood}. A great addition to your Saturday.`,
    tags: place.categories.map((c) => c.name.toLowerCase()),
    intensityLevel: 'medium',
    crowdLevel: index < 2 ? 'busy' : 'moderate',
    bestTimeToVisit: 'Check ahead for opening hours',
  };
}

function mapToFoodOption(place: FoursquarePlace): FoodOption {
  const cuisine = place.categories[0]?.name || 'Restaurant';
  const neighbourhood = place.location.neighborhood?.[0] || place.location.locality || 'Local area';

  return {
    id: `fsq-food-${place.fsq_id}`,
    name: place.name,
    cuisine,
    location: place.location.formatted_address || place.name,
    neighbourhood,
    pricePerPerson: priceToEstimate(place.price, 'food'),
    description:
      place.description ||
      `${place.name} is a well-regarded ${cuisine.toLowerCase()} spot in ${neighbourhood}.`,
    dietaryOptions: ['vegetarian-options', 'non-vegetarian'],
    ambience: 'Casual, welcoming',
    crowdLevel: 'moderate',
    tags: place.categories.map((c) => c.name.toLowerCase()),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RealDataResult<T> {
  data: T[];
  source: 'foursquare' | 'mock';
}

export async function getRealActivities(
  city: string,
  interests: string[]
): Promise<RealDataResult<Activity>> {
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    return { data: getCityActivities(city), source: 'mock' };
  }

  try {
    const geo = await geocodeCity(city);
    if (!geo) {
      return { data: getCityActivities(city), source: 'mock' };
    }

    const categories = categoriesToQuery(interests);
    const places = await searchFoursquare(geo.lat, geo.lng, categories, undefined, 8);

    if (places.length === 0) {
      return { data: getCityActivities(city), source: 'mock' };
    }

    // Merge: real data first, then supplement with mock to ensure coverage
    const realActivities = places.map((p, i) => mapToActivity(p, i));
    const mockActivities = getCityActivities(city);

    // Deduplicate by name similarity (simple check)
    const realNames = new Set(realActivities.map((a) => a.name.toLowerCase()));
    const uniqueMock = mockActivities.filter(
      (m) => !realNames.has(m.name.toLowerCase())
    );

    return {
      data: [...realActivities, ...uniqueMock.slice(0, 3)],
      source: 'foursquare',
    };
  } catch {
    return { data: getCityActivities(city), source: 'mock' };
  }
}

export async function getRealFoodOptions(
  city: string,
  constraints: string[]
): Promise<RealDataResult<FoodOption>> {
  const apiKey = process.env.FOURSQUARE_API_KEY;

  if (!apiKey) {
    return { data: getCityFood(city), source: 'mock' };
  }

  try {
    const geo = await geocodeCity(city);
    if (!geo) {
      return { data: getCityFood(city), source: 'mock' };
    }

    const isVegetarian = constraints.some((c) =>
      c.toLowerCase().includes('veg')
    );

    // Search for food places — add vegetarian query if constraint present
    const query = isVegetarian ? 'vegetarian restaurant cafe' : 'restaurant cafe';
    const places = await searchFoursquare(geo.lat, geo.lng, '13000,13032', query, 8);

    if (places.length === 0) {
      return { data: getCityFood(city), source: 'mock' };
    }

    const realFood = places.map((p) => {
      const food = mapToFoodOption(p);
      // If user is vegetarian, mark options as vegetarian-friendly
      if (isVegetarian) {
        food.dietaryOptions = ['vegetarian', 'vegan-options'];
      }
      return food;
    });

    const mockFood = getCityFood(city);
    const realNames = new Set(realFood.map((f) => f.name.toLowerCase()));
    const uniqueMock = mockFood.filter((m) => !realNames.has(m.name.toLowerCase()));

    return {
      data: [...realFood, ...uniqueMock.slice(0, 2)],
      source: 'foursquare',
    };
  } catch {
    return { data: getCityFood(city), source: 'mock' };
  }
}

// ─── Currency from geocoding ──────────────────────────────────────────────────

export function getCurrencyFromCountryCode(countryCode: string): string {
  const map: Record<string, string> = {
    IN: '₹', GB: '£', US: '$', EU: '€', JP: '¥', AU: 'A$', CA: 'C$',
    SG: 'S$', AE: 'د.إ', FR: '€', DE: '€', IT: '€', ES: '€',
  };
  return map[countryCode.toUpperCase()] || '₹';
}
