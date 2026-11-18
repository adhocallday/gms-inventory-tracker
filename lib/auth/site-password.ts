/**
 * Site-wide password gate.
 *
 * Vercel's own Password Protection is a Pro feature and this project is on
 * Hobby, so the gate lives in middleware instead. Runs on the edge runtime,
 * so it uses Web Crypto rather than node:crypto.
 */

export const SESSION_COOKIE = 'mft_session';
const SESSION_DAYS = 14;

const encoder = new TextEncoder();

const toBase64Url = (bytes: ArrayBuffer | Uint8Array) => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const byte of view) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function key(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
}

async function sign(payload: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign('HMAC', await key(secret), encoder.encode(payload));
  return toBase64Url(signature);
}

/** `<expiry>.<hmac>` — no secret material ever reaches the browser. */
export async function mintSession(secret: string): Promise<string> {
  const expiry = String(Date.now() + SESSION_DAYS * 86_400_000);
  return `${expiry}.${await sign(expiry, secret)}`;
}

export async function verifySession(token: string | undefined, secret: string): Promise<boolean> {
  if (!token) return false;
  const [expiry, signature] = token.split('.');
  if (!expiry || !signature) return false;
  if (Number(expiry) < Date.now()) return false;

  const expected = await sign(expiry, secret);
  // Constant-time compare so the signature cannot be probed byte by byte.
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export const sessionMaxAge = SESSION_DAYS * 86_400;
