# FoodBridge — MERN Stack Application

A production-grade food donation platform connecting food donors with NGOs to reduce food waste and feed those in need. Built with security, performance, and scalability in mind.

---

## Features

### For Donors
- Post surplus food donations with photo, pickup window, and expiry time
- Real-time notifications when donations are claimed
- Complete donation history with status tracking
- Biometric authentication support for posting donations

### For NGOs
- Live feed of nearby available donations with geospatial filtering
- Interactive map view of donation locations
- One-click claim system with automatic donor contact sharing
- Claims history and pickup tracking

### For Admins
- User verification — approve / reject with confirmation dialog
- Real-time analytics dashboard (donation breakdown, user stats, completion rate)
- Paginated users list with last login time and online status
- Paginated donation history with filters (status, date, donor, NGO)
- Live donation map

---

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js 18+ | Runtime (uses built-in `node --watch`) |
| Express.js | Web framework |
| MongoDB + Mongoose | Database and ODM |
| Redis | Caching, rate limiting, JWT blacklist |
| Argon2id | Password hashing (with bcrypt migration support) |
| JWT | Authentication |
| Nodemailer + Gmail SMTP | Transactional email |
| AES-256-GCM | Field-level encryption (email, phone, license) |
| node-cron | Scheduled jobs |

### Frontend
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

---

## Project Structure

```
foodbridge/
├── backend/
│   ├── controllers/
│   │   ├── authController.js      # Register, login, logout, password reset
│   │   ├── donationController.js  # CRUD, nearby, claim, collect, history
│   │   └── userController.js      # Admin stats, user management, verification
│   ├── middleware/
│   │   ├── auth.js                # JWT verify + Redis user cache + blacklist check
│   │   ├── rateLimiter.js         # Brute-force + spray protection via Redis
│   │   └── logger.js              # Request logger with sensitive field redaction
│   ├── models/
│   │   ├── User.js                # Schema with Argon2 hashing + AES-256 encryption
│   │   └── Donation.js
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
│   └── server.js
├── frontend-webview/              # React web application
│   └── src/
│       ├── pages/
│       │   ├── admin/Dashboard.jsx
│       │   ├── donor/Dashboard.jsx
│       │   ├── ngo/Dashboard.jsx
│       │   ├── auth/Login.jsx
│       │   ├── auth/Register.jsx
│       │   └── common/Profile.jsx
│       ├── store/slices/          # Redux slices
│       ├── hooks/                 # useGeolocation, useBiometric, useMobile
│       ├── services/              # api.js, socket.js
│       └── locales/               # en, hi, gu translation files
└── frontend-mobileview/           # React Native / Expo mobile app
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

> **Gmail App Password:** Go to Google Account → Security → 2-Step Verification → App passwords. Generate one named "FoodBridge".

> **Production Redis:** Use [Upstash](https://upstash.com) free tier. Copy the connection URL and set `REDIS_URL`.

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

## API Endpoints

### Authentication
| Method | Endpoint | Description | Rate Limited |
|--------|----------|-------------|-------------|
| POST | `/api/auth/register` | Register donor or NGO | 3/hr per IP |
| POST | `/api/auth/login` | Login | 5/15min per account |
| POST | `/api/auth/logout` | Logout (blacklists token) | — |
| POST | `/api/auth/request-password-reset` | Send OTP to email | 3/hr per account |
| POST | `/api/auth/verify-otp` | Verify reset OTP | — |
| POST | `/api/auth/reset-password` | Set new password | 3/hr per account |
| GET | `/api/auth/profile` | Get own profile | — |
| PUT | `/api/auth/profile` | Update own profile | — |

### Donations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/donations/nearby` | Geospatial nearby donations (Redis cached) |
| POST | `/api/donations` | Create donation |
| PUT | `/api/donations/:id/claim` | Claim donation (NGO) |
| PUT | `/api/donations/:id/collect` | Mark as collected |
| GET | `/api/donations/history/donor` | Donor history |
| GET | `/api/donations/history/ngo` | NGO claim history |
| GET | `/api/donations/admin/history` | Full history with pagination + filters |

### Users (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/stats` | Platform stats (Redis cached 5 min) |
| GET | `/api/users/all` | Paginated users list with search |
| GET | `/api/users/pending` | Pending verifications |
| PUT | `/api/users/:id/verify` | Approve or reject user |

---

## Security

- **Rate limiting** — brute-force protection per account (email), spray protection per network (distinct accounts/IP)
- **JWT blacklist** — logged-out tokens are invalidated in Redis immediately
- **Auth middleware cache** — user object cached in Redis (5 min TTL), no DB hit on every request
- **Field-level encryption** — email, phone, license number, contact person stored AES-256-GCM encrypted
- **Argon2id hashing** — passwords hashed with Argon2id (memory: 64MB, time: 3, parallelism: 4)
- **Role enforcement** — `admin` and `super_admin` roles cannot be self-registered
- **Input validation** — all registration fields validated on backend (not just frontend)
- **OTP single-use** — OTP is invalidated immediately after successful verification
- **Sensitive log redaction** — passwords, tokens, encrypted fields never appear in logs

---

## Backend Scripts

```bash
npm run dev              # Start with node --watch (auto-reload on file change)
npm start                # Production start
npm run create-admin     # Create default admin user
npm run create-super-admin  # Create super admin
npm run fetch-users      # List all users with roles
npm run fetch-roles      # Detailed role-wise user report
```

---

## Internationalisation

The web frontend supports three languages switchable at runtime:

| Language | Code |
|----------|------|
| English | `en` |
| Hindi | `hi` |
| Gujarati | `gu` |

Translation files: `frontend-webview/src/locales/{en,hi,gu}/translation.json`

---

## Redis Features

The app runs fully without Redis (graceful fallback to in-memory/direct DB). With Redis connected:

| Feature | TTL | Benefit |
|---------|-----|---------|
| Nearby donations cache | 2 min | Skips expensive geospatial aggregation |
| Admin stats cache | 5 min | 7 parallel aggregations → single Redis read |
| Auth user cache | 5 min | No DB hit on every protected request |
| Login rate limit | 15 min window | 5 attempts per account |
| Register rate limit | 1 hr window | 3 attempts per IP |
| JWT blacklist | 7 days | Immediate logout token invalidation |

**Production:** Use [Upstash](https://upstash.com) Redis free tier — set `REDIS_URL` in production env.

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
