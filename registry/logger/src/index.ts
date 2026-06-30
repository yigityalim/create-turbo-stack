export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface LogRecord {
  level: LogLevel;
  message: string;
  time: string;
  context?: Record<string, unknown>;
}

export type LogTransport = (record: LogRecord) => void;

export interface LoggerOptions {
  level?: LogLevel;
  transport?: LogTransport;
  /**
   * Redact context before it reaches the transport. Pair with
   * `{{scope}}/errors`'s `sanitize` to strip PII from logs.
   */
  redact?: (context: Record<string, unknown>) => Record<string, unknown>;
  /** Fields merged into every record (and inherited by children). */
  base?: Record<string, unknown>;
}

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): Logger;
}

/** Default transport — one JSON line per record on the matching console method. */
export const jsonConsoleTransport: LogTransport = (record) => {
  const line = JSON.stringify(record);
  if (record.level === "error") console.error(line);
  else if (record.level === "warn") console.warn(line);
  else console.log(line);
};

export function createLogger(options: LoggerOptions = {}): Logger {
  const minLevel = ORDER[options.level ?? "info"];
  const transport = options.transport ?? jsonConsoleTransport;
  const redact = options.redact ?? ((context) => context);
  const base = options.base ?? {};

  function log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (ORDER[level] < minLevel) return;
    const merged = { ...base, ...context };
    transport({
      level,
      message,
      time: new Date().toISOString(),
      context: Object.keys(merged).length > 0 ? redact(merged) : undefined,
    });
  }

  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
    child: (context) => createLogger({ ...options, base: { ...base, ...context } }),
  };
}
