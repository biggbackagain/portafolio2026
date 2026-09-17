# Irán García — Sitio profesional

Sitio estático de servicios de TI, portafolio y formación. HTML, CSS y JavaScript sin compilación ni dependencias de desarrollo.

## Estructura

- `index.html`: contenido, navegación y metadatos.
- `assets/site.css`: identidad visual y adaptación a escritorio y móvil.
- `assets/site.js`: menú móvil, certificaciones y formulario.
- `assets/theme.js`: restaura el tema guardado antes de mostrar la página.
- `assets/site-data.js`: contacto, configuración pública de EmailJS y las 27 certificaciones originales.
- `assets/CV-Iran-Garcia.pdf`: CV descargable.
- `assets/Checklist-Tecnico.pdf`: recurso gratuito de descarga directa.
- `assets/badges/`: insignias oficiales locales.

## Diseño

Fondo marfil, texto verde profundo, azul para acciones y acentos salvia y durazno. La página presenta servicios, casos, perfil, certificaciones, cursos próximos y contacto. No carga repositorios automáticamente ni utiliza contadores o fondos animados. Las certificaciones se muestran en tres destacadas y se pueden ampliar y filtrar.

El botón de sol/luna permite alternar entre modo día y noche en escritorio y móvil. El modo claro es el predeterminado; la elección se recuerda localmente si el navegador permite almacenamiento. El sitio aclara que no se emiten facturas.

## Contacto

WhatsApp es el canal principal. El formulario alternativo solicita nombre, correo y mensaje. EmailJS se carga al enviar y usa la cuenta y plantilla existentes. Los campos ocultos mantienen compatibilidad con la plantilla anterior. Ante un fallo se conserva el texto y se ofrece continuar por WhatsApp. Nunca colocar claves privadas de servicios en estos archivos públicos.

Los enlaces de WhatsApp incluyen mensajes específicos para cada servicio. Los enlaces al CV y al checklist son descargas directas, sin formulario de suscripción.

## Cursos: siguiente etapa

La sección actual anuncia próximos cursos y permite consultar por WhatsApp. No existe todavía registro de alumnos, checkout ni cobro. Cuando se defina el primer curso, implementar catálogo y ficha con temario, fechas y precio; inscripción; proveedor de pagos; confirmación del pago desde un servidor mediante webhook; y acceso del alumno. El acceso no debe depender solo de una redirección del navegador después del pago. No se ha seleccionado ni integrado un proveedor de pagos.

## Revisión local

Abrir `index.html` en un navegador o servir la carpeta con un servidor estático, por ejemplo:

```powershell
python -m http.server 8080 --bind 127.0.0.1
```

Verificar navegación móvil, desplegables, 27 certificaciones y filtros, descargas de PDF y enlaces de contacto. Probar el envío real de EmailJS cuando se autorice enviar un mensaje de prueba.

## Publicación

El proyecto conserva compatibilidad con GitHub Pages y el dominio `irangarcia.dev`. Publicar también los archivos `assets/site.css`, `assets/site.js` y `assets/site-data.js` junto con los recursos existentes. Este rediseño no publica cambios automáticamente.
