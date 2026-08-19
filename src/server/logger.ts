/**
 * Logs JSON a stdout, nivel configurable por LOG_LEVEL (CLAUDE.md §7).
 * Sin PII: nunca loguear email/nombre/contraseña — sólo ids (uuid) cuando
 * haga falta identificar a qué usuario/recurso corresponde un log.
 *
 * Deliberadamente sin dependencia (pino/winston): a esta escala (2
 * usuarios, un contenedor) un wrapper de 20 líneas sobre `console` cubre
 * todo lo que pide el brief — nivel, JSON, stdout — sin una dependencia
 * más que mantener. Docker ya rota los logs (`max-size`/`max-file` en
 * docker-compose.yml), así que tampoco hace falta manejar rotación acá.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function configuredLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL;
  return raw === "debug" || raw === "info" || raw === "warn" || raw === "error"
    ? raw
    : "info";
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configuredLevel()]) return;
  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...meta,
  });
  if (level === "error" || level === "warn") console.error(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) =>
    write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    write("error", message, meta),
};
