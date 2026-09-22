# Dominios personalizados

Los dominios se configuran de forma operativa. InmoCore no compra dominios ni usa la API de Vercel para automatizar DNS.

## Flujo para un cliente

1. Confirmar la contratación y definir con el cliente el dominio canónico, por ejemplo `inmobiliaria.com.ar` o `www.inmobiliaria.com.ar`.
2. Registrar el dominio a nombre del cliente. Para `.com.ar`, completar la gestión correspondiente en NIC Argentina.
3. Agregar el dominio al proyecto de InmoCore en Vercel desde **Project > Settings > Domains**. Si se usarán las variantes con y sin `www`, agregar ambas y configurar una redirección hacia la canónica.
4. Configurar en el proveedor DNS exactamente los registros indicados por Vercel. Habitualmente un dominio apex usa `A` y un subdominio usa `CNAME`, pero los valores mostrados por Vercel son la fuente de verdad.
5. Si Vercel solicita verificar propiedad, agregar el registro `TXT` indicado. Esperar la propagación y comprobar que el dominio figure como válido.
6. Esperar la emisión automática del certificado SSL y verificar que `https://<dominio>` no presente errores.
7. Configurar el hostname normalizado en `organizations.custom_domain`, sin protocolo, puerto, path ni barra final. Definir también `site_variant` como `default` o `editorial`. Estas columnas no se exponen al owner.
8. Verificar la Home en `/`, incluyendo logo, Hero, buscador, contacto y links sin el slug interno.
9. Verificar el catálogo en `/properties`, sus filtros, paginación y links.
10. Verificar una ficha en `/properties/<propertyId>`, WhatsApp, galería y similares. Confirmar que un ID de otra organización responda 404.
11. Revisar `robots.txt`, `sitemap.xml`, canonical y `og:url`. Todos deben usar `https://<dominio>/...`, nunca la URL fallback con slug.

El dominio debe existir en una sola organización. Un hostname desconocido no usa una organización demo ni otra organización como fallback.

## Alta inicial

El onboarding admite ambos valores opcionales:

```bash
pnpm client:onboard --name "Inmobiliaria Ejemplo" --slug "inmobiliaria-ejemplo" --owner-email "owner@ejemplo.com" --custom-domain "inmobiliaria.com.ar" --site-variant "editorial"
```

Sin esos argumentos se guarda `custom_domain = null` y `site_variant = default`. Para una organización existente, cambiar estos campos mediante el proceso administrativo de base de datos después de que el dominio esté validado en Vercel.

## Desarrollo local

El flujo habitual no requiere editar el archivo `hosts`:

```text
http://localhost:3000/inmobiliaria-demo
```

Para probar opcionalmente el routing por hostname, la base local debe contener ese mismo `custom_domain`. Con el servidor iniciado:

```bash
curl.exe -H "Host: inmobiliaria.test.com" http://localhost:3000/
curl.exe -H "Host: inmobiliaria.test.com" http://localhost:3000/properties
```

El hostname de prueba debe tener formato de dominio; `localhost` queda reservado para el fallback por slug.

## Operación y diagnóstico

- Dominio en 404: comprobar que el hostname recibido coincide exactamente con `custom_domain` y que la migración está aplicada.
- Certificado o DNS pendiente: revisar el estado del dominio y los registros requeridos en Vercel; no corregirlo en la aplicación.
- `www` abre pero el apex no: agregar ambos dominios al proyecto y redirigir el secundario al hostname guardado como canónico.
- Canonical incorrecto: comprobar `custom_domain`; `NEXT_PUBLIC_SITE_URL` sólo es la base para organizaciones sin dominio propio.

Referencias operativas vigentes: [agregar un dominio en Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain) y [configurar un dominio personalizado](https://vercel.com/docs/domains/set-up-custom-domain).
