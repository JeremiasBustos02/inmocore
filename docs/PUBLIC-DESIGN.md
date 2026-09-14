# Diseño del sitio público

## Objetivo

La experiencia debe sentirse como una inmobiliaria moderna, profesional y fácil de recorrer. La imagen de la propiedad y el buscador son protagonistas; evitar estéticas editoriales, artísticas, SaaS o de portal saturado.

## Tipografía

- Manrope para títulos, cuerpo y UI mediante `next/font`.
- Hero y títulos de sección: peso 600, tracking levemente negativo.
- Cuerpo: peso 400, 16-18 px según contexto.
- UI: peso 500-600, labels de 13-14 px.
- No usar serif, display decorativa ni pesos 800/900.

## Color

Los tokens visuales permanecen dentro de `.public-site` para no alterar el admin.

- Background/surface: `#ffffff`.
- Foreground: `#171717`.
- Primary: `#1b1b1b`.
- Muted foreground: `#6b6b6b`.
- Border: `#e7e7e7`.
- Surface soft: `#f6f6f4`.
- El accent neutral queda reservado para focus y personalización futura.

No usar gradients, glassmorphism, colores decorativos ni sombras grandes.

## Header

- Altura de 76 px, identidad a la izquierda y navegación simple a la derecha.
- En mobile usar menú nativo accesible, compacto y sin Client Component.
- Links con cambio de color y underline breve.

## Hero

- Imagen real de una propiedad publicada, a ancho completo y con `object-cover`.
- Altura controlada: 390 px mobile, 460-500 px desde tablet.
- Copy breve, centrado y sans; overlay plano sólo cuando hay imagen.
- Sin imagen usar una superficie neutral, nunca stock o datos falsos.

## Buscador

- Bloque blanco conectado y parcialmente solapado con el hero.
- Encabezado interno y selector segmentado Venta/Alquiler.
- Filtros visibles: tipo, localidad, habitaciones, baños y precios.
- Una fila en desktop amplio, grilla intermedia en tablet y stack en mobile.
- Todos los filtros se envían por GET al catálogo.

## PropertyCard

- Imagen 4:3 dominante, contenido debajo y sin contenedor pesado.
- Mostrar operación, título, precio, localidad y características disponibles.
- Portada real por menor `sortOrder`; fallback neutral sin contenido falso.
- Hover: imagen escala 1.03, título cambia de tono y flecha avanza 3 px.

## Layout y spacing

- Container máximo: 1320 px.
- Laterales: 20 px mobile, 32 px tablet, 40 px desktop.
- Secciones: 64 px mobile, 80-96 px desktop.
- Cards: 1 columna mobile, 2 tablet, 3 desktop amplio.
- Categorías: navegación 2x2 simple con bordes sutiles.

## Motion y responsive

- Transiciones CSS de 200-250 ms sólo para feedback.
- Respetar `prefers-reduced-motion`.
- Sin animación JS, parallax, carousel ni movimiento permanente.
- Verificar especialmente 375x812 y 1366x768, sin overflow horizontal.
