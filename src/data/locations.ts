import { City, Country, State, ICity, ICountry } from "country-state-city";

export interface CountryEntry {
  code: string;
  name: string;
  flag?: string;
}

const MAIN_CITY_SOFT_CAP = 150;
const SMALL_COUNTRY_ALL_THRESHOLD = 100;

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
 * - Large countries: ~1 city near each state centroid + fill to soft cap
 */
export function listCitiesForCountry(countryQuery: string): string[] {
  const country = resolveCountry(countryQuery);
  if (!country) return [];

  const raw = City.getCitiesOfCountry(country.isoCode) || [];
  if (raw.length === 0) {
    // Territories / city-states with no city rows — use country name as the city option
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

  const selected = new Map<string, string>(); // lower -> display name
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

  // Fill remaining slots with cities closest to the country center
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
