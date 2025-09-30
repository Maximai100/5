# TODO: Production Fixes Tracker

Status: in progress

- [x] Remove committed `.env` from repo and rely on env vars in Vercel
- [x] Rotate Supabase anon key after removal (action required in dashboard)
- [x] Pin @google/genai to a fixed version (`^1.21.0`) instead of `latest`
- [x] Add `prebuild` step to strip debug logs (`remove_debug_logs.js`)
- [x] Gate AI modal by env flags; hide if key is missing
- [x] Guard sensitive logs (hide Supabase key preview in prod)
- [x] Add minimal CI (lint + build) on GitHub Actions

Next (optional, nice-to-have)

- [ ] Add CSP and security headers (Vercel `headers`)
- [ ] Add Sentry (errors + perf) behind env flag
- [ ] Convert `sql/` to Supabase CLI migrations for reproducibility
- [ ] Add smoke tests for auth, CRUD, and share link open

