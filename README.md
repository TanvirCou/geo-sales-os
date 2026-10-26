# Business Sales & Geo-Mapping Management System

Production-oriented Next.js application for tracking businesses, products, orders and visualising them on a Bangladesh map.

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+ (local or remote)

### 2. Environment Setup

Copy `.env.local` and fill in values:
```bash
# Already created at .env.local — edit it:
DATABASE_URL="postgresql://user:password@localhost:5432/business_sales_dev"
SESSION_SECRET="<64-byte random hex>"
ADMIN_PIN_HASH=""   # generated in step 4
```

Generate `SESSION_SECRET`:
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Install & Migrate
```powershell
npm install
npx prisma migrate dev --name init
```

### 4. Set Admin PIN
```powershell
# Hash your chosen 6-digit PIN (e.g. 123456):
npm run hash-pin 123456

# Copy the printed hash into .env.local as ADMIN_PIN_HASH="..."
# Then seed the database:
npm run seed:admin
```

### 5. Run Dev Server
```powershell
npm run dev
# Open: http://localhost:3000
```

---

## Development Phases

| Phase | Description | Status |
|---|---|---|
| **1** | Foundation + Login (PIN auth, sessions, dashboard shell) | ✅ Complete |
| **2** | Business + Product + Order CRUD | 🔜 Next |
| **3** | Shared map data layer + filters | 🔜 |
| **4** | Google Maps integration | 🔜 |
| **5** | MapLibre GL + Geoapify integration | 🔜 |
| **6** | Compare providers → pick one | 🔜 |
| **7** | Excel/Steadfast import pipeline | 🔜 |
| **8** | Real company data + production deploy | 🔜 |

## Key Design Decisions

- **GREEN pin** = Business has ≥1 order recorded (any status)
- **RED pin** = Business has 0 orders
- **No grey**, no payment verification, no demo mode
- Server Components by default; Client Components only for interactivity
- Server Actions for all mutations (Business/Product/Order CRUD)
- Prisma + PostgreSQL with `onDelete: Restrict` to protect order history

## Scripts

```powershell
npm run dev          # Dev server
npm run db:migrate   # Apply Prisma migrations
npm run db:push      # Push schema without migration (dev only)
npm run db:studio    # Open Prisma Studio
npm run hash-pin 123456  # Hash a PIN
npm run seed:admin   # Write hashed PIN to DB
```
