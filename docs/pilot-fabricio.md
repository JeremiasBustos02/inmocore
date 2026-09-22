# Piloto Fabricio Gómez Ramos Propiedades

## Estado actual

La organización demo está creada como tenant controlado:

- Slug: `fabricio-gomez-ramos`
- Dominio: ninguno (`customDomain = null`)
- Variante: `editorial`
- Estado: demo/no cliente (`isDemo = true`)
- Administración: cuenta de desarrollo existente `prueba@inmocore.com`

No se envió ninguna invitación a Fabricio, no se registró dominio a su nombre y no se configuró DNS externo.

## Información usada

La búsqueda pública no produjo datos verificables suficientes para publicar dirección, teléfono, WhatsApp, email, matrícula, trayectoria, zonas o servicios. Esos campos permanecen vacíos.

Los archivos locales de `public/` contienen un logo y fotografías entregados para la demo. Se usan como assets versionados de demostración, no como uploads del cliente ni como publicaciones reales. La propiedad cargada está marcada como `DEMO-001` y su ubicación figura como “a confirmar”.

## Revisión comercial

La Home usa `editorial`, el nombre de la inmobiliaria, color magenta del material entregado y copy neutral. El bloque de confianza evita afirmar trayectoria, liderazgo o conocimiento de una zona. El catálogo, ficha, filtros y administración siguen siendo los componentes compartidos.

## Convertir en cliente

1. Fabricio confirma el servicio y entrega los datos públicos definitivos.
2. Se define el dominio canónico y se registra a nombre del cliente.
3. Se agrega el dominio al proyecto Vercel y se configura DNS/SSL.
4. Se asigna `customDomain` a esta organización, sin duplicar el tenant.
5. Se reemplazan los datos pendientes, logo, Hero y propiedades demo por assets y publicaciones reales.
6. Se crea o invita el owner real mediante el flujo normal de Supabase y se conserva la membership controlada sólo durante la transición acordada.
7. Se cargan o importan propiedades reales y se validan Home, catálogo, fichas, imágenes y WhatsApp.
8. Se cambia `isDemo` a `false`; con eso se habilita indexación normal y la organización puede aparecer en el sitemap correspondiente.
9. Se revisan canonical, `og:url`, `sitemap.xml`, `robots.txt` y el recorrido móvil antes de entregar.

## Limpieza antes de entregar

- Eliminar la propiedad `DEMO-001`.
- Retirar cualquier asset no confirmado.
- Reemplazar los assets versionados de `public/` por archivos del cliente o subirlos mediante Storage.
- Completar contacto y WhatsApp sólo con datos proporcionados por el cliente.
- Confirmar que el owner real tenga acceso y que la cuenta interna ya no sea necesaria.
