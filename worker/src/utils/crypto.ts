import type { Env } from "../types/env";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const PASSWORD_ALGORITHM = "pbkdf2-sha256";
const MAX_WORKER_PBKDF2_ITERATIONS = 100_000;
const PASSWORD_ITERATIONS = MAX_WORKER_PBKDF2_ITERATIONS;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const JWT_ALGORITHM = "HS256";
const JWT_EXPIRATION_SECONDS = 60 * 60 * 24 * 7;

export type JwtPayload = {
  sub: string;
  email: string;
  exp: number;
  iat: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "="
  );
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(textEncoder.encode(value));
}

function base64UrlToString(value: string): string {
  return textDecoder.decode(base64UrlToBytes(value));
}

async function importPbkdf2Key(password: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", textEncoder.encode(password), "PBKDF2", false, [
    "deriveBits"
  ]);
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await importPbkdf2Key(password);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations
    },
    key,
    HASH_BYTES * 8
  );

  return new Uint8Array(bits);
}

function parseStoredIterations(value: string | undefined): number | null {
  const iterations = Number(value);

  if (!Number.isInteger(iterations) || iterations <= 0 || iterations > MAX_WORKER_PBKDF2_ITERATIONS) {
    return null;
  }

  return iterations;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

async function importJwtKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign", "verify"]
  );
}

async function signHmacSha256(value: string, secret: string): Promise<string> {
  const key = await importJwtKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));

  return bytesToBase64Url(new Uint8Array(signature));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS);

  return [
    PASSWORD_ALGORITHM,
    PASSWORD_ITERATIONS.toString(),
    bytesToBase64Url(salt),
    bytesToBase64Url(hash)
  ].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, iterations, saltValue, hashValue] = storedHash.split("$");
  const parsedIterations = parseStoredIterations(iterations);

  if (algorithm !== PASSWORD_ALGORITHM || parsedIterations === null) {
    return false;
  }

  if (!saltValue || !hashValue) {
    return false;
  }

  const expectedHash = base64UrlToBytes(hashValue);
  const actualHash = await derivePasswordHash(password, base64UrlToBytes(saltValue), parsedIterations);

  return constantTimeEqual(actualHash, expectedHash);
}

export async function signJwt(
  env: Env,
  payload: Pick<JwtPayload, "sub" | "email">
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: JWT_ALGORITHM,
    typ: "JWT"
  };
  const tokenPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + JWT_EXPIRATION_SECONDS
  };
  const unsignedToken = [
    stringToBase64Url(JSON.stringify(header)),
    stringToBase64Url(JSON.stringify(tokenPayload))
  ].join(".");
  const signature = await signHmacSha256(unsignedToken, env.JWT_SECRET);

  return `${unsignedToken}.${signature}`;
}

export async function verifyJwt(env: Env, token: string): Promise<JwtPayload | null> {
  const [headerValue, payloadValue, signatureValue] = token.split(".");

  if (!headerValue || !payloadValue || !signatureValue) {
    return null;
  }

  const unsignedToken = `${headerValue}.${payloadValue}`;
  const expectedSignature = await signHmacSha256(unsignedToken, env.JWT_SECRET);

  if (!constantTimeEqual(textEncoder.encode(signatureValue), textEncoder.encode(expectedSignature))) {
    return null;
  }

  try {
    const header = JSON.parse(base64UrlToString(headerValue)) as { alg?: string; typ?: string };
    const payload = JSON.parse(base64UrlToString(payloadValue)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);

    if (header.alg !== JWT_ALGORITHM || header.typ !== "JWT") {
      return null;
    }

    if (!payload.sub || !payload.email || !payload.exp || payload.exp <= now) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
