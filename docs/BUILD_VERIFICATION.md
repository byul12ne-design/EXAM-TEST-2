# Build Verification

## Current Verification Scope

| Item | Current State |
|---|---|
| Basis | Current repository working tree |
| Production deploy | Not performed |
| Firestore Rules deploy | Not performed |
| Local production build | Passed |
| Local dev server | Passed |
| Firestore Emulator rules test | Passed |

## Environment

| Item | Value |
|---|---|
| Node | `v22.18.0` |
| npm | `10.9.1` |
| Shell | PowerShell |
| Framework | Vite + React |

## Dependency Status

| Dependency | Role |
|---|---|
| `firebase` | Application runtime dependency |
| `firebase-admin` | Local admin claim script dependency |
| `@firebase/rules-unit-testing` | Firestore Rules Emulator test dependency |

`npm install` output reported audit vulnerabilities. They were not fixed in this task because the current scope is security flow/documentation and smoke verification, not dependency remediation.

## Production Build

Command:

```powershell
npm.cmd run build
```

Result:

| Check | Result |
|---|---|
| TypeScript compile | PASS |
| Vite build | PASS |
| Output directory | `dist/` |
| Main JS chunk | `637.38 kB`, gzip `163.87 kB` |
| CSS asset | `1.80 kB`, gzip `0.83 kB` |
| Warning | Vite 500 kB chunk warning remains |

Note: sandbox execution hit a local access restriction while resolving Vite config, but the local approved execution completed successfully.

## Local Dev Server

Command:

```powershell
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Result:

| Check | Result |
|---|---|
| Vite ready | PASS |
| Root URL | `http://127.0.0.1:5173/` |
| HTTP status | `200` |
| Root app container | Present |
| Dev server cleanup | Completed |

## Firestore Rules Emulator

Command:

```powershell
$env:JAVA_HOME='C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot'
$env:PATH="$env:JAVA_HOME\bin;$env:PATH"
npx.cmd firebase-tools emulators:exec --project demo-exam-test-rules --only firestore "node scripts/firestore-rules-emulator-test.mjs"
```

Result:

| Check | Result |
|---|---|
| Firestore Emulator start | PASS |
| Scenario count | 20 |
| Passed | 20 |
| Failed | 0 |
| Production deploy | Not performed |

## Scripts

| Script | Current State |
|---|---|
| `dev` | Exists |
| `build` | Exists |
| `preview` | Exists |
| `admin:claim` | Exists |
| `lint` | Not defined |
| `test` | Not defined |

## Runtime Caveats

| Caveat | Status |
|---|---|
| Firestore Rules production deployment | Pending |
| Student shared credential | Pending security remediation |
| Employee ID validation | Pending external policy/source |
| Preview/Production Firebase split | Pending staging project |
| Tailwind CDN dependency | Pending build-time migration |
| Large JS chunk | Pending code splitting/manual chunks |
