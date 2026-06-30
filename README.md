# ⚡ Hero App — Smart Life OS + Civic Guardian

A unified hackathon project combining an AI-powered personal productivity assistant
with a hyperlocal civic issue reporting platform — all driven by one "Hero Score."

---

## 🚀 Setup (10 minutes)

### 1. Install dependencies
```bash
cd hero-app
npm install
```

### 2. Create a Supabase project
- Go to https://supabase.com → New Project → wait ~2 min
- Settings → API → copy **Project URL** and **anon public key**

### 3. Run the database schema
- Supabase Dashboard → SQL Editor → New Query
- Paste the entire contents of `supabase/schema.sql` → Run

### 4. Disable email confirmation (for fast hackathon demo)
- Authentication → Providers → Email → turn OFF "Confirm email" → Save

### 5. Get a Claude API key
- https://console.anthropic.com → Settings → API Keys → Create Key

### 6. Add environment variables
```bash
cp .env.local.example .env.local
```
Open `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   ← the "anon public" key, NOT publishable key
ANTHROPIC_API_KEY=sk-ant-...
```

### 7. Run it
```bash
npm run dev
```
Open **http://localhost:3000** → Register → you're in!

---

## 🗂 What's inside

```
app/
  auth/login/page.tsx     → login + register
  dashboard/page.tsx      → the whole app: Home, Tasks, Habits, Civic, Goals, AI tabs
  api/ai/
    categorize/route.ts   → AI issue categorization
    prioritize/route.ts   → AI task prioritization
    schedule/route.ts     → AI daily scheduling
    insights/route.ts     → AI productivity / civic / goal insights

components/
  auth/AuthProvider.tsx   → global auth context
  ui/HeroRing.tsx         → the signature combined-score ring
  ui/Navbar.tsx, BottomNav.tsx, Toast.tsx
  civic/MapView.tsx       → Leaflet dark map with live pins
  civic/ReportModal.tsx   → 2-step report form w/ image upload + AI
  tasks/AddTaskModal.tsx

lib/
  supabase.ts             → Supabase client
  constants.ts            → colors, categories, badges, helpers
  ai.ts                   → client-side calls to our AI API routes

supabase/schema.sql       → full DB schema, triggers, RLS, points system
```

---

## ✅ All 16 Features — Where to Find Them

| # | Feature | Location |
|---|---------|----------|
| 1 | Intelligent task prioritization | Tasks tab → 🤖 AI Priority |
| 2 | AI-powered scheduling | Tasks tab → 📅 Schedule |
| 3 | Personalized productivity recommendations | AI tab → Productivity Analysis |
| 4 | Context-aware reminders | 🔔 toggle when adding a task |
| 5 | Calendar integration | `calendar_events` table ready for FullCalendar/Google Calendar sync |
| 6 | Goal & habit tracking | Goals tab + Habits tab |
| 7 | Voice-enabled assistance | 🎤 button in navbar (Web Speech API) |
| 8 | Autonomous task planning & execution | AI Schedule generates and can auto-create calendar events |
| 9 | Image/video issue reporting | Civic → + Report → photo/video upload |
| 10 | AI-powered issue categorization | Claude auto-classifies every report |
| 11 | Geo-location & mapping | Civic → Map tab (Leaflet + browser geolocation) |
| 12 | Community verification | ✓ Verify button — 5 verifications auto-promotes status |
| 13 | Real-time issue tracking | Supabase Realtime — live pin updates across devices |
| 14 | Impact dashboards | AI tab → Civic Impact Report |
| 15 | Predictive insights | AI tab → all 3 insight types use Claude predictions |
| 16 | Gamification | Points, badges, Hero Score ring, Leaderboard |

---

## 🏆 The "Hero Score" — our unique idea

Most hackathon projects pick ONE of these two app ideas. We combined them with a single
unifying metric: the **Hero Score** (0–100), calculated live as:

```
Hero Score = 40% task completion + 30% habit completion + 30% civic points
```

This turns "be productive" and "help your community" into one game — exactly the kind
of judge-pleasing differentiator a hackathon needs.

---

## 🎯 Points System
| Action | Points |
|---|---|
| Complete a task | +10 to +30 (by priority) |
| Complete a habit | +20 |
| Complete a goal milestone | based on goal |
| Report a civic issue | +50 |
| Upvote an issue | +5 (+10 to issue owner) |
| Verify an issue | +8 |
| Issue resolved | +100 |

## 🏅 Badges
🌱 Newcomer (0) → 📣 Reporter (50) → 🐕 Watchdog (150) → 🛡️ Guardian (300) → ⚡ Hero (600)

---

## 🌐 Deploy to Vercel
```bash
npx vercel
```
Add the same 3 environment variables in the Vercel dashboard, then deploy.
