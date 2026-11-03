import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const apiKey =
  process.env.GEOAPIFY_SERVER_API_KEY ||
  process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;

if (!apiKey) {
  console.error("❌ Geoapify API key not found in environment.");
  process.exit(1);
}

// ── 1. Bangladesh Districts and Aliases ──────────────────────────────────────
const BANGLADESH_DISTRICTS = [
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
      "কক্সবাজার", "rangamati", "bandarban", "khagrachhari"
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
    aliases: ["bogra", "bogura", "বগুড়া", "sherpur", "শেরপুর", "shibganj", "গাবতলী", "gabtali", "নন্দীগ্রাম", "ধুনট", "সোনাতলা"],
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
    aliases: ["mymensingh", "ময়মনসিংহ", "jamalpur", "জামালপুর", "netrokona", "নেত্রকোণা", "muktagacha", "bhaluka"],
  },
  {
    name: "Cumilla",
    aliases: ["cumilla", "comilla", "কুমিল্লা", "kandirpar", "daudkandi", "laksham", "barura", "মুরাদনগর", "লাকসাম", "চান্দিনা"],
  },
  {
    name: "Chandpur",
    aliases: [
      "chandpur", "চাঁদপুর", "kachua", "কচুয়া", "কচুয়া", "kochua", "faridganj",
      "ফরিদগঞ্জ", "matlab", "মতলব", "hajiganj", "হাজীগঞ্জ", "shahrasti", "শাহরাস্তি",
      "haimchar", "হাইমচর", "hizla", "chairmanghat"
    ],
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

const DISTRICT_COORDINATES = {
  Dhaka: { lat: 23.8103, lng: 90.4125 },
  Chattogram: { lat: 22.3569, lng: 91.7832 },
  Gazipur: { lat: 23.9999, lng: 90.4203 },
  Narayanganj: { lat: 23.6238, lng: 90.5000 },
  Sylhet: { lat: 24.8949, lng: 91.8687 },
  Rajshahi: { lat: 24.3745, lng: 88.6042 },
  Bogura: { lat: 24.8465, lng: 89.3777 },
  Sirajganj: { lat: 24.4534, lng: 89.7006 },
  Pabna: { lat: 24.0122, lng: 89.2519 },
  Khulna: { lat: 22.8456, lng: 89.5403 },
  Jashore: { lat: 23.1664, lng: 89.2081 },
  Kushtia: { lat: 23.9013, lng: 89.1204 },
  Barishal: { lat: 22.7010, lng: 90.3535 },
  Rangpur: { lat: 25.7439, lng: 89.2752 },
  Mymensingh: { lat: 24.7471, lng: 90.4203 },
  Cumilla: { lat: 23.4607, lng: 91.1809 },
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
  Jhenaidah: { lat: 23.5448, lng: 89.1539 },
  Magura: { lat: 23.4873, lng: 89.4199 },
  Narail: { lat: 23.1725, lng: 89.5127 },
  Chuadanga: { lat: 23.6402, lng: 88.8418 },
  Meherpur: { lat: 23.7622, lng: 88.6318 },
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

function extractDistrict(text, fallback = null) {
  if (!text) return fallback;
  const cleaned = text
    .replace(/\b[a-zA-Z]+\s+division\b/gi, " ")
    .replace(/\S+\s*বিভাগ/g, " ")
    .toLowerCase();

  for (const district of BANGLADESH_DISTRICTS) {
    if (district.name === "Dhaka") continue;
    for (const alias of district.aliases) {
      if (cleaned.includes(alias.toLowerCase())) {
        return district.name;
      }
    }
  }

  const dhaka = BANGLADESH_DISTRICTS.find((d) => d.name === "Dhaka");
  if (dhaka?.aliases.some((alias) => cleaned.includes(alias.toLowerCase()))) {
    return "Dhaka";
  }

  return fallback;
}

const BENGALI_NOISE = new Set([
  "বিশ্বরোড", "হসপিটাল", "হাসপাতাল", "দক্ষিণ-পশ্চিম", "উত্তর-পশ্চিম", "উত্তর-পূর্ব", "দক্ষিণ-পূর্ব",
  "দক্ষিণ", "উত্তর", "পূর্ব", "পশ্চিম", "পাশে", "নিকট", "সামনে", "পিছনে", "মোড়", "বাজার", "রোড", "রাস্তা",
  "গলি", "দোকান", "হোল্ডিং", "সেক্টর", "প্লট", "বাড়ি", "বাড়ি", "ফ্লোর", "তলা", "পৌরসভা", "উপজেলা", "থানা"
]);

const ENGLISH_NOISE = new Set([
  "road", "rd", "lane", "ln", "avenue", "ave", "street", "st", "sarani",
  "house", "holding", "sector", "sec", "plot", "block", "near", "opp", "opposite", "beside",
  "bangladesh", "bd"
]);

function extractLocalities(text, targetDistrict) {
  const words = (text || "")
    .replace(/[,/\\()\-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  const distLower = (targetDistrict || "").toLowerCase();
  const meaningful = [];
  const seen = new Set();

  for (const w of words) {
    const lower = w.toLowerCase();
    if (BENGALI_NOISE.has(lower) || ENGLISH_NOISE.has(lower)) continue;
    if (distLower && (distLower === lower || lower === "চাঁদপুর" || lower === "ঢাকা" || lower === "কুমিল্লা" || lower === "বগুড়া")) continue;
    if (!seen.has(lower) && lower.length > 1) {
      seen.add(lower);
      meaningful.push(w);
    }
  }

  return meaningful;
}

async function smartResolve(businessName, location, targetDistrict) {
  const localities = extractLocalities(location, targetDistrict);
  const areaQueries = [];

  if (localities.length > 0 && targetDistrict) {
    areaQueries.push(`${localities.join(" ")}, ${targetDistrict}`);
    if (localities.length > 1) {
      areaQueries.push(`${localities[0]}, ${targetDistrict}`);
    }
  }
  if (targetDistrict) {
    areaQueries.push(`${targetDistrict}, Bangladesh`);
  }
  if (location) {
    areaQueries.push(location);
  }

  const makeUrl = (q) =>
    `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
      q
    )}&filter=countrycode:bd&limit=5&apiKey=${apiKey}`;

  for (const q of areaQueries) {
    try {
      const res = await fetch(makeUrl(q));
      if (!res.ok) continue;
      const data = await res.json();
      const features = data?.features || [];

      for (const feat of features) {
        const [lon, lat] = feat.geometry?.coordinates || [];
        const formatted = feat.properties?.formatted || "";
        const featDistrict = extractDistrict(formatted, null);

        // Strict: never accept a location from another district
        if (targetDistrict && featDistrict && featDistrict !== targetDistrict) {
          continue;
        }

        if (lat != null && lon != null) {
          return {
            latitude: Number(lat),
            longitude: Number(lon),
            formattedAddress: formatted,
            placeId: feat.properties?.place_id,
          };
        }
      }
    } catch {
      // Continue to next query
    }
  }

  // Fallback to district center
  const center = DISTRICT_COORDINATES[targetDistrict];
  if (center) {
    return {
      latitude: center.lat,
      longitude: center.lng,
      formattedAddress: `${targetDistrict}, Bangladesh`,
      placeId: null,
    };
  }

  return null;
}

async function main() {
  console.log("🔍 Scanning database for mismatched business locations...\n");

  const businesses = await prisma.business.findMany({
    select: {
      id: true,
      name: true,
      area: true,
      address: true,
      district: true,
      latitude: true,
      longitude: true,
      osmLatitude: true,
      osmLongitude: true,
      osmFormattedAddress: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const mismatched = [];

  for (const b of businesses) {
    // Physical raw text from Excel is stored in b.area (or fallback b.address)
    const rawLoc = (b.area && b.area.trim().length > 3 ? b.area : b.address) || "";
    
    // Determine the true district from the raw physical location text first!
    const targetDistrict =
      extractDistrict(rawLoc, null) ||
      extractDistrict(b.district, null) ||
      b.district ||
      "Dhaka";

    const osmDistrict = extractDistrict(b.osmFormattedAddress, null);

    // Mismatch criteria:
    // 1. Target district is NOT Dhaka, but osmFormattedAddress points to Dhaka
    // 2. Or osmDistrict is known and does not equal targetDistrict
    const isMismatched =
      (targetDistrict !== "Dhaka" &&
        b.osmFormattedAddress &&
        /\b(dhaka|ঢাকা|demra|mirpur|dhanmondi|gulshan|uttara|motijheel|savar)\b/i.test(
          b.osmFormattedAddress
        )) ||
      (osmDistrict && targetDistrict && osmDistrict !== targetDistrict);

    if (isMismatched) {
      mismatched.push({
        business: b,
        rawLoc,
        targetDistrict,
        oldOsmAddress: b.osmFormattedAddress,
      });
    }
  }

  console.log(`Found ${mismatched.length} businesses with mismatched locations.\n`);

  if (mismatched.length === 0) {
    console.log("✅ All business locations are currently in their correct districts!");
    return;
  }

  let fixedCount = 0;

  for (const { business: b, rawLoc, targetDistrict, oldOsmAddress } of mismatched) {
    console.log(`----------------------------------------------------------------`);
    console.log(`🏢 [${b.name}]`);
    console.log(`   Physical Location: "${rawLoc}"`);
    console.log(`   Correct District: ${targetDistrict}`);
    console.log(`   ❌ Old Wrong Pin: "${oldOsmAddress}"`);

    const result = await smartResolve(b.name, rawLoc, targetDistrict);

    if (result && result.latitude != null && result.longitude != null) {
      await prisma.business.update({
        where: { id: b.id },
        data: {
          latitude: result.latitude,
          longitude: result.longitude,
          osmLatitude: result.latitude,
          osmLongitude: result.longitude,
          osmFormattedAddress: result.formattedAddress,
          osmPlaceId: result.placeId,
          district: targetDistrict,
          updatedAt: new Date(),
        },
      });

      console.log(`   ✅ NEW CORRECT PIN: "${result.formattedAddress}" [${result.latitude}, ${result.longitude}]`);
      fixedCount++;
    } else {
      console.log(`   ⚠️ Could not resolve new coordinates.`);
    }

    // Small delay to respect API rate limits
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\n================================================================`);
  console.log(`🎉 Successfully fixed ${fixedCount} of ${mismatched.length} mismatched locations!`);
  console.log(`================================================================\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
