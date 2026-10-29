// Built-in env loading via --env-file=.env or process.env

async function testApis() {
  const geoapifyKey = process.env.GEOAPIFY_SERVER_API_KEY || process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY;
  const googleKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  console.log("=== 1. Testing Geoapify Places API ===");
  console.log("Key:", geoapifyKey ? `${geoapifyKey.slice(0, 8)}...` : "None");
  try {
    // Search around Dhanmondi, Dhaka (lat 23.7405, lon 90.3846, radius 3km)
    const geoUrl = `https://api.geoapify.com/v2/places?categories=catering.restaurant,catering.cafe,catering.fast_food&filter=circle:90.3846,23.7405,3000&bias=proximity:90.3846,23.7405&limit=10&apiKey=${geoapifyKey}`;
    const res = await fetch(geoUrl);
    const data = await res.json();
    if (data.features) {
      console.log(`✅ Geoapify Works! Found ${data.features.length} restaurants in Dhaka:`);
      data.features.slice(0, 5).forEach((f, i) => {
        console.log(`  ${i + 1}. [${f.properties.name || "Unnamed Restaurant"}]`);
        console.log(`     Coordinates: ${f.properties.lat}, ${f.properties.lon}`);
        console.log(`     Address: ${f.properties.formatted || f.properties.street || "N/A"}`);
      });
    } else {
      console.log("⚠️ Geoapify Response:", data);
    }
  } catch (err) {
    console.error("❌ Geoapify Error:", err.message);
  }

  console.log("\n=== 2. Testing Google Places API ===");
  console.log("Key:", googleKey ? `${googleKey.slice(0, 8)}...` : "None");
  try {
    const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=23.7405,90.3846&radius=3000&type=restaurant&key=${googleKey}`;
    const res = await fetch(googleUrl);
    const data = await res.json();
    console.log("Google API Status:", data.status);
    if (data.error_message) {
      console.log("Google Message:", data.error_message);
    }
    if (data.results && data.results.length > 0) {
      console.log(`✅ Google Places Works! Found ${data.results.length} restaurants:`);
      data.results.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i + 1}. [${r.name}] Vicinity: ${r.vicinity} | Lat/Lng: ${r.geometry.location.lat}, ${r.geometry.location.lng}`);
      });
    }
  } catch (err) {
    console.error("❌ Google Error:", err.message);
  }
}

testApis();
