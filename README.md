# FoodBridge — MERN Stack Application

A production-grade food donation platform connecting food donors with NGOs to reduce food waste and feed those in need. Built with security, performance, and scalability in mind.

---

## Features

### For Donors
- Post surplus food donations with photo, weight (kg), pickup window, and expiry time
- Real-time status updates — instant notification when NGO claims (Socket.IO)
- Full NGO contact card shown after claim (name, phone, email, address, trust score, ratings)
- Complete donation history with kg saved from waste tracking
- Biometric authentication support for posting donations
- No-image placeholder when photo is unavailable

### For NGOs
- Live feed of nearby available donations with geospatial filtering
- Confirmation dialog before claiming — includes 30-minute pickup commitment notice
- Interactive map view of donation locations
- Claims history and pickup tracking
- Immediate live feed refresh after claiming

### For Admins
- User verification — approve / reject with multilingual confirmation dialog
- Real-time analytics dashboard — donation breakdown, completion rate, verification rate, kg saved
- Paginated users list with last login time
- Paginated donation history with filters (status, date, donor, NGO)
- Live donation map

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
| node-cron | Scheduled jobs |

### Web Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI library |
| Vite | Build tool with HMR |
| Redux Toolkit | State management |
| React Router v6 | Navigation |
| Tailwind CSS | Styling |
| React Hook Form | Form handling and validation |
| React Hot Toast | Notifications |
| Leaflet + React-Leaflet | Interactive maps |
| i18next | Internationalisation (English, Hindi, Gujarati) |
| Socket.IO Client | Real-time updates |

### Mobile Frontend
| Technology | Purpose |
|-----------|---------|
| React Native + Expo 54 | Mobile framework |
| Expo Router | File-based navigation |
| Redux Toolkit | State management |
| expo-location | GPS geolocation with fallback |
| expo-local-authentication | Biometric (Face ID / Fingerprint) |
| expo-secure-store | Secure token storage |
| react-native-maps | Google Maps integration |
| i18next | Internationalisation (English, Hindi, Gujarati) |

---

## Project Structure

```
foodbridge/
├── backend/
│   ├── controllers/
│   │   ├── authController.js      # Register, login, logout, password reset
│   │   ├── donationController.js  # CRUD, nearby, claim, collect, history, weight_kg
│   │   └── userController.js      # Admin stats (kg saved), user management, verification
│   ├── middleware/
│   │   ├── auth.js                # JWT verify + Redis user cache + blacklist check
│   │   ├── rateLimiter.js         # Brute-force (per account) + spray (distinct emails/IP)
│   │   └── logger.js              # Request logger with sensitive field redaction
│   ├── models/
│   │   ├── User.js                # Argon2 hashing + AES-256-GCM field encryption
│   │   └── Donation.js            # weight_kg field, geospatial index
│   ├── routes/
│   │   ├── auth.js
│   │   ├── donations.js
│   │   ├── users.js
│   │   └── map.js
│   ├── services/
│   │   ├── emailService.js        # HTML email templates, graceful SMTP fallback
│   │   └── performanceService.js  # Redis-backed nearby donations cache
│   ├── utils/
│   │   ├── encryption.js          # AES-256-GCM with key rotation support
│   │   └── redisClient.js         # Redis wrapper with in-memory fallback
│   ├── jobs/
│   │   └── expiryScheduler.js     # Auto-expire donations, 365-day cleanup
│   └── server.js                  # Real Socket.IO server (donor/NGO rooms)
├── frontend-webview/              # React web application
│   └── src/
│       ├── pages/
│       │   ├── admin/Dashboard.jsx  # Analytics, paginated users + donations, confirmation dialogs
│       │   ├── donor/Dashboard.jsx  # Post food (weight_kg), NGO contact card, real-time status
│       │   ├── ngo/Dashboard.jsx    # Live feed, claim confirmation dialog, map
│       │   ├── auth/Login.jsx
│       │   ├── auth/Register.jsx    # FSSAI/NGO license formatter, phone formatter
│       │   └── common/Profile.jsx
│       ├── store/slices/
│       ├── hooks/                   # useGeolocation (GPS + network fallback + retry)
│       ├── services/                # api.js, socket.js (donor + NGO rooms)
│       └── locales/                 # en, hi, gu translation files
└── frontend-mobileview/           # React Native / Expo mobile app
    └── src/
        ├── screens/
        │   ├── DonorDashboard.tsx   # Post food (weight_kg), image error handling, stats
        │   ├── NGODashboard.tsx     # Claim confirmation Alert.alert dialog
        │   ├── AdminDashboard.tsx   # Paginated users, last login, analytics
        │   ├── LoginScreen.tsx
        │   └── RegisterScreen.tsx   # FSSAI/NGO formatter, phone formatter, +91 prefix
        ├── hooks/
        │   └── useLocation.ts       # GPS with high→network fallback + retry
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

# Server
PORT=5001
```

