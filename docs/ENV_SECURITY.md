# ENV and Key Security

This project uses Vite env variables. Keep secrets out of Git and rotate leaked keys.

Recommended steps:

- Remove `.env` from Git history and rely on Vercel (or host) environment:
  - Stop tracking: `git rm --cached .env`
  - Ensure `.gitignore` contains `.env` (already present)
  - Commit and push

- Rotate Supabase anon key if it was committed:
  1. Supabase Dashboard → Settings → API → Rotate anon key
  2. Update Vercel Project → Settings → Environment Variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
  3. Redeploy

- Local development:
  - Copy `env.example` to `.env` locally; do not commit `.env`.

- Optional hardening:
  - Limit public table access via RLS; for public reads prefer SECURITY DEFINER RPC.
  - Avoid logging secrets; keep production logs minimal.

