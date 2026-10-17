/**
 * PKM V1.9: Central Typed Error Architecture
 * 
 * Provides stable, typed error categories, structured codes, chained causes,
 * and automated redaction of sensitive credentials/PII for robust diagnostics.
 */

export type ErrorCategory =
  | 'ValidationError'
  | 'ConflictError'
  | 'PermissionError'
  | 'StorageError'
  | 'NetworkError'
  | 'SecurityError'
  | 'UnsupportedCapabilityError'
  | 'TaskCancelledError'
  | 'SchemaMigrationError';

export interface SerializedPkmError {
  name: string;
  category: ErrorCategory;
  code: string;
  message: string;
  userMessage: string;
  timestamp: string;
  correlationId?: string;
  details?: Record<string, any>;
  cause?: string;
}

const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_.]+/gi,
  /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["']?([^\s"']+)["']?/gi,
  /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, // Credit cards
  /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
];

export function redactSensitiveErrorMessage(msg: string): string {
  if (!msg || typeof msg !== 'string') return '';
  let clean = msg;
  for (const pattern of SENSITIVE_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED_CREDENTIAL]');
  }
  return clean;
}

export class PkmError extends Error {
  public readonly category: ErrorCategory;
  public readonly code: string;
  public readonly userMessage: string;
  public readonly timestamp: string;
  public readonly correlationId?: string;
  public readonly details?: Record<string, any>;

  constructor(options: {
    category: ErrorCategory;
    code: string;
    message: string;
    userMessage?: string;
    cause?: unknown;
    correlationId?: string;
    details?: Record<string, any>;
  }) {
    const cleanMessage = redactSensitiveErrorMessage(options.message);
    super(cleanMessage);
    this.name = options.category;
    this.category = options.category;
    this.code = options.code;
    this.userMessage = options.userMessage || cleanMessage;
    this.timestamp = new Date().toISOString();
    this.correlationId = options.correlationId;
    this.details = options.details;

    if (options.cause && options.cause instanceof Error) {
      this.cause = options.cause;
    }

    // Capture stack trace where V8 supports
    const captureStackTrace = (Error as ErrorConstructor & {
      captureStackTrace?: (target: object, constructorOpt?: Function) => void;
    }).captureStackTrace;
    captureStackTrace?.(this, PkmError);
  }

  public toJSON(): SerializedPkmError {
    return {
      name: this.name,
      category: this.category,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      correlationId: this.correlationId,
      details: this.details,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }
}

export class ValidationError extends PkmError {
  constructor(message: string, code = 'ERR_VALIDATION', details?: Record<string, any>) {
    super({ category: 'ValidationError', code, message, details });
  }
}

export class ConflictError extends PkmError {
  constructor(message: string, code = 'ERR_CONFLICT', details?: Record<string, any>) {
    super({ category: 'ConflictError', code, message, details });
  }
}

export class PermissionError extends PkmError {
  constructor(message: string, code = 'ERR_PERMISSION_DENIED', details?: Record<string, any>) {
    super({ category: 'PermissionError', code, message, userMessage: 'Access was denied due to insufficient permissions.', details });
  }
}

export class StorageError extends PkmError {
  constructor(message: string, code = 'ERR_STORAGE_FAILURE', details?: Record<string, any>, cause?: unknown) {
    super({ category: 'StorageError', code, message, userMessage: 'A local storage operation failed safely.', details, cause });
  }
}

export class NetworkError extends PkmError {
  constructor(message: string, code = 'ERR_NETWORK_UNAVAILABLE', details?: Record<string, any>, cause?: unknown) {
    super({ category: 'NetworkError', code, message, userMessage: 'Network operation failed or device is offline.', details, cause });
  }
}

export class SecurityError extends PkmError {
  constructor(message: string, code = 'ERR_SECURITY_VIOLATION', details?: Record<string, any>) {
    super({ category: 'SecurityError', code, message, userMessage: 'Operation blocked by security policy.', details });
  }
}

export class UnsupportedCapabilityError extends PkmError {
  constructor(capability: string, details?: Record<string, any>) {
    super({
      category: 'UnsupportedCapabilityError',
      code: 'ERR_CAPABILITY_UNSUPPORTED',
      message: `Capability '${capability}' is not supported in the current runtime environment.`,
      userMessage: `This platform does not support ${capability}.`,
      details: { capability, ...details },
    });
  }
}

export class TaskCancelledError extends PkmError {
  constructor(taskName: string, correlationId?: string) {
    super({
      category: 'TaskCancelledError',
      code: 'ERR_TASK_CANCELLED',
      message: `Task '${taskName}' was cancelled before completion.`,
      correlationId,
    });
  }
}
