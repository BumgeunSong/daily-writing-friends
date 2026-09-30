/**
 * Resolve a service_role key for the local Supabase stack.
 *
 * Recent Supabase CLI versions sign JWTs with ES256 only, so the legacy HS256
 * `service_role` key printed by `supabase status` is rejected by GoTrue's admin
 * API with `bad_jwt: signing method HS256 is invalid`. Instead of hardcoding a
 * key, we read the stack's own EC signing key and issuer out of the running auth
 * container and mint a short-lived ES256 `service_role` JWT with it — using only
 * Node's built-in WebCrypto, no extra dependencies.
 *
 * WebCrypto's ECDSA signature is already the raw r‖s concatenation that JWS
 * ES256 expects, so no DER transcoding is needed.
 */
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUPABASE_CONFIG_PATH = resolve(REPO_ROOT, 'supabase', 'config.toml');

/** A seed run finishes in seconds; an hour is generous headroom without being long-lived. */
const SERVICE_ROLE_TTL_SECONDS = 60 * 60;

/** The EC private signing key shape inside `GOTRUE_JWT_KEYS` (a JWK Set). */
interface EcSigningJwk {
  kty: 'EC';
  kid: string;
  crv: string;
  d: string;
  x: string;
  y: string;
}

interface ServiceRoleClaims {
  iss: string;
  role: 'service_role';
  exp: number;
}

const textEncoder = new TextEncoder();

// ── Functional core (pure) ────────────────────────────────────────────────

function base64urlFromBytes(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function base64urlFromJson(value: unknown): string {
  return base64urlFromBytes(textEncoder.encode(JSON.stringify(value)));
}

export function buildServiceRoleClaims(
  issuer: string,
  nowSeconds: number,
  ttlSeconds: number,
): ServiceRoleClaims {
  return {
    iss: issuer,
    role: 'service_role',
    exp: nowSeconds + ttlSeconds,
  };
}

/** The `header.payload` string that gets signed — the first two JWT segments. */
export function buildJwtSigningInput(kid: string, claims: ServiceRoleClaims): string {
  const header = { alg: 'ES256', typ: 'JWT', kid };
  return `${base64urlFromJson(header)}.${base64urlFromJson(claims)}`;
}

export function assembleJwt(signingInput: string, signatureBase64url: string): string {
  return `${signingInput}.${signatureBase64url}`;
}

export function parseProjectId(configToml: string): string {
  const match = configToml.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error(`Could not find project_id in ${SUPABASE_CONFIG_PATH}`);
  }
  return match[1];
}

export function selectSigningJwk(rawJwtKeys: string): EcSigningJwk {
  const jwks = JSON.parse(rawJwtKeys) as EcSigningJwk[];
  const signingKey = jwks.find((key) => key.kty === 'EC' && Boolean(key.d));
  if (!signingKey) {
    throw new Error('GOTRUE_JWT_KEYS contains no EC private signing key');
  }
  return signingKey;
}

// ── Imperative shell (side effects) ───────────────────────────────────────

function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * The auth container for THIS repo, named `supabase_auth_<project_id>`. Selecting
 * by exact name avoids signing with another running stack's key (whose signature
 * this stack would reject as `bad_jwt`).
 */
async function findAuthContainerName(): Promise<string> {
  const projectId = parseProjectId(await readFile(SUPABASE_CONFIG_PATH, 'utf8'));
  const expectedName = `supabase_auth_${projectId}`;

  const { stdout } = await execFileAsync('docker', [
    'ps',
    '--filter',
    `name=${expectedName}`,
    '--format',
    '{{.Names}}',
  ]);
  const isRunning = stdout
    .split('\n')
    .map((name) => name.trim())
    .includes(expectedName);

  if (!isRunning) {
    throw new Error(
      `Auth container "${expectedName}" is not running. Start local Supabase first: npx supabase start`,
    );
  }
  return expectedName;
}

async function readContainerEnv(containerName: string, variableName: string): Promise<string> {
  const { stdout } = await execFileAsync('docker', [
    'exec',
    containerName,
    'sh',
    '-c',
    `echo "$${variableName}"`,
  ]);
  return stdout.trim();
}

async function readIssuer(containerName: string): Promise<string> {
  const configuredIssuer = await readContainerEnv(containerName, 'GOTRUE_JWT_ISSUER');
  if (configuredIssuer) return configuredIssuer;
  return `${await readContainerEnv(containerName, 'API_EXTERNAL_URL')}/auth/v1`;
}

async function signEs256(signingInput: string, jwk: EcSigningJwk): Promise<string> {
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    { kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    textEncoder.encode(signingInput),
  );
  return base64urlFromBytes(new Uint8Array(signature));
}

async function mintServiceRoleJwt(): Promise<string> {
  const containerName = await findAuthContainerName();
  const [rawJwtKeys, issuer] = await Promise.all([
    readContainerEnv(containerName, 'GOTRUE_JWT_KEYS'),
    readIssuer(containerName),
  ]);
  const signingJwk = selectSigningJwk(rawJwtKeys);
  const claims = buildServiceRoleClaims(issuer, nowInSeconds(), SERVICE_ROLE_TTL_SECONDS);
  const signingInput = buildJwtSigningInput(signingJwk.kid, claims);
  const signature = await signEs256(signingInput, signingJwk);
  return assembleJwt(signingInput, signature);
}

/**
 * Resolve the service_role key for a local seed run.
 *
 * An explicit `SUPABASE_SERVICE_ROLE_KEY` wins so CI can inject its own key;
 * otherwise mint one from the running stack's ES256 signing key.
 */
export async function resolveLocalServiceRoleKey(): Promise<string> {
  const injectedKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (injectedKey) return injectedKey;

  return mintServiceRoleJwt();
}
