/**
 * Structured Logging Utility
 *
 * Provides consistent, structured logging across the application
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  [key: string]: any
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  module?: string
  error?: {
    message: string
    stack?: string
    code?: string
  }
}

class Logger {
  private module: string
  private isDevelopment: boolean

  constructor(module: string) {
    this.module = module
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  private format(entry: LogEntry): string {
    if (this.isDevelopment) {
      const parts = [
        `[${entry.level.toUpperCase()}]`,
        entry.module ? `[${entry.module}]` : '',
        entry.message,
      ].filter(Boolean)

      if (entry.context && Object.keys(entry.context).length > 0) {
        parts.push(JSON.stringify(entry.context, null, 2))
      }

      if (entry.error) {
        parts.push(`Error: ${entry.error.message}`)
        if (entry.error.stack) {
          parts.push(entry.error.stack)
        }
      }

      return parts.join(' ')
    } else {
      return JSON.stringify(entry)
    }
  }

  private write(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      module: this.module,
      context,
    }

    if (error) {
      entry.error = {
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      }
    }

    const formatted = this.format(entry)

    switch (level) {
      case 'debug':
        if (this.isDevelopment) {
          console.debug(formatted)
        }
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }

  debug(message: string, context?: LogContext) {
    this.write('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.write('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.write('warn', message, context)
  }

  error(message: string, error?: Error, context?: LogContext) {
    this.write('error', message, context, error)
  }

  child(additionalContext: LogContext) {
    const childLogger = new Logger(this.module)
    const originalWrite = childLogger.write.bind(childLogger)
    childLogger.write = (level, message, context, error) => {
      originalWrite(level, message, { ...additionalContext, ...context }, error)
    }
    return childLogger
  }
}

export function createLogger(module: string): Logger {
  return new Logger(module)
}

export const logger = createLogger('APP')
export const apiLogger = createLogger('API')
export const authLogger = createLogger('AUTH')
export const dbLogger = createLogger('DATABASE')
export const storageLogger = createLogger('STORAGE')
export const processorLogger = createLogger('PROCESSOR')
export const searchLogger = createLogger('SEARCH')


