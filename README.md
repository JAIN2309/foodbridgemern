# FoodBridge — MERN Stack Application

A production-grade food donation platform connecting food donors with NGOs to reduce food waste and feed those in need. Built with security, performance, and scalability in mind.

---

## Features

### For Donors
- Post surplus food donations with photo, weight (kg), pickup window, and expiry time
- Real-time status updates — instant notification when NGO claims (Socket.IO + FCM push)
- Full NGO contact card shown after claim (name, phone, email, address, trust score, ratings)
- **Rate the NGO** after collection — 1–5 star rating with optional comment (updates NGO trust score)
- "Collected by NGO" card with collection time and impact message
- Complete paginated donation history with kg saved from waste tracking
- Biometric authentication support for posting donations
- No-image placeholder when photo is unavailable

### For NGOs
- Live feed of nearby available donations with geospatial filtering
- **Search + filter bar** — search by food/donor/address, filter by category, radius (1/5/10 km), min serves, sort by urgency / distance / newest
- **Scheduled pickup** — choose Instant (30-min commitment) or Schedule Later (pick a date/time before the pickup window ends)
- Pickup deadline badge in My Claims showing instant vs scheduled status
- **Rate the donor** when marking collected — 1–5 star rating with optional comment (updates donor trust score)
- "Cannot Pickup" release flow with reason — returns donation to available, recorded as pill tags
- Interactive map view of donation locations
- Claims history and pickup tracking with release history
- Immediate live feed refresh after claiming
- GPS → registered-address fallback so the feed always works (location never compulsory)

### For Admins
- User verification — approve / reject with multilingual confirmation dialog
- **Account activation / deactivation** — block or restore login with confirm dialog; deactivated users get a 403 on login
- **User detail drawer** — on-demand slide-in panel with contact info, timeline, activity stats, trust score, and full review history
- **Analytics dashboard** — donation breakdown, completion rate, verification rate, kg saved, **pickup type split (instant vs scheduled)**
- **Date range filter** on analytics with **Excel (.xls) and PDF export** (9-section styled reports)
- **Ratings tab** — platform average, star distribution, top-rated NGO/donor leaderboards, recent reviews feed
- Sortable rating column + inline review expansion in the users list
- Paginated users list with last login time, account status, and rating
- Paginated donation history with filters (status, date, donor, NGO)
- Live donation map
- Dark mode across all dashboards

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js 18+ | Runtime (built-in `node --watch`, no nodemon) |
| Express.js | Web framework |
| MongoDB + Mongoose | Database and ODM |
| Socket.IO | Real-time donation status updates |
| Redis | Caching, rate limiting, JWT blacklist |
| Argon2id | Password hashing (with bcrypt migration support) |
| JWT | Authentication |
| Nodemailer + Gmail SMTP | Transactional email |
| AES-256-GCM | Field-level encryption (email, phone, license) |
| helmet | HTTP security headers (HSTS, X-Frame-Options, Permissions-Policy) |
| express-mongo-sanitize | NoSQL operator injection prevention |
| express-validator | Input validation on all write endpoints |
| @sentry/node | Error tracking and performance monitoring |
| Expo Push (FCM) | Mobile push notifications |
| node-cron | Scheduled jobs |

### Web Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI library |
| Vite | Build tool with HMR |
| Redux Toolkit | State management |
| React Router v6 | Navigation |
| Tailwind CSS | Styling (with dark mode) |
| React Hook Form | Form handling and validation |
| React Hot Toast | Notifications |
| Leaflet + React-Leaflet | Interactive maps |
| @sentry/react | Error tracking |
| i18next | Internationalisation (English, Hindi, Gujarati) |
| Socket.IO Client | Real-time updates |

