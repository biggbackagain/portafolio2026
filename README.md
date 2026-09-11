# Portafolio 2026 — Ing. Iran García

Sitio personal **100% estático**: un solo `index.html` sin dependencias, sin build,
sin frameworks. Se puede abrir con doble clic o publicar en cualquier hosting estático.

## Estructura

```
portafolio2026/
├── index.html                     # Todo el sitio (HTML + CSS + JS en un archivo)
├── robots.txt                     # Para buscadores
├── sitemap.xml                    # Para buscadores
└── assets/
    ├── CV-Iran-Garcia.pdf         # CV descargable desde el sitio
    ├── iran-retrato-860.jpg       # La que usa el sitio
    ├── iran-retrato-430.jpg       # Versión ligera / redes
    ├── iran-retrato-original.png  # Original 1568 px (respaldo)
    └── badges/                    # 11 insignias oficiales descargadas de Credly
```

## Secciones

Perfil · Servicios (7 líneas de negocio) · Casos de éxito · Experiencia · Proyectos ·
Certificaciones con insignias · FAQ · Contacto.

## Paleta

Azul corporativo dominante, que es el color que transmite confianza en TI. Sin morados ni neones.

| Rol               | Oscuro    | Claro     |
|-------------------|-----------|-----------|
| Fondo             | `#071223` | `#f4f7fc` |
| Acento principal  | `#3b82f6` | `#1d4ed8` |
| Acento secundario | `#1d4ed8` | `#0f3a8f` |
| Éxito / métricas  | `#14b8a6` | `#0d9488` |

## Configuración

Todo lo editable está en el objeto `CONFIG`, al inicio del `<script>` de `index.html`:

| Campo      | Valor actual                                |
|------------|---------------------------------------------|
| `email`    | `garciagg2193@gmail.com`                    |
| `whatsapp` | `523411056019` (341 105 6019 con lada país) |
| `github`   | `biggbackagain`                             |

Otros arreglos en el mismo `<script>`:

- `featuredProjects` — proyectos curados; se muestran siempre y sirven de respaldo si GitHub no responde.
- `certifications` — certificaciones; el campo `cat` genera solo los botones de filtro.

## Detalles de implementación

- **Foto:** la imagen viene recortada sobre fondo blanco, así que se monta en un panel claro y se desvanece en los bordes con `mask-image` radial. Por eso no se ve un cuadro blanco sobre el fondo oscuro.
- **Insignias:** descargadas de Credly a `assets/badges/<uuid>.png`. La ruta se deduce del propio enlace de la credencial (`badgeSrc()`), así que una certificación nueva de Credly solo necesita su PNG con ese nombre. Si el archivo falta, la imagen se elimina sola (`onerror`) y la tarjeta sigue viéndose bien. Las certificaciones con insignia se ordenan primero.
- **Proyectos:** pinta la lista curada y luego, si hay internet, la enriquece con la API pública de GitHub. Sin conexión el sitio se ve completo igual.
- **Formulario:** abre el cliente de correo con `mailto:` y el mensaje ya armado (nombre, empresa, servicio, presupuesto y necesidad). No hay servidor ni se envían datos a terceros. Si algún día quieres recibir los correos sin depender del cliente del visitante, se puede conectar a Formspree o Netlify Forms sin dejar de ser estático.
- **Descargar CV:** los dos botones apuntan a `assets/CV-Iran-Garcia.pdf` con el atributo `download`. Para actualizarlo solo reemplaza ese archivo con el mismo nombre; no hay que tocar el HTML. La hoja `@media print` sigue ahí, así que imprimir la página con Ctrl+P también produce una versión limpia sin menús ni fondos.
- **Tema claro/oscuro:** se recuerda en `localStorage`; el inicial respeta la preferencia del sistema.
- **Accesibilidad y rendimiento:** navegación por teclado, `aria-*` en filtros y menú, `prefers-reduced-motion` respetado, imágenes con dimensiones declaradas y cero librerías externas.
- **SEO:** meta descripción, Open Graph, `canonical`, `robots.txt`, `sitemap.xml` y datos estructurados `schema.org/ProfessionalService` con catálogo de servicios, teléfono y redes sociales.

## Publicar en GitHub Pages

```bash
git add .
git commit -m "Portafolio 2026: rediseño y líneas de servicio"
git push origin main
```

Luego en GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
Queda en `https://biggbackagain.github.io/portafolio2026/`.

Con dominio propio, actualiza las URLs de `canonical`, Open Graph, `robots.txt` y `sitemap.xml`.

## Ver en local

```bash
python -m http.server 8080 --bind 127.0.0.1
```

Y abre `http://127.0.0.1:8080`.
