import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const ACCESS_COOKIE = "stima_access";
export const REFRESH_COOKIE = "stima_refresh";

export type AccessTokenPayload = {
  userId: string;
  role: string;
  email: string;
};

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export function signAccessToken(payload: AccessTokenPayload) {
  return jwt.sign(payload, getSecret("JWT_SECRET"), { expiresIn: "12h" });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getSecret("JWT_SECRET")) as AccessTokenPayload;
}

export function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSessionTokens(user: {
  id: string;
  role: string;
  email: string;
}) {
  const accessToken = signAccessToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });
  const refreshToken = createRefreshToken();

  return { accessToken, refreshToken };
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function getSecret(name: "JWT_SECRET" | "REFRESH_TOKEN_SECRET") {
  const secret = process.env[name];
  if (!secret) {
    throw new Error(`${name} is not configured`);
  }

  return secret;
}
