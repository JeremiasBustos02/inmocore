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

Opcionales: `NEXT_PUBLIC_SITE_URL` (origen de la plataforma para organizaciones sin dominio propio, sitemap y robots), `NOMINATIM_BASE_URL` (instancia de geocodificación; usa el servicio público de OpenStreetMap por defecto), `SUPABASE_INVITE_REDIRECT_URL` (redirección de invitaciones), `SUPABASE_SECRET_KEY` (sólo para `pnpm client:onboard`, `pnpm client:add-member` y el provider backoffice, nunca para el navegador), `SUPABASE_MEMBER_PASSWORD` (sólo localmente con `client:add-member --mode create`, nunca commitearla) y `PLATFORM_ADMIN_USER_IDS` (IDs de usuarios Supabase autorizados al provider backoffice, separados por comas o espacios).

## Mapas y privacidad

Los mapas usan Leaflet y tiles de OpenStreetMap. Nominatim sólo se consulta desde acciones administrativas autenticadas, al presionar el botón de búsqueda; las consultas idénticas se cachean y un advisory lock limita las solicitudes salientes a una por segundo.

La ubicación pública `approximate` se genera en el servidor redondeando latitud y longitud a dos decimales y se representa con un círculo de 750 metros. La dirección y las coordenadas exactas se eliminan antes de construir las props públicas. La opción `hidden` tampoco entrega coordenadas al cliente.

Los códigos de propiedades se generan por organización mediante un contador atómico. El prefijo se deriva y persiste desde el slug al crear la organización; las referencias antiguas se conservan en `reference` como dato externo opcional. El backfill de la migración asigna códigos a las propiedades existentes ordenadas por creación y no modifica esas referencias.

## Provider backoffice

El panel interno vive en `/control` y sólo permite el acceso a los usuarios cuyos IDs estén configurados en `PLATFORM_ADMIN_USER_IDS`. Esta autorización es independiente de los roles `owner`, `admin` y `agent` de cada organización. Desde allí se pueden listar organizaciones, crear una nueva, editar `isDemo`, `siteVariant` y `customDomain`, y agregar memberships. Las acciones sensibles validan nuevamente la identidad server-side y `SUPABASE_SECRET_KEY` sólo se usa en el servidor.

En Vercel, configurar `SUPABASE_SECRET_KEY` como Environment Variable privada para los entornos que ejecuten el backoffice. No crear una variable `NEXT_PUBLIC_SUPABASE_SECRET_KEY`: cualquier variable con ese prefijo puede llegar al navegador.

## Storage

`property-images` almacena imágenes de propiedades. `organization-assets` almacena logo y Hero. Las rutas deben mantener el prefijo de la organización; no mover objetos manualmente sin actualizar referencias.

## Nuevo cliente y backup

Seguir [client-onboarding.md](client-onboarding.md), [custom-domains.md](custom-domains.md) cuando corresponda y [backup-and-recovery.md](backup-and-recovery.md).

## Diagnóstico básico

- Sitio no carga: comprobar deploy, variables públicas, logs y `/api/health`.
- DB falla: comprobar `DATABASE_URL`, conectividad y estado del proyecto Supabase.
- Imágenes no cargan: comprobar buckets, políticas Storage, rutas y `NEXT_PUBLIC_SUPABASE_URL`.
- Login falla: comprobar Supabase Auth, cookies, URL de redirección y publishable key.
- Migración falla: detener deploy, revisar SQL y `_journal.json`; no marcar ni editar migraciones aplicadas manualmente.
- Dominio propio falla: revisar el estado DNS/SSL en Vercel y la coincidencia exacta con `organizations.custom_domain`.

## Límites comerciales iniciales

No hay billing ni plan persistido. El Plan Base se opera manualmente e incluye sitio público, panel admin, propiedades, imágenes, Excel, personalización y WhatsApp. Los límites y cualquier cobro se acuerdan fuera de la aplicación en esta etapa.
