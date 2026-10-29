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
