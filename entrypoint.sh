#!/bin/sh
set -eu

# Lock simple contra carreras si Coolify llega a levantar >1 réplica a la vez
# (no debería con 2 usuarios, pero es barato y evita corrupción de migraciones).
LOCK_DIR="/tmp/iron-log-migrate.lock"

if mkdir "$LOCK_DIR" 2>/dev/null; then
  trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

  if [ -d "./drizzle" ] && [ -n "$(ls -A ./drizzle 2>/dev/null | grep -v '.gitkeep')" ]; then
    # NOTA (Fase 1): drizzle-kit es devDependency y el build standalone de
    # Next sólo empaqueta node_modules trazado desde código server — el CLI
    # de drizzle-kit no queda incluido. La migración real se dispara desde
    # un script propio (p. ej. src/instrumentation.ts o migrate.mjs) que use
    # drizzle-orm/node-postgres/migrator, así Next lo traza y lo incluye.
    echo "[entrypoint] corriendo migraciones..."
    node ./migrate.mjs
  else
    echo "[entrypoint] sin migraciones todavia (Fase 1) — omitiendo migración"
  fi
else
  echo "[entrypoint] otra instancia ya esta migrando, esperando..."
  while [ -d "$LOCK_DIR" ]; do sleep 1; done
fi

echo "[entrypoint] arrancando server..."
exec node server.js
