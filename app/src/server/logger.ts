// Lightweight console logger for server-side utilities.
type LogContext = Record<string, unknown> | undefined

const log = (level: "debug" | "info" | "warn" | "error", message: string, context?: LogContext) => {
  const payload = `[beton:${level}] ${message}`
  if (context) {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      payload,
      context
    )
  } else {
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](payload)
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, context?: LogContext | Error) =>
    log(
      "error",
      message,
      context instanceof Error
        ? { name: context.name, message: context.message, stack: context.stack }
        : context
    ),
}


