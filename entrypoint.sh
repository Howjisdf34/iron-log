#!/bin/sh
set -eu

# Las migraciones y el seed de usuarios corren en src/instrumentation.ts
# (register hook de Next.js), protegidas con un advisory lock de Postgres.
# Ver docs/ARCHITECTURE.md ADR-008.
echo "[entrypoint] arrancando server..."
exec node server.js
