# Roadmap

### M0 — Foundation

**Estado:** completado.

**Objetivo:** establecer la base técnica mínima de la aplicación.

**Resultado esperado:** Next.js, TypeScript, Tailwind CSS y shadcn/ui funcionando.

### M1 — Persistence foundation

**Estado:** completado.

**Objetivo:** incorporar persistencia multi-tenant para las identidades organizacionales básicas.

**Resultado esperado:** Supabase, Drizzle y migraciones configurados, con `Organization`, `User` y `Membership` persistidos.

### M2 — Authentication

**Estado:** completado.

**Objetivo:** autenticar usuarios y resolver su acceso a una organización de forma segura.

**Resultado esperado:** login operativo y contexto de organización validado en el servidor.

### M3 — Properties

**Progreso:** M3A (núcleo de propiedades) completado; imágenes pendientes.

**Objetivo:** gestionar el inventario inmobiliario inicial.

**Resultado esperado:** modelo y administración básica de propiedades e imágenes.

### M4 — Public website

**Objetivo:** publicar la oferta de cada inmobiliaria en un sitio accesible y responsive.

**Resultado esperado:** home, catálogo con filtros y ficha pública de propiedad sobre los datos administrativos.

### M5 — Contacts & inquiries

**Objetivo:** centralizar personas y oportunidades de contacto originadas en el sitio o el panel.

**Resultado esperado:** gestión básica de contactos y consultas con seguimiento simple.

### M6 — Imports

**Objetivo:** facilitar la incorporación inicial o masiva de propiedades.

**Resultado esperado:** importador de Excel y CSV con resultado y errores visibles.

### M7 — Operations

**Objetivo:** registrar cierres comerciales sin incorporar contabilidad.

**Resultado esperado:** ventas y alquileres registrados con historial básico y actualización coherente de propiedades.

### M8 — Dashboard

**Objetivo:** ofrecer una lectura rápida de la operación real.

**Resultado esperado:** métricas simples y útiles calculadas a partir de propiedades, consultas y operaciones.

### M9 — Branding & website settings

**Objetivo:** permitir que cada organización configure su presencia pública.

**Resultado esperado:** logo, datos de contacto, identidad y configuración pública administrables.

### M10 — Production hardening

**Objetivo:** preparar el MVP para una operación confiable en producción.

**Resultado esperado:** seguridad, tests críticos, accesibilidad, SEO y revisión final verificados.
