# Backup y recuperación

## Qué se guarda

- PostgreSQL contiene organizaciones, memberships, propiedades, imágenes como metadata y configuración.
- Storage contiene los archivos de `property-images` y `organization-assets`; la base sólo guarda sus rutas.
- Git contiene el código, `.env.example` y migraciones Drizzle. No contiene secretos ni datos de producción.
- Restaurar PostgreSQL por sí solo no restaura objetos de Storage borrados después del backup.

## Backup

1. Hacer un dump de PostgreSQL desde un equipo seguro con `DIRECT_DATABASE_URL`:

```powershell
pg_dump "$DIRECT_DATABASE_URL" --format=custom --file="backup-$(Get-Date -Format yyyyMMdd-HHmm).dump"
```

En Linux/macOS, reemplazar `Get-Date` por `$(date +%Y%m%d-%H%M)`.
2. Mantener una copia separada de los objetos de Storage de los buckets `property-images` y `organization-assets`. Usar la descarga/exportación disponible en el proyecto Supabase o `supabase storage cp` si la CLI está instalada; conservar las rutas originales.
3. Conservar en Git el código y el directorio `drizzle/`. Guardar aparte los nombres de proyecto, URLs, claves y configuración del proveedor, nunca sus valores secretos en el repositorio.
4. Revisar en Supabase si el plan contratado incluye backups diarios o PITR. La disponibilidad y retención dependen del plan; los backups de DB no incluyen Storage.

## Restauración básica

1. Preparar un proyecto Supabase destino, sus buckets públicos y las variables de entorno requeridas.
2. Restaurar el dump con `pg_restore --dbname="$DIRECT_DATABASE_URL" --format=custom --no-owner --no-privileges backup.dump`. Hacerlo sobre un destino controlado y revisar el log.
3. Restaurar los archivos a los buckets conservando `organizationId/...` y las rutas registradas en PostgreSQL.
4. Aplicar sólo migraciones pendientes con el flujo de Drizzle documentado en `docs/operations.md`; no editar `_journal.json` manualmente.
5. Ejecutar las validaciones posteriores: `/api/health`, login, home, catálogo, ficha, imágenes, Storage, sitemap y robots.

Los objetos eliminados de Storage no son recuperables mediante un restore de la base. La recuperación completa requiere una copia independiente de esos archivos.