### Mobile Frontend
| Technology | Purpose |
|-----------|---------|
| React Native + Expo 54 | Mobile framework |
| Expo Router | File-based navigation |
| Redux Toolkit | State management |
| expo-location | GPS geolocation with profile fallback |
| expo-local-authentication | Biometric (Face ID / Fingerprint) |
| expo-secure-store | Secure token storage |
| expo-notifications | FCM push notifications |
| expo-background-fetch + task-manager | Android background offline sync (WorkManager) |
| expo-haptics | Tactile feedback on rating taps |
| @sentry/react-native | Crash reporting |
| react-native-maps | Google Maps integration |
| i18next | Internationalisation (English, Hindi, Gujarati) |

---

## Project Structure

```
foodbridge/
├── backend/
│   ├── controllers/
│   │   ├── authController.js      # Register, login, logout, password reset, profile
│   │   ├── donationController.js  # CRUD, nearby, claim (instant/scheduled), collect, rate, release, history
│   │   └── userController.js      # Admin stats, ratings summary, user mgmt, verify, activate/deactivate, export
│   ├── middleware/
│   │   ├── auth.js                # JWT verify + Redis user cache + blacklist check
│   │   ├── rateLimiter.js         # Login, register, OTP, sync, claim, rating, export, map limiters
│   │   ├── validators.js          # express-validator chains for every write endpoint
│   │   └── logger.js              # Request logger with sensitive field redaction
│   ├── models/
│   │   ├── User.js                # Argon2 hashing + AES-256-GCM, is_active, push_token, ratings
│   │   └── Donation.js            # weight_kg, pickup_type, scheduled_pickup_time, donor_rated, release_history, indexes
│   ├── routes/
│   │   ├── auth.js
│   │   ├── donations.js
│   │   ├── users.js
│   │   └── map.js                 # Auth-guarded, rate-limited
│   ├── services/
│   │   ├── emailService.js        # HTML email templates, graceful SMTP fallback
│   │   ├── performanceService.js  # Redis-backed nearby donations cache
│   │   └── pushService.js         # Expo push (FCM) — claim/collect notifications + silent sync
│   ├── utils/
│   │   ├── encryption.js          # AES-256-GCM with lazy key loading
│   │   └── redisClient.js         # Redis wrapper with in-memory fallback
│   ├── jobs/
│   │   └── expiryScheduler.js     # Auto-expire + revert overdue reserved donations, 365-day cleanup
│   └── server.js                  # Socket.IO server, helmet, sanitize, CORS allowlist, /, /api/info, /api/health
├── frontend-webview/              # React web application
│   └── src/
│       ├── pages/
│       │   ├── admin/Dashboard.jsx  # Analytics + export, ratings tab, user activation, detail drawer, pagination
│       │   ├── donor/Dashboard.jsx  # Post food, NGO contact card, rate-NGO, paginated history
│       │   ├── ngo/Dashboard.jsx    # Live feed + filters, pickup scheduling, rate-donor, release flow
│       │   ├── auth/Login.jsx
│       │   ├── auth/Register.jsx    # GPS capture, FSSAI/NGO formatter, phone formatter
│       │   └── common/Profile.jsx
│       ├── store/slices/
│       ├── hooks/                   # useGeolocation (GPS + network fallback + retry)
│       ├── services/                # api.js, socket.js (donor + NGO rooms)
│       └── locales/                 # en, hi, gu translation files
└── frontend-mobileview/           # React Native / Expo mobile app
    └── src/
        ├── screens/
        │   ├── DonorDashboard.tsx   # Post food, rate-NGO (Ionicons stars + haptics), pagination
        │   ├── NGODashboard.tsx     # Live feed + filters, pickup scheduling, rate-donor, release
        │   ├── AdminDashboard.tsx   # Paginated users, last login, analytics
        │   ├── LoginScreen.tsx
        │   └── RegisterScreen.tsx   # GPS capture, FSSAI/NGO formatter, +91 prefix
        ├── hooks/
        │   └── useLocation.ts       # GPS with high→network fallback + retry
        ├── utils/
        │   ├── offlineQueue.ts      # AsyncStorage offline action queue
        │   ├── backgroundSync.ts    # Android WorkManager background sync
        │   └── pushNotifications.ts # FCM token registration + listeners
        ├── store/
        └── i18n/locales/            # en, hi, gu TypeScript translation files
```

