import { NextRequest } from "next/server";

import { ACCESS_COOKIE, verifyAccessToken, type AccessTokenPayload } from "@/lib/auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function jsonError(error: unknown) {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  const message = error instanceof Error ? error.message : "Unexpected server error";
  return Response.json({ error: message }, { status: 500 });
}

export function requireApiUser(request: NextRequest): AccessTokenPayload {
  const authorization = request.headers.get("authorization");
  const rawBearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;
  const bearerToken =
    rawBearerToken && rawBearerToken !== "null" && rawBearerToken !== "undefined"
      ? rawBearerToken
      : null;
  const cookieToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (!bearerToken && !cookieToken) {
    throw new ApiError(401, "Authentication required");
  }

  for (const token of [bearerToken, cookieToken]) {
    if (!token) continue;

    try {
      return verifyAccessToken(token);
    } catch {
      // Try the next available auth source before rejecting the request.
    }
  }

  throw new ApiError(401, "Invalid or expired session");
}

export function requireAdmin(payload: AccessTokenPayload) {
  if (!["ADMIN", "SUPER_ADMIN"].includes(payload.role)) {
    throw new ApiError(403, "Admin access required");
  }
}
