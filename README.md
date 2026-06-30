## ⚡ Hero App — Smart Life OS + Civic Guardian

## 🚀 Getting Started (for teammates/judges)

This repo doesn't include the `.env.local` file since it contains private API keys.
To run the project locally, follow these steps:

1. Clone the repo and install dependencies:
   
   git clone https://github.com/shailja011/vibe2ship_hackathon.git
   cd vibe2ship_hackathon
   npm install


2. Copy the example env file and fill in your own keys:

   cp .env.local.example .env.local


3. You'll need:
   - A free [Supabase](https://supabase.com) project (for the database + auth)
   - A free [Anthropic API key](https://console.anthropic.com) (for the AI features)

4. Run the database schema:
   - Open your Supabase project → SQL Editor → paste the contents of `supabase/schema.sql` → Run

5. Start the dev server:

   npm run dev


6. Open `http://localhost:3000` and register an account to get started.



Tech Stack
Next.js 14, TypeScript, Supabase (Postgres, Auth, Realtime, Storage), 
Claude (Anthropic API), Leaflet for mapping.

Links
GitHub: https://github.com/shailja011/vibe2ship_hackathon.git
Live demo: vibe2ship-hackathon-as35.vercel.app


> Note: I built this for a hackathon, so I kept the setup lightweight — no Docker, no complex CI, just Next.js + Supabase + Claude AI working together.


## Why I built this

Going into this hackathon: an AI productivity
assistant, and a hyperlocal civic issue reporter. Instead of picking one, I asked
myself what would happen if they shared the same user and the same sense of
"progress." That became Hero App.

The core idea is simple: being productive in your own life and showing up for your
community shouldn't feel like two separate apps competing for your attention. So I
built one **Hero Score** — a single live number (0–100) that blends your daily task
completion, habit streaks, and civic points into one ring on the home screen. Finish
your tasks, keep your habits, report a pothole — they all move the same needle.

Everything is wired to a real backend, not mocked: Supabase handles auth, database,
row-level security, and realtime sync, while Claude AI powers the smarter parts —
prioritizing your tasks, generating a daily schedule, categorizing civic reports from
a photo description, and surfacing predictive insights about both your productivity
and your neighborhood's problems.

It was built solo in a few days for this hackathon, so I leaned on AI-assisted
development heavily for the boilerplate and focused my own time on the product
decisions — what the Hero Score should weigh, how the civic verification system
should work, and making sure the whole thing actually felt like one cohesive app
instead of two bolted together.
