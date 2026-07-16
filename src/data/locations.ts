export interface CountryEntry {
  code: string;
  name: string;
  cities: string[];
}

/**
 * Curated country → city picklists for onboarding / location setup.
 * Extend as needed; kept in-memory for fast lookup.
 */
export const LOCATION_DATA: CountryEntry[] = [
  {
    code: "PK",
    name: "Pakistan",
    cities: [
      "Karachi",
      "Lahore",
      "Islamabad",
      "Rawalpindi",
      "Faisalabad",
      "Multan",
      "Peshawar",
      "Quetta",
      "Sialkot",
      "Gujranwala",
      "Hyderabad",
      "Abbottabad",
      "Bahawalpur",
      "Sargodha",
      "Sukkur",
      "Mardan",
      "Mingora",
      "Sheikhupura",
      "Jhang",
      "Rahim Yar Khan",
    ],
  },
  {
    code: "IN",
    name: "India",
    cities: [
      "Mumbai",
      "Delhi",
      "Bengaluru",
      "Hyderabad",
      "Chennai",
      "Kolkata",
      "Pune",
      "Ahmedabad",
      "Jaipur",
      "Surat",
      "Lucknow",
      "Kanpur",
      "Nagpur",
      "Indore",
      "Bhopal",
      "Patna",
      "Chandigarh",
      "Kochi",
      "Coimbatore",
      "Visakhapatnam",
    ],
  },
  {
    code: "AE",
    name: "United Arab Emirates",
    cities: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Al Ain"],
  },
  {
    code: "SA",
    name: "Saudi Arabia",
    cities: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Khobar", "Tabuk", "Abha"],
  },
  {
    code: "US",
    name: "United States",
    cities: [
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "Phoenix",
      "Philadelphia",
      "San Antonio",
      "San Diego",
      "Dallas",
      "San Jose",
      "Austin",
      "Jacksonville",
      "Seattle",
      "Denver",
      "Boston",
      "Atlanta",
      "Miami",
      "Washington",
    ],
  },
  {
    code: "GB",
    name: "United Kingdom",
    cities: [
      "London",
      "Manchester",
      "Birmingham",
      "Leeds",
      "Glasgow",
      "Liverpool",
      "Bristol",
      "Edinburgh",
      "Sheffield",
      "Cardiff",
      "Belfast",
      "Newcastle",
    ],
  },
  {
    code: "CA",
    name: "Canada",
    cities: [
      "Toronto",
      "Vancouver",
      "Montreal",
      "Calgary",
      "Ottawa",
      "Edmonton",
      "Winnipeg",
      "Quebec City",
      "Hamilton",
      "Halifax",
    ],
  },
  {
    code: "AU",
    name: "Australia",
    cities: [
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide",
      "Canberra",
      "Gold Coast",
      "Hobart",
      "Darwin",
    ],
  },
  {
    code: "BD",
    name: "Bangladesh",
    cities: ["Dhaka", "Chittagong", "Khulna", "Rajshahi", "Sylhet", "Barisal", "Rangpur", "Comilla"],
  },
  {
    code: "TR",
    name: "Turkey",
    cities: ["Istanbul", "Ankara", "Izmir", "Bursa", "Antalya", "Gaziantep", "Konya", "Adana"],
  },
  {
    code: "EG",
    name: "Egypt",
    cities: ["Cairo", "Alexandria", "Giza", "Sharm El Sheikh", "Luxor", "Aswan", "Port Said"],
  },
  {
    code: "DE",
    name: "Germany",
    cities: ["Berlin", "Munich", "Hamburg", "Frankfurt", "Cologne", "Stuttgart", "Düsseldorf", "Leipzig"],
  },
  {
    code: "FR",
    name: "France",
    cities: ["Paris", "Lyon", "Marseille", "Toulouse", "Nice", "Nantes", "Strasbourg", "Bordeaux"],
  },
  {
    code: "MY",
    name: "Malaysia",
    cities: ["Kuala Lumpur", "George Town", "Johor Bahru", "Ipoh", "Shah Alam", "Malacca", "Kota Kinabalu"],
  },
  {
    code: "SG",
    name: "Singapore",
    cities: ["Singapore"],
  },
  {
    code: "QA",
    name: "Qatar",
    cities: ["Doha", "Al Rayyan", "Al Wakrah", "Al Khor"],
  },
  {
    code: "KW",
    name: "Kuwait",
    cities: ["Kuwait City", "Hawalli", "Salmiya", "Farwaniya"],
  },
  {
    code: "OM",
    name: "Oman",
    cities: ["Muscat", "Salalah", "Sohar", "Nizwa"],
  },
  {
    code: "BH",
    name: "Bahrain",
    cities: ["Manama", "Riffa", "Muharraq", "Hamad Town"],
  },
  {
    code: "NG",
    name: "Nigeria",
    cities: ["Lagos", "Abuja", "Kano", "Ibadan", "Port Harcourt", "Benin City"],
  },
];

export function listCountries(): Array<{ code: string; name: string }> {
  return LOCATION_DATA.map(({ code, name }) => ({ code, name })).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function listCitiesForCountry(countryQuery: string): string[] {
  const q = countryQuery.trim().toLowerCase();
  if (!q) return [];

  const entry = LOCATION_DATA.find(
    (c) => c.code.toLowerCase() === q || c.name.toLowerCase() === q
  );
  if (!entry) return [];
  return [...entry.cities].sort((a, b) => a.localeCompare(b));
}

export function findCountryByNameOrCode(query: string): CountryEntry | undefined {
  const q = query.trim().toLowerCase();
  return LOCATION_DATA.find((c) => c.code.toLowerCase() === q || c.name.toLowerCase() === q);
}
