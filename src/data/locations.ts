import { City, Country, State, ICity, ICountry } from "country-state-city";

export interface CountryEntry {
  code: string;
  name: string;
  flag?: string;
}

const MAIN_CITY_SOFT_CAP = 400;
const SMALL_COUNTRY_ALL_THRESHOLD = 200;

/** Major cities that should always appear for large countries (by ISO code). */
const PRIORITY_CITIES: Record<string, string[]> = {
  US: [
    "New York", "Los Angeles", "Chicago", "Houston", "Phoenix", "Philadelphia",
    "San Antonio", "San Diego", "Dallas", "San Jose", "Austin", "Jacksonville",
    "Fort Worth", "Columbus", "Charlotte", "San Francisco", "Indianapolis",
    "Seattle", "Denver", "Washington", "Boston", "El Paso", "Nashville",
    "Detroit", "Oklahoma City", "Portland", "Las Vegas", "Memphis", "Louisville",
    "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento",
    "Mesa", "Kansas City", "Atlanta", "Miami", "Raleigh", "Omaha", "Minneapolis",
    "Tampa", "Orlando", "Cleveland", "Pittsburgh", "Cincinnati",
  ],
  PK: [
    "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan",
    "Peshawar", "Quetta", "Sialkot", "Gujranwala", "Hyderabad", "Sukkur",
    "Bahawalpur", "Sargodha", "Abbottabad", "Mardan", "Mingora", "Rahim Yar Khan",
    "Sahiwal", "Okara", "Sheikhupura", "Jhelum", "Gujrat", "Kasur", "Dera Ghazi Khan",
  ],
  IN: [
    "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata",
    "Pune", "Jaipur", "Surat", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane",
    "Bhopal", "Visakhapatnam", "Patna", "Vadodara", "Ghaziabad", "Ludhiana",
    "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar",
    "Amritsar", "Chandigarh", "Coimbatore", "Kochi", "Mysuru", "Noida", "Gurgaon",
  ],
  GB: [
    "London", "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds",
    "Sheffield", "Edinburgh", "Bristol", "Cardiff", "Belfast", "Leicester",
    "Coventry", "Nottingham", "Newcastle upon Tyne", "Southampton", "Portsmouth",
    "Brighton", "Reading", "Oxford", "Cambridge", "Aberdeen", "Dundee",
  ],
  CA: [
    "Toronto", "Montreal", "Vancouver", "Calgary", "Edmonton", "Ottawa",
    "Winnipeg", "Quebec City", "Hamilton", "Kitchener", "London", "Victoria",
    "Halifax", "Oshawa", "Windsor", "Saskatoon", "Regina", "St. John's",
  ],
  AE: [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah",
    "Al Ain", "Umm Al Quwain",
  ],
  SA: [
    "Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Tabuk",
    "Abha", "Taif", "Jubail", "Yanbu", "Najran",
  ],
  AU: [
    "Sydney", "Melbourne", "Brisbane", "Perth", "Adelaide", "Gold Coast",
    "Canberra", "Newcastle", "Wollongong", "Hobart", "Geelong", "Townsville",
    "Cairns", "Darwin", "Toowoomba",
  ],
  DE: [
    "Berlin", "Hamburg", "Munich", "Cologne", "Frankfurt", "Stuttgart",
    "Düsseldorf", "Leipzig", "Dortmund", "Essen", "Bremen", "Dresden",
    "Hanover", "Nuremberg", "Duisburg",
  ],
  FR: [
    "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Montpellier",
    "Strasbourg", "Bordeaux", "Lille", "Rennes", "Reims", "Toulon",
  ],
};

function dist2(
  a: { latitude?: string | null; longitude?: string | null },
  b: { latitude?: string | null; longitude?: string | null }
): number {
  const alat = parseFloat(a.latitude || "0");
  const alng = parseFloat(a.longitude || "0");
  const blat = parseFloat(b.latitude || "0");
  const blng = parseFloat(b.longitude || "0");
  const dlat = alat - blat;
  const dlng = alng - blng;
  return dlat * dlat + dlng * dlng;
}

/**
 * List every country (ISO 3166-1), sorted by name.
 */
export function listCountries(): CountryEntry[] {
  return Country.getAllCountries()
    .map((c: ICountry) => ({
      code: c.isoCode,
      name: c.name,
      flag: c.flag,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function resolveCountry(countryQuery: string): ICountry | undefined {
  const q = countryQuery.trim().toLowerCase();
  if (!q) return undefined;
  const all = Country.getAllCountries();
  return (
    all.find((c) => c.isoCode.toLowerCase() === q) ||
    all.find((c) => c.name.toLowerCase() === q)
  );
}

/**
 * Main cities for a country (name or ISO code).
 * - Small countries: all unique city names
 * - Large countries: priority cities + ~1 per state + fill to soft cap
 */
export function listCitiesForCountry(countryQuery: string): string[] {
  const country = resolveCountry(countryQuery);
  if (!country) return [];

  const raw = City.getCitiesOfCountry(country.isoCode) || [];
  if (raw.length === 0) {
    return [country.name];
  }

  const unique = new Map<string, ICity>();
  for (const city of raw) {
    const key = city.name.trim().toLowerCase();
    if (!key) continue;
    if (!unique.has(key)) unique.set(key, city);
  }
  const cities = [...unique.values()];

  if (cities.length <= SMALL_COUNTRY_ALL_THRESHOLD) {
    return cities.map((c) => c.name).sort((a, b) => a.localeCompare(b));
  }

  const selected = new Map<string, string>();

  // Always include curated major cities when present in the dataset.
  const priorities = PRIORITY_CITIES[country.isoCode] || [];
  for (const name of priorities) {
    const key = name.toLowerCase();
    const match =
      unique.get(key) ||
      cities.find((c) => c.name.toLowerCase().includes(key) || key.includes(c.name.toLowerCase()));
    if (match) {
      selected.set(match.name.toLowerCase(), match.name);
    } else {
      // Still surface the well-known name even if package spelling differs slightly.
      selected.set(key, name);
    }
  }

  const states = State.getStatesOfCountry(country.isoCode) || [];
  for (const state of states) {
    const inState = cities.filter((c) => c.stateCode === state.isoCode);
    if (inState.length === 0) continue;

    const nameMatch = inState.find(
      (c) => c.name.toLowerCase() === state.name.toLowerCase()
    );
    const pick =
      nameMatch ||
      inState.reduce((best, c) =>
        dist2(c, state) < dist2(best, state) ? c : best
      );

    selected.set(pick.name.toLowerCase(), pick.name);
  }

  const ranked = [...cities].sort(
    (a, b) => dist2(a, country) - dist2(b, country)
  );
  for (const city of ranked) {
    if (selected.size >= MAIN_CITY_SOFT_CAP) break;
    selected.set(city.name.toLowerCase(), city.name);
  }

  return [...selected.values()].sort((a, b) => a.localeCompare(b));
}

export function findCountryByNameOrCode(query: string): CountryEntry | undefined {
  const c = resolveCountry(query);
  if (!c) return undefined;
  return { code: c.isoCode, name: c.name, flag: c.flag };
}
