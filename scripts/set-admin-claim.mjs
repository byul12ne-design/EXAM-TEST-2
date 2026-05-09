#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith('--')) continue;

    const [rawKey, inlineValue] = arg.slice(2).split('=');
    if (inlineValue !== undefined) {
      result[rawKey] = inlineValue;
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      result[rawKey] = true;
    } else {
      result[rawKey] = next;
      index += 1;
    }
  }
  return result;
}

function printUsage() {
  console.log(`
Usage:
  npm run admin:claim -- --uid <ADMIN_UID> --service-account <LOCAL_JSON_PATH> --action grant --confirm
  npm run admin:claim -- --uid <ADMIN_UID> --service-account <LOCAL_JSON_PATH> --action revoke --confirm

Environment variables:
  FIREBASE_ADMIN_UID
  FIREBASE_SERVICE_ACCOUNT_PATH
  GOOGLE_APPLICATION_CREDENTIALS
  CONFIRM_ADMIN_CLAIM=true

Notes:
  - Defaults to dry-run unless --confirm or CONFIRM_ADMIN_CLAIM=true is provided.
  - Never commit service account JSON files or real admin uid/email values.
`);
}

function maskUid(uid) {
  if (!uid || uid.length <= 6) return '[MASKED_UID]';
  return `${uid.slice(0, 3)}...${uid.slice(-3)}`;
}

function normalizeAction(args) {
  if (args.revoke === true) return 'revoke';
  if (args.grant === true) return 'grant';
  return args.action || process.env.ADMIN_CLAIM_ACTION || 'grant';
}

const args = parseArgs(process.argv.slice(2));
const action = normalizeAction(args);
const adminUid = args.uid || process.env.FIREBASE_ADMIN_UID || process.env.ADMIN_UID;
const serviceAccountPath =
  args['service-account'] ||
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  process.env.GOOGLE_APPLICATION_CREDENTIALS;
const confirmed = args.confirm === true || process.env.CONFIRM_ADMIN_CLAIM === 'true';

if (args.help === true || args.h === true) {
  printUsage();
  process.exit(0);
}

if (!['grant', 'revoke'].includes(action)) {
  console.error(`Invalid action: ${action}`);
  printUsage();
  process.exit(1);
}

if (!adminUid || !serviceAccountPath) {
  console.error('Missing required admin uid or service account path.');
  printUsage();
  process.exit(1);
}

console.log('Admin claim operation prepared.');
console.log(`- action: ${action}`);
console.log(`- target uid: ${maskUid(adminUid)}`);
console.log('- service account: provided via local path');
console.log(`- mode: ${confirmed ? 'CONFIRMED WRITE' : 'DRY RUN'}`);

if (!confirmed) {
  console.log('No Firebase changes were made. Re-run with --confirm to apply.');
  process.exit(0);
}

const rawServiceAccount = await readFile(serviceAccountPath, 'utf8');
const serviceAccount = JSON.parse(rawServiceAccount);

initializeApp({
  credential: cert(serviceAccount),
});

const auth = getAuth();
const user = await auth.getUser(adminUid);
const currentClaims = user.customClaims ?? {};
const nextClaims =
  action === 'grant'
    ? { ...currentClaims, admin: true }
    : Object.fromEntries(Object.entries(currentClaims).filter(([key]) => key !== 'admin'));

await auth.setCustomUserClaims(adminUid, nextClaims);
const updatedUser = await auth.getUser(adminUid);
const hasAdminClaim = updatedUser.customClaims?.admin === true;

console.log('Admin claim operation completed.');
console.log(`- target uid: ${maskUid(adminUid)}`);
console.log(`- admin claim: ${hasAdminClaim ? 'true' : 'not set'}`);
console.log('Ask the affected user to sign out and sign in again, or force token refresh.');
