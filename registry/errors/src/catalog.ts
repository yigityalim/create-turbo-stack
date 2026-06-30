export interface ErrorDef {
  /** Opaque display code, safe to show users/support. */
  readonly code: string;
  /** HTTP-style status for transport mapping. */
  readonly status: number;
  /** Whether retrying the operation may help. */
  readonly retryable: boolean;
  /** Safe, user-facing title. */
  readonly title: string;
}

/** Catalog of generic error codes. Extend per app as needed. */
export const ErrorCatalog = {
  BAD_REQUEST: { code: "E-400", status: 400, retryable: false, title: "Invalid request" },
  UNAUTHORIZED: { code: "E-401", status: 401, retryable: false, title: "Authentication required" },
  FORBIDDEN: {
    code: "E-403",
    status: 403,
    retryable: false,
    title: "You don't have access to this",
  },
  NOT_FOUND: { code: "E-404", status: 404, retryable: false, title: "Not found" },
  CONFLICT: { code: "E-409", status: 409, retryable: false, title: "Conflict" },
  VALIDATION: { code: "E-422", status: 422, retryable: false, title: "Validation failed" },
  RATE_LIMITED: { code: "E-429", status: 429, retryable: true, title: "Too many requests" },
  INTERNAL: { code: "E-500", status: 500, retryable: true, title: "Something went wrong" },
  UNAVAILABLE: { code: "E-503", status: 503, retryable: true, title: "Service unavailable" },
  TIMEOUT: { code: "E-504", status: 504, retryable: true, title: "Request timed out" },
} as const satisfies Record<string, ErrorDef>;

export type ErrorCode = keyof typeof ErrorCatalog;
