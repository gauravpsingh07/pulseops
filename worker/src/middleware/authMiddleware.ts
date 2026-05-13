import type { Env } from "../types/env";
import { verifyJwt } from "../utils/crypto";

export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type AuthContext = {
  user: AuthenticatedUser;
};

export async function authenticateRequest(
  request: Request,
  env: Env
): Promise<AuthContext | null> {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return null;
  }

  const payload = await verifyJwt(env, token);

  if (!payload) {
    return null;
  }

  return {
    user: {
      id: payload.sub,
      email: payload.email
    }
  };
}
