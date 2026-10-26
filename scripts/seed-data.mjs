import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting development database seeding for Phase 2...");

  // Clear existing domain data (order matters due to FKs)
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.business.deleteMany();
  await prisma.product.deleteMany();

  console.log("🧹 Cleared old domain data.");

  // 1. Seed Products (10 items)
  const productsData = [
    { name: "Premium Mustard Oil 1L", sku: "OIL-MST-1L", unit: "Bottle", priceBdt: 320.00 },
    { name: "Soybean Oil 5L Can", sku: "OIL-SOY-5L", unit: "Can", priceBdt: 890.00 },
    { name: "Chinigura Aromatic Rice 5kg", sku: "RICE-CHIN-5K", unit: "Bag", priceBdt: 750.00 },
    { name: "Nazirshail Rice 25kg Sack", sku: "RICE-NAZ-25K", unit: "Sack", priceBdt: 2150.00 },
    { name: "Pure Danedar Ghee 500g", sku: "DAIRY-GHEE-500", unit: "Jar", priceBdt: 680.00 },
    { name: "Organic Honey 500g", sku: "ORG-HNY-500", unit: "Jar", priceBdt: 550.00 },
    { name: "Sylhet Premium Black Tea 400g", sku: "TEA-SYL-400", unit: "Box", priceBdt: 260.00 },
    { name: "Spices Combo Master Pack", sku: "SPC-CMB-1K", unit: "Pack", priceBdt: 420.00 },
    { name: "Red Lentils (Deshi Masoor) 2kg", sku: "LENT-MAS-2K", unit: "Bag", priceBdt: 290.00 },
    { name: "Refined White Sugar 5kg", sku: "SUG-REF-5K", unit: "Bag", priceBdt: 640.00 },
  ];

  const createdProducts = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({ data: p });
    createdProducts.push(prod);
  }
  console.log(`✅ Created ${createdProducts.length} products.`);

  // 2. Seed Businesses (20 businesses: some located, some unlocated, various categories & areas)
  const businessesData = [
    // Dhanmondi (Restaurant / Grocery)
    {
      name: "Star Kabab & Restaurant (Dhanmondi 2)",
      category: "Restaurant",
      area: "Dhanmondi",
      district: "Dhaka",
      contactName: "Mirza Kabir",
      phoneRaw: "+880 1711-223344",
      phoneNormalized: "01711223344",
      address: "House 15, Road 2, Dhanmondi, Dhaka",
      latitude: 23.7405100,
      longitude: 90.3846200,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Cafe Bistro 27",
      category: "Restaurant",
      area: "Dhanmondi",
      district: "Dhaka",
      contactName: "Rezaul Karim",
      phoneRaw: "01819-334455",
      phoneNormalized: "01819334455",
      address: "Road 27 (Old), Dhanmondi, Dhaka",
      latitude: 23.7538200,
      longitude: 90.3725400,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Shwapno Superstore Dhanmondi 8",
      category: "Superstore",
      area: "Dhanmondi",
      district: "Dhaka",
      contactName: "Store Manager",
      phoneRaw: "01755-667788",
      phoneNormalized: "01755667788",
      address: "Plot 32, Road 8/A, Dhanmondi, Dhaka",
      latitude: 23.7471200,
      longitude: 90.3749300,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Dhanmondi Central Pharmacy",
      category: "Pharmacy",
      area: "Dhanmondi",
      district: "Dhaka",
      contactName: "Dr. Faruk Hossain",
      phoneRaw: "01912-345678",
      phoneNormalized: "01912345678",
      address: "Mirpur Road, Near City College, Dhanmondi",
      latitude: 23.7391100,
      longitude: 90.3838200,
      coordinateSource: "manual_verified",
      isActive: true,
    },

    // Gulshan / Banani
    {
      name: "Gloria Jean's Coffees Gulshan 1",
      category: "Restaurant",
      area: "Gulshan",
      district: "Dhaka",
      contactName: "Ashrafuzzaman",
      phoneRaw: "01713-998877",
      phoneNormalized: "01713998877",
      address: "Navana Tower, Gulshan 1 Circle, Dhaka",
      latitude: 23.7779300,
      longitude: 90.4168200,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Unimart Gulshan 2",
      category: "Superstore",
      area: "Gulshan",
      district: "Dhaka",
      contactName: "Procurement Desk",
      phoneRaw: "01730-112233",
      phoneNormalized: "01730112233",
      address: "Gulshan Centre Point, Gulshan 2, Dhaka",
      latitude: 23.7925000,
      longitude: 90.4152000,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Banani Gourmet Club",
      category: "Restaurant",
      area: "Banani",
      district: "Dhaka",
      contactName: "Zahid Hasan",
      phoneRaw: "01822-445566",
      phoneNormalized: "01822445566",
      address: "Road 11, Block D, Banani, Dhaka",
      latitude: 23.7937100,
      longitude: 90.4048900,
      coordinateSource: "manual_verified",
      isActive: true,
    },

    // Uttara
    {
      name: "Sultan's Dine Uttara",
      category: "Restaurant",
      area: "Uttara",
      district: "Dhaka",
      contactName: "Manager Kamrul",
      phoneRaw: "01977-889900",
      phoneNormalized: "01977889900",
      address: "Sector 3, Jasimuddin Avenue, Uttara, Dhaka",
      latitude: 23.8612000,
      longitude: 90.3984000,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Meena Bazar Sector 11",
      category: "Superstore",
      area: "Uttara",
      district: "Dhaka",
      contactName: "Nazmul Huda",
      phoneRaw: "01714-556677",
      phoneNormalized: "01714556677",
      address: "Gareeb-e-Nawaz Avenue, Sector 11, Uttara",
      latitude: 23.8741000,
      longitude: 90.3892000,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Uttara Model Pharmacy",
      category: "Pharmacy",
      area: "Uttara",
      district: "Dhaka",
      contactName: "Tariqul Islam",
      phoneRaw: "01844-332211",
      phoneNormalized: "01844332211",
      address: "Sector 7, Rabindra Sarani, Uttara",
      latitude: 23.8689000,
      longitude: 90.3976000,
      coordinateSource: "manual_verified",
      isActive: true,
    },

    // Mirpur
    {
      name: "Kasturi Garden Restaurant Mirpur",
      category: "Restaurant",
      area: "Mirpur",
      district: "Dhaka",
      contactName: "Abul Kashem",
      phoneRaw: "01720-667788",
      phoneNormalized: "01720667788",
      address: "Mirpur 10 Roundabout, Mirpur, Dhaka",
      latitude: 23.8071000,
      longitude: 90.3685000,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Mirpur Wholesale Grocers Association",
      category: "Wholesale",
      area: "Mirpur",
      district: "Dhaka",
      contactName: "Haji Nurul Haque",
      phoneRaw: "01911-889977",
      phoneNormalized: "01911889977",
      address: "Mirpur 1 Muktijoddha Market, Dhaka",
      latitude: 23.7955000,
      longitude: 90.3541000,
      coordinateSource: "manual_verified",
      isActive: true,
    },

    // Old Dhaka / Motijheel
    {
      name: "Al-Razzak Restaurant",
      category: "Restaurant",
      area: "Old Dhaka",
      district: "Dhaka",
      contactName: "Haji Mohammad Ali",
      phoneRaw: "01711-554433",
      phoneNormalized: "01711554433",
      address: "Nazira Bazar, Old Dhaka",
      latitude: 23.7176000,
      longitude: 90.4042000,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Motijheel Corporate Canteen Supply",
      category: "Retail",
      area: "Motijheel",
      district: "Dhaka",
      contactName: "Shafiq Ahmed",
      phoneRaw: "01817-223311",
      phoneNormalized: "01817223311",
      address: "Dilkusha C/A, Motijheel, Dhaka",
      latitude: 23.7298000,
      longitude: 90.4187000,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Moulvibazar Traders Wholesale",
      category: "Wholesale",
      area: "Old Dhaka",
      district: "Dhaka",
      contactName: "Haji Babul Miah",
      phoneRaw: "01715-443322",
      phoneNormalized: "01715443322",
      address: "Moulvibazar Spices Market, Old Dhaka",
      latitude: 23.7142000,
      longitude: 90.3995000,
      coordinateSource: "manual_verified",
      isActive: true,
    },

    // Mohakhali
    {
      name: "Mohakhali General Hospital Canteen",
      category: "Restaurant",
      area: "Mohakhali",
      district: "Dhaka",
      contactName: "Habib Rahman",
      phoneRaw: "01922-998811",
      phoneNormalized: "01922998811",
      address: "TB Gate, Mohakhali, Dhaka",
      latitude: 23.7782000,
      longitude: 90.4011000,
      coordinateSource: "manual_verified",
      isActive: true,
    },

    // Outside Dhaka (Chittagong)
    {
      name: "Khatunganj Spice Emporium",
      category: "Wholesale",
      area: "Khatunganj",
      district: "Chittagong",
      contactName: "Anisur Rahman",
      phoneRaw: "01819-887766",
      phoneNormalized: "01819887766",
      address: "Khatunganj Wholesale Hub, Chittagong",
      latitude: 22.3364000,
      longitude: 91.8385000,
      coordinateSource: "manual_verified",
      isActive: true,
    },
    {
      name: "Barik Building Store",
      category: "Retail",
      area: "Agrabad",
      district: "Chittagong",
      contactName: "Monirul Islam",
      phoneRaw: "01712-778899",
      phoneNormalized: "01712778899",
      address: "Agrabad C/A, Chittagong",
      latitude: 22.3275000,
      longitude: 91.8122000,
      coordinateSource: "manual_verified",
      isActive: true,
    },

    // ─── UNLOCATED BUSINESSES (Location Needed test cases: lat/lng null) ───
    {
      name: "Green Valley Organics (New Prospect)",
      category: "Retail",
      area: "Dhanmondi",
      district: "Dhaka",
      contactName: "Sadia Afroz",
      phoneRaw: "01799-112233",
      phoneNormalized: "01799112233",
      address: "Unverified location, Dhanmondi",
      latitude: null,
      longitude: null,
      coordinateSource: null,
      isActive: true,
    },
    {
      name: "Apex Food Distribution Hub",
      category: "Wholesale",
      area: "Tejgaon",
      district: "Dhaka",
      contactName: "Mizanur Rahman",
      phoneRaw: "01888-223344",
      phoneNormalized: "01888223344",
      address: "Tejgaon I/A, pending GPS survey",
      latitude: null,
      longitude: null,
      coordinateSource: null,
      isActive: true,
    },
  ];

  const createdBusinesses = [];
  for (const b of businessesData) {
    const bus = await prisma.business.create({ data: b });
    createdBusinesses.push(bus);
  }
  console.log(`✅ Created ${createdBusinesses.length} businesses.`);

  // 3. Seed Orders & OrderItems
  // Plan requirement:
  // - Some businesses have >= 1 order (GREEN: Star Kabab, Shwapno Dhanmondi, Sultan's Dine, Unimart, etc.)
  // - Some businesses have 0 orders (RED: Cafe Bistro 27, Central Pharmacy, Banani Gourmet, Khatunganj, etc.)
  // - At least one business has CANCELLED order only (still GREEN per rule: Orders >= 1 -> GREEN!)
  // Total orders: ~25 orders

  const greenBusinessIndices = [0, 2, 4, 5, 7, 8, 10, 12, 13, 14, 17, 18]; // 12 businesses with orders
  // Remaining indices: [1, 3, 6, 9, 11, 15, 16, 19] have 0 orders (RED)!

  let orderCount = 0;
  let itemCount = 0;

  for (const idx of greenBusinessIndices) {
    const bus = createdBusinesses[idx];

    // Determine how many orders for this business (1 to 4)
    const numOrders = idx === 0 ? 4 : idx === 2 ? 3 : idx === 4 ? 3 : idx === 7 ? 2 : 1;

    for (let o = 0; o < numOrders; o++) {
      const daysAgo = (idx * 3 + o * 4 + 1) % 45;
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - daysAgo);

      // Business #14 (Moulvibazar Traders) gets a CANCELLED order to test that CANCELLED orders still yield GREEN
      const status = idx === 14 ? "CANCELLED" : o === 0 && idx % 3 === 0 ? "PENDING" : "COMPLETED";

      const order = await prisma.order.create({
        data: {
          businessId: bus.id,
          orderedAt: orderDate,
          status: status,
          source: "manual",
          externalOrderId: `ORD-2026-${1000 + orderCount}`,
        },
      });
      orderCount++;

      // Create 1 to 3 items per order
      const prod1 = createdProducts[(idx + o) % createdProducts.length];
      const prod2 = createdProducts[(idx + o + 3) % createdProducts.length];

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: prod1.id,
          sourceProductName: prod1.name,
          quantity: (o + 1) * 5,
          unitPriceBdt: prod1.priceBdt,
        },
      });
      itemCount++;

      if (o % 2 === 0) {
        await prisma.orderItem.create({
          data: {
            orderId: order.id,
            productId: prod2.id,
            sourceProductName: prod2.name,
            quantity: (o + 2) * 2,
            unitPriceBdt: prod2.priceBdt,
          },
        });
        itemCount++;
      }
    }
  }

  console.log(`✅ Created ${orderCount} orders with ${itemCount} order items.`);
  console.log("🎉 Seeding complete! Database is primed for Phase 2 validation.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
