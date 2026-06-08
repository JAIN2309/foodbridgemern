<div align="center">

# 🍽️ FoodBridge

### Bridging Food Surplus with Food Security

A **production-grade MERN food donation platform** connecting food donors with NGOs to reduce food waste and feed those in need — built with security, performance, and scalability at its core.

<br/>

![Node](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-54-000020?style=for-the-badge&logo=expo&logoColor=white)

![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-010101?style=flat-square&logo=socket.io&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Sentry](https://img.shields.io/badge/Sentry-Monitoring-362D59?style=flat-square&logo=sentry&logoColor=white)
![i18n](https://img.shields.io/badge/i18n-EN_·_HI_·_GU-FF6F61?style=flat-square)
![License](https://img.shields.io/badge/Endpoints-40-blue?style=flat-square)

</div>

---

## 📑 Table of Contents

- [✨ Features](#-features)
- [🛠 Tech Stack](#-tech-stack)
- [📂 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [🍱 Donation Fields](#-donation-fields)
- [🔌 API Endpoints](#-api-endpoints)
- [🔐 Security](#-security)
- [⏱ Pickup Scheduling](#-pickup-scheduling)
- [⭐ Rating & Trust System](#-rating--trust-system)
- [⚡ Real-Time Architecture](#-real-time-architecture)
- [📊 Redis Caching](#-redis-caching)
- [📡 Monitoring](#-monitoring)
- [🌍 Internationalisation](#-internationalisation)

---

## ✨ Features

<table>
<tr>
<td width="33%" valign="top">

### 🍴 For Donors
- Post food with photo, **weight (kg)**, pickup window & expiry
- Real-time claim alerts (Socket.IO + **FCM push**)
- Full NGO contact card after claim
- **Rate the NGO** ⭐ after collection
- "Collected by NGO" impact card
- Paginated history + kg-saved tracking
- Biometric auth for posting
- No-image placeholder fallback

</td>
<td width="33%" valign="top">

### 🤝 For NGOs
- Live feed of **nearby** donations
- **Search · filter · sort** bar
  (category, radius 1/5/10 km, serves)
- **Scheduled pickup** ⚡📅
  (instant 30-min or schedule later)
- Pickup deadline badge
- **Rate the donor** ⭐ on collect
- "Cannot Pickup" release flow
- Interactive map view
- GPS → registered-address fallback

</td>
<td width="33%" valign="top">

### 🛡 For Admins
- Verify users (approve / reject)
- **Activate / deactivate** accounts
- **User detail drawer** (on-demand)
- Analytics + **pickup split**
- **Excel / PDF export** + date filter
- **Ratings tab** with leaderboards
- Sortable + expandable reviews
- Paginated lists · 🌙 dark mode

</td>
</tr>
</table>

---

## 🛠 Tech Stack

<details open>
<summary><b>⚙️ Backend</b></summary>

| Technology | Purpose |
|-----------|---------|
| **Node.js 18+** | Runtime (built-in `node --watch`, no nodemon) |
| **Express.js** | Web framework |
| **MongoDB + Mongoose** | Database and ODM |
| **Socket.IO** | Real-time donation status updates |
| **Redis** | Caching, rate limiting, JWT blacklist |
| **Argon2id** | Password hashing (with bcrypt migration support) |
| **JWT** | Authentication |
| **Nodemailer + Gmail SMTP** | Transactional email |
| **AES-256-GCM** | Field-level encryption (email, phone, license) |
| **helmet** | HTTP security headers (HSTS, X-Frame-Options, Permissions-Policy) |
| **express-mongo-sanitize** | NoSQL operator injection prevention |
| **express-validator** | Input validation on all write endpoints |
| **@sentry/node** | Error tracking and performance monitoring |
| **Expo Push (FCM)** | Mobile push notifications |
| **node-cron** | Scheduled jobs |

</details>

<details open>
<summary><b>🌐 Web Frontend</b></summary>

| Technology | Purpose |
|-----------|---------|
| **React 18** | UI library |
| **Vite** | Build tool with HMR |
| **Redux Toolkit** | State management |
| **React Router v6** | Navigation |
| **Tailwind CSS** | Styling (with dark mode) |
| **React Hook Form** | Form handling and validation |
| **React Hot Toast** | Notifications |
| **Leaflet + React-Leaflet** | Interactive maps |
| **@sentry/react** | Error tracking |
| **i18next** | Internationalisation (English, Hindi, Gujarati) |
| **Socket.IO Client** | Real-time updates |

</details>

<details open>
<summary><b>📱 Mobile Frontend</b></summary>

| Technology | Purpose |
|-----------|---------|
| **React Native + Expo 54** | Mobile framework |
| **Expo Router** | File-based navigation |
| **Redux Toolkit** | State management |
| **expo-location** | GPS geolocation with profile fallback |
| **expo-local-authentication** | Biometric (Face ID / Fingerprint) |
| **expo-secure-store** | Secure token storage |
| **expo-notifications** | FCM push notifications |
| **expo-background-fetch + task-manager** | Android background offline sync (WorkManager) |
| **expo-haptics** | Tactile feedback on rating taps |
| **@sentry/react-native** | Crash reporting |
| **react-native-maps** | Google Maps integration |
| **i18next** | Internationalisation (English, Hindi, Gujarati) |

</details>

---

## 📂 Project Structure

```
foodbridge/
├── 📁 backend/
│   ├── controllers/
│   │   ├── authController.js      # Register, login, logout, password reset, profile
│   │   ├── donationController.js  # CRUD, nearby, claim (instant/scheduled), collect, rate, release
│   │   └── userController.js      # Admin stats, ratings, user mgmt, verify, activate, export
│   ├── middleware/
│   │   ├── auth.js                # JWT verify + Redis user cache + blacklist check
│   │   ├── rateLimiter.js         # Login, register, OTP, sync, claim, rating, export, map limiters
│   │   ├── validators.js          # express-validator chains for every write endpoint
│   │   └── logger.js              # Request logger with sensitive field redaction
│   ├── models/
│   │   ├── User.js                # Argon2 + AES-256-GCM, is_active, push_token, ratings
│   │   └── Donation.js            # weight_kg, pickup_type, scheduled_pickup_time, release_history
│   ├── routes/                    # auth · donations · users · map (auth-guarded, rate-limited)
│   ├── services/
│   │   ├── emailService.js        # HTML email templates, graceful SMTP fallback
│   │   ├── performanceService.js  # Redis-backed nearby donations cache
│   │   └── pushService.js         # Expo push (FCM) — claim/collect + silent sync
│   ├── utils/                     # encryption.js (AES-256-GCM) · redisClient.js (fallback)
│   ├── jobs/expiryScheduler.js    # Auto-expire + revert overdue reserved, 365-day cleanup
│   └── server.js                  # Socket.IO, helmet, sanitize, CORS, /, /api/info, /api/health
│
├── 🌐 frontend-webview/           # React web application
│   └── src/
│       ├── pages/
│       │   ├── admin/Dashboard.jsx  # Analytics + export, ratings, activation, drawer, pagination
│       │   ├── donor/Dashboard.jsx  # Post food, NGO card, rate-NGO, paginated history
│       │   ├── ngo/Dashboard.jsx    # Live feed + filters, pickup scheduling, rate-donor, release
│       │   ├── auth/                # Login · Register (GPS capture, formatters)
│       │   └── common/Profile.jsx
│       ├── store/ · hooks/ · services/ · locales/   # en · hi · gu
│
└── 📱 frontend-mobileview/        # React Native / Expo mobile app
    └── src/
        ├── screens/               # Donor · NGO · Admin · Login · Register dashboards
        ├── hooks/useLocation.ts   # GPS with high→network fallback + retry
        ├── utils/
        │   ├── offlineQueue.ts      # AsyncStorage offline action queue
        │   ├── backgroundSync.ts    # Android WorkManager background sync
        │   └── pushNotifications.ts # FCM token registration + listeners
        ├── store/ · i18n/locales/   # en · hi · gu
```

---

## 🚀 Getting Started

### Prerequisites
> Node.js **v18+** · MongoDB (local or Atlas) · Redis (local or Upstash) · Git

### 1️⃣ Clone the repository
```bash
git clone https://github.com/JAIN2309/foodbridgemern.git
cd foodbridgemern
```

### 2️⃣ Install dependencies
```bash
cd backend && npm install
cd ../frontend-webview && npm install
```

### 3️⃣ Environment variables

Copy `.env.example` to `.env` in `backend/` and fill in:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/foodbridge

# Authentication
JWT_SECRET=your_random_string_min_32_chars

# Encryption — generate with: node -e "require('crypto').randomBytes(32).toString('hex')"
# ⚠️ NEVER change after users register — existing data becomes unreadable
ENCRYPTION_KEY=your_64_char_hex_string

# Email (Gmail with App Password)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Redis (optional — app works without it via in-memory fallback)
REDIS_URL=redis://localhost:6379

# Frontend URL (used in email links)
FRONTEND_URL=http://localhost:5173

# Sentry error tracking (optional)
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX

# Twilio SMS webhook signature verification (optional)
TWILIO_AUTH_TOKEN=your_twilio_auth_token

# Server
PORT=5001
```

> 💡 **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords → name it "FoodBridge".
>
> 🔑 **Encryption Key:** Run `node -e "require('crypto').randomBytes(32).toString('hex')"` and paste the output.
>
> ☁️ **Production Redis:** [Upstash](https://upstash.com) free tier. Set `REDIS_URL` to the connection URL.
>
> 🛰 **Sentry:** DSN from sentry.io → Project Settings → Client Keys. Web uses `VITE_SENTRY_DSN`, mobile uses `EXPO_PUBLIC_SENTRY_DSN`.

### 4️⃣ Create the first admin
```bash
cd backend && npm run create-admin
```
> ⚠️ Change the default password immediately after first login.

### 5️⃣ Run it

| Terminal | Command | Runs on |
|----------|---------|---------|
| 🔵 Backend | `cd backend && npm run dev` | `http://localhost:5001` |
| 🟢 Frontend | `cd frontend-webview && npm run dev` | `http://localhost:5173` |

> ✅ Visit `http://localhost:5001/api/health` to confirm MongoDB + Redis connectivity.

---

## 🍱 Donation Fields

| Field | Type | Description |
|-------|------|-------------|
| `food_items` | Array | Name, category, storage, expiry per item |
| `quantity_serves` | Number | People the donation feeds |
| `weight_kg` | Number | Total food weight in kg (impact reporting) |
| `photo_url` | String | Base64 food photo (optional) |
| `pickup_address` | String | Collection address |
| `pickup_window_start/end` | Date | NGO pickup window |
| `pickup_type` | Enum | `instant` (30-min deadline) or `scheduled` |
| `scheduled_pickup_time` | Date | Chosen pickup time for scheduled claims |
| `pickup_deadline` | Date | Auto-revert deadline (instant +30m, scheduled +15m grace) |
| `release_history` | Array | NGO release reasons with timestamps |
| `donor_rated` | Boolean | Whether donor has rated the NGO (prevents double-rating) |
| `status` | Enum | `available` → `reserved` → `collected` / `expired` |

---

## 🔌 API Endpoints

> **40 endpoints** across 4 route groups. Visit `/api/info` for a live summary.

<details>
<summary><b>🔑 Authentication</b></summary>

| Method | Endpoint | Description | Rate Limited |
|--------|----------|-------------|-------------|
| `POST` | `/api/auth/register` | Register donor or NGO (validated) | 3/hr per IP |
| `POST` | `/api/auth/login` | Login (403 if account deactivated) | 5/15min per account |
| `POST` | `/api/auth/verify-password` | Verify password (biometric) | login limiter |
| `POST` | `/api/auth/logout` | Logout (blacklists JWT) | — |
| `POST` | `/api/auth/request-password-reset` | Send OTP to email | 3/hr per account |
| `POST` | `/api/auth/verify-otp` | Verify OTP (single-use) | 10/15min per IP |
| `POST` | `/api/auth/reset-password` | Set new password | 3/hr per account |
| `GET` | `/api/auth/profile` | Get own profile | — |
| `PUT` | `/api/auth/profile` | Update own profile (busts cache) | — |
| `PUT` | `/api/auth/push-token` | Save FCM push token (validated) | — |

</details>

<details>
<summary><b>🍽️ Donations</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/donations/nearby` | Geospatial nearby donations (Redis cached 2 min) |
| `POST` | `/api/donations` | Create donation (validated, rate limited 20/hr) |
| `POST` | `/api/donations/:id/claim` | Claim — instant or scheduled, sets deadline, emits socket + push |
| `POST` | `/api/donations/:id/collect` | Mark collected + rate donor (1–5 stars) |
| `POST` | `/api/donations/:id/release` | Release back to available with reason |
| `POST` | `/api/donations/:id/rate-ngo` | Donor rates the NGO (1–5 stars, once) |
| `GET` | `/api/donations/history/donor` | Donor history (paginated, NGO contact) |
| `GET` | `/api/donations/history/ngo` | NGO claim history (Redis cached 30s) |
| `GET` | `/api/donations/admin/history` | Paginated full history with filters |
| `POST` | `/api/donations/sync-offline` | Sync queued offline actions (validated, rate limited) |

</details>

<details>
<summary><b>👥 Users (Admin)</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users/stats` | Platform stats + pickup split (cached 5 min) |
| `GET` | `/api/users/all` | Paginated + searchable users list (cached 1 min) |
| `GET` | `/api/users/pending` | Pending verifications (paginated, cached 1 min) |
| `GET` | `/api/users/:id/detail` | User detail + activity stats (cached 2 min) |
| `GET` | `/api/users/ratings/summary` | Ratings leaderboards + reviews feed (cached 5 min) |
| `GET` | `/api/users/export/analytics` | Analytics export data (cached 2 min, rate limited) |
| `PUT` | `/api/users/:id/verify` | Approve or reject — clears cache instantly |
| `PUT` | `/api/users/:id/status` | Activate / deactivate account |

</details>

<details>
<summary><b>⚙️ System</b></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Root status |
| `GET` | `/api/info` | API metadata |
| `GET` | `/api/health` | MongoDB + Redis connectivity (IST timestamp, 503 if degraded) |

</details>

---

## 🔐 Security

| Layer | Implementation |
|-------|----------------|
| 🪖 **HTTP headers** | `helmet` — HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy (geolocation/camera self-only, mic/payment/USB blocked) |
| 💉 **NoSQL injection** | `express-mongo-sanitize` strips `$` operators from all request bodies |
| ✅ **Input validation** | `express-validator` on every write endpoint, with `.escape()` for XSS |
| 🚦 **Rate limiting** | Per-account brute-force + per-IP spray detection + OTP, register, sync, claim, rating, export, map limiters |
| 🚫 **JWT blacklist** | Logged-out tokens invalidated in Redis for remaining 7-day lifetime |
| ⚡ **Auth cache** | User object cached in Redis (5 min) — no DB hit per request |
| 🔒 **Field encryption** | Email, phone, license, contact person encrypted with AES-256-GCM |
| 🛡 **Password hashing** | Argon2id — 64MB memory, 3 iterations, parallelism 4 |
| 🔕 **Account deactivation** | Admin can block login; deactivated users get 403 |
| 👮 **Role enforcement** | `admin` / `super_admin` cannot be self-registered via API |
| 🌐 **CORS allowlist** | Explicit origin allowlist (no wildcard) in production |
| 📲 **Twilio signature** | SMS webhook verifies `X-Twilio-Signature` |
| 🔢 **OTP single-use** | Verified flag prevents reuse; per-account attempt cap |
| 🧹 **Log redaction** | Passwords, tokens, encrypted fields stripped from all logs |
| 🛑 **CSP** | Content-Security-Policy on web (script-src self, allow-listed connect-src) |

---

## ⏱ Pickup Scheduling

When an NGO claims a donation, they choose how they'll pick it up:

```
┌─────────────────────────────┐   ┌──────────────────────────────────────────┐
│  ⚡ Instant Pickup          │   │  📅 Schedule Later                         │
│     Pick up within 30 min    │   │     Choose a date/time before window ends  │
│     deadline = now + 30m      │   │     deadline = scheduled_time + 15m grace  │
└─────────────────────────────┘   └──────────────────────────────────────────┘
```

A per-claim `setTimeout` plus the 5-minute expiry scheduler auto-reverts the donation to **available** if not collected by the deadline — guarded so a collected donation is never wiped (TOCTOU-safe).

---

## ⭐ Rating & Trust System

The trust score system is **fully bidirectional** — both sides rate each other after a pickup:

```
NGO marks collected  →  rates the Donor (food quality)   →  donor's trust score updates
Donor sees collected  →  rates the NGO (service quality)  →  NGO's trust score updates
```

- ⭐ 1–5 star rating with optional comment
- 🌐 **Web:** SVG stars — cascade fill + spring bounce + glow
- 📱 **Mobile:** Ionicons stars — `Animated.spring` + `expo-haptics` tactile feedback
- 🔒 `donor_rated` flag prevents double-rating
- 📊 Admin **Ratings tab** — platform average, star distribution, top-rated leaderboards, recent reviews feed

---

## ⚡ Real-Time Architecture

```
NGO claims donation
  └─→ Backend: DB update → Redis cache invalidated → Socket.IO emit to donor-{id} room
       ├─→ Donor browser: receives donation-claimed event → re-fetches history instantly
       └─→ Donor mobile: receives FCM push (works even if app is closed)
            └─→ Status flips "available" → "reserved" without waiting for 30s poll
```

Both donor and NGO dashboards also auto-refresh every 30 seconds as a fallback.

### 📴 Offline Sync (Android)
```
NGO offline → claims food → queued in AsyncStorage
  └─→ Internet restores:
       ├─ app open      → instant
       ├─ background    → WorkManager ≤ 5 min
       ├─ app closed    → stopOnTerminate: false
       └─ rebooted      → startOnBoot: true
  └─→ Server processes sync → sends silent FCM push → device refreshes data
```

---

## 📊 Redis Caching

> The app runs **fully without Redis** (graceful in-memory fallback). With Redis connected:

| Feature | TTL | Benefit |
|---------|-----|---------|
| Nearby donations | `2 min` | Skips geospatial aggregation; invalidated on claim/collect |
| NGO claim history | `30 sec` | Per-NGO; invalidated on claim/collect/release |
| Donor history | `1 min` | Paginated; invalidated on rating |
| Admin stats | `5 min` | 11 parallel aggregations → single Redis read |
| Ratings summary | `5 min` | 4 aggregations; invalidated on any new rating |
| Pending verifications | `1 min` | Paginated; invalidated on verify/register |
| Active donations | `1 min` | Map data; invalidated on status change |
| User list / detail | `1–2 min` | Invalidated on verify/status change |
| Export analytics | `2 min` | Expensive 14-pipeline aggregation |
| Auth user cache | `5 min` | No DB hit on every protected call |
| Login rate limit | `15 min` | 5 attempts per account (IP-agnostic) |
| Spray detection | `15 min` | Blocks > 50 distinct accounts per IP |
| Register rate limit | `1 hr` | 3 attempts per IP |
| JWT blacklist | `7 days` | Immediate logout token invalidation |

> 🔄 Cache invalidation is **explicit** — when data changes, the relevant key is deleted immediately, so stale data is never served beyond the TTL window.

---

## 📡 Monitoring

- 🛰 **Sentry** wired on all three platforms (`@sentry/node`, `@sentry/react`, `@sentry/react-native`) — every unhandled crash captured with stack trace, user email, and IP. Graceful: the app runs fine without a DSN set.
- 💚 **Health endpoint** `/api/health` returns MongoDB + Redis status with an IST timestamp (`200 ok` / `503 degraded`) for uptime monitors.

---

## 🌍 Internationalisation

All three platforms support **three languages**, switchable at runtime:

| Language | Code | Web | Mobile |
|----------|------|-----|--------|
| 🇬🇧 English | `en` | ✅ | ✅ |
| 🇮🇳 Hindi | `hi` | ✅ | ✅ |
| 🇮🇳 Gujarati | `gu` | ✅ | ✅ |

> Web: `frontend-webview/src/locales/{en,hi,gu}/translation.json`
> Mobile: `frontend-mobileview/src/i18n/locales/{en,hi,gu}.ts`

---

## 🧰 Backend Scripts

```bash
npm run dev                 # Start with node --watch (auto-reload)
npm start                   # Production start
npm run create-admin        # Create default admin user
npm run create-super-admin  # Create super admin
npm run fetch-users         # List all users
npm run fetch-roles         # Role-wise user report
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch — `git checkout -b feature/your-feature`
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

<div align="center">

## 👤 Author

**JAIN2309**

[![GitHub](https://img.shields.io/badge/GitHub-@JAIN2309-181717?style=for-the-badge&logo=github)](https://github.com/JAIN2309)
[![Email](https://img.shields.io/badge/Email-krishjain641@gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white)](mailto:krishjain641@gmail.com)
[![Repo](https://img.shields.io/badge/Repo-foodbridgemern-2088FF?style=for-the-badge&logo=git)](https://github.com/JAIN2309/foodbridgemern)

<br/>

*Made with purpose — reducing food waste, feeding those in need.* 💚

</div>
