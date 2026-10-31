// Bangladesh Districts and Sub-regions mapping for automated extraction from address text

export interface DistrictDefinition {
  name: string;
  aliases: string[];
}

export const BANGLADESH_DISTRICTS: DistrictDefinition[] = [
  {
    name: "Dhaka",
    aliases: [
      "dhaka", "ঢাকা", "dhanmondi", "mirpur", "uttara", "gulshan", "banani",
      "motijheel", "badda", "mohammadpur", "tejgaon", "savar", "keraniganj",
      "dhamrai", "farmgate", "pallabi", "khilgaon", "ramna", "wari", "lalbagh",
      "chawkbazar", "new market", "cantonment", "diabari", "aftabnagar", "basundhara", "bashundhara"
    ],
  },
  {
    name: "Chattogram",
    aliases: [
      "chittagong", "chattogram", "চট্টগ্রাম", "ctg", "agrabad", "halishahar",
      "panchlaish", "nasirabad", "chandgaon", "khulshi", "cox's bazar", "coxs bazar",
      "কক্সবাজার", "rangamati", "bandarban", "khagrachhari", "রাঙ্গামাটি", "বান্দরবান", "খাগড়াছড়ি"
    ],
  },
  {
    name: "Gazipur",
    aliases: ["gazipur", "গাজীপুর", "tongi", "টঙ্গী", "joydebpur", "জয়দেবপুর", "sreepur", "kaliakair", "kapasia"],
  },
  {
    name: "Narayanganj",
    aliases: ["narayanganj", "নারায়ণগঞ্জ", "fatullah", "rupganj", "sonargaon", "siddhirganj", "araihazar"],
  },
  {
    name: "Sylhet",
    aliases: ["sylhet", "সিলেট", "moulvibazar", "মৌলভীবাজার", "habiganj", "হবিগঞ্জ", "sunamganj", "সুনামগঞ্জ", "beanibazar", "golapganj", "sreemangal"],
  },
  {
    name: "Rajshahi",
    aliases: ["rajshahi", "রাজশাহী", "natore", "নাটোর", "naogaon", "নওগাঁ", "chapainawabganj", "চাঁপাইনবাবগঞ্জ", "bagha", "puthia", "godagari"],
  },
  {
    name: "Bogura",
    aliases: ["bogra", "bogura", "বগুড়া", "sherpur bogra", "shibganj bogra"],
  },
  {
    name: "Sirajganj",
    aliases: ["sirajganj", "sirajgonj", "সিরাজগঞ্জ", "shahzadpur", "belkuchi", "ullapara"],
  },
  {
    name: "Pabna",
    aliases: ["pabna", "পাবনা", "ishwardi", "ঈশ্বরদী", "chatmohar"],
  },
  {
    name: "Khulna",
    aliases: ["khulna", "খুলনা", "satkhira", "সাতক্ষীরা", "bagerhat", "বাগেরহাট", "daulatpur", "khalishpur", "dumuria"],
  },
  {
    name: "Jashore",
    aliases: ["jashore", "jessore", "যশোর", "benapole", "বেনাপোল", "noapara", "keshabpur"],
  },
  {
    name: "Kushtia",
    aliases: ["kushtia", "কুষ্টিয়া", "poradah", "kumarkhali"],
  },
  {
    name: "Barishal",
    aliases: [
      "barishal", "barisal", "বরিশাল", "bhola", "ভোলা", "patuakhali", "পটুয়াখালী",
      "pirojpur", "পিরোজপুর", "jhalokathi", "ঝালকাঠি", "barguna", "বরগুনা", "kuakata"
    ],
  },
  {
    name: "Rangpur",
    aliases: [
      "rangpur", "রংপুর", "dinajpur", "দিনাজপুর", "kurigram", "কুড়িগ্রাম",
      "gaibandha", "গাইবান্ধা", "lalmonirhat", "লালমনিরহাট", "nilphamari",
      "নীলফামারী", "panchagarh", "পঞ্চগড়", "thakurgaon", "ঠাকুরগাঁও", "saidpur"
    ],
  },
  {
    name: "Mymensingh",
    aliases: ["mymensingh", "ময়মনসিংহ", "jamalpur", "জামালপুর", "netrokona", "নেত্রকোণা", "sherpur", "শেরপুর", "muktagacha", "bhaluka"],
  },
  {
    name: "Cumilla",
    aliases: ["cumilla", "comilla", "কুমিল্লা", "kandirpar", "daudkandi", "laksham"],
  },
  {
    name: "Chandpur",
    aliases: ["chandpur", "চাঁদপুর", "hizla", "chairmanghat", "matlab", "hajiganj"],
  },
  {
    name: "Feni",
    aliases: ["feni", "ফেনী", "parshuram", "daganbhuiyan"],
  },
  {
    name: "Noakhali",
    aliases: ["noakhali", "নোয়াখালী", "maijdee", "begumganj", "chowmuhani"],
  },
  {
    name: "Brahmanbaria",
    aliases: ["brahmanbaria", "ব্রাহ্মণবাড়িয়া", "akhaura", "ashuganj", "kasba"],
  },
  {
    name: "Faridpur",
    aliases: ["faridpur", "ফরিদপুর", "boalmari", "bhanga"],
  },
  {
    name: "Gopalganj",
    aliases: ["gopalganj", "গোপালগঞ্জ", "tungipara", "kotalipara", "muksudpur"],
  },
  {
    name: "Madaripur",
    aliases: ["madaripur", "মাদারীপুর", "shibchar", "kalkini"],
  },
  {
    name: "Shariatpur",
    aliases: ["shariatpur", "শরীয়তপুর", "zajira", "naria"],
  },
  {
    name: "Rajbari",
    aliases: ["rajbari", "রাজবাড়ী", "pangsha", "goalanda"],
  },
  {
    name: "Tangail",
    aliases: ["tangail", "টাঙ্গাইল", "elenga", "madhupur", "ghatail", "mirzapur"],
  },
  {
    name: "Narsingdi",
    aliases: ["narsingdi", "নরসিংদী", "madhabdi", "shibpur", "palash"],
  },
  {
    name: "Munshiganj",
    aliases: ["munshiganj", "মুন্সীগঞ্জ", "bikrampur", "bickrampur", "mirkadim", "srinagar munshiganj"],
  },
  {
    name: "Manikganj",
    aliases: ["manikganj", "মানিকগঞ্জ", "singair", "saturia"],
  },
  {
    name: "Kishoreganj",
    aliases: ["kishoreganj", "কিশোরগঞ্জ", "bhairab", "ভৈরব", "bajitpur"],
  },
  {
    name: "Jhenaidah",
    aliases: ["jhenaidah", "ঝিনাইদহ", "kaliganj jhenaidah", "kotchandpur"],
  },
  {
    name: "Magura",
    aliases: ["magura", "মাগুরা", "sreepur magura"],
  },
  {
    name: "Narail",
    aliases: ["narail", "নড়াইল", "lohagagara"],
  },
  {
    name: "Chuadanga",
    aliases: ["chuadanga", "চুয়াডাঙ্গা", "darsana"],
  },
  {
    name: "Meherpur",
    aliases: ["meherpur", "মেহেরপুর", "gangni"],
  },
  {
    name: "Joypurhat",
    aliases: ["joypurhat", "জয়পুরহাট", "panchbibi"],
  },
];

