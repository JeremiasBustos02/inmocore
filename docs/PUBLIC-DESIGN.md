# Diseño del sitio público

## Objetivo

La experiencia pública debe transmitir confianza, calma, claridad y oficio inmobiliario. La propiedad es protagonista; la interfaz evita el lenguaje de dashboard, portal saturado o landing SaaS.

## Tipografía

- Instrument Serif: títulos editoriales y grandes mensajes.
- Manrope: navegación, formularios, cuerpo y datos.
- Hero: escala fluida y ancho de línea corto.
- Cuerpo: 16-18 px, interlineado holgado.
- Labels: mínimo 14 px.

## Color

Los tokens públicos se aplican dentro de `.public-site` para no alterar el admin.

- Background: marfil mineral `oklch(0.965 0.012 83)`.
- Surface: blanco cálido `oklch(0.995 0.004 80)`.
- Foreground/primary: tinta verde-negra `oklch(0.24 0.012 150)`.
- Muted foreground: gris cálido `oklch(0.51 0.012 90)`.
- Brand accent inicial: piedra `oklch(0.56 0.025 78)`.
- Borders: finos, cálidos y de bajo contraste.

El acento se reserva para estados, labels puntuales, links y focus. No usar gradients decorativos, glassmorphism ni sombras grandes.

## Layout y espacio

- Container máximo: 1320 px.
- Padding lateral: 20 px mobile, 32 px tablet, 40 px desktop.
- Secciones: 64 px mobile, 80 px tablet, 96-112 px desktop.
- El hero usa una composición editorial texto/imagen; en 1366x768 deja visible el buscador y continuidad inferior.
- Grillas: una columna mobile, dos tablet, tres desktop amplio.

## Radius

- Controls: 8 px.
- Property cards e imágenes: 12 px.
- Pills sólo para estados breves, como la operación.

## Hover y motion

- Transiciones CSS de 200-250 ms.
- Links: underline progresivo o cambio de color.
- Buttons: cambio leve de tono, sin elevación marcada.
- Flechas: desplazamiento horizontal máximo de 3-4 px.
- Respetar siempre `prefers-reduced-motion`.
- No usar animación JS, parallax, stagger ni movimiento permanente.

## PropertyCard

- Imagen 3:2 con `object-cover` y dimensiones reservadas.
- Portada: imagen con menor `sortOrder`.
- Sin imagen: fondo neutral, nunca contenido falso.
- Mostrar sólo operación, título, ciudad, precio y características disponibles.
- Hover: imagen escala 1.03, flecha avanza 3 px y el título se subraya.
- No elevar la card ni sumar sombras fuertes.
- Toda la card debe ser un link con nombre accesible y focus visible.
