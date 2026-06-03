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

export const MAX_SESSIONS = 2;

export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCK_MS = 10 * 60 * 1000;


