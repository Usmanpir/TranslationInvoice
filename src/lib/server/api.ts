import 'server-only'
import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { ZodError, type z, type ZodTypeAny } from 'zod'
import { ApiError } from './errors'

export type ApiSuccess<T> = { success: true; data: T }
export type ApiFailure = {
  success: false
  error: { code: string; message: string; details?: Record<string, unknown> }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ success: true, data }, init)
}

export function fail(code: string, message: string, status: number, details?: Record<string, unknown>) {
  return NextResponse.json<ApiFailure>(
    { success: false, error: { code, message, ...(details && { details }) } },
    { status }
  )
}

/** Converts any thrown value into a safe, consistent error response. Never leaks internals. */
export function toErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return fail(error.code, error.message, error.status, error.details)
  }
  if (error instanceof ZodError) {
    const first = error.errors[0]
    const field = first?.path.join('.')
    return fail('VALIDATION_ERROR', first?.message ?? 'Invalid input.', 400, {
      ...(field && { field }),
      fields: error.flatten().fieldErrors,
    })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return fail('CONFLICT', 'A record with these details already exists.', 409)
    if (error.code === 'P2025') return fail('NOT_FOUND', 'Resource not found.', 404)
    if (error.code === 'P2003') {
      return fail('CONFLICT', 'This record is still referenced by other records and cannot be changed.', 409)
    }
  }
  if (error instanceof SyntaxError) {
    return fail('BAD_REQUEST', 'Malformed request body.', 400)
  }
  console.error('[api] unhandled error:', error)
  return fail('INTERNAL_ERROR', 'Something went wrong. Please try again.', 500)
}

type RouteContext<P> = { params: Promise<P> }

/**
 * Wraps a route handler: returned values become `{ success: true, data }`,
 * thrown errors become `{ success: false, error }`.
 */
export function route<P = Record<string, string>>(
  handler: (request: Request, context: RouteContext<P>) => Promise<unknown>
) {
  return async (request: Request, context: RouteContext<P>): Promise<Response> => {
    try {
      const result = await handler(request, context)
      if (result instanceof Response) return result
      return ok(result ?? null)
    } catch (error) {
      return toErrorResponse(error)
    }
  }
}

export async function parseJson<S extends ZodTypeAny>(request: Request, schema: S): Promise<z.output<S>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError('BAD_REQUEST', 'Malformed request body.')
  }
  return schema.parse(body)
}

export interface Pagination {
  page: number
  limit: number
  skip: number
}

export function parsePagination(url: URL, opts: { defaultLimit?: number; maxLimit?: number } = {}): Pagination {
  const max = opts.maxLimit ?? 100
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
  const rawLimit = parseInt(url.searchParams.get('limit') || String(opts.defaultLimit ?? 10), 10) || 10
  const limit = Math.min(max, Math.max(1, rawLimit))
  return { page, limit, skip: (page - 1) * limit }
}

export function paginated<T>(items: T[], total: number, p: Pagination) {
  return { items, total, page: p.page, pages: Math.max(1, Math.ceil(total / p.limit)), limit: p.limit }
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim()
}
