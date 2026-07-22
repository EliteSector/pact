# Pact

Installable iOS PWA — accountability contracts with real stakes, synced live between two accounts via Supabase.

## Stack
- **Frontend**: vanilla JS PWA, no build step (`index.html` + ES modules under `js/`). Design tokens ported 1:1 from the handoff design system in `css/tokens.css`.
- **Backend**: Supabase — Postgres + Auth (email/password) + Realtime + two Edge Functions (`send-push`, `delete-account`).
- **Push**: Web Push (VAPID), delivered server-side by the `send-push` Edge Function, triggered by a Database Webhook on `notifications` insert.
- **Hosting**: GitHub Pages, static files served from `main`.

## One-time setup

### 1. Create the Supabase project
Create a project at supabase.com/dashboard. Then, in **Authentication → Providers → Email**, turn **off** "Confirm email" (so `signUp` immediately returns a session — needed for the onboarding flow to continue right after sign-up during testing).

Grab from **Settings → API**: the **Project URL** and **anon public key**. Put them in `js/config.js`:
```js
export const SUPABASE_URL = 'https://xxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'xxxx';
```

### 2. Generate VAPID keys (for Web Push)
```bash
npx web-push generate-vapid-keys
```
Put the public key in `js/config.js` as `VAPID_PUBLIC_KEY`.

### 3. Link the Supabase CLI and push the schema
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 4. Deploy the Edge Functions + set secrets
```bash
npx supabase functions deploy send-push
npx supabase functions deploy delete-account
npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT="mailto:you@example.com" APP_URL="https://<your-pages-url>/"
```

### 5. Populate the push-webhook Vault secrets (one-off, not committed)
The `notifications_after_insert_push` trigger (migration 0004) reads the function URL + service role key from Supabase Vault so neither ever lands in a committed file. Run once, in the Supabase SQL editor or via `psql`:
```sql
select vault.create_secret('https://<project-ref>.functions.supabase.co/send-push', 'push_function_url');
select vault.create_secret('<service-role-key-from-Settings-API>', 'service_role_key');
```

### 6. Deploy the frontend to GitHub Pages
```bash
git init && git add -A && git commit -m "Pact"
gh repo create EliteSector/pact --public --source=. --push
gh api -X POST repos/EliteSector/pact/pages -f "source[branch]=main" -f "source[path]=/"
```
Site will be live at `https://elitesector.github.io/pact/` within a minute or two.

## Two-phone testing
1. Open the Pages URL in Safari on each iPhone.
2. Share → **Add to Home Screen** on each.
3. Launch from the Home Screen icon (standalone mode, not the Safari tab).
4. Sign up as two different accounts.
5. On phone A: Network → Invite a Partner → share the referral code (text it, AirDrop, whatever). On phone B: Network → paste the code into "Have a referral code?" → Link. Both phones are now connected real accounts.
6. On phone A: Create New Contract → pick the phone B account as the partner → send. It should appear live on phone B's Dashboard (realtime) and as a push notification (if phone B enabled notifications during onboarding).