> **Gmail App Password:** Google Account → Security → 2-Step Verification → App passwords → Create one named "FoodBridge".

> **Encryption Key:** Run `node -e "require('crypto').randomBytes(32).toString('hex')"` and paste the output.

> **Production Redis:** Use [Upstash](https://upstash.com) free tier. Set `REDIS_URL` to the connection URL.

### 5. Create the first admin user
```bash
cd backend
npm run create-admin
```
Default credentials:
```
Email:    admin@foodbridge.com
Password: admin123
```
Change the password immediately after first login.

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
| `status` | Enum | available → reserved → collected / expired |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description | Rate Limited |
|--------|----------|-------------|-------------|
| POST | `/api/auth/register` | Register donor or NGO | 3/hr per IP |
| POST | `/api/auth/login` | Login | 5/15min per account |
| POST | `/api/auth/logout` | Logout (blacklists JWT) | — |
| POST | `/api/auth/request-password-reset` | Send OTP to email | 3/hr per account |
| POST | `/api/auth/verify-otp` | Verify OTP (single-use) | — |
| POST | `/api/auth/reset-password` | Set new password | 3/hr per account |
| GET | `/api/auth/profile` | Get own profile | — |
| PUT | `/api/auth/profile` | Update own profile | — |

### Donations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/donations/nearby` | Geospatial nearby donations (Redis cached 2 min) |
| POST | `/api/donations` | Create donation (with weight_kg) |
| PUT | `/api/donations/:id/claim` | Claim donation — invalidates cache, emits socket event |
| PUT | `/api/donations/:id/collect` | Mark collected — invalidates cache + admin stats |
| GET | `/api/donations/history/donor` | Donor history (with full NGO contact details) |
| GET | `/api/donations/history/ngo` | NGO claim history |
| GET | `/api/donations/admin/history` | Paginated full history with filters |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/stats` | Platform stats incl. kg_saved (Redis cached 5 min) |
| GET | `/api/users/all` | Paginated + searchable users list |
| GET | `/api/users/pending` | Pending verifications |
| PUT | `/api/users/:id/verify` | Approve or reject — clears cache instantly |

---

## Security

- **Rate limiting** — per-account brute-force limit (5/15min) + per-IP distinct-email spray detection (50 accounts/15min)
- **JWT blacklist** — logged-out tokens invalidated in Redis for remaining 7-day lifetime
- **Auth middleware cache** — user object cached in Redis (5 min), no DB hit per request
- **Field-level encryption** — email, phone, license, contact person encrypted with AES-256-GCM
- **Argon2id hashing** — memory: 64MB, time: 3 iterations, parallelism: 4
- **Role enforcement** — `admin` / `super_admin` cannot be self-registered via API
- **Backend validation** — email regex, Indian phone format, FSSAI 14-digit, coordinate range, field minlength
- **OTP single-use** — OTP nulled immediately after successful verification
- **Sensitive log redaction** — passwords, tokens, encrypted fields stripped from all logs

---

## Real-Time Architecture

```
NGO claims donation
  → Backend: DB update → Redis cache invalidated → Socket.IO emit to donor-{id} room
  → Donor browser: receives donation-claimed event → immediately re-fetches history
  → Status changes from "available" to "reserved" without waiting for 30s poll
```

Both donor and NGO dashboards also auto-refresh every 30 seconds as a fallback.

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
| Admin stats cache | 5 min | 8 parallel aggregations → single Redis read |
| Auth user cache | 5 min | No DB hit on every protected API call |
| Login rate limit | 15 min window | 5 attempts per account (IP-agnostic) |
| Spray detection | 15 min window | Blocks >50 distinct accounts per IP |
| Register rate limit | 1 hr window | 3 attempts per IP |
| JWT blacklist | 7 days | Immediate logout token invalidation |

**Production:** [Upstash](https://upstash.com) Redis free tier (10k req/day) is sufficient for FoodBridge.

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
