/** Authenticated app user attached by requireAuth / optionalAuth. */
export type AuthUser = {
  uid: string;
  /** Legacy alias used in some controllers during migration. */
  userId?: string;
  email: string | null;
};

/** Admin user resolved by requireAdmin. */
export type AdminUser = {
  uid: string;
  email: string;
};

/** Claims embedded in STRON access JWTs. */
export type AccessTokenPayload = {
  uid: string;
  email?: string | null;
  type?: string;
  iat?: number;
  exp?: number;
};

/** Claims embedded in STRON refresh JWTs. */
export type RefreshTokenPayload = AccessTokenPayload & {
  type: "refresh";
  jti: string;
};

export type SignTokenInput = {
  uid: string;
  email?: string | null;
};

export type ClientContext = {
  ip?: string | null;
  userAgent?: string | null;
  headers?: Record<string, string | string[] | undefined>;
};

export type OtpSendResult =
  | {
      success: true;
      requestId?: string | null;
      messageId?: string;
      provider?: string;
    }
  | {
      success: false;
      error: string;
      statusCode?: number;
      code?: string;
      retryAfterSeconds?: number;
      requestId?: string | null;
    };


