# Business Sales & Geo-Mapping Management System
## Master Implementation Plan — v1.9 · Build First · Map Filters + Safe CRUD

**Date:** 26 October 2026  
**Status:** Development-ready plan (software has not yet been built); v1.9 incorporates simple archive/delete policy, shared map filter acceptance criteria, and provider-selection-first sequencing  
**Audience:** Single company admin; Bangladesh  
**Dev URL:** `http://localhost:3000`  
**Working rule:** এখন আসল application তৈরি করব, নিজের কিছু sample Business/Product/Order data দিয়ে চালাব; পরে company files পেলে clean production DB-তে **একই schema ও code** দিয়ে genuine data import করব।

> **Core rule: `Orders >= 1 → GREEN`; `Orders = 0 → RED`.** কোনো GREY marker, `history_coverage`, sales-settlement calculation, special demo mode বা custom database lock নেই। Color মানে **order recorded / no order recorded**; payment বা successful delivery verified—এমন দাবি নয়।

---

## 1. Scope — কী তৈরি করব

- **একটি production-oriented Next.js application**, throwaway demo নয়।
- **একজন Admin**, 6-digit PIN login, protected dashboard; customer portal / multiuser RBAC / SaaS নয়।
- Dashboard, Businesses, Products, Orders, Order History, Search/Filters, Imports এবং Bangladesh Map।
- **Development-এ দুইটি working map:**
  - `/dashboard/map/google` — Google Maps JavaScript API + Places API (New) + Routes API।
  - `/dashboard/map/geoapify` — MapLibre GL JS + Geoapify Tiles, Places, Geocoding, Routing।
- দুই map-এ নিজের PostgreSQL-এর **একই Businesses, Orders ও marker-color rules**। Provider-specific live Places result ও routing আলাদা।
- Map-এর **ভেতরে** selected Business-এর route line, distance, ETA; নতুন Google Maps tab-এ redirect নয়।
- **First:** নিজের sample data দিয়ে দুইটি real map build ও compare; Google অথবা MapLibre+Geoapify—**একটি provider final** করে `/dashboard/map` route-এ রাখব।
- **Then:** selected provider-এর জন্যই auto Place ID matching + admin review + Steadfast/Excel import pipeline implement করব; company files এলে genuine data import/verify করব।
- ৪,০০০ Business-এর **dual-provider place matching করব না**।

### এখন যা বানাব না

- Discount, delivery fee, other fee, refund, net settlement, payment accounting।
- Purchase overrides, Green/Red/Grey classification, manual history-coverage certification।
- Separate `customers` table, multi-tenant `companies` table, customer profile/portal।
- Mock APIs, fake map providers, special demo switch/flag, needless DB locking or multi-stage approval workflows।
- Unnecessary `/api/businesses`, `/api/products`, `/api/orders` REST endpoints।

---

## 2. Tech stack & architecture

| Layer | Decision |
|---|---|
| Frontend | Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons |
| Rendering | **Server Components by default**, Client Components only for browser interactivity |
| Mutations | **Server Actions** for Business/Product/Order CRUD; server-side input validation |
| Database | Real PostgreSQL + Prisma migrations; `prisma` server-only |
| Authentication | One admin; hashed 6-digit PIN, server session, secure HttpOnly cookie, throttling |
| Map 1 | Google Maps JS + Places (New) + Routes |
| Map 2 | MapLibre GL JS + Geoapify APIs |
| File imports | Browser → object storage (signed upload) → `/api/imports/*` → background worker → PostgreSQL |
| Long running jobs | Minimal PostgreSQL-backed job queue / standalone Node worker, built when import feature is implemented |
| Deployment | Next.js on Vercel (planned); managed PostgreSQL with connection pooler; separate worker process for bulk jobs |

**Server Components:** dashboard page, KPI queries, business/product/order list, detail pages।  
**Client Components:** interactive add/edit forms where necessary, map canvas, marker interaction, geolocation, dynamic filtering UI, file upload progress।

