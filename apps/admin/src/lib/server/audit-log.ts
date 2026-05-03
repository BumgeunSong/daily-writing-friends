import 'server-only';

export type AdminAction = 'user.approve' | 'user.reject' | 'board.create' | 'app-config.update';

export type AuditLogEntry = {
  adminEmail: string;
  action: AdminAction;
  target: unknown;
};

export type AuditLogger = (entry: AuditLogEntry) => void;

const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/g;

export function sanitize(value: string): string {
  return value.replace(CONTROL_CHAR_RE, '');
}

function sanitizeTarget(target: unknown): unknown {
  if (typeof target === 'string') return sanitize(target);
  if (target && typeof target === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(target as Record<string, unknown>)) {
      out[k] = typeof v === 'string' ? sanitize(v) : v;
    }
    return out;
  }
  return target;
}

export const auditLog: AuditLogger = (entry) => {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    adminEmail: sanitize(entry.adminEmail),
    action: entry.action,
    target: sanitizeTarget(entry.target),
  });
  console.log(line);
};
