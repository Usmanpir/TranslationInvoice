import 'server-only'

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'NO_ORGANIZATION'
  | 'ORGANIZATION_SUSPENDED'
  | 'SUBSCRIPTION_INACTIVE'
  | 'LIMIT_REACHED'
  | 'FEATURE_UNAVAILABLE'
  | 'BILLING_NOT_CONFIGURED'
  | 'SERVICE_UNAVAILABLE'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR'

const DEFAULT_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  NO_ORGANIZATION: 403,
  ORGANIZATION_SUSPENDED: 423,
  SUBSCRIPTION_INACTIVE: 402,
  LIMIT_REACHED: 402,
  FEATURE_UNAVAILABLE: 402,
  BILLING_NOT_CONFIGURED: 503,
  SERVICE_UNAVAILABLE: 503,
  BAD_REQUEST: 400,
  INTERNAL_ERROR: 500,
}

/** An error whose message is safe to show to the end user. */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, message: string, opts: { status?: number; details?: Record<string, unknown> } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = opts.status ?? DEFAULT_STATUS[code]
    this.details = opts.details
  }
}

export const unauthorized = (message = 'Please sign in to continue.') => new ApiError('UNAUTHORIZED', message)
export const forbidden = (message = "You don't have permission to do that.") => new ApiError('FORBIDDEN', message)
export const notFound = (what = 'Resource') => new ApiError('NOT_FOUND', `${what} not found.`)
export const badRequest = (message: string) => new ApiError('BAD_REQUEST', message)