---

## Getting Started

### Prerequisites
- Node.js v18 or higher
- MongoDB (local or Atlas)
- Redis (local or Upstash for production)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/JAIN2309/foodbridgemern.git
cd foodbridgemern
```

### 2. Backend setup
```bash
cd backend
npm install
```

### 3. Frontend setup
```bash
cd ../frontend-webview
npm install
```

### 4. Environment variables

Copy `.env.example` to `.env` in the `backend/` directory and fill in the values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/foodbridge

# Authentication
JWT_SECRET=your_random_string_min_32_chars

# Encryption — generate with: node -e "require('crypto').randomBytes(32).toString('hex')"
# NEVER change this after users have registered — existing data will be unreadable
ENCRYPTION_KEY=your_64_char_hex_string

# Email (Gmail with App Password)
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_gmail_app_password

# Redis (optional — app works without it, just no caching/rate-limiting)
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

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords → Create one named "FoodBridge".

> **Encryption Key:** Run `node -e "require('crypto').randomBytes(32).toString('hex')"` and paste the output.

> **Production Redis:** Use [Upstash](https://upstash.com) free tier. Set `REDIS_URL` to the connection URL.

> **Sentry:** Get the DSN from sentry.io → Project Settings → Client Keys. Web uses `VITE_SENTRY_DSN`, mobile uses `EXPO_PUBLIC_SENTRY_DSN`.

### 5. Create the first admin user
```bash
cd backend
npm run create-admin
```
Change the default password immediately after first login.

### 6. Start the application

Terminal 1 — Backend (port 5001):
```bash
cd backend
npm run dev
```

Terminal 2 — Frontend (port 5173):
```bash
cd frontend-webview
npm run dev
```

Visit `http://localhost:5001/api/health` to confirm MongoDB and Redis connectivity.

---

## Donation Fields

| Field | Type | Description |
|-------|------|-------------|
| `food_items` | Array | Name, category, storage, expiry per item |
| `quantity_serves` | Number | People the donation feeds |
| `weight_kg` | Number | Total food weight in kg (tracked for impact reporting) |
| `photo_url` | String | Base64 food photo (optional) |
| `pickup_address` | String | Collection address |
| `pickup_window_start/end` | Date | NGO pickup window |
| `pickup_type` | Enum | `instant` (30-min deadline) or `scheduled` |
| `scheduled_pickup_time` | Date | Chosen pickup time for scheduled claims |
| `pickup_deadline` | Date | Auto-revert deadline (instant + 30 min, or scheduled + 15 min grace) |
| `release_history` | Array | NGO release reasons with timestamps |
| `donor_rated` | Boolean | Whether donor has rated the NGO (prevents double-rating) |
| `status` | Enum | available → reserved → collected / expired |

---

## API Endpoints

40 endpoints across 4 route groups. Visit `/api/info` for a live summary.

### Authentication
| Method | Endpoint | Description | Rate Limited |
|--------|----------|-------------|-------------|
| POST | `/api/auth/register` | Register donor or NGO (validated) | 3/hr per IP |
| POST | `/api/auth/login` | Login (403 if account deactivated) | 5/15min per account |
| POST | `/api/auth/verify-password` | Verify password (biometric) | login limiter |
| POST | `/api/auth/logout` | Logout (blacklists JWT) | — |
| POST | `/api/auth/request-password-reset` | Send OTP to email | 3/hr per account |
| POST | `/api/auth/verify-otp` | Verify OTP (single-use) | 10/15min per IP |
| POST | `/api/auth/reset-password` | Set new password | 3/hr per account |
| GET | `/api/auth/profile` | Get own profile | — |
| PUT | `/api/auth/profile` | Update own profile (busts cache) | — |
| PUT | `/api/auth/push-token` | Save FCM push token (validated) | — |

