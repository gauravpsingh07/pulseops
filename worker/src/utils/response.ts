export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8"
};

const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
};

type CorsEnv = {
  FRONTEND_ORIGIN?: string;
};

function isLocalDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      Boolean(url.port)
    );
  } catch {
    return false;
  }
}

function getAllowedOrigin(request: Request, env: CorsEnv): string | null {
  const origin = request.headers.get("Origin");

  if (!origin) {
    return null;
  }

  if (env.FRONTEND_ORIGIN) {
    return origin === env.FRONTEND_ORIGIN ? origin : null;
  }

  return isLocalDevOrigin(origin) ? origin : null;
}

function applyBaseHeaders(headers: Headers): void {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });
}

function applyCorsHeaders(headers: Headers, request: Request, env: CorsEnv): void {
  const allowedOrigin = getAllowedOrigin(request, env);

  if (!allowedOrigin) {
    return;
  }

  headers.set("Access-Control-Allow-Origin", allowedOrigin);
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  headers.set("Vary", "Origin");
}

export function successResponse<T>(data: T, status = 200): Response {
  return Response.json(
    {
      success: true,
      data
    } satisfies ApiSuccess<T>,
    {
      status,
      headers: jsonHeaders
    }
  );
}

export function optionsResponse(request: Request, env: CorsEnv): Response {
  const headers = new Headers();

  applyBaseHeaders(headers);
  applyCorsHeaders(headers, request, env);

  return new Response(null, {
    status: 204,
    headers
  });
}

export function withResponseHeaders(response: Response, request: Request, env: CorsEnv): Response {
  const headers = new Headers(response.headers);

  applyBaseHeaders(headers);
  applyCorsHeaders(headers, request, env);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export function errorResponse(code: string, message: string, status = 400): Response {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message
      }
    } satisfies ApiError,
    {
      status,
      headers: jsonHeaders
    }
  );
}
