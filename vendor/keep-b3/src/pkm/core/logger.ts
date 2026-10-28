/**
 * PKM V1.9: Central Structured Logger
 * 
 * Provides typed domain logging, severity levels, correlation ID tracking,
 * automatic credential/PII sanitization, and an in-memory ring-buffer for
 * developer diagnostics (strictly local; no remote telemetry).
 */

import { redactSensitiveErrorMessage } from './errors';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  domain: string;
  message: string;
  correlationId?: string;
  data?: Record<string, any>;
}

export type LogListener = (entry: LogEntry) => void;

class StructuredLogger {
  private buffer: LogEntry[] = [];
  private maxBufferSize: number = 250;
  private listeners: Set<LogListener> = new Set();
  private minLevel: LogLevel = 'info';

  constructor() {
    // Only enable debug level when explicitly set via dev tools or in development
    if (typeof window !== 'undefined' && (window as any).__PKM_DEBUG_LOGGING__) {
      this.minLevel = 'debug';
    }
  }

  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getRecentLogs(filter?: { domain?: string; level?: LogLevel; limit?: number }): LogEntry[] {
    let result = [...this.buffer];
    if (filter?.domain) {
      result = result.filter((e) => e.domain.toLowerCase() === filter.domain!.toLowerCase());
    }
    if (filter?.level) {
      result = result.filter((e) => e.level === filter.level);
    }
    if (filter?.limit && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }
    return result;
  }

  public clear(): void {
    this.buffer = [];
  }

  public log(level: LogLevel, domain: string, message: string, data?: Record<string, any>, correlationId?: string): void {
    const levelOrder: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    if (levelOrder[level] < levelOrder[this.minLevel]) return;

    const cleanMsg = redactSensitiveErrorMessage(message);
    const sanitizedData = data ? this.sanitizeDataObject(data) : undefined;

    const entry: LogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      domain,
      message: cleanMsg,
      correlationId,
      data: sanitizedData,
    };

    this.buffer.push(entry);
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    // Console output for dev awareness
    const prefix = `[PKM:${domain.toUpperCase()}]`;
    if (level === 'error') {
      console.error(prefix, cleanMsg, sanitizedData || '');
    } else if (level === 'warn') {
      console.warn(prefix, cleanMsg, sanitizedData || '');
    } else if (level === 'info' && process.env.NODE_ENV !== 'production') {
      console.info(prefix, cleanMsg, sanitizedData || '');
    } else if (level === 'debug') {
      console.debug(prefix, cleanMsg, sanitizedData || '');
    }

    this.listeners.forEach((l) => {
      try {
        l(entry);
      } catch (err) {
        // Safe isolation
      }
    });
  }

  public debug(domain: string, message: string, data?: Record<string, any>, correlationId?: string): void {
    this.log('debug', domain, message, data, correlationId);
  }

  public info(domain: string, message: string, data?: Record<string, any>, correlationId?: string): void {
    this.log('info', domain, message, data, correlationId);
  }

  public warn(domain: string, message: string, data?: Record<string, any>, correlationId?: string): void {
    this.log('warn', domain, message, data, correlationId);
  }

  public error(domain: string, message: string, data?: Record<string, any>, correlationId?: string): void {
    this.log('error', domain, message, data, correlationId);
  }

  private sanitizeDataObject(data: Record<string, any>): Record<string, any> {
    try {
      const copy: Record<string, any> = {};
      for (const [k, v] of Object.entries(data)) {
        if (/password|secret|key|token|auth/i.test(k)) {
          copy[k] = '[REDACTED]';
        } else if (typeof v === 'string') {
          copy[k] = redactSensitiveErrorMessage(v);
        } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          copy[k] = this.sanitizeDataObject(v);
        } else {
          copy[k] = v;
        }
      }
      return copy;
    } catch {
      return { _sanitizationError: true };
    }
  }
}

export const logger = new StructuredLogger();