/**
 * Automatically extracts the best matching Bangladesh district from address/location text.
 * Falls back to "Dhaka" if nothing matches.
 */
export function extractDistrictFromText(text?: string | null): string {
  if (!text) return "Dhaka";
  const lower = text.toLowerCase();

  // 1. Check non-Dhaka districts first to avoid false-matching generic "Dhaka Division" strings
  for (const district of BANGLADESH_DISTRICTS) {
    if (district.name === "Dhaka") continue;
    for (const alias of district.aliases) {
      if (lower.includes(alias)) {
        return district.name;
      }
    }
  }

  // 2. Check Dhaka aliases
  const dhaka = BANGLADESH_DISTRICTS.find((d) => d.name === "Dhaka");
  if (dhaka?.aliases.some((alias) => lower.includes(alias))) {
    return "Dhaka";
  }

  return "Dhaka";
}

export const DISTRICT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Dhaka: { lat: 23.8103, lng: 90.4125 },
  Chattogram: { lat: 22.3569, lng: 91.7832 },
  Chittagong: { lat: 22.3569, lng: 91.7832 },
  Gazipur: { lat: 23.9999, lng: 90.4203 },
  Narayanganj: { lat: 23.6238, lng: 90.5000 },
  Sylhet: { lat: 24.8949, lng: 91.8687 },
  Rajshahi: { lat: 24.3745, lng: 88.6042 },
  Bogura: { lat: 24.8465, lng: 89.3777 },
  Bogra: { lat: 24.8465, lng: 89.3777 },
  Sirajganj: { lat: 24.4534, lng: 89.7006 },
  Pabna: { lat: 24.0122, lng: 89.2519 },
  Khulna: { lat: 22.8456, lng: 89.5403 },
  Jashore: { lat: 23.1664, lng: 89.2081 },
  Jessore: { lat: 23.1664, lng: 89.2081 },
  Kushtia: { lat: 23.9013, lng: 89.1204 },
  Barishal: { lat: 22.7010, lng: 90.3535 },
  Barisal: { lat: 22.7010, lng: 90.3535 },
  Rangpur: { lat: 25.7439, lng: 89.2752 },
  Mymensingh: { lat: 24.7471, lng: 90.4203 },
  Cumilla: { lat: 23.4607, lng: 91.1809 },
  Comilla: { lat: 23.4607, lng: 91.1809 },
  Chandpur: { lat: 23.2333, lng: 90.6667 },
  Feni: { lat: 23.0159, lng: 91.3976 },
  Noakhali: { lat: 22.8696, lng: 91.0995 },
  Brahmanbaria: { lat: 23.9571, lng: 91.1115 },
  Tangail: { lat: 24.2513, lng: 89.9167 },
  Faridpur: { lat: 23.6071, lng: 89.8429 },
  Manikganj: { lat: 23.8617, lng: 90.0003 },
  Munshiganj: { lat: 23.5422, lng: 90.5305 },
  Narsingdi: { lat: 23.9197, lng: 90.7153 },
  Kishoreganj: { lat: 24.4449, lng: 90.7766 },
  Netrokona: { lat: 24.8770, lng: 90.7277 },
  Jamalpur: { lat: 24.9375, lng: 89.9378 },
  Sherpur: { lat: 25.0205, lng: 90.0153 },
  "Cox's Bazar": { lat: 21.4272, lng: 92.0058 },
  CoxsBazar: { lat: 21.4272, lng: 92.0058 },
  Bandarban: { lat: 22.1953, lng: 92.2184 },
  Rangamati: { lat: 22.6533, lng: 92.1789 },
  Khagrachhari: { lat: 23.1193, lng: 91.9847 },
  Lakshmipur: { lat: 22.9425, lng: 90.8412 },
  Sunamganj: { lat: 25.0658, lng: 91.3950 },
  Habiganj: { lat: 24.3750, lng: 91.4167 },
  Moulvibazar: { lat: 24.4829, lng: 91.7774 },
  Natore: { lat: 24.4206, lng: 89.0003 },
  Naogaon: { lat: 24.7936, lng: 88.9318 },
  Chapainawabganj: { lat: 24.5965, lng: 88.2775 },
  Joypurhat: { lat: 25.1011, lng: 89.0270 },
  Dinajpur: { lat: 25.6217, lng: 88.6355 },
  Kurigram: { lat: 25.8054, lng: 89.6362 },
  Gaibandha: { lat: 25.3288, lng: 89.5403 },
  Lalmonirhat: { lat: 25.9923, lng: 89.2847 },
  Nilphamari: { lat: 25.9318, lng: 88.8560 },
  Panchagarh: { lat: 26.3411, lng: 88.5542 },
  Thakurgaon: { lat: 26.0337, lng: 88.4617 },
  Bagerhat: { lat: 22.6516, lng: 89.7859 },
  Satkhira: { lat: 22.7185, lng: 89.0705 },
  Meherpur: { lat: 23.7622, lng: 88.6318 },
  Chuadanga: { lat: 23.6402, lng: 88.8418 },
  Jhenaidah: { lat: 23.5448, lng: 89.1539 },
  Magura: { lat: 23.4873, lng: 89.4199 },
  Narail: { lat: 23.1725, lng: 89.5127 },
  Bhola: { lat: 22.6859, lng: 90.6481 },
  Patuakhali: { lat: 22.3596, lng: 90.3299 },
  Pirojpur: { lat: 22.5841, lng: 89.9720 },
  Jhalokathi: { lat: 22.6406, lng: 90.1987 },
  Barguna: { lat: 22.0953, lng: 90.0770 },
  Gopalganj: { lat: 23.0051, lng: 89.8266 },
  Madaripur: { lat: 23.1641, lng: 90.1897 },
  Rajbari: { lat: 23.7574, lng: 89.6445 },
  Shariatpur: { lat: 23.2423, lng: 90.4348 },
};

export function getDistrictCoordinates(districtName?: string | null): { lat: number; lng: number } | null {
  if (!districtName || districtName === "ALL") return null;
  const normalized = districtName.trim();
  if (DISTRICT_COORDINATES[normalized]) {
    return DISTRICT_COORDINATES[normalized];
  }
  const key = Object.keys(DISTRICT_COORDINATES).find(
    (k) => k.toLowerCase() === normalized.toLowerCase()
  );
  return key ? DISTRICT_COORDINATES[key] : null;
}

