import { authenticateRequest } from "../middleware/authMiddleware";
import {
  DuplicateEmailError,
  findUserById,
  InvalidCredentialsError,
  loginUser,
  registerUser
} from "../services/authService";
import type { Env } from "../types/env";
import { errorResponse, successResponse } from "../utils/response";
import { authSchema, getValidationMessage, parseJsonBody } from "../utils/validation";
import { checkRateLimit, getClientIp } from "../middleware/rateLimitMiddleware";

const AUTH_RATE_LIMIT = {
  maxRequests: 10,
  route: "auth",
  windowSeconds: 10 * 60
};

async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody(request);
  const result = authSchema.safeParse(body);

  if (!result.success) {
    return errorResponse("VALIDATION_ERROR", getValidationMessage(result.error), 400);
  }

  try {
    const user = await registerUser(env, result.data.email, result.data.password);

    return successResponse({ user }, 201);
  } catch (error) {
    if (error instanceof DuplicateEmailError) {
      return errorResponse("EMAIL_ALREADY_EXISTS", error.message, 409);
    }

    throw error;
  }
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await parseJsonBody(request);
  const result = authSchema.safeParse(body);

  if (!result.success) {
    return errorResponse("VALIDATION_ERROR", getValidationMessage(result.error), 400);
  }

  try {
    const loginResult = await loginUser(env, result.data.email, result.data.password);

    return successResponse(loginResult);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return errorResponse("INVALID_CREDENTIALS", error.message, 401);
    }

    throw error;
  }
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const auth = await authenticateRequest(request, env);

  if (!auth) {
    return errorResponse("UNAUTHORIZED", "Missing or invalid authorization token.", 401);
  }

  const user = await findUserById(env, auth.user.id);

  if (!user) {
    return errorResponse("UNAUTHORIZED", "Missing or invalid authorization token.", 401);
  }

  return successResponse({ user });
}

export async function handleAuthRoute(
  request: Request,
  env: Env,
  pathname: string
): Promise<Response | null> {
  if (
    pathname === "/api/auth/register" ||
    pathname === "/api/auth/login" ||
    pathname === "/api/auth/me"
  ) {
    const rateLimitResponse = await checkRateLimit(env, {
      ...AUTH_RATE_LIMIT,
      identifier: getClientIp(request)
    });

    if (rateLimitResponse) {
      return rateLimitResponse;
    }
  }

  if (request.method === "POST" && pathname === "/api/auth/register") {
    return handleRegister(request, env);
  }

  if (request.method === "POST" && pathname === "/api/auth/login") {
    return handleLogin(request, env);
  }

  if (request.method === "GET" && pathname === "/api/auth/me") {
    return handleMe(request, env);
  }

  return null;
}
