#!/bin/sh
set -eu

# Backup de Iron Log: pg_dump comprimido + tar de la media persistente.
# Requiere los servicios `db` y `app` corriendo (docker compose up -d).
#
# Uso: ./scripts/backup.sh [directorio_destino]
#
# Cron de ejemplo (3am todos los días, en el VPS, retiene 7 días):
#   0 3 * * * cd /ruta/al/proyecto && ./scripts/backup.sh /var/backups/iron-log >> /var/log/iron-log-backup.log 2>&1
#
# El tar de media sale del propio contenedor `app` (docker compose exec),
# no del volumen Docker directo — evita tener que adivinar el nombre real
# del volumen, que en Coolify no sigue el mismo patrón que en local
# (ver docs/ARCHITECTURE.md).

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "[backup] Volcando Postgres..."
docker compose exec -T db pg_dump --clean --if-exists \
  -U "${POSTGRES_USER:-ironlog}" "${POSTGRES_DB:-ironlog}" \
  | gzip > "$BACKUP_DIR/db-$TIMESTAMP.sql.gz"

echo "[backup] Empaquetando media..."
docker compose exec -T app tar czf - -C /app/media . > "$BACKUP_DIR/media-$TIMESTAMP.tar.gz"

echo "[backup] Retención: borrando backups de más de $RETENTION_DAYS días en $BACKUP_DIR..."
find "$BACKUP_DIR" -name "db-*.sql.gz" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "media-*.tar.gz" -mtime "+$RETENTION_DAYS" -delete

echo "[backup] Listo:"
echo "  $BACKUP_DIR/db-$TIMESTAMP.sql.gz"
echo "  $BACKUP_DIR/media-$TIMESTAMP.tar.gz"