### Donations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/donations/nearby` | Geospatial nearby donations (Redis cached 2 min) |
| POST | `/api/donations` | Create donation (validated, rate limited 20/hr) |
| POST | `/api/donations/:id/claim` | Claim — instant or scheduled, sets deadline, emits socket + push |
| POST | `/api/donations/:id/collect` | Mark collected + rate donor (1–5 stars) |
| POST | `/api/donations/:id/release` | Release back to available with reason |
| POST | `/api/donations/:id/rate-ngo` | Donor rates the NGO (1–5 stars, once) |
| GET | `/api/donations/history/donor` | Donor history (paginated, NGO contact details) |
| GET | `/api/donations/history/ngo` | NGO claim history (Redis cached 30s) |
| GET | `/api/donations/admin/history` | Paginated full history with filters |
| POST | `/api/donations/sync-offline` | Sync queued offline actions (validated, rate limited) |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/stats` | Platform stats + pickup split (Redis cached 5 min) |
| GET | `/api/users/all` | Paginated + searchable users list (cached 1 min) |
| GET | `/api/users/pending` | Pending verifications (paginated, cached 1 min) |
| GET | `/api/users/:id/detail` | User detail + activity stats (cached 2 min) |
| GET | `/api/users/ratings/summary` | Ratings leaderboards + reviews feed (cached 5 min) |
| GET | `/api/users/export/analytics` | Analytics export data (cached 2 min, rate limited) |
| PUT | `/api/users/:id/verify` | Approve or reject — clears cache instantly |
| PUT | `/api/users/:id/status` | Activate / deactivate account |

### System
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Root status |
| GET | `/api/info` | API metadata |
| GET | `/api/health` | MongoDB + Redis connectivity (IST timestamp, 503 if degraded) |

---

## Security

- **HTTP security headers** — `helmet` adds HSTS, X-Frame-Options, X-Content-Type-Options, Permissions-Policy (geolocation/camera self-only, mic/payment/USB blocked)
- **NoSQL injection prevention** — `express-mongo-sanitize` strips `$` operator injection from all request bodies
- **Input validation** — `express-validator` on every write endpoint (register, login, donation, rating, release, sync, admin actions) with `.escape()` for XSS
- **Rate limiting** — per-account brute-force (5/15min) + per-IP distinct-email spray detection + OTP, register, sync, claim, rating, export, and map limiters
- **JWT blacklist** — logged-out tokens invalidated in Redis for remaining 7-day lifetime
- **Auth middleware cache** — user object cached in Redis (5 min), no DB hit per request
- **Field-level encryption** — email, phone, license, contact person encrypted with AES-256-GCM
- **Argon2id hashing** — memory: 64MB, time: 3 iterations, parallelism: 4
- **Account deactivation** — admin can block login; deactivated users receive 403
- **Role enforcement** — `admin` / `super_admin` cannot be self-registered via API
- **CORS allowlist** — explicit origin allowlist (no wildcard) in production
- **Twilio webhook signature** — SMS webhook verifies `X-Twilio-Signature`
- **OTP single-use** — verified flag prevents reuse; per-account attempt cap
- **Sensitive log redaction** — passwords, tokens, encrypted fields stripped from all logs
- **CSP** — Content-Security-Policy on the web frontend (script-src self, allow-listed connect-src)

---

## Pickup Scheduling

When an NGO claims a donation, they choose how they'll pick it up:

```
⚡ Instant Pickup            📅 Schedule Later
   Pick up within 30 min        Choose a date/time before the pickup window ends
   pickup_deadline = now+30m     pickup_deadline = scheduled_time + 15m grace
