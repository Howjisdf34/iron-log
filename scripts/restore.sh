#!/bin/sh
set -eu

# Restaura un backup de Iron Log (scripts/backup.sh). DESTRUCTIVO:
# reemplaza TODA la base de datos y TODA la media actuales.
#
# Uso: ./scripts/restore.sh <db-TIMESTAMP.sql.gz> <media-TIMESTAMP.tar.gz>
# Requiere los servicios `db` y `app` corriendo.

if [ "$#" -ne 2 ]; then
  echo "Uso: $0 <db-TIMESTAMP.sql.gz> <media-TIMESTAMP.tar.gz>" >&2
  exit 1
fi

DB_BACKUP="$1"
MEDIA_BACKUP="$2"

for f in "$DB_BACKUP" "$MEDIA_BACKUP"; do
  if [ ! -f "$f" ]; then
    echo "No existe: $f" >&2
    exit 1
  fi
done

echo "Esto reemplaza TODA la base de datos y la media actuales por las de:"
echo "  $DB_BACKUP"
echo "  $MEDIA_BACKUP"
printf "Escribí 'restaurar' para confirmar: "
read -r CONFIRM
if [ "$CONFIRM" != "restaurar" ]; then
  echo "Cancelado."
  exit 1
fi

echo "[restore] Restaurando Postgres..."
gunzip -c "$DB_BACKUP" | docker compose exec -T db psql -U "${POSTGRES_USER:-ironlog}" "${POSTGRES_DB:-ironlog}"

echo "[restore] Restaurando media..."
# -u root: el contenedor corre como `nextjs` (no-root, ver Dockerfile), y
# archivos de media de una vida anterior del volumen pueden pertenecer a
# otro uid (bug real encontrado probando este script). root puede
# borrarlos y reescribirlos sin problema; el chown final deja todo de
# vuelta como `nextjs`, que es con quien corre la app en runtime.
docker compose exec -T -u root app sh -c \
  "rm -rf /app/media/* && tar xzf - -C /app/media && chown -R nextjs:nodejs /app/media" \
  < "$MEDIA_BACKUP"

echo "[restore] Listo. Si algo se ve raro, reiniciá el contenedor: docker compose restart app"
