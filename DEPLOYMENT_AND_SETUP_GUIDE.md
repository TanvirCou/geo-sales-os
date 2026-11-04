# 🚀 GeoSales OS — Complete Production Deployment & Setup Guide
> **Stack:** Next.js 16 + React 19 + PostgreSQL + Prisma + PM2 + CyberPanel (OpenLiteSpeed)  
> **Server OS:** AlmaLinux / Rocky Linux / CentOS (RHEL Family) or Ubuntu / Debian

---

## 📑 সূচিপত্র (Table of Contents)
1. [সার্ভার রিকোয়ারমেন্টস ও প্যাকেজ ইন্সটলেশন (AlmaLinux / RHEL)](#1-সার্ভার-রিকোয়ারমেন্টস-ও-প্যাকেজ-ইন্সটলেশন-almalinux--rhel)
2. [PostgreSQL ডাটাবেজ সেটআপ ও ট্রাবলশুটিং](#2-postgresql-ডাটাবেজ-সেটআপ-ও-ট্রাবলশুটিং)
3. [CyberPanel-এ ওয়েবসাইট তৈরি ও কোড ক্লোন](#3-cyberpanel-এ-ওয়েবসাইট-তৈরি-ও-কোড-ক্লোন)
4. [Environment Variables (.env) কনফিগারেশন](#4-environment-variables-env-কনফিগারেশন)
5. [Prisma মাইগ্রেশন ও Next.js প্রোডাকশন বিল্ড](#5-prisma-মাইগ্রেশন-ও-nextjs-প্রোডাকশন-বিল্ড)
6. [PM2 কনফিগারেশন (ecosystem.config.cjs) ও অটো-স্টার্ট](#6-pm2-কনফিগারেশন-ecosystemconfigcjs-ও-অটো-স্টার্ট)
7. [CyberPanel (OpenLiteSpeed) রিভার্স প্রক্সি সেটআপ (Port 3000)](#7-cyberpanel-openlitespeed-রিভার্স-প্রক্সি-সেটআপ-port-3000)
8. [এক ক্লিকে অটো-আপডেট স্ক্রিপ্ট (deploy.sh)](#8-এক-ক্লিকে-অটো-আপডেট-স্ক্রিপ্ট-deploysh)
9. [রিসেন্ট ফিচার চেঞ্জলগ (Privacy Mask, Fullscreen Map, Mobile Skeletons)](#9-রিসেন্ট-ফিচার-চেঞ্জলগ)

---

## 1. সার্ভার রিকোয়ারমেন্টস ও প্যাকেজ ইন্সটলেশন (AlmaLinux / RHEL)

সার্ভারে SSH দিয়ে `root` হিসেবে লগইন করে নিচের কমান্ডগুলো চালান:

```bash
# ১. সিস্টেম আপডেট
dnf update -y

# ২. বিল্ড টুলস ও গিট ইন্সটল
dnf install -y git gcc-c++ make

# ৩. Node.js 20.x (LTS) ইন্সটল
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs

# ৪. ভার্সন চেক
node -v   # v20.x.x আসবে
npm -v    # v10.x.x আসবে

# ৫. PM2 গ্লোবালি ইন্সটল
npm install -g pm2
```

*(যদি উবুন্টু/ডেবিয়ান সার্ভার হয়, তবে `dnf`-এর বদলে `sudo apt update && sudo apt install -y nodejs` ব্যবহার করবেন)*

---

## 2. PostgreSQL ডাটাবেজ সেটআপ ও ট্রাবলশুটিং

### ক. ইন্সটলেশন ও ইনিশিয়ালাইজেশন (AlmaLinux)
```bash
# PostgreSQL ইন্সটল
dnf install -y postgresql-server postgresql-contrib

# যদি আগে চেষ্টা করার কারণে "Data directory is not empty" এরর দেখায়:
rm -rf /var/lib/pgsql/data/*

# ফ্রেশ ডাটাবেজ ক্লাস্টার ইনিশিয়ালাইজ
postgresql-setup --initdb

# সার্ভিস স্টার্ট ও অটো-বুট এনাবল
systemctl start postgresql
systemctl enable postgresql

# স্ট্যাটাস চেক (সবুজ active running নিশ্চিত করুন)
systemctl status postgresql
```

### খ. ডাটাবেজ ও ইউজার তৈরি
```bash
# postgres ইউজার দিয়ে psql শেল-এ ঢুকুন
su - postgres -c "psql"
```

এখন নিচের SQL কোডগুলো চালান:
```sql
-- ডাটাবেজ তৈরি
CREATE DATABASE geosales_db;

-- ইউজার তৈরি ও পাসওয়ার্ড সেট
CREATE USER geosales_user WITH ENCRYPTED PASSWORD 'StrongPass#2026!';

-- পারমিশন প্রদান
GRANT ALL PRIVILEGES ON DATABASE geosales_db TO geosales_user;
ALTER DATABASE geosales_db OWNER TO geosales_user;

-- বের হয়ে আসুন
\q
```

### গ. পাসওয়ার্ড অথেনটিকেশন (scram-sha-256) এনাবল
AlmaLinux-এ লোকাল পাসওয়ার্ড কানেকশনের জন্য এটি রান করুন:
```bash
sed -i 's/127.0.0.1\/32            ident/127.0.0.1\/32            scram-sha-256/g' /var/lib/pgsql/data/pg_hba.conf
sed -i 's/::1\/128                 ident/::1\/128                 scram-sha-256/g' /var/lib/pgsql/data/pg_hba.conf

# PostgreSQL রিস্টার্ট করুন
systemctl restart postgresql
```

---

## 3. CyberPanel-এ ওয়েবসাইট তৈরি ও কোড ক্লোন

1. CyberPanel প্যানেলে যান ➔ **Websites** ➔ **Create Website**।
2. আপনার ডোমেইন দিন (যেমন: `app.yourdomain.com`), PHP সিলেক্ট করুন এবং **SSL** ইস্যু করুন।
3. টার্মিনালে প্রজেক্ট ডিরেক্টরিতে যান:

```bash
# ডোমেইনের ফোল্ডারে প্রবেশ (আপনার ডোমেইনের নাম বসাবেন)
cd /home/yourdomain.com

# ডিফল্ট ফোল্ডার খালি করুন
rm -rf public_html

# আপনার গিট রিপোজিটরি ক্লোন করুন
git clone https://github.com/your-username/geo-sales-os.git public_html

# প্রোজেক্টে প্রবেশ
cd public_html
```

---

## 4. Environment Variables (.env) কনফিগারেশন

```bash
nano .env
```

নিচের কনফিগারেশনটি দিয়ে সংরক্ষণ করুন (`Ctrl + O`, `Enter`, `Ctrl + X`):

```env
# Database Connection
DATABASE_URL="postgresql://geosales_user:StrongPass%232026!@localhost:5432/geosales_db?schema=public"

# Auth & Encryption Secrets
SESSION_SECRET="generate-a-strong-random-secret-key-here"
ADMIN_PIN_HASH="your-hashed-admin-pin"

# Google Maps APIs
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
NEXT_PUBLIC_GOOGLE_MAP_ID="your-google-map-id"
GOOGLE_MAPS_SERVER_API_KEY="your-google-maps-server-key"

# Geoapify APIs
NEXT_PUBLIC_GEOAPIFY_API_KEY="your-geoapify-client-key"
GEOAPIFY_SERVER_API_KEY="your-geoapify-server-key"

# Public App URL
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

---

## 5. Prisma মাইগ্রেশন ও Next.js প্রোডাকশন বিল্ড

```bash
# ১. ডিপেন্ডেন্সি ইন্সটল
npm install

# ২. প্রিজমা ক্লায়েন্ট জেনারেট ও ডাটাবেজ স্কিমা পুশ
npx prisma generate
npx prisma db push

# ৩. এডমিন সিড (প্রয়োজনে)
npm run seed:admin

# ৪. Next.js প্রোডাকশন বিল্ড
npm run build
```

---

## 6. PM2 কনফিগারেশন (ecosystem.config.cjs) ও অটো-স্টার্ট

প্রজেক্টে ইতিমধ্যে `ecosystem.config.cjs` ফাইল রয়েছে:

```javascript
module.exports = {
  apps: [
    {
      name: "geosales-os",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

অ্যাপ চালু ও অটো-রিস্টার্ট করতে:

```bash
# অ্যাপ স্টার্ট
pm2 start ecosystem.config.cjs

# স্ট্যাটাস চেক
pm2 status

# সিস্টেম রিবুটেও চালু রাখতে
pm2 save
pm2 startup
# (টার্মিনালে sudo env PATH... যে কমান্ডটি আসবে সেটি কপি করে পেস্ট করে রান করবেন)
```

---

## 7. CyberPanel (OpenLiteSpeed) রিভার্স প্রক্সি সেটআপ (Port 3000)

Next.js পোর্ট `3000`-এ চলছে। আপনার ডোমেইনের ট্রাফিক পোর্ট ৩০০০-এ পাঠাতে:

1. **CyberPanel ড্যাশবোর্ড** ➔ **Websites** ➔ **List Websites** ➔ আপনার ওয়েবসাইটের পাশে **Manage** বাটনে ক্লিক করুন।
2. নিচের দিকে স্ক্রোল করে **Rewrite Rules** অপশনে যান।
3. বক্সে আগের কোড মুছে নিচের কোড পেস্ট করে **Save Rewrite Rules** দিন:

```apache
RewriteEngine On
RewriteCond %{HTTPS} on
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

---

## 8. এক ক্লিকে অটো-আপডেট স্ক্রিপ্ট (deploy.sh)

পরবর্তীতে যেকোনো কোড আপডেট করার পর সার্ভারে শুধু এই এক লাইন চালাবেন:

```bash
cd /home/yourdomain.com/public_html
chmod +x deploy.sh
./deploy.sh
```

এই স্ক্রিপ্টটি স্বয়ংক্রিয়ভাবে:
1. Git থেকে লেটেস্ট কোড পুল করবে।
2. নতুন প্যাকেজ থাকলে `npm install` করবে।
3. `npx prisma db push` দিয়ে ডাটাবেজ আপডেট করবে।
4. `npm run build` দিয়ে বিল্ড বানাবে।
5. জিরো-ডাউনটাইমে `pm2 reload` করবে।

---

## 9. রিসেন্ট ফিচার চেঞ্জলগ
- **Confidential Spoiler Mask:** Telegram-style animated particle cloud দিয়ে ড্যাশবোর্ডের গ্রস রেভিনিউ, অর্ডার ও ক্লায়েন্ট সংখ্যা হাইড/শো করার অপশন এবং গ্লোবাল `👁️ Privacy Mode` সুইচ।
- **Fullscreen Map Experience:** সম্পূর্ণ স্ক্রিন জুড়ে ডিস্ট্রাকশন-ফ্রি ম্যাপ, একক এক্সিট বাটন ও ESC কি শর্টকাট।
- **Mobile Loading Skeletons:** মোবাইলের ডাইনামিক ভিউপোর্ট (`100dvh`), স্ক্রোলেবল ফিল্টার পিলস এবং অপ্টিমাইজড কার্ড স্কেলেটন।
