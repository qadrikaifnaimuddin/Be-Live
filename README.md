# Be-Live 🔴

A production-ready social media application built with React + TypeScript + Supabase.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (Postgres + Realtime + Auth + Storage) |
| Deployment | Vercel |

## Features

- 🔐 **Auth** — Email/password + Google OAuth via Supabase Auth
- 👤 **Profiles** — Editable profile, avatar studio, private/public accounts
- 📸 **Posts** — Rich media posts with visibility controls
- 💬 **Messages** — Real-time DMs, groups, channels, voice messages, doodles, snaps, polls, disappearing messages, E2EE indicator
- 👥 **Follow System** — Follow/unfollow, follow requests for private accounts, real-time notifications
- 🔔 **Notifications** — Follow, like, comment, mention notifications with unread badge
- 🔥 **Streaks** — Snapchat-style streak counters
- 📖 **Stories** — 24-hour disappearing stories

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/qadrikaifnaimuddin/Be-Live.git
cd Be-Live
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase project URL and anon key.

### 4. Set up the database

Run the migration file in your Supabase SQL Editor:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, indexes, views, storage buckets, and realtime subscriptions.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Database Schema

```
profiles          — User profiles, linked to Supabase Auth
relationships     — Follow graph (follower_id → target_id)
follow_requests   — Pending requests for private accounts
notifications     — Follow, like, comment, mention events
posts             — User posts with media + visibility
comments          — Threaded comments on posts
stories           — 24-hour disappearing stories
chat_rooms        — Groups and channels
messages          — DMs and room messages (E2EE, snaps, polls, voice)
streaks           — Daily messaging streaks
profile_follow_stats — Materialized follower/following counts (view)
```

## Deployment

### Vercel

1. Import this repo to [vercel.com](https://vercel.com)
2. Set environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy

### Recommended Plans

| Service | Plan | Cost |
|---|---|---|
| Vercel | Hobby | Free |
| Supabase | **Pro** | $25/month |

> ⚠️ Supabase Free tier pauses inactive projects. Upgrade to Pro for production use.

## License

MIT