**HTTP route handlers only where they are genuinely needed:** `/api/imports/**`, `/api/places/**`, `/api/routes/**`। All HTTP endpoints and Server Actions check admin session on the server.

---

## 3. Simple database schema — actual build contract

### 3.1 Four domain tables

| Table | Fields (required unless `?`) | Purpose |
|---|---|---|
| **`businesses`** | `id UUID`, `name`, `category?`, `area?`, `district?`, `contact_name?`, `phone_raw?`, `phone_normalized?`, `address?`, `latitude?`, `longitude?`, `coordinate_source?`, `coordinate_source_ref?`, `place_provider?`, `external_place_id?`, `is_active Boolean DEFAULT true`, `created_at`, `updated_at` | Company-tracked Businesses and prospects; active/archived state, one selected provider reference after selection |
| **`products`** | `id UUID`, `name`, `sku?`, `unit?`, `price_bdt DECIMAL(14,2)`, `is_active`, timestamps | Company product catalog |
| **`orders`** | `id UUID`, `business_id FK`, `ordered_at`, `status OrderStatus`, `source?`, `source_status_raw?`, `external_order_id?`, timestamps | Recorded order, whether pending, cancelled, completed or imported |
| **`order_items`** | `id UUID`, `order_id FK`, `product_id FK?`, `source_product_name?` (historical name snapshot where available), `quantity DECIMAL(12,3)`, `unit_price_bdt DECIMAL(14,2)` | Known product line items and historical unit prices |

`OrderStatus`:

```prisma
enum OrderStatus {
  PENDING
  COMPLETED
  CANCELLED
  RETURNED
  PARTIAL
  UNKNOWN
}
```

**Why retain statuses?** Order list/history-তে কী ঘটেছে দেখাতে। **Marker color-এর সঙ্গে কোনো সম্পর্ক নেই।** Import-এর unknown courier status `source_status_raw`-তে থাকবে, internal status `UNKNOWN` হতে পারে।

**Money:** Floating-point নয়, `Decimal`; Product price বদলালেও historical `order_items.unit_price_bdt` বদলাবে না।  
**Order total:** stored `order_total_bdt` নেই। Itemized order-এর `SUM(quantity × unit_price_bdt)` calculate করব। Imported order-এর line items/price অজানা হলে total **“Unavailable”** দেখাব; fake zero বা fake products নয়। `source_product_name` is the historical name snapshot for imported/manual items when available; product renaming must not silently rewrite old order descriptions.

**Constraints:** valid lat/lng ranges, quantity `> 0`, prices `>= 0`, FK integrity, indexes on `orders.business_id`, `businesses.category`, `area`, `district`, `is_active`, name, normalized phone; no globally unique phone (shared phones possible)। If a reliable provider identity is stored, enforce uniqueness on the selected `(place_provider, external_place_id)` pair where applicable. Duplicate import guard via `(source, external_order_id)` where source ID is reliable. Business → Orders and Product → OrderItems use **`onDelete: Restrict`**, never cascade away historical orders. `is_active` on Products and Businesses is regular archiving, not demo lock.

**Area meaning:** `district` = administrative district (Dhaka); `area` = finer locality/neighborhood (Dhanmondi, Uttara). Both are editable company data. Do not infer area from a provider result without checking; optional missing values appear as **Unspecified**. The `category` is the company-recorded Business type; do not use Google/Geoapify live-search category as a silent override.

### 3.2 Necessary technical tables (not business complexity)

- Minimal admin credential/session/attempt persistence for secure PIN login and account-wide lockout.
- `import_jobs`/`import_batches` record for file key, checksum, status, mapping, progress and errors **only when building imports**.
- Queue library's tables when background worker is implemented.
- **No `company_settings` history coverage table needed for color.** No Grey status or demo flag.

### 3.3 Order color — only one query

```ts
// Pseudocode: calculate in server-side query; do not load all orders per marker.
const markerColor = business._count.orders > 0 ? 'green' : 'red';
```

