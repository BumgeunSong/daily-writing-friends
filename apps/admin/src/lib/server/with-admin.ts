import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { AdminAuthError, requireAdmin, type RequireAdminResult } from './auth';
import { auditLog as defaultAuditLog, type AdminAction, type AuditLogger } from './audit-log';
import type { Verifier } from './verify-token';

export type AdminApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'rate-limited'
  | 'bad-request'
  | 'server-error';

export type AdminApiErrorBody = {
  error: string;
  code: AdminApiErrorCode;
};

export class AdminApiError extends Error {
  readonly code: AdminApiErrorCode;
  readonly status: number;
  constructor(code: AdminApiErrorCode, message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.code = code;
    this.status = status;
  }
  static badRequest(message: string): AdminApiError {
    return new AdminApiError('bad-request', message, 400);
  }
  static notFound(message: string): AdminApiError {
    return new AdminApiError('bad-request', message, 404);
  }
  static serverError(message: string): AdminApiError {
    return new AdminApiError('server-error', message, 500);
  }
}

export type RouteContext = {
  req: NextRequest;
  admin: { email: string };
};

export type ReadHandler<T> = (ctx: RouteContext) => Promise<T>;

export type MutationHandlerResult<T> = {
  data: T;
  /** When `false`, suppresses the audit log entry (idempotent no-op). Default: true. */
  mutated?: boolean;
  /** Optional override for the audit log `target` field. Defaults to `data`. */
  auditTarget?: unknown;
};

export type MutationHandler<T> = (ctx: RouteContext) => Promise<MutationHandlerResult<T>>;

export type ReadConfig<T> = {
  kind: 'read';
  schema: z.ZodType<T>;
  handler: ReadHandler<T>;
};

export type MutationConfig<T> = {
  kind: 'mutation';
  action: AdminAction;
  schema: z.ZodType<T>;
  handler: MutationHandler<T>;
};

export type AdminRouteConfig<T> = ReadConfig<T> | MutationConfig<T>;

export type WithAdminDeps = {
  verifier?: Verifier;
  auditLog?: AuditLogger;
};

function errorResponse(code: AdminApiErrorCode, message: string, status: number): NextResponse {
  const body: AdminApiErrorBody = { error: message, code };
  return NextResponse.json(body, { status });
}

function mapUnknownError(err: unknown): NextResponse {
  if (err instanceof AdminAuthError) {
    return errorResponse(err.code, err.message, err.status);
  }
  if (err instanceof AdminApiError) {
    return errorResponse(err.code, err.message, err.status);
  }
  console.error('[admin] unhandled error in route handler:', err);
  return errorResponse('server-error', 'Internal server error.', 500);
}

export function withAdmin<T>(
  config: AdminRouteConfig<T>,
  deps: WithAdminDeps = {},
): (req: NextRequest) => Promise<NextResponse> {
  const auditLogFn = deps.auditLog ?? defaultAuditLog;

  return async (req: NextRequest): Promise<NextResponse> => {
    let identity: RequireAdminResult;
    try {
      identity = await requireAdmin(req, deps.verifier);
    } catch (e) {
      return mapUnknownError(e);
    }

    const ctx: RouteContext = { req, admin: { email: identity.email } };

    let rawData: T;
    let mutationMeta: { mutated: boolean; auditTarget: unknown } | null = null;
    try {
      if (config.kind === 'read') {
        rawData = await config.handler(ctx);
      } else {
        const result = await config.handler(ctx);
        rawData = result.data;
        mutationMeta = {
          mutated: result.mutated ?? true,
          auditTarget: result.auditTarget !== undefined ? result.auditTarget : result.data,
        };
      }
    } catch (e) {
      return mapUnknownError(e);
    }

    const validated = config.schema.safeParse(rawData);
    if (!validated.success) {
      console.error('[admin] response failed schema validation:', validated.error.flatten());
      return errorResponse('server-error', 'Response validation failed.', 500);
    }

    if (config.kind === 'mutation' && mutationMeta && mutationMeta.mutated) {
      try {
        auditLogFn({
          adminEmail: identity.email,
          action: config.action,
          target: mutationMeta.auditTarget,
        });
      } catch (e) {
        // Never let logging failure block a successful mutation. The DB write succeeded.
        console.error('[admin] audit log emission failed:', e);
      }
    }

    return NextResponse.json(validated.data);
  };
}
