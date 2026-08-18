# Data Sources — Iron Log

Fuentes verificadas con `curl` real antes de tipar nada (ver también la conversación
de la Fase 2). Pipeline completo en `pnpm seed:exercises` (`scripts/seed-exercises.ts`
+ `src/server/seed/*`).

## wger.de — fuente primaria

- API pública, sin auth: `https://wger.de/api/v2/`
- Endpoint principal: `exerciseinfo/` — 873 ejercicios (verificado, no "800+" genérico).
  Cada resultado ya trae `translations[]` (todos los idiomas, incluido español —
  `language: 4`), `muscles[]`/`muscles_secondary[]`, `equipment[]`, y **`videos[]`
  embebido** (no hace falta pegarle a `/video/` por separado).
- El endpoint `video/` reporta 78 videos en total, pero tras una corrida real completa
  de `pnpm seed:exercises` (18/08/2026) sólo **46 ejercicios (5%) terminaron con un
  video usable** vía `exerciseinfo.videos[]` — la diferencia probablemente son videos
  huérfanos o de ejercicios que no resuelven en `exerciseinfo`. Se documenta el número
  real observado, no el del endpoint suelto. El resto cae al fallback de
  free-exercise-db o queda sin media.
- Los videos son `.MOV` con codec HEVC (no mp4 directo como asumía el brief original) —
  se transcodifican siempre, nunca se hotlinkean.
- Licencia: mayormente CC-BY-SA 4 (`license.id: 2`), verificado contra
  `GET /api/v2/license/`. Atribución real por autor en `/creditos`.
- **Catálogos sin traducción al español**: `muscle/` (15 músculos) y `equipment/`
  (12 items) sólo traen nombres en latín/inglés. Traducidos a mano en
  `src/server/seed/translations/{muscles-es,equipment-es}.ts` — terminología
  estándar de gimnasio, no son datos inventados de la API, son strings de UI.

## free-exercise-db — fallback

- `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json`
- 873 ejercicios (dominio público / Unlicense), con `instructions[]` en inglés y
  2 imágenes por ejercicio (`images[0]` = inicio, `images[1]` = fin).
- Imágenes en `.../main/exercises/<ruta-relativa>` (verificado con curl).
- **Matching contra wger**: por nombre en inglés normalizado (minúsculas, sin acentos
  ni puntuación) — exacto, no difuso. Es una heurística honesta: dos catálogos
  curados por separado no van a solapar 1:1, y no vale la pena una librería de
  distancia de edición para esto. Lo que no matchea, no tiene fallback de imagen —
  cae al placeholder final.

## Mapeo a nuestro schema (no es 1:1 con ninguna fuente)

Nuestro `exercises.category` (`compound | isolation | cardio | mobility`, CLAUDE.md
§3) **no existe tal cual en ninguna fuente**:

- La `category` de wger es grupo muscular (Abs/Arms/Back/Calves/Cardio/Chest/Legs/
  Shoulders) — la ignoramos para esto, ya la cubren `primaryMuscles[]`.
- La `category` de free-exercise-db es tipo de disciplina (strength/stretching/
  plyometrics/powerlifting/...).

Se deriva con la heurística de `src/server/seed/normalize.ts#mapCategory` (documentada
en el código): `Cardio` de wger o `cardio` de free-exercise-db → `cardio`;
`stretching` → `mobility`; `mechanic: isolation` del match → `isolation`; si no,
`compound` por defecto. `force`, `mechanic` y `level` sólo se llenan cuando hay match
con free-exercise-db — si no, quedan `null` (son nullable en el schema a propósito).

`defaultRestSeconds` (120/90/60/30 según categoría) es un default de producto, no un
dato de ninguna API — ninguna fuente lo provee.

## `needsTranslation`

`true` cuando el ejercicio no tiene traducción al español en wger (`translations`
sin `language: 4`) — en ese caso `nameEs`/`instructionsEs` quedan en el idioma
disponible (inglés, o lo que haya en `translations[0]` si ni inglés hay — pasa con
un puñado de ejercicios enviados por la comunidad en otros idiomas). Corregible más
adelante desde un panel simple (no implementado en v1).

## Resultado real de la corrida completa (18/08/2026)

| | |
|---|---|
| Total ejercicios | 873 |
| Con video (wger) | 46 |
| Con loop de 2 imágenes (free-exercise-db) | 48 |
| Sin media — placeholder en runtime | 779 (89%) |
| `needsTranslation: true` | 229 (26%) |

**89% sin media real** es un número honesto, no un objetivo — el matching exacto por
nombre entre wger y free-exercise-db tiene un hit rate bajo (dos catálogos curados por
separado), y sólo el 5% de wger trae video propio. El placeholder de mapa muscular +
texto (Fase 3/4) no es un "nice to have", es el caso mayoritario real. Si en el futuro
se quiere mejorar el hit rate del matching, la palanca es fuzzy matching (distancia de
edición) en `free-exercise-db-client.ts#normalizeNameForMatch` — no implementado por
ahora, ver "no sobre-ingeniería" en CLAUDE.md §11.

## Media — pipeline y presupuesto

Transcodificado sólo en el seed, nunca en runtime (`src/server/seed/media-pipeline.ts`,
ffmpeg vía `node:child_process`):

| Caso | Salida | Presupuesto | Verificado |
|---|---|---|---|
| Video de wger | `video.webm` (VP9) + `video.mp4` (H.264) + `poster.webp` | ≤720p, ≤8s, sin audio, ≤500KB | 487KB / 489KB reales en prueba |
| Match en free-exercise-db, sin video | `loop.webp` animado (2 frames, 1s c/u, loop infinito) | — | 40KB reales, `codec_name=webp_anim` confirmado con ffprobe |
| Sin match en ninguna fuente | (nada) | — | placeholder en UI: mapa muscular + texto (Fase 3/4) |

El WebP animado se arma con el demuxer `concat` de ffmpeg (duración explícita por
frame) en vez de `filter_complex` — más predecible para timing exacto de 1s/frame.

## Caché y reanudación

- JSON crudo: `data/raw/wger-exercises.json`, `data/raw/free-exercise-db.json` —
  gitignored (no versionados: son ~1-5MB c/u y regenerables). Si el archivo existe,
  el seed no vuelve a pegarle a la red salvo `--force-fetch`.
- Media fuente (antes de transcodificar): `data/raw/media-cache/` — gitignored.
- Media procesada: `MEDIA_DIR/exercises/<slug>/` (volumen persistente en Docker).
- Todo el pipeline es **idempotente**: correr `pnpm seed:exercises` de nuevo no
  duplica filas (`ON CONFLICT` por `slug`) ni vuelve a descargar/transcodificar
  archivos que ya existen en disco.

## Fixture para tests/dev sin red

`data/exercises.sample.json` — subconjunto curado (~30 ejercicios, mezcla de
categorías y de los 3 casos de media) exportado después de una corrida real, para
poder desarrollar y testear sin depender de wger/GitHub estando arriba.
