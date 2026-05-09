# Vercel Env Status

## Purpose

This document records how Firebase web client environment variables are operated for local development and Vercel deployment.

`src/lib/firebase.ts` reads Firebase web client configuration from `import.meta.env.VITE_FIREBASE_*`. Local development uses `.env.local`; Vercel deployments use Vercel Dashboard environment variables.

Actual values must not be committed. `VITE_*` values are client-side values and are included in the browser bundle, so they are not a secret storage mechanism.

## Current Registered Variables

Only variable names are documented:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID
```

## Environment Policy

현재는 별도 staging Firebase project가 제공되지 않아 Preview와 Production Vercel 환경에 동일한 Firebase web client configuration이 등록되어 있다.

| Environment | Purpose | Firebase Project | Current State |
|---|---|---|---|
| Local | Developer build/dev verification | Value from `.env.local` | Configured locally and ignored by Git |
| Preview | Vercel preview smoke test | Same Firebase project as Production | Env registered, but tests can affect production data |
| Production | User-facing deployment | Same Firebase project as Preview | Env registered, production safety depends on Auth/Rules/runtime checks |

Preview and Production env registration is complete, but data isolation is not complete. The recommended future state is:

```text
Preview  -> staging Firebase project
Production -> production Firebase project
```

## Vercel Dashboard Location

```text
Vercel Dashboard
Project
Settings
Environment Variables
```

When changing env values:

1. Test the value in `.env.local`.
2. Run `npm.cmd run build`.
3. Run local dev smoke test.
4. Update Vercel Preview variables.
5. Deploy Preview and smoke test carefully.
6. Update Production variables.
7. Redeploy Production.
8. Smoke test Production URL.

## Vite Env Rules

| Rule | Explanation |
|---|---|
| `VITE_*` is public | It is included in the browser bundle |
| Firebase web config is not an admin secret | It still requires Firestore Rules/Auth to be safe |
| Do not store secrets in `VITE_*` | Admin passwords, shared student credentials, service account keys, and server tokens must not be placed there |
| Missing env fails early | `src/lib/firebase.ts` throws a clear missing variable error |

## Current Verification

| Check | Result |
|---|---|
| `.env.example` exists | Pass |
| `.env.local` ignored | Pass |
| Local production build | Pass |
| Local dev server | Pass, HTTP 200 on root |
| Vercel Dashboard env | Registered for Preview and Production according to current operator state |
| Actual production URL behavior | Must be verified separately in Vercel and browser |

This project may be deployed through Vercel automatic deployment, but repository code alone cannot confirm the actual Vercel Dashboard settings, environment variable values, deployment logs, or production domain behavior. This analysis is based on repository code and local production build; actual deployment status must be verified separately in Vercel Dashboard and the deployment URL.

## Remaining Operational Risks

| Risk | Impact | Recommended Action |
|---|---|---|
| Same Firebase project for Preview/Production | Preview tests may change production data | Create a staging Firebase project |
| Firestore Rules not deployed to production | Repository rules do not protect production yet | Deploy only after staging/preview verification |
| Student shared credential | Student account impersonation risk | Replace with verified per-user auth flow |
| Employee ID validation absent | Fake or stolen employee IDs can register | Add server-side or admin-controlled validation |
| Tailwind CDN runtime dependency | App can stall if CDN fails | Move Tailwind to build-time dependency |
