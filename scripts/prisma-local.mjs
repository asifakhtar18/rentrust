import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const command = process.argv[2];
if (command !== 'status' && command !== 'deploy') {
  console.error('Usage: prisma-local.mjs status|deploy');
  process.exit(2);
}

const directUrl = process.env.POSTGRES_URL_NON_POOLING ?? process.env.DATABASE_URL;
if (!directUrl) {
  console.error(
    'Set POSTGRES_URL_NON_POOLING (Supabase) or DATABASE_URL (local Postgres) in .env.local.',
  );
  process.exit(2);
}

function supabaseProjectRef(value) {
  if (!value) return undefined;
  let url;
  try {
    url = new URL(value);
  } catch {
    console.error('A Supabase connection URL is invalid. Migration stopped.');
    process.exit(2);
  }
  return (
    /^postgres\.([a-z0-9]+)$/i.exec(url.username)?.[1] ??
    /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(url.hostname)?.[1]
  );
}

const directRef = supabaseProjectRef(directUrl);
const pooledRef = supabaseProjectRef(process.env.POSTGRES_PRISMA_URL);
if (directRef && pooledRef && directRef !== pooledRef) {
  console.error('Direct and pooled Supabase URLs point to different projects. Migration stopped.');
  process.exit(2);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(
  process.execPath,
  [
    join(root, 'node_modules/prisma/build/index.js'),
    'migrate',
    command,
    '--schema',
    join(root, 'apps/api/prisma/schema.prisma'),
  ],
  {
    cwd: root,
    env: { ...process.env, DATABASE_URL: directUrl },
    stdio: 'inherit',
  },
);
if (result.error) {
  console.error('Could not start Prisma:', result.error.message);
}
process.exit(result.status ?? 1);