- **Green:** at least one order row linked to this Business (even if `PENDING` or `CANCELLED`—per current simple requirement).
- **Red:** zero order rows linked to this Business.
- Missing location: Business stays in table and can be assigned a pin; no fake coordinate or Grey marker.
- Import must **attach orders to the correct Business** or marker colors will be wrong.
- Only company-tracked Businesses in `businesses` are rendered as persistent pins. Live Places discovery results are temporary search results; they are **not auto-added** to the company database. Admin can deliberately add a result as a Business.
- UI legend should say **“Order recorded” / “No order recorded”**, rather than imply payment settlement.

---

## 4. Location source, Place IDs, attribution — minimal safe rules

| Field/data | Store in PostgreSQL? | Use |
|---|---|---|
| Company-supplied / manually verified `name`, `phone`, `address` | Yes | Shared company-owned Business data |
| Company-provided or manually verified `latitude`, `longitude` | Yes | Shared permanent marker location |
| Geoapify geocoding coordinates (with required source terms/attribution) | Generally yes, subject to current plan/data-source terms | Shared canonical marker location in both maps |
| `place_provider` + `external_place_id` | Yes, within the chosen provider’s terms | Nullable reference for the **selected** provider only; Google and Geoapify IDs are not interchangeable |
| Google Places-derived location/details/results | **Do not save indefinitely as shared location data** | Use under Google rules and only in Google-compliant context |

**Operational rule:** For thousands of company businesses, use company coordinates or properly licensed Geoapify/OSM location data as the **shared** marker coordinates. **Do not make 4,000 Google Place Details requests merely to draw company markers.** Google and Geoapify IDs are different, nullable, and never reused interchangeably. During the two-map comparison, compare live results independently; bulk matching and persistent selected-provider reference happen **only after provider selection**.

