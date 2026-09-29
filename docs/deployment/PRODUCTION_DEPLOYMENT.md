# NEXUS — Production Deployment Guide

## Prerequisites
- Node.js 18+
- Supabase CLI (`npm install -g supabase`)
- pnpm or npm
- A Supabase project (self-hosted or cloud)

## 1. Supabase Setup

### 1.1 Create Project
1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Note your **Project URL** and **anon (public)** key.

### 1.2 Deploy Database Schema
```bash
cd /path/to/NexusEcho
supabase db reset  # optional: start clean
supabase db push   # applies all migrations from /supabase/migrations/
```

Or link to an existing project and push:
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 1.3 Deploy Edge Functions
```bash
supabase functions deploy player-login
supabase functions deploy game-submit
supabase functions deploy game-get-node
supabase functions deploy game-scan-qr
supabase functions deploy game-get-state
supabase functions deploy game-use-hint
supabase functions deploy game-notifications
supabase functions deploy game-node-progress
supabase functions deploy game-inventory
supabase functions deploy game-leaderboard
supabase functions deploy game-mark-read
supabase functions deploy bureau-operations
supabase functions deploy game-bureau-ops
supabase functions deploy admin-check
```

### 1.4 Configure Service Role Key
The `SUPABASE_SERVICE_ROLE_KEY` is automatically provided to Edge Functions by the Supabase runtime. No manual configuration is needed.

## 2. Environment Configuration

### 2.1 Update `.env.local`
```bash
cp .env.example .env.local
```

Fill in:
- `VITE_SUPABASE_URL` — your project URL (e.g., `https://abc123.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — your project's anonymous key

**Security note**: Only `VITE_`-prefixed variables are exposed to the browser. The service role key is never in the client bundle.

### 2.2 Production Feature Flags
Set these for production:
```
VITE_APP_ENV=production
VITE_ENABLE_DEV_TOOLS=false
```

## 3. Build & Deploy Frontend

### 3.1 Local Build
```bash
pnpm install
pnpm build
```

This produces output in `dist/`.

### 3.2 Deploy Options

#### Option A: Supabase Edge / Static Hosting
```bash
supabase hosting upload dist/
# or deploy to your preferred static host (Vercel, Netlify, S3)
```

#### Option B: Docker
```bash
docker build -t nexus-frontend .
docker run -p 80:80 nexus-frontend
```

## 4. Post-Deployment Verification

### 4.1 Verify Database
```bash
supabase db ls  # should show all migrations applied
```
Check that the `teams` table has columns: `game_started_at`, `game_deadline`, `game_duration_minutes`, `current_node_code`.

### 4.2 Verify Edge Functions
```bash
supabase functions list
```
All 14 functions should be deployed and active.

### 4.3 Verify Admin Setup
Create a Super Admin user:
```sql
-- Run in Supabase SQL Editor
INSERT INTO admin_users (auth_user_id, username, role, created_at)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com' LIMIT 1),
  'superadmin',
  'SUPER_ADMIN',
  NOW()
);
```

## 5. Security Checklist

- [ ] Service role key is NOT in client bundle (`grep -r SERVICE_ROLE_KEY src/`)
- [ ] No hardcoded secrets in `.env.local`
- [ ] All player-facing edge functions forward JWT via Authorization header
- [ ] `VITE_ENABLE_DEV_TOOLS=false` in production
- [ ] SSL/TLS enforced on all connections
- [ ] CORS configured for your domain (update `corsHeaders` in functions if needed)

## 6. Rollback

To rollback to a previous deployment:
```bash
# Revert DB migrations
supabase db reset
supabase db push --file supabase/migrations/PREVIOUS_MIGRATION.sql

# Redeploy previous function versions
supabase functions deploy <function-name>
```
