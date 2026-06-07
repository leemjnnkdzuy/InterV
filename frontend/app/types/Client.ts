export interface FailedRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}

export interface SessionRevokedResponse {
  sessionRevoked?: boolean;
}