Google Places live results must not be transferred onto the Geoapify/MapLibre map as a copied Places listing. Keep service-specific data and required attributions separate. Geoapify/OSM credits/links remain visible where required. Review provider terms before production. [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies), [Geoapify storage & attribution](https://www.geoapify.com/), [Geoapify comparison](https://www.geoapify.com/google-maps-api-alternative/).

**No fake pins:** Address unresolved → “Location needed” in Business table, allow manually placing/verifying a pin; map only shows located businesses.

---

## 5. Pages & folder structure

```text
src/
├── app/
│   ├── login/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx                 # protected server layout
│   │   ├── page.tsx                   # KPIs, server component
│   │   ├── businesses/page.tsx
│   │   ├── businesses/[id]/page.tsx
│   │   ├── products/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── map/
│   │   │   ├── google/page.tsx        # map 1 (dev)
│   │   │   └── geoapify/page.tsx      # map 2 (dev)
│   │   ├── imports/page.tsx
│   │   └── imports/review/page.tsx    # uncertain import/place matches only
│   └── api/
│       ├── imports/.../route.ts
│       ├── places/.../route.ts
│       └── routes/.../route.ts
├── actions/                         # server actions for CRUD
│   ├── businesses.ts
│   ├── products.ts
│   └── orders.ts
├── components/
│   ├── maps/GoogleMapClient.tsx
│   ├── maps/GeoapifyMapClient.tsx
│   ├── maps/BusinessMapFilters.tsx
│   └── ...
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── businesses.ts
│   ├── maps/google.ts
│   ├── maps/geoapify.ts
│   ├── imports/parse.ts
│   └── imports/match.ts
├── worker/                           # when bulk import is built
└── prisma/schema.prisma
```

No `/api/businesses`, `/api/products`, `/api/orders` API endpoints. Server Component queries access Prisma directly after authorization.

---

## 6. Development phases (build in order)

Each phase produces functioning code, is reviewed in browser, then becomes the baseline for the next phase. **No throwaway demo app.**

### Phase 1 — Foundation + Login

- Create Next.js App Router + TypeScript + Tailwind + shadcn/ui project.
- Connect PostgreSQL **development** database and Prisma migrations; configure `.env.local` without committing secrets.
- Build single-admin 6-digit PIN login with Argon2id/bcrypt hash, secure cookie/session, logout.
- Limit wrong PIN attempts: **5 attempts → 15-minute account-wide temporary lockout**, plus IP-level throttling; login rate limits do not lock the database.
- Protected dashboard shell/sidebar and minimal error/loading states.

**Done when:** PIN login/logout works; unauthenticated page/action access fails; DB migrations work.

### Phase 2 — Real Business + Product + Order CRUD

- Business list/detail/add/edit, category, area/district, Name/Phone/Area search; normal Active/Archived filter where needed.
- **Business hard delete:** allowed only if `orders` count = 0; confirm delete. If it has **any** Order, show **Archive** instead (`is_active=false`), preserving linked order history and offering **Restore**. Archived Businesses are hidden from the **default** map, but remain accessible in Archived list/history.
- Product list/add/edit, catalog price and status. **Product hard delete:** allowed only if no `order_items` reference it; otherwise **Archive** (`is_active=false`), preserve all old OrderItems, offer **Restore**. Archived Products are excluded from new Order selection by default.
- **Order:** add/edit/list/detail, Cancel by updating `status=CANCELLED`, with history retained. Permanently delete only a mistaken entry after explicit confirmation; remove its `order_items` together in one transaction. If it was a Business's last order, color becomes RED (unless that Business is archived and hidden). A CANCELLED order **still counts** as an existing order for current Green/Red rule.
- **OrderItems:** managed through Order forms; never independently erase historical items when archiving products.
- **DB safety:** `onDelete: Restrict` for Business→Order and Product→OrderItem; only explicit, intentional Order deletion may cascade/remove that Order's items. These are standard referential integrity constraints, **not** custom DB locks.
- Server Actions for writes, server-side validation; live dashboard counts and historical itemized totals.
- Use **15–30 sample Businesses, 8–12 Products, 20–40 Orders** manually entered through normal forms or a one-time development seed. Include businesses with **zero** and **multiple** orders.
- No artificial `demo` label, mode, protected CRUD route or special restriction.

**Done when:** both Green/Red cases can be derived from DB and CRUD works with real Prisma queries.

### Phase 3 — Shared map data layer

- Single server-side query returns **only needed Business marker data** and `orderCount > 0` status.
- Coordinates must be company/manual or licensed Geocoding origin; keep provider IDs separate.
- Share **one server-side filter/query function** across both map routes: `getMapBusinesses({q, category, district, area, orderColor})`. Use Prisma filters on **ACTIVE company Businesses** and `orders` existence/count; do not load full orders for marker color.
- UI controls: **Category** (All + company categories), **District/Area** (All + company-entered district/locality), **Order Status** (All / Green / Red), small **Business name/phone search**, and **Reset**. Optional/null category and area show "Unspecified", not invented data.
- **Combined conditions are AND**: e.g., `Restaurant + Dhanmondi + Green` must meet all three. Changing or resetting filters updates pins, result count and business listing together, without mixing in provider live-search Places results.
- Only businesses with verified/displayable coordinates render pins. Show total filtered company records plus a separate `Location needed` count, so missing coordinates do not disappear silently. Archived Businesses do not show by default.
- Use URL `searchParams` or a shared Server Component query input for filter state (Client Components only for controls/map). Keep matching filters consistent across both map routes. Clustering/render efficiently for thousands of points (viewport/bounding-box loading as needed, but counts must clearly distinguish viewport vs entire-filter results).
- Google live Places results and Geoapify live Places results are independent **temporary discovery** results and **must not** be mixed into company Green/Red counts without Admin adding them to `businesses`.

**Filter acceptance criteria (same for Google and Geoapify):**

| Admin action | Expected result | 
|---|---|
| Open Map / Reset | Only **active company Businesses**, with all categories/areas/colors (and located pins) |
| Category = Restaurant | Only company records whose `category` is Restaurant |
| Area = Dhanmondi | Only company records whose `area` is Dhanmondi (not every Business in Dhaka district) |
| Green | Order count `>=1`; includes cancelled/pending orders per deliberately simple rule |
| Red | Order count `=0` |
| Restaurant + Dhanmondi + Green | **AND** logic; only records satisfying all three |
| Search name / phone | Matching company Businesses, same rule in both pages |
| No result | Show "No businesses found"; no marker, no crash |
| Unlocated matched Business | Included in relevant count/table, **not** fake pin; "Location needed" displayed |
| Archived Business | Hidden by default, order history preserved and Restore available |
| Same filters on both routes | Same company Business IDs, result counts and marker colors; basemap/provider discovery/route differ |
| Live provider Places search | Provider-specific temporary pins/results clearly separated from company filters; not auto-saved |

**Done when:** both map routes accept identical company-filter inputs and return identical business IDs/counts/colors from the shared server query.

### Phase 4 — Google Map (real API)

- `/dashboard/map/google`; Google JS map, custom Green/Red pins, popup + Business details, filters.
- Google Places (New) search **on Google view only**, separate from company Business pins. Admin may deliberately add a discovered business into `businesses` after checking identity/location; zero orders means RED. Map company filters must pass Phase 3 acceptance tests.
- In-page Google route line, distance, ETA: browser geolocation (permission) or manual origin.
- Start with acquired **Demo API Key + `DEMO_MAP_ID`** for eligible dev testing; official key/Map ID saved but standard API usage requires Google billing-enabled project before production.
- Never persist restricted Google Places payload as permanent shared location data.

**Done when:** company pins and live Google Places search work, routing remains inside page.

### Phase 5 — MapLibre + Geoapify (real API)

- `/dashboard/map/geoapify`; MapLibre GL JS + Geoapify map style/tiles.
- Same company Businesses with same Green/Red colors/filter results and exact acceptance criteria from Phase 3.
- Geoapify Places API search **on this provider view only**, Geoapify Routing for in-page route, distance and ETA. Admin may deliberately add a discovered business after checking identity/location; this uses the same `businesses` table as manual entries.
- Proper tile/OSM/Geoapify attribution and API key restriction.

**Done when:** both map routes show matching company Business count/colors, with each provider's independent routing and search.

### Phase 6 — Compare the two maps and select ONE provider

- Use sample company Businesses/Orders in real PostgreSQL and real Google/Geoapify APIs to check business search coverage, pin accuracy, Green/Red filters, directions, ETA and API usage.
- Test a few representative place matches **manually/on-screen**, just enough to compare matching quality; do **not** implement dual-provider matching for 4,000 records.
- Choose Google **or** MapLibre + Geoapify; keep **one** `/dashboard/map` implementation. Remove the unused provider's UI, code, and credentials before production (or leave clean dev branches only if useful).
- Document the selected provider and required location data licensing/attribution. Persist only `place_provider` + `external_place_id` for the chosen provider; coordinates must still have permitted source provenance.

**Done when:** one selected map renders the same company orders/colors, filters, and in-page routing; provider is chosen **before** full import automation.

### Phase 7 — Excel / Steadfast import + selected-provider matching

- `/dashboard/imports`: upload `.csv`, `.xlsx`, preview columns, map source columns, progress/errors. Implement this phase when the real source files are available or the format can be confirmed; earlier phases use the same actual CRUD/data model.
- **Direct file upload to object storage** using signed URL/token; don't send large file bytes through Vercel Functions (4.5 MB request/response limit).
- Backend creates `import_batches` + job; standalone **Postgres-backed worker** processes file batches, not a long-lived loop inside a Vercel function.
- Normalize UTF-8/BOM/Bangla, Bangladesh phone (`01...`, `+8801...`), company/business names, and dates in `Asia/Dhaka`.
- Deduplicate using reliable `(source, external_order_id)` where available. **Internal identity matching first:** phone + business name + address/area and other evidence; never phone alone as guaranteed identity.
- **External Place ID matching only for the CHOSEN map provider**: search by confirmed business name + address/area, check candidates and match confidence, store nullable `place_provider`/`external_place_id`. No second-provider lookup/job/schema required.
- Location: company GPS/manual pin or properly licensed Geoapify/OSM geocoding; do not persist Google-restricted coordinates as independent shared permanent data. Store `coordinate_source` and required attribution.
- `/dashboard/imports/review`: only ambiguous internal-Business matches or external Place matches, with **Approve / Reject / Select correct Business / Manually place pin**. Clear matches go straight through. No extra company-wide approval process.
- Preserve `source_status_raw`; store only known products/prices/items. Unknown totals show "Unavailable" rather than invented records.
- Implement controlled rate limits, retries, idempotent imports and simple progress metrics (`imported`, `duplicate`, `review`, `failed`).

**Done when:** sample-format and genuine company files can be imported safely into the same simple schema, with order links correct and uncertain identities/locations reviewable. Final column mapping follows actual Steadfast/Excel files.

### Phase 8 — Company real data + production

- Receive actual company Excel/Steadfast files, inspect columns/quality and agree on column mapping.
- **Provision a clean production PostgreSQL database** (or reset only an isolated development DB; never wipe a live production DB).
- Apply **same committed Prisma migrations**. Do not copy sample rows to production.
- Import company businesses, products and orders via **the actual import pipeline** after provider selection; review identity/location exceptions; validate counts and Green/Red query.
- Set production secrets, restricted API keys, Google billing (if Google selected), provider attributions, database pooling, backups, HTTPS and domain.
- Deploy Next.js plus worker, check logs and test login/order entry/business map/routing/import using genuine records.

**Done when:** production contains **zero sample records** and company-confirmed records appear correctly on selected map.

---

## 7. Minimal security rules (not database locking)

1. Hash PIN; never store or log raw PIN; secure `HttpOnly`, `SameSite` cookies, HTTPS in production.
2. 5 wrong PIN attempts cause 15-minute **account-wide** login lockout; use extra IP throttling and record minimal audit timestamps. This is **login protection, not DB locking**.
3. Check session & authorization within **every Server Action and HTTP handler**; never trust hidden buttons or client data alone.
4. Validate inputs, sanitize imported data, enforce DB constraints, use Prisma transactions for multi-row order/import changes.
5. Keep private API keys (`GOOGLE_MAPS_SERVER_API_KEY`, `GEOAPIFY_SERVER_API_KEY`, `DATABASE_URL`, object storage secrets) on server; browser keys only when required and restricted.
6. Production database backup and tested restore path; imported file access private, size/type validated.
7. Correctly configure serverless DB pooling; use a worker with a sensible connection limit.

No demo-only restrictions, no custom table locks, no payment verification module or overengineered approval gate.

---

## 8. Minimal environment variables

```dotenv
DATABASE_URL=postgresql://...                  # development database
SESSION_SECRET=...                            # cryptographically strong
ADMIN_PIN_HASH=...                            # Argon2id/bcrypt hash, not raw PIN

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...             # dev: eligible Google demo key
NEXT_PUBLIC_GOOGLE_MAP_ID=DEMO_MAP_ID           # dev only
GOOGLE_MAPS_SERVER_API_KEY=...                 # add when server Google calls used

NEXT_PUBLIC_GEOAPIFY_API_KEY=...
GEOAPIFY_SERVER_API_KEY=...                    # add when backend calls used

OBJECT_STORAGE_BUCKET=...                     # configure in import phase
OBJECT_STORAGE_ACCESS_KEY=...
OBJECT_STORAGE_SECRET_KEY=...
```

Production env replaces dev values with production database, own Google Map ID/appropriate key, secure storage credentials, correct `APP_URL`, etc. **Never commit `.env.local`.**

---

## 9. Test checklist (core only)

- [ ] Admin PIN correct/incorrect; global lockout; logout; no unauthorized Server Action.
- [ ] Business with 0 orders **RED**; with 1 or more orders **GREEN**, regardless of order status.
- [ ] Adding an order immediately changes Red → Green; deleting the last order changes Green → Red.
- [ ] Both providers show the **same persisted** business status; unlocated records aren't shown at fake pins.
- [ ] Google search & routing work *inside* Google page; Geoapify search & routing work *inside* Geoapify page.
- [ ] No Google Places-owned content leaks to non-Google map; both maps show required attribution.
- [ ] Product price changes do not modify historical `unit_price_bdt`.
- [ ] Unused Product/Business can be hard-deleted after confirmation; referenced Product/Business is **Archived**, not cascaded/deleted; Restore works.
- [ ] Archived Products unavailable for new orders; archived Businesses hidden from default map but remain in history.
- [ ] Cancelling an Order retains it and **still counts as Green**; explicitly deleting last Order makes active Business Red.
- [ ] Imports normalize Bangla/UTF-8/BOM/phone; duplicate file/order safely handled.
- [ ] Provider selected **before** 4,000-record matching; only selected provider's optional `place_provider`/`external_place_id` stored. Ambiguous matches enter `/dashboard/imports/review`. No Google coordinate dump stored as shared long-term company coordinate.
- [ ] Business, Product and Order add/edit/cancel/archive/delete paths work per Phase 2; historical orders protected from parent cascading deletes.
- [ ] On **both** maps Category, District/Area, Name/Phone search and Green/Red filters pass every Phase 3 acceptance criterion; no result displays cleanly, unlocated records are counted, discovered Places not auto-persisted.
- [ ] Imported orders correctly linked to Businesses; missing item prices shown as unavailable.
- [ ] Direct-to-object-storage large upload and background worker work; retry/progress sensible.
- [ ] Vercel/managed DB pooling, backup, server errors and key restrictions checked.
- [ ] Clean production database has **no sample data**; real import and map validated.

---

## 10. Build order, no unnecessary steps

**First milestone:** foundation + PIN + simple Prisma schema + Dashboard CRUD (including Archive/Restore) + sample businesses/orders.  
**Second milestone:** Google and MapLibre+Geoapify on two routes, identical company filters and status colors, in-page routing.  
**Third milestone:** compare providers using actual APIs and sample Businesses, **pick one**, then implement the selected provider's import/matching/review pipeline.  
**Final milestone:** clean production DB, company data import/verification, deploy.

**Defer until company explicitly needs it:** advanced financial accounting, COD reconciliation, settlement, reports by delivery fees/discounts, multiple users, route optimization across many stops, notifications, CRM automation, sophisticated sales forecasting.

### Key sources for implementation checks

- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js — Authentication & Server Action authorization](https://nextjs.org/docs/app/guides/authentication)
- [Google Places API policies and cache restrictions](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Geoapify — API data storage and attribution FAQ](https://www.geoapify.com/)
- [Vercel — 4.5MB Function payload limit](https://vercel.com/docs/functions/limitations)

---

**Final decision:** **REAL APP NOW + REAL DATABASE SCHEMA + SAMPLE ROWS FIRST + TWO REAL MAPS IN DEV + LATER REAL COMPANY DATA IN CLEAN PRODUCTION DB.**

### v1.9 changes (over v1.8)

- **Standard CRUD policy**: Product/Business with no historical references → Confirmed Hard Delete; with history → Archive (`is_active=false`) + Restore; Order Cancel keeps history, mistaken Order deletion requires confirmation. Explicit DB `Restrict` relations, no accidental cascade of history.
- Added `businesses.is_active` and `businesses.area`; distinguished district vs locality (e.g., Dhaka vs Dhanmondi) and Optional/Unspecified values.
- Defined **map filters and executable acceptance criteria** for Category, District/Area, order color, name/phone search, combined filters, empty results, unlocated Businesses, archives, identical results across both provider pages, and separation of discovery results.
- Updated build sequencing: **test both maps → choose one provider → implement that provider's place matching + import/review → real company migration**. Removed need for persistent dual-provider Place IDs and 4,000 dual matches.
- Preserved simple domain schema, server components first, server actions, genuine dev/production DBs, basic security, and no demo-specific locks or simulation layers.

