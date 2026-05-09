# Vercel Deployment Analysis

## Current Scope

This project may be deployed through Vercel automatic deployment, but repository code alone cannot confirm the actual Vercel Dashboard settings, environment variable values, deployment logs, or production domain behavior. This analysis is based on repository code and local production build; actual deployment status must be verified separately in Vercel Dashboard and the deployment URL.

## Current Deployment Status

| Item | Current State |
|---|---|
| Framework | React + Vite SPA |
| Build command | `tsc && vite build` through `npm.cmd run build` |
| Output directory | `dist/` |
| Local production build | Pass |
| Local dev server | Pass, root URL returned HTTP 200 |
| Vercel env | Preview and Production variables registered according to operator state |
| Firebase config | Loaded from `VITE_FIREBASE_*` in `src/lib/firebase.ts` |
| Preview/Production Firebase | Same Firebase project/config is currently used |
| Admin login | Firebase Auth admin ID/password + `admin: true` claim |
| Firestore Rules | Draft exists and Emulator tests pass, but production deploy not performed |

## Vercel Settings Found In Repository

| Setting | Repository State | Risk |
|---|---|---|
| `vercel.json` | Not present | Vercel preset/build/output behavior depends on Dashboard auto-detection |
| `.vercelignore` | Not present | Vercel uses default ignore behavior and `.gitignore` |
| Node version | Not pinned | Vercel Node version may differ from local Node |
| SPA rewrites | Not configured | Future path-based routes can 404 on direct access |
| Environment variables | Documented via `.env.example` | Actual values must be checked in Vercel Dashboard |

Current app routing is state-based inside `src/App.tsx`, so root path deployment can work without rewrites. If React Router or direct URL routes are introduced, add:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/"
    }
  ]
}
```

## Environment Variables

Required Vercel variables:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

현재는 별도 staging Firebase project가 제공되지 않아 Preview와 Production Vercel 환경에 동일한 Firebase web client configuration이 등록되어 있다.

This is operationally usable for limited testing, but Preview tests can affect production data. The recommended future setup is separate Firebase projects for Preview and Production.

## Build And Bundle Result

Latest local production build:

```text
vite v5.4.21 building for production...
dist/index.html                  0.48 kB
dist/assets/index-C-dvAIOk.css   1.80 kB
dist/assets/index-BaebhwFW.js  637.38 kB
```

Vite warning:

```text
Some chunks are larger than 500 kB after minification.
```

Likely causes:

| Cause | Detail |
|---|---|
| Single large `App.tsx` | Student UI, admin UI, business logic, and data access are bundled together |
| Firebase SDK | Auth and Firestore SDK are included in the main bundle |
| No route-level splitting | Admin code is downloaded on first load |
| No manual chunks | Firebase/vendor chunk is not separated |

## Production Runtime Risks

| Severity | Risk | Current Cause | Recommended Action |
|---|---|---|---|
| Critical | Firestore Rules not deployed | Draft exists only in repo/emulator | Deploy after staging/preview smoke test |
| Critical | Student shared credential remains | Student login still uses shared credential flow | Replace with verified per-user auth |
| Critical | Employee ID validation absent | Only basic format validation exists | Add server-side/admin-controlled validation |
| High | Preview uses production Firebase | Same Firebase config in Preview and Production | Add staging Firebase project |
| High | Client-calculated result payload | Score/result is produced client-side | Move scoring/validation server-side |
| Medium | Large JS chunk | Single entry bundle with Firebase/Admin UI | Code splitting/manual chunks |
| Medium | Tailwind CDN dependency | Runtime styling dependency remains | Move Tailwind to build-time CSS |
| Medium | No pinned Node version | Vercel may run different Node | Add `engines` or `.nvmrc` after owner agreement |

## Production Blocking Issues

Before treating this as production-ready:

1. Deploy and validate Firestore Rules with admin claim policy.
2. Remove student shared credential.
3. Add real employee ID registration validation.
4. Separate Preview and Production Firebase projects.
5. Add production smoke test results from the actual Vercel URL.
6. Add failure UX for auth, permission, and network errors.

## Current Readiness Verdict

| Level | Verdict |
|---|---|
| Local development | Usable |
| Vercel Preview | Usable with caution |
| Internal limited operation | Possible only with known security limitations |
| Production/commercial operation | Not ready |
