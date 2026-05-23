import jwt from "jsonwebtoken";

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || "access_secret_key";
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || "refresh_secret_key";

export const ACCESS_TOKEN_EXPIRES_IN = "15m";
export const REFRESH_TOKEN_SHORT_EXPIRES_IN = "1d";
export const REFRESH_TOKEN_LONG_EXPIRES_IN = "30d";
export const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
export const REFRESH_TOKEN_SHORT_MAX_AGE = 24 * 60 * 60 * 1000;
export const REFRESH_TOKEN_LONG_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export interface TokenPayload {
  userId: string;
  sessionId?: string;
}

export function generateAccessToken(userId: string, sessionId?: string): string {
  return jwt.sign({ userId, sessionId }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
}

export function generateRefreshToken(
  userId: string,
  rememberMe: boolean = false,
  sessionId?: string
): string {
  const expiresIn = rememberMe ? REFRESH_TOKEN_LONG_EXPIRES_IN : REFRESH_TOKEN_SHORT_EXPIRES_IN;
  return jwt.sign({ userId, sessionId }, REFRESH_TOKEN_SECRET, {
    expiresIn,
  });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    return decoded as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    return decoded as TokenPayload;
  } catch {
    return null;
  }
}
