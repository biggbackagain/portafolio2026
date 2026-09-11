# Irán García — Soluciones de TI en Ciudad Guzmán, Jalisco

**Ingeniero en Telemática** (Universidad de Guadalajara, CUSur) con trayectoria en TI desde 2017.
Desarrollo de software a la medida, servidores y equipo de cómputo, licenciamiento original,
redes y CCTV, marketing digital y soporte técnico. Servicio **en sitio en el Sur de Jalisco y
la Zona Metropolitana de Guadalajara**, y **remoto en todo México**.

**Sitio web:** [biggbackagain.github.io/portafolio2026](https://biggbackagain.github.io/portafolio2026/)
**WhatsApp:** [341 105 6019](https://wa.me/523411056019)
**Correo:** [garciagg2193@gmail.com](mailto:garciagg2193@gmail.com)
**Redes:** [LinkedIn](https://www.linkedin.com/in/irangarcia93/) ·
[Facebook](https://www.facebook.com/iraan.garciagtz) ·
[Instagram](https://www.instagram.com/irangarcia93/)

---

## Servicios

| Servicio | Qué incluye |
|---|---|
| **Software a la medida y punto de venta** | Sistemas de ventas, inventario con kardex, recetas y costos, multi-sucursal, permisos por usuario, cortes de caja, instalador y respaldos automáticos. |
| **Servidores y equipo de cómputo** | Dimensionamiento según carga real, compra, instalación, configuración, migración de datos, virtualización, usuarios de dominio y respaldos programados. |
| **Licenciamiento de software** | Software original y facturado a nombre de tu empresa: sistemas operativos, ofimática, correo empresarial, antivirus y respaldo en la nube, con control de vencimientos. |
| **Redes, voz, datos y CCTV** | Cableado estructurado, switching, VLANs, ruteo, Wi-Fi de cobertura, segmentación segura, videovigilancia IP y telefonía sobre IP. |
| **Presencia digital y marketing** | Sitio web propio y rápido, correo con tu dominio, Google Business, SEO local, campañas medibles y automatización de WhatsApp. |
| **Desarrollo backend e integraciones** | APIs REST, autenticación y roles, integración de pagos y facturación, automatización de procesos y optimización de consultas. |
| **Soporte y mantenimiento** | Soporte L1–L2 remoto y en sitio, preventivo, respaldos verificados, plan de recuperación, inventario técnico y capacitación. Por póliza mensual o por incidente. |

**Cotización y diagnóstico inicial sin costo.** Propuesta por escrito con alcance, tiempos y precio.

## Tecnologías

`Python` · `Django` · `Java` · `C++` · `PHP / Laravel` · `Vue` · `HTML / CSS` · `MySQL` ·
`MariaDB` · `SQL Server` · `SQLite` · `REST APIs` · `Git` · `Linux` · `Windows Server` ·
`Active Directory` · `Routing & Switching` · `OSPF` · `EIGRP` · `RIPv2` · `VLANs / STP / ROAS` ·
`NAT / PAT / DHCP` · `Cableado estructurado` · `CCTV IP` · `Wireshark` · `Cisco Packet Tracer` ·
`NetSpot` · `Kali Linux`

## Experiencia

- **Administrador de Sistemas y Medios Digitales** — Pollos Coloso, Ciudad Guzmán *(abr 2019 – presente)*
- **Docente de Matemáticas y asesor de equipos** — Colegio Cervantes *(feb 2024 – presente)*
- **Remote Desktop Manager** — AN Global México, Tlaquepaque *(sep 2018 – ene 2019)*
- **Ingeniero de Sistemas** — Golden Lion Casino *(nov 2017 – sep 2018)*

**Reconocimientos:** 7.º lugar en IBM HackAttack 2019 (60+ participantes nacionales) · 2.º lugar
en competencia STEAM con equipo asesorado · tallerista en Redi Zapotlán 2024, *"Hack Marketing:
segmentación precisa y ciberseguridad en el mundo digital"*.

**27 certificaciones verificables** de Cisco, Meta, Google, IBM, HackerRank y CertiProf —
todas con enlace de validación en el sitio.

---

## Sobre este repositorio

Código del sitio personal: **100% estático**, un solo `index.html` sin dependencias, sin build y
sin frameworks. Se abre con doble clic o se publica en cualquier hosting estático.

```
portafolio2026/
├── index.html                     # Todo el sitio (HTML + CSS + JS en un archivo)
├── robots.txt · sitemap.xml       # Para buscadores
└── assets/
    ├── CV-Iran-Garcia.pdf         # CV descargable desde el sitio
    ├── iran-retrato-860.jpg       # Foto que usa el sitio (+ 430 y original)
    └── badges/                    # 11 insignias oficiales de Credly
```

### Configuración

Todo lo editable está en el objeto `CONFIG`, al inicio del `<script>` de `index.html`:
`email`, `whatsapp` (con lada país, sin signos) y `github`. Los arreglos `featuredProjects` y
`certifications` alimentan esas dos secciones; el campo `cat` genera solo los botones de filtro.

### Detalles de implementación

- **Foto:** viene recortada sobre fondo blanco, así que se monta en un panel claro y se desvanece en los bordes con `mask-image` radial. Por eso no se ve un cuadro blanco sobre el fondo oscuro.
- **Insignias:** descargadas de Credly a `assets/badges/<uuid>.png`; la ruta se deduce del enlace de la credencial, y si el archivo falta la imagen se quita sola (`onerror`).
- **Proyectos:** pinta la lista curada y luego, si hay internet, la enriquece con la API pública de GitHub. Sin conexión el sitio se ve completo igual.
- **Formulario:** `mailto:` con el mensaje ya armado. Sin servidor, sin rastreadores y sin enviar datos a terceros.
- **CV:** los botones apuntan a `assets/CV-Iran-Garcia.pdf`; para actualizarlo basta reemplazar ese archivo.
- **Tema claro/oscuro:** se recuerda en `localStorage` y respeta la preferencia del sistema.
- **Accesibilidad:** navegación por teclado, `aria-*` en filtros y menú, y `prefers-reduced-motion` respetado.
- **SEO:** meta descripción, Open Graph, `canonical`, `robots.txt`, `sitemap.xml` y datos estructurados `schema.org/ProfessionalService` con catálogo de servicios, teléfono y redes.

### Paleta

Azul corporativo dominante, el color que transmite confianza en TI. Sin morados ni neones.

| Rol | Oscuro | Claro |
|---|---|---|
| Fondo | `#071223` | `#f4f7fc` |
| Acento principal | `#3b82f6` | `#1d4ed8` |
| Acento secundario | `#1d4ed8` | `#0f3a8f` |
| Éxito / métricas | `#14b8a6` | `#0d9488` |

### Publicar en GitHub Pages

```bash
git add .
git commit -m "Portafolio 2026"
git push origin main
```

Luego **Settings → Pages → Source: Deploy from a branch → main / (root)**.
Con dominio propio, actualiza las URLs de `canonical`, Open Graph, `robots.txt` y `sitemap.xml`.

### Ver en local

```bash
python -m http.server 8080 --bind 127.0.0.1
```

---

<sub>Palabras clave: soporte técnico Ciudad Guzmán · sistemas punto de venta Jalisco · desarrollo
de software Zapotlán el Grande · redes y cableado estructurado Sur de Jalisco · instalación de
CCTV · venta de licencias de software · servidores y equipo de cómputo · mantenimiento
preventivo de computadoras · páginas web Ciudad Guzmán · marketing digital Guadalajara.</sub>
