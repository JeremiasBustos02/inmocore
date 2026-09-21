# Operación y mantenimiento

## Deploy

Desplegar la aplicación con la plataforma configurada para este repositorio usando `pnpm install --frozen-lockfile` y `pnpm build`; ejecutar el resultado con `pnpm start` cuando la infraestructura sea self-hosted. En cada entorno configurar las variables listadas en `.env.example`.

## Migraciones

1. Modificar `src/db/schema.ts`.
2. Revisar el diff y generar con `pnpm db:generate`.
3. Revisar el SQL generado y el cambio en `drizzle/meta/_journal.json`.
4. Aplicar con `pnpm db:migrate` contra la base destino.

No crear SQL de schema manualmente ni agregar entradas a `_journal.json` a mano. Si una migración SQL manual ya existe, detenerse y reconciliar el estado antes de ejecutar otra migración.

## Variables de entorno

Requeridas: `DATABASE_URL`, `DIRECT_DATABASE_URL` (migraciones y backup), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Opcionales: `NEXT_PUBLIC_SITE_URL` (URLs absolutas, sitemap y robots), `SUPABASE_INVITE_REDIRECT_URL` (redirección de invitaciones) y `SUPABASE_SERVICE_ROLE_KEY` (sólo para `pnpm client:onboard`, nunca para el navegador).

## Storage

`property-images` almacena imágenes de propiedades. `organization-assets` almacena logo y Hero. Las rutas deben mantener el prefijo de la organización; no mover objetos manualmente sin actualizar referencias.

## Nuevo cliente y backup

Seguir [client-onboarding.md](client-onboarding.md) y [backup-and-recovery.md](backup-and-recovery.md).

## Diagnóstico básico

- Sitio no carga: comprobar deploy, variables públicas, logs y `/api/health`.
- DB falla: comprobar `DATABASE_URL`, conectividad y estado del proyecto Supabase.
- Imágenes no cargan: comprobar buckets, políticas Storage, rutas y `NEXT_PUBLIC_SUPABASE_URL`.
- Login falla: comprobar Supabase Auth, cookies, URL de redirección y publishable key.
- Migración falla: detener deploy, revisar SQL y `_journal.json`; no marcar ni editar migraciones aplicadas manualmente.

## Límites comerciales iniciales

No hay billing ni plan persistido. El Plan Base se opera manualmente e incluye sitio público, panel admin, propiedades, imágenes, Excel, personalización y WhatsApp. Los límites y cualquier cobro se acuerdan fuera de la aplicación en esta etapa.
