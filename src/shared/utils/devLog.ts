// Agent observability logging utility for development environments

export type DevLogLevel = 'info' | 'warn' | 'error';

export interface DevLogEntry {
  timestamp: string;
  category: string;
  event: string;
  level: DevLogLevel;
  correlationId: string;
  data?: Record<string, unknown>;
  duration?: number;
}

export interface DevLogOptions {
  category: string;
  event: string;
  level?: DevLogLevel;
  correlationId?: string;
  data?: Record<string, unknown>;
  duration?: number;
}

// Module-level active correlation ID
let _activeCorrelationId: string | null = null;

/**
 * Builds a structured log entry from options.
 * Pure function - no side effects.
 */
export function buildLogEntry(options: DevLogOptions): DevLogEntry {
  const {
    category,
    event,
    level = 'info',
    correlationId,
    data,
    duration,
  } = options;

  const effectiveCorrelationId =
    correlationId || _activeCorrelationId || crypto.randomUUID();

  const entry: DevLogEntry = {
    timestamp: new Date().toISOString(),
    category,
    event,
    level,
    correlationId: effectiveCorrelationId,
  };

  if (data !== undefined) {
    entry.data = data;
  }

  if (duration !== undefined) {
    entry.duration = duration;
  }

  return entry;
}

/**
 * Starts a correlation context.
 * All subsequent devLog calls will use this correlation ID unless overridden.
 */
export function startCorrelation(id?: string): string {
  _activeCorrelationId = id || crypto.randomUUID();
  return _activeCorrelationId;
}

/**
 * Ends the current correlation context.
 */
export function endCorrelation(): void {
  _activeCorrelationId = null;
}

/**
 * Logs development events to the dev server endpoint.
 * No-op in production builds.
 * Fire-and-forget with silent error handling.
 */
export function devLog(options: DevLogOptions): void {
  // No-op in production
  if (import.meta.env.PROD) {
    return;
  }

  try {
    const entry = buildLogEntry(options);

    // Fire-and-forget POST to dev endpoint
    fetch('/__dev/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    }).catch(() => {
      // Silent failure - dev logging should never break the app
    });
  } catch {
    // Silent failure - dev logging should never break the app
  }
}
