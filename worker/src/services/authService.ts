import type { Env } from "../types/env";
import { hashPassword, signJwt, verifyPassword } from "../utils/crypto";

export type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

export type PublicUser = Omit<UserRow, "password_hash">;

export type LoginResult = {
  token: string;
  user: PublicUser;
};

export class DuplicateEmailError extends Error {
  constructor() {
    super("A user with this email already exists.");
    this.name = "DuplicateEmailError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidCredentialsError";
  }
}

function toPublicUser(user: UserRow): PublicUser {
  const { password_hash: _passwordHash, ...publicUser } = user;

  return publicUser;
}

export async function findUserByEmail(env: Env, email: string): Promise<UserRow | null> {
  return env.DB.prepare(
    `SELECT id, email, password_hash, created_at, updated_at
     FROM users
     WHERE email = ?`
  )
    .bind(email)
    .first<UserRow>();
}

export async function findUserById(env: Env, id: string): Promise<PublicUser | null> {
  const user = await env.DB.prepare(
    `SELECT id, email, password_hash, created_at, updated_at
     FROM users
     WHERE id = ?`
  )
    .bind(id)
    .first<UserRow>();

  return user ? toPublicUser(user) : null;
}

export async function registerUser(env: Env, email: string, password: string): Promise<PublicUser> {
  const normalizedEmail = email.toLowerCase();
  const existingUser = await findUserByEmail(env, normalizedEmail);

  if (existingUser) {
    throw new DuplicateEmailError();
  }

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    await env.DB.prepare(
      `INSERT INTO users (id, email, password_hash)
       VALUES (?, ?, ?)`
    )
      .bind(userId, normalizedEmail, passwordHash)
      .run();
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("unique")) {
      throw new DuplicateEmailError();
    }

    throw error;
  }

  const user = await findUserById(env, userId);

  if (!user) {
    throw new Error("Failed to load created user.");
  }

  return user;
}

export async function loginUser(env: Env, email: string, password: string): Promise<LoginResult> {
  const normalizedEmail = email.toLowerCase();
  const user = await findUserByEmail(env, normalizedEmail);

  if (!user) {
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await verifyPassword(password, user.password_hash);

  if (!passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const publicUser = toPublicUser(user);
  const token = await signJwt(env, {
    sub: publicUser.id,
    email: publicUser.email
  });

  return {
    token,
    user: publicUser
  };
}
