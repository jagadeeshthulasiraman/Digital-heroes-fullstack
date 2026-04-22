# ⚡ Digital Heroes — Full Stack App

Golf score tracking + monthly prize draws + charity fundraising platform.

## Tech Stack
- **Backend**: Python 3.11 + FastAPI + SQLAlchemy + JWT Auth
- **Frontend**: Next.js 14 + vanilla CSS
- **DB**: SQLite (dev) / PostgreSQL (prod)
- **Deploy**: Railway (backend) + Vercel (frontend)

---

## 🚀 DEPLOY IN 15 MINUTES

### STEP 1 — Deploy Backend on Railway

1. Go to **https://railway.app** → sign up with new account
2. New Project → Deploy from GitHub repo → select this repo
3. Choose the `backend` folder as root
4. Add environment variables:
   ```
   SECRET_KEY=generate-a-long-random-string-here
   DATABASE_URL=<Railway will auto-set if you add PostgreSQL plugin>
   ```
5. Add **PostgreSQL** plugin inside Railway project
6. Railway auto-sets `DATABASE_URL` — copy it
7. After first deploy, open Railway shell and run:
   ```bash
   python seed.py
   ```
8. Copy your backend URL: `https://xxx.railway.app`

---

### STEP 2 — Deploy Frontend on Vercel

1. Go to **https://vercel.com** → sign up with new account
2. New Project → Import GitHub repo → select `frontend` folder
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://xxx.railway.app
   ```
   (your Railway backend URL from Step 1)
4. Deploy → done!

---
## STEP 3 — Test Credentials

Admin and test users can be created using the seed script:

```bash
python seed.py

---

## 🧪 Testing Checklist

- [ ] User signup & login
- [ ] Subscribe (monthly/yearly)
- [ ] Add 5 scores — 6th auto-removes oldest
- [ ] Duplicate date blocked
- [ ] Select charity + contribution %
- [ ] Admin: simulate draw
- [ ] Admin: publish draw → winners auto-generated
- [ ] User: view winnings + submit proof
- [ ] Admin: verify winner → mark paid
- [ ] Admin: dashboard stats, reports
- [ ] Responsive on mobile

---

## 📁 Project Structure

```
digital-heroes/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── database.py          # SQLAlchemy setup
│   ├── models.py            # DB models
│   ├── auth_utils.py        # JWT + bcrypt
│   ├── seed.py              # Seed admin/users/charities
│   ├── requirements.txt
│   ├── railway.json
│   ├── render.yaml
│   └── routers/
│       ├── auth.py          # Register/login/me
│       ├── scores.py        # Rolling-5 score logic
│       ├── draws.py         # Draw engine (random + algorithm)
│       ├── charities.py     # Charity listing + selection
│       ├── subscriptions.py # Monthly/yearly plans
│       ├── admin.py         # Dashboard + reports
│       └── winners.py       # Verification + payouts
└── frontend/
    ├── pages/
    │   ├── index.js         # Homepage
    │   ├── login.js         # Auth page
    │   ├── dashboard.js     # User panel
    │   └── admin.js         # Admin panel
    ├── lib/api.js           # API client
    ├── styles/globals.css   # Full design system
    └── vercel.json
```

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| GET  | /api/auth/me | Current user |

### Scores
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/scores/ | Get my scores |
| POST | /api/scores/ | Add score (rolling-5) |
| PUT  | /api/scores/{id} | Edit score |
| DELETE | /api/scores/{id} | Delete score |

### Draws
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/draws/ | List draws |
| GET  | /api/draws/latest | Latest published |
| POST | /api/draws/simulate | Admin: simulate |
| POST | /api/draws/publish | Admin: publish official draw |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/subscriptions/me | My subscription |
| POST | /api/subscriptions/subscribe | Subscribe to plan |
| POST | /api/subscriptions/cancel | Cancel |

### Charities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/charities/ | List charities |
| POST | /api/charities/select | Select charity |
| GET  | /api/charities/me/selection | My selection |
| POST | /api/charities/admin | Admin: create |
| PUT  | /api/charities/admin/{id} | Admin: update |
| DELETE | /api/charities/admin/{id} | Admin: remove |

### Winners
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/winners/me | My winnings |
| POST | /api/winners/{id}/proof | Submit proof |
| GET  | /api/winners/admin/all | Admin: all winners |
| PUT  | /api/winners/admin/{id}/verify | Admin: verify/pay |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | /api/admin/dashboard | Stats |
| GET  | /api/admin/users | User list |
| GET  | /api/admin/reports | Analytics |

---

## Prize Pool Logic

| Match | Pool Share | Rollover |
|-------|-----------|---------|
| 5-Number | 40% | ✅ Yes (Jackpot) |
| 4-Number | 35% | ❌ No |
| 3-Number | 25% | ❌ No |

- Each active subscriber contributes £1/month to prize pool
- Jackpot rolls over if no 5-match winner
- Multiple winners split the tier equally

## Score Rules
- Stableford format: 1–45 points
- Max 5 scores stored per user
- One score per date (duplicates blocked)
- Adding 6th score auto-removes oldest
- Displayed newest-first

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
python seed.py
uvicorn main:app --reload --port 8000
# API docs: http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
# App: http://localhost:3000
```
