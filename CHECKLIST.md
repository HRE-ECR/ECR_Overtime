# OvertimeHub – Step-by-step checklist

## A) Supabase setup
- [ ] Create Supabase project
- [ ] Run **supabase/schema.sql** in SQL Editor
- [ ] Auth: Enable **Email OTP / Magic Link** provider
- [ ] Auth: Add redirect URLs (local + production) in **URL Configuration**
- [ ] Create your first user by signing in through the app
- [ ] Set that user’s role to **manager** in `profiles` table

## B) Local dev setup
- [ ] Install Node.js (LTS)
- [ ] Download / unzip this project
- [ ] Copy `.env.example` to `.env`
- [ ] Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Test on phone: open your machine IP `http://<ip>:5173` (same Wi‑Fi)

## C) Functional testing
- [ ] Sign in as employee → see **Shift Feed**
- [ ] Tap **Available / Backup / Unavail** → refresh → status persists
- [ ] Sign in as manager → open **Admin**
- [ ] Create shift post → appears in feed
- [ ] Confirm a user → user sees it in **My Shifts**

## D) PWA install testing
- [ ] Build: `npm run build` then `npm run preview`
- [ ] On Android Chrome: check install banner appears
- [ ] Install → launches in standalone (no browser bars)
- [ ] On iOS Safari: use Share → **Add to Home Screen** (prompt explains)
- [ ] Turn on airplane mode → app shell still loads

## E) Deploy
- [ ] Deploy `dist/` to your static host
- [ ] Set env vars on host
- [ ] Add your deployed URL to Supabase redirect allow-list
- [ ] Confirm HTTPS enabled (required for PWA install)
