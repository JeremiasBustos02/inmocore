# Alta de clientes

El alta inicial es administrativa. No hay signup público ni se deben compartir contraseñas por documentación o correo.

## Antes del alta

Pedir a la inmobiliaria: nombre comercial, slug deseado, nombre y email del owner, teléfono, WhatsApp, dirección, email público, logo, imagen Hero y color de marca. Si corresponde, definir el dominio canónico y la variante pública controlada por el proveedor.

## Alta técnica

1. Copiar `.env.example` a `.env.local` y completar las variables del proyecto. Para este procedimiento se necesita además `SUPABASE_SERVICE_ROLE_KEY`, sólo en el entorno local del operador. Nunca exponerla al navegador ni commitearla.
2. Ejecutar el script oficial. Invita al owner, crea organización y membership `owner` en una transacción, y permite cargar branding inicial:

```bash
pnpm client:onboard --name "Inmobiliaria Ejemplo" --slug "inmobiliaria-ejemplo" --owner-name "Nombre Owner" --owner-email "owner@ejemplo.com" --phone "02266123456" --whatsapp "5492266123456" --address "Calle 1 123" --public-email "hola@ejemplo.com" --primary-color "#1B1B1B" --logo "C:\\ruta\\logo.png" --hero "C:\\ruta\\hero.webp" --custom-domain "inmobiliaria-ejemplo.com.ar" --site-variant "editorial"
```

`--logo`, `--hero`, `--custom-domain`, `--site-variant` y los datos de contacto son opcionales. El dominio se escribe sin protocolo ni path y debe ser único. La variante admite `default` o `editorial`; su valor por defecto es `default`. El slug debe ser único. Una colisión o dato inválido detiene la transacción; si falla la operación, el script elimina el usuario invitado y los assets que haya subido.

3. El owner recibe la invitación de Supabase y define su acceso desde el enlace. Si se usa una URL de redirección específica, configurar `SUPABASE_INVITE_REDIRECT_URL` antes de ejecutar el script.
4. Verificar que el owner pueda entrar a `/admin`, vea la organización y pueda abrir `/admin/<slug>/organization`.
5. Completar o corregir datos desde esa pantalla. La configuración no requiere que todos los campos opcionales estén completos.

## Validación

- Login del owner y acceso sólo a su organización.
- Home pública `/<slug>` y catálogo `/<slug>/properties`.
- Ficha `/<slug>/properties/<propertyId>`.
- WhatsApp, logo, color y Hero.
- Carga de una propiedad e imágenes.
- Importación Excel, si el módulo está desplegado.
- `/sitemap.xml` y `/robots.txt` si `NEXT_PUBLIC_SITE_URL` está configurada.
- Si existe dominio propio, seguir y completar la validación de [dominios personalizados](custom-domains.md).

## Entrega

Entregar la URL pública, la URL admin, el email usado para la invitación y el flujo básico: cargar propiedades, subir imágenes, publicar y revisar el sitio. No entregar ni registrar contraseñas.