```

A per-claim `setTimeout` plus the 5-minute expiry scheduler auto-reverts the donation to **available** if it isn't collected by the deadline — guarded so a collected donation is never wiped (TOCTOU-safe).

---

## Rating & Trust System

The trust score system is fully bidirectional — both sides rate each other after a pickup:

```
NGO marks collected  → rates the Donor (food quality)  → donor's trust score updates
Donor sees collected → rates the NGO (service quality) → NGO's trust score updates
```

- 1–5 star rating with optional comment, SVG/Ionicons stars with cascade animation
- Web: cascade fill + spring bounce + glow. Mobile: `Animated.spring` + `expo-haptics` tactile feedback
- `donor_rated` flag prevents double-rating
- Admin Ratings tab shows platform average, star distribution, top-rated leaderboards, and a recent reviews feed

---

## Real-Time Architecture

```
NGO claims donation
  → Backend: DB update → Redis cache invalidated → Socket.IO emit to donor-{id} room
  → Donor browser: receives donation-claimed event → immediately re-fetches history
  → Donor mobile: receives FCM push (works even if app is closed)
  → Status changes from "available" to "reserved" without waiting for 30s poll
```

Both donor and NGO dashboards also auto-refresh every 30 seconds as a fallback.

### Offline Sync (Android)
```
NGO offline → claims food → queued in AsyncStorage
  → Internet restores (app open: instant │ background: WorkManager ≤5 min │ closed: stopOnTerminate false │ rebooted: startOnBoot true)
  → Server processes sync → sends silent FCM push → device refreshes data
```

---

## Backend Scripts

```bash
npm run dev              # Start with node --watch (auto-reload)
npm start                # Production start
npm run create-admin     # Create default admin user
npm run create-super-admin  # Create super admin
npm run fetch-users      # List all users
npm run fetch-roles      # Role-wise user report
```

---

## Internationalisation

All three platforms (web, mobile, admin) support three languages switchable at runtime:

| Language | Code |
|----------|------|
| English | `en` |
| Hindi | `hi` |
| Gujarati | `gu` |

Web: `frontend-webview/src/locales/{en,hi,gu}/translation.json`
Mobile: `frontend-mobileview/src/i18n/locales/{en,hi,gu}.ts`

---

## Redis Features

The app runs fully without Redis (graceful in-memory fallback). With Redis connected:

| Feature | TTL | Benefit |
|---------|-----|---------|
| Nearby donations cache | 2 min | Skips geospatial aggregation; invalidated on claim/collect |
| NGO claim history cache | 30 sec | Per-NGO; invalidated on claim/collect/release |
| Donor history cache | 1 min | Paginated; invalidated on rating |
| Admin stats cache | 5 min | 11 parallel aggregations → single Redis read |
| Ratings summary cache | 5 min | 4 aggregations; invalidated on any new rating |
| Pending verifications cache | 1 min | Paginated; invalidated on verify/register |
| Active donations cache | 1 min | Map data; invalidated on status change |
| User list / detail cache | 1–2 min | Invalidated on verify/status change |
| Export analytics cache | 2 min | Expensive 14-pipeline aggregation |
| Auth user cache | 5 min | No DB hit on every protected API call |
| Login rate limit | 15 min window | 5 attempts per account (IP-agnostic) |
| Spray detection | 15 min window | Blocks >50 distinct accounts per IP |
| Register rate limit | 1 hr window | 3 attempts per IP |
| JWT blacklist | 7 days | Immediate logout token invalidation |

Cache invalidation is explicit — when data changes, the relevant key is deleted immediately so stale data is never served beyond the TTL window.

**Production:** [Upstash](https://upstash.com) Redis free tier (10k req/day) is sufficient for FoodBridge.

---

## Monitoring

- **Sentry** wired on all three platforms (`@sentry/node`, `@sentry/react`, `@sentry/react-native`) — every unhandled crash is captured with stack trace, user email, and IP. Graceful: the app runs fine without a DSN set.
- **Health endpoint** `/api/health` returns MongoDB + Redis status with an IST timestamp (200 ok / 503 degraded) for uptime monitors.

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

---

## Author

**JAIN2309**
- GitHub: [@JAIN2309](https://github.com/JAIN2309)
- Repository: [foodbridgemern](https://github.com/JAIN2309/foodbridgemern)

---

*Made with purpose — reducing food waste, feeding those in need.*
