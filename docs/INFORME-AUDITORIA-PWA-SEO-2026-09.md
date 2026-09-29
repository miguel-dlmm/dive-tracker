# Auditoría PWA + SEO — Ocean Flow (2026-09)

> Auditoría de solo lectura (sin cambios de código), pedida como parte
> del lote nocturno iniciado el 2026-09-27 ("revisa q está todo
> preparado y previsto al 100% para ser usado como webapp. dale una
> revisión a todo el seo para estar al día de tendencia, uso de
> taxonomías… etc"). Cubre dos superficies muy distintas del proyecto,
> que hay que evaluar con criterios distintos:
>
> - **La app en sí** (`index.html`, todo lo que hay tras el login) — es
>   una herramienta **privada** de un solo usuario por cuenta, con datos
>   de facturación. No debe indexarse nunca; su "SEO" correcto es
>   precisamente estar bien bloqueada.
> - **La landing "Meet Ocean Flow"** (`public/meetOceanFlow/`) — es la
>   única superficie realmente pública y pensada para descubrimiento
>   (10 idiomas), y es donde se aplican de verdad las prácticas de SEO.
>
> No se ha tocado ningún fichero de producto en esta auditoría — solo
> este informe. Todas las recomendaciones están pendientes de tu
> aprobación antes de implementarse (regla 5/7 de `CLAUDE.md`).

## Resumen ejecutivo

Lo más importante primero, de mayor a menor impacto real:

1. **La landing no es descubrible por nadie hoy, ni buscando ni por
   enlace interno** — `robots.txt` bloquea todo el dominio (`Disallow:
   /`, sin excepción), no existe `sitemap.xml`, y ningún fichero del
   propio proyecto (`src/`, `docs/`) enlaza a `/meetOceanFlow/`. Su
   único canal de distribución real hoy es un enlace directo compartido
   a mano (p. ej. bio de Instagram). Esto no es un bug — es coherente
   con que la landing **todavía no está desplegada en `main`/producción**
   (confirmado: existe en `develop`/TEST, no en `main`) — pero es el
   primer punto a resolver el día que se decida publicarla de verdad.
2. **La landing pesa 222 KB de HTML, de los cuales ~196 KB (88%) son dos
   capturas de pantalla incrustadas en base64** dentro del propio
   documento, en vez de ficheros de imagen aparte. Esto perjudica
   directamente Core Web Vitals (LCP) y la velocidad de carga percibida,
   ambos factores de posicionamiento reales — ver detalle en el punto 4.
3. **La landing no tiene ninguna etiqueta de metadatos para compartir ni
   para buscadores**: sin Open Graph, sin Twitter Card, sin datos
   estructurados (`schema.org`), sin `<link rel="canonical">` — a
   diferencia de la app (`index.html`), que sí los tiene todos, ya
   trabajados y correctos.
4. **No hay Service Worker en ningún punto del proyecto** — sin él, en
   Android/Chrome no aparece nunca el prompt nativo de instalación
   (`beforeinstallprompt`) ni hay ningún nivel de funcionamiento offline.
   Esto es coherente con una decisión ya tomada conscientemente (ver
   `InstallAppTab.jsx`, comentario explícito: "no hay ningún prompt
   nativo de instalación que disparar... el único camino real, en
   cualquier plataforma, es explicar el gesto manual") — no es un
   descuido, es una superficie que quedó fuera a propósito. Se detalla
   igualmente abajo como mejora opcional, no como fallo.
5. El resto — manifest, iconos, viewport, favicon con modo oscuro,
   estructura semántica de la landing (un único `<h1>`, jerarquía de
   encabezados correcta, todas las imágenes con `alt`) — **está bien
   hecho** y no necesita cambios.

---

## 1. PWA — ¿está lista para usarse como aplicación instalada?

### 1.1. Lo que ya funciona correctamente

- `public/manifest.json` existe, se sirve desde la raíz (`publicDir`,
  bug de despliegue de esto ya corregido en una sesión anterior) y
  tiene los campos mínimos correctos: `name`, `short_name`,
  `start_url`, `display: "standalone"`, `background_color`,
  `theme_color`, `orientation: "portrait"`.
- Dos iconos (`192×192` y `512×512`, PNG), que es el mínimo que pide
  el [criterio de instalabilidad de Chrome](https://web.dev/articles/install-criteria)
  (icono ≥192px y uno ≥512px).
- `apple-touch-icon` presente en `index.html` — necesario en iOS Safari,
  que no lee `manifest.json` de la misma forma que Chrome/Android.
- Favicon vectorial (`icon.svg`) con `@media (prefers-color-scheme:
  dark)` para invertir a blanco en modo oscuro del sistema — detalle de
  pulido que la mayoría de apps ni se plantea.
- `InstallAppTab.jsx`: pantalla propia con instrucciones manuales para
  iOS ("Compartir" → "Añadir a inicio") y Android ("⋮" → "Instalar
  app"), con la decisión ya documentada en el propio código de que no
  existe alternativa mejor multiplataforma (`beforeinstallprompt` es
  solo Chromium). Resuelve el caso de uso real sin construir nada de
  más — coherente con la regla de MVP/reutilización del proyecto.
- Viewport avanzado: `viewport-fit=cover` + `interactive-widget=
  resizes-content`, con un comentario que documenta un bug real de
  Safari que esto corrige (barra de menú tapada cuando la pantalla no
  tiene contenido que hacer scroll).

### 1.2. Huecos reales, de mayor a menor impacto

| Hueco | Impacto real | Esfuerzo |
|---|---|---|
| Sin Service Worker → sin funcionamiento offline, sin prompt nativo de instalación en Android/Chrome | Medio-bajo: la app depende de Supabase en tiempo real para casi todo, así que "modo offline" tiene poco valor de negocio hoy; el prompt nativo de Android es una mejora de conversión, no una funcionalidad rota (el acceso directo ya funciona vía instrucciones manuales) | M — añadir `vite-plugin-pwa` (estándar de facto del ecosistema Vite, no una solución casera) con una estrategia mínima de cacheo de shell de la app, sin intentar cachear datos de Supabase |
| Iconos del manifest sin `"purpose": "maskable"` | Bajo — en Android, sin un icono maskable, el sistema puede recortar el icono de forma menos cuidada en formas de icono adaptables (algunos lanzadores). Cosmético, no bloquea instalación | S — generar una variante con margen de seguridad (safe zone) del logo ya existente |
| Sin `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `apple-mobile-web-app-title` en `index.html` | Bajo-medio — con solo `apple-touch-icon`, iOS Safari puede seguir abriendo en modo standalone al añadir a inicio, pero estas tres etiquetas son la forma [documentada por Apple](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html) de garantizar barra de estado consistente con la marca y el nombre corto correcto en el icono | S |

**No se recomienda** perseguir el 100% del checklist de Lighthouse PWA
a ciegas — varias de sus reglas (p. ej. "responde con 200 incluso
offline") solo tienen sentido para apps de contenido, no para una
herramienta que sin conexión a Supabase no puede hacer nada útil de
todas formas.

---

## 2. SEO — la app privada (`index.html`)

**Diagnóstico: correcto, sin cambios necesarios.** Confirmado en
producción:

```
$ curl https://oceanflow-web.vercel.app/robots.txt
User-agent: *
Disallow: /
```

Además de `robots.txt`, la propia `index.html` refuerza con `<meta
name="robots" content="noindex, nofollow">` — doble barrera
intencionada y ya documentada en el propio HTML. Las etiquetas Open
Graph, Twitter Card y el JSON-LD (`schema.org/SoftwareApplication`) que
sí tiene la app **no contradicen el `noindex`**: siguen siendo útiles
para que un enlace compartido a mano (WhatsApp, iMessage, Slack) se vea
bien como tarjeta de vista previa — esos rastreadores de vista previa
social normalmente ignoran `robots.txt`/`noindex` y sí leen Open Graph
al resolver una URL compartida explícitamente. `og:image`/`og:url` ya
usan URLs absolutas (bug real corregido en su momento, documentado en
el propio HTML) y la imagen ya mide el tamaño estándar 1200×630.

No hay ninguna acción pendiente aquí.

---

## 3. SEO — la landing pública (`public/meetOceanFlow/`)

Esta es la superficie donde el SEO real tiene sentido, y hoy está sin
trabajar. Nada de lo siguiente es urgente **mientras la landing no esté
desplegada en producción** — pero conviene resolverlo como parte del
propio lanzamiento, no después.

### 3.1. Descubribilidad (bloqueante para cualquier otra mejora)

- **`robots.txt` bloquea todo el dominio, landing incluida.** El día
  que `/meetOceanFlow/` se publique en `main` con intención de que se
  encuentre por buscadores, hace falta una excepción explícita:
  ```
  User-agent: *
  Disallow: /
  Allow: /meetOceanFlow/
  Sitemap: https://<dominio-real>/sitemap.xml
  ```
  (sintaxis estándar de [Google Search Central](https://developers.google.com/search/docs/crawling-indexing/robots/create-robots-txt) — `Allow` como excepción dentro de un `Disallow` general es un patrón soportado por todos los rastreadores relevantes).
- **No existe `sitemap.xml`.** Con una sola URL pública (la landing no
  tiene sub-rutas), un sitemap es menos crítico que en un sitio grande,
  pero sigue siendo la forma estándar de comunicar a Google Search
  Console la existencia e idioma de la página y acelerar el primer
  rastreo.
- **Ningún fichero del propio proyecto enlaza a la landing.** No es un
  "error" técnico, pero conviene decidirlo a propósito: si el objetivo
  es solo distribución vía redes (Instagram, como ya se está trabajando
  en `docs/community-manager/`), la ausencia de enlace interno es
  irrelevante. Si en algún momento se quiere que también aporte a SEO
  del dominio, un enlace real desde algún sitio público del propio
  dominio ayudaría (autoridad interna).

### 3.2. Metadatos ausentes en `public/meetOceanFlow/index.html`

A diferencia de la app, la landing no tiene **ninguna** de estas
etiquetas hoy:

- `<meta name="robots">` propio (hereda el bloqueo global de momento).
- Open Graph (`og:title`, `og:description`, `og:image`, `og:url`,
  `og:locale`) y Twitter Card — sin esto, compartir el enlace de la
  landing en redes sociales no muestra una tarjeta enriquecida, solo el
  título y la URL en crudo. Esto es exactamente lo contrario de lo que
  se quiere para una página pensada para compartirse.
- Datos estructurados (`schema.org`) — para una landing de producto, el
  tipo más adecuado no es `SoftwareApplication` (ese ya lo usa la app),
  sino `WebSite`/`Organization` o, si en el futuro hay pricing público,
  `Product`. No urgente, pero de coste casi nulo una vez se añadan los
  demás metadatos.
- `<link rel="canonical">` — con una sola URL real esto es menos
  crítico, pero es buena práctica estándar y evita problemas si la
  página llega a servirse alguna vez desde más de un dominio (recuerda
  que hoy ya hay varios alias de Vercel apuntando al mismo proyecto).

### 3.3. Rendimiento — impacto directo en Core Web Vitals

Medido directamente en el fichero: **`index.html` pesa 222 KB, de los
que ~196 KB (88%) son dos capturas de pantalla incrustadas como
`data:image/png;base64` dentro del propio HTML**, en vez de servirse
como ficheros de imagen aparte.

Esto tiene tres consecuencias reales, no solo teóricas:
- El navegador no puede empezar a pintar la página hasta haber
  descargado el HTML completo (las imágenes normales sí permiten pintar
  el resto de la página mientras cargan aparte) — impacto directo en
  **LCP** (Largest Contentful Paint), una de las tres métricas de
  [Core Web Vitals de Google](https://web.dev/articles/vitals) y señal
  de posicionamiento confirmada desde 2021.
- Esas imágenes no se pueden cachear por separado entre visitas (cada
  carga del HTML las vuelve a transferir en base64, ~33% más pesadas
  que el binario original por la propia codificación base64).
- No se pueden aplicar atributos de imagen nativos del navegador
  (`loading="lazy"`, `width`/`height` para evitar *layout shift*,
  formatos modernos como WebP/AVIF).

**Recomendación**: mover esas dos capturas a `public/meetOceanFlow/` como
ficheros `.webp` (o `.png` si se prefiere mantener el formato actual) y
referenciarlas con `<img src="...">` normal. Esfuerzo bajo, impacto
directo y medible en velocidad de carga.

### 3.4. Estructura semántica — correcta, sin cambios

Verificado directamente en el HTML:
- Un único `<h1>`, jerarquía de encabezados limpia (4× `<h2>`, 6×
  `<h3>`, sin saltos de nivel).
- Todas las imágenes (`<img>`) tienen `alt` — ninguna sin describir.
- `viewport` correcto para mobile-first.

### 3.5. Multi-idioma: limitación estructural a tener en cuenta

La landing ofrece 10 idiomas, pero todos viven bajo **una única URL**
con cambio de idioma 100% en cliente (`<select>` + JS, sin rutas por
idioma). Esto tiene una implicación real para SEO que conviene conocer
antes de invertir más en esta página, no como un "fallo" sino como una
limitación de la arquitectura elegida:

- No es posible usar `hreflang` (el mecanismo estándar de Google para
  decir "esta es la versión en francés de esta página" — ver
  [documentación de Google Search Central sobre hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)),
  porque `hreflang` enlaza URLs distintas por idioma, y aquí solo hay
  una.
- Un buscador solo puede indexar el idioma que ve al cargar la página
  sin ejecutar el `<select>` (previsiblemente español, el `lang="es"`
  fijo del `<html>` y el contenido que carga por defecto) — un usuario
  buscando en francés no va a recibir nunca la landing en el snippet de
  resultados en francés, aunque el contenido exista.
- El atributo `lang` del `<html>` está fijado a `"es"` y no se actualiza
  al cambiar el selector — detalle menor de accesibilidad (lectores de
  pantalla anunciarían mal el idioma tras el cambio) más que de SEO.

Esto **no es una petición implícita de reescribir la landing con rutas
por idioma** (`/en/`, `/fr/`...) — sería un cambio de arquitectura
notable para una página de un único producto, y choca con el principio
de MVP/proporcionalidad del proyecto salvo que haya una señal real de
tráfico internacional que lo justifique. Se documenta aquí para que la
decisión de mantener una sola URL sea consciente, no accidental.

---

## 4. Tendencias 2026 relevantes (con fuente)

Solo las que aplican de verdad a un producto de este tamaño, con fuente
verificable en cada caso, según la regla del proyecto de no recomendar
sin respaldo:

- **Core Web Vitals con INP** (sustituyó a FID como métrica oficial en
  marzo de 2024) — [web.dev/inp](https://web.dev/articles/inp). Aplica
  directamente al punto 3.3 de este informe.
- **Indexación mobile-first** (Google indexa la versión móvil de una
  página desde 2023 para prácticamente todo el índice) —
  [Google Search Central](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-first-indexing).
  Ya cubierto: la landing y la app son mobile-first por diseño desde el
  principio del proyecto.
- **Datos estructurados para motores de respuesta con IA** (Google SGE,
  Perplexity, ChatGPT Search) — el propio comentario ya existente en
  `index.html` de la app lo documenta correctamente citando esta
  tendencia; se recomienda extenderlo a la landing (punto 3.2).
- **`llms.txt`** (convención emergente, propuesta en 2024, para indicar
  a agentes de IA qué contenido de un sitio es relevante) — mencionado
  aquí solo para que conste que se ha evaluado: es todavía una
  convención no estandarizada (no adoptada por Google/Bing/OpenAI de
  forma oficial) y de beneficio no demostrado. **No se recomienda
  invertir en ella todavía** — encaja con la regla del proyecto de no
  construir para escenarios hipotéticos.

---

## 5. Recomendaciones priorizadas

| # | Acción | Impacto | Esfuerzo | Cuándo tiene sentido |
|---|---|---|---|---|
| 1 | Excepción en `robots.txt` + `sitemap.xml` para `/meetOceanFlow/` | Alto (sin esto, nada más de SEO de la landing sirve de nada) | S | Al decidir publicar la landing en `main`/producción |
| 2 | Sacar las 2 capturas base64 a ficheros `.webp` con `<img>` normal | Alto (Core Web Vitals, tiempo de carga) | S | Independiente, se puede hacer ya |
| 3 | Open Graph + Twitter Card + `canonical` en la landing | Medio-alto (vista previa al compartir en redes, que es su canal principal hoy) | S | Independiente, se puede hacer ya |
| 4 | Datos estructurados (`schema.org`) en la landing | Medio | S | Junto al punto 3 |
| 5 | `apple-mobile-web-app-*` meta tags en `index.html` de la app | Bajo-medio | S | Cuando se toque de nuevo la instalación PWA |
| 6 | Icono maskable en el manifest | Bajo | S | Igual que el 5 |
| 7 | Service Worker (`vite-plugin-pwa`) para shell offline + prompt nativo Android | Medio-bajo (la app depende de red para casi todo) | M | Solo si aparece una señal real de demanda (usuarios pidiendo instalación más "nativa" en Android, o quejas de que no aparece el prompt) |

Ítems 1-4 son los que de verdad mueven la aguja y tienen coste bajo;
recomiendo empezar por ahí si decides seguir adelante. Los ítems 5-7
son correctos pero de impacto menor o condicionado a una señal de
demanda que hoy no existe — coherente con no construir complejidad por
adelantado.

Ninguno de estos cambios se ha implementado. Dime cuáles quieres que
aborde y en qué orden, y seguimos el mismo mecanismo de siempre (rama
propia, resumen antes de commit, tests y build en verde antes de push).
