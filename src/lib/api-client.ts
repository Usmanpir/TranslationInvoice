// Browser-side helper for the `{ success, data } | { success: false, error }` API contract.

export interface ApiErrorDetails {
  [key: string]: unknown
  resource?: string
  used?: number
  limit?: number
  plan?: string
  planName?: string
  suggestedPlan?: string | null
  suggestedPlanName?: string | null
  feature?: string
  featureLabel?: string
  field?: string
  lapsed?: boolean
}

export class ApiRequestError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: ApiErrorDetails

  constructor(code: string, message: string, status: number, details?: ApiErrorDetails) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = code
    this.status = status
    this.details = details
  }

  get isUpgradeRequired() {
    return this.code === 'LIMIT_REACHED' || this.code === 'FEATURE_UNAVAILABLE'
  }
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

export async function api<T = unknown>(url: string, opts: ApiOptions = {}): Promise<T> {
  const isForm = typeof FormData !== 'undefined' && opts.body instanceof FormData
  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: opts.body !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body === undefined ? undefined : isForm ? (opts.body as FormData) : JSON.stringify(opts.body),
      signal: opts.signal,
      credentials: 'same-origin',
    })
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error
    throw new ApiRequestError('NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.', 0)
  }

  const json = (await res.json().catch(() => null)) as
    | { success: true; data: T }
    | { success: false; error: { code: string; message: string; details?: ApiErrorDetails } }
    | null

  if (!json) throw new ApiRequestError('BAD_RESPONSE', 'Unexpected response from the server.', res.status)
  if (!json.success) throw new ApiRequestError(json.error.code, json.error.message, res.status, json.error.details)
  return json.data
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  return error instanceof ApiRequestError ? error.message : fallback
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pages: number
  limit: number
}
