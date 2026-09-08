# Ocean Flow — Design System v1 (borrador, rama `feature/rediseno-v2`)

> **Estado: borrador pendiente de aprobación humana.** No es la sustitución
> oficial de `docs/ESTILO.md` todavía — lo será cuando se apruebe y se
> propague a las pantallas (ver `docs/REDISENO-V2-PROGRESS.md`). Mientras
> tanto, `docs/ESTILO.md` sigue describiendo lo que hay en producción/`develop`.
>
> Objetivo de este documento: ser la única fuente de verdad de decisiones
> visuales — todo lo que no esté aquí como token o patrón reutilizable no
> debería "inventarse" en una pantalla nueva (encargo explícito: "que nada
> se cree con identidad propia"). Por petición explícita del usuario, este
> documento profundiza especialmente en **controles, iconografía y
> tipografía** — son las piezas que se repiten en cada pantalla y las que
> más rápido generan inconsistencia si no quedan cerradas aquí.

## 1. Marca

### 1.1 Logo

Marca de agua/ala formando una "F" dentro de un círculo abierto — dos
trazos curvos que evocan a la vez una ola y el movimiento de una aleta.
Entregado originalmente en 4 combinaciones de color (los dos JPG,
`WhatsApp Image 2026-09-06 at 16.57.00.jpeg` y su variante con
wordmark, en la raíz del repo — valores muestreados a nivel de píxel,
no estimados a ojo):

**Vectorial real, entregado 2026-09-07 (Fase 7):** dos archivos SVG
(`Logos Ocean Flow-01.svg`/`-02.svg`, hojas de presentación con la marca
sobre los 4 fondos + wordmark en tipografía custom) sustituyen a los
JPG como fuente del símbolo — `public/brand/logo-mark-navy.svg` y
`logo-mark-white.svg` (usados por `<img>` en toda la app desde este
commit) se extrajeron de ahí, path a path, sin redibujar.

**Corrección de `BRAND_NAVY`/`BRAND_SKY` aplicada** (mismo día, tras
confirmación explícita del usuario): el navy/sky exactos del vectorial
(`#063256`/`#8AACCE`) diferían ligeramente de los valores anteriores
(`#00335A`/`#81ADD0`, muestreados por píxel de los JPG más abajo — la
única fuente disponible en su momento). `src/colors.js` y todo lo que
duplicaba el valor literal (`index.html`, `manifest.json`,
`server/email/templates/emailLayout.js`, los dos usos de Tailwind
arbitrario en `shared.jsx`, y el propio SVG del símbolo) se corrigieron
a los valores exactos del vectorial — contraste WCAG re-verificado
en §3.3, sin cambios de resultado (diferencia de centésimas en cada
ratio).

| Fondo | Color del símbolo | Uso |
|---|---|---|
| Sky blue `#8AACCE` | Blanco `#FFFFFF` | Superficies de marca claras (splash, onboarding, tarjetas destacadas) |
| Negro cálido `#191919` | Sky blue `#8AACCE` | Superficies oscuras — confirma que la marca contempla tema oscuro (ver §8) |
| Blanco `#FFFFFF` | Navy `#063256` | Uso por defecto: cabecera, favicon, cualquier fondo claro |
| Navy `#063256` | Blanco `#FFFFFF` | Superficies de marca oscuras (footer de emails, splash alternativo) |

**Wordmark:** "ocean flow" en minúsculas, trazo redondeado propio del
logotipo (no es una fuente del sistema — es rotulación custom). **No se
usa como fuente de UI** (ver §2): el wordmark vive solo en el lockup del
logo (cabecera, splash, emails, favicon/OG), nunca como tipografía de
párrafo o de botón.

**Reglas de uso:**
- Área de seguridad mínima alrededor del símbolo: el diámetro del propio
  círculo (ni texto ni otro elemento más cerca que eso).
- Tamaño mínimo legible: 24px de alto para el símbolo solo, 32px de alto
  para el lockup símbolo+wordmark.
- Nunca recolorear el símbolo fuera de las 4 combinaciones de la tabla —
  son las únicas con contraste verificado (ver §3.3).

### 1.2 Tono de voz

Ya establecido en `CLAUDE.md` (Reglas permanentes — Release V1, regla 2)
y reafirmado aquí porque el rediseño visual debe transmitir lo mismo que
el texto: cercano, humano, agradable, joven y fresco sin dejar de ser
profesional. El contexto de uso real es manos mojadas, sol directo, y
poco tiempo entre inmersiones (regla 3) — toda decisión visual de este
documento se mide contra eso, no solo contra "queda bonito".

## 2. Tipografía

**Se mantiene Inter como única tipografía**, ya cargada vía Google Fonts
en `src/index.css`. Decisión reafirmada, no reabierta sin motivo: el
propio código ya documentaba el porqué con un precedente real de
industria (Stripe, Linear, Mercury — productos financieros/profesionales
que resuelven jerarquía visual con peso y tamaño, no mezclando fuentes).
Mezclar una segunda tipografía "amigable" para ecualizar con el
logotipo se evaluó y se descarta — ver §9.

### 2.1 Escala y jerarquía

| Token | Tamaño/interlineado | Peso | Tracking | Uso |
|---|---|---|---|---|
| `display` | 28px / 34px | 800 | −0.01em | Cifra protagonista (HeroTotal, KpiTile grande) — reservado solo para números, nunca para un titular de texto |
| `title` | 20px / 26px | 700 | −0.01em | Título de pantalla/sección |
| `subtitle` | 15px / 20px | 600 | 0 | Cabecera de tarjeta, nombre de curso/escuela |
| `body` | 14px / 20px | 500 | 0 | Texto de lista, formularios — peso por defecto |
| `body-muted` | 14px / 20px | 400 | 0 | Texto secundario/de apoyo (nunca para el dato principal de una fila) |
| `caption` | 12px / 16px | 500 | 0 | Metadatos, badges, ayuda de campo |
| `label` | 11px / 14px | 600 | +0.04em, mayúsculas | Etiquetas de sección, cabeceras de tabla — el tracking positivo compensa la pérdida de legibilidad de las mayúsculas a tamaño pequeño |

**Regla de peso:** el 800 (`display`) se reserva exclusivamente para
cifras — si dos pantallas empiezan a usarlo para texto normal, es la
señal de que la jerarquía se está perdiendo. 700 es el peso más fuerte
permitido para texto no numérico.

### 2.2 Números y dinero

- Cifras de dinero: `tabular-nums` (ya activo globalmente en
  `index.css`) + símbolo de moneda más apagado que la cifra — sin
  cambios, ya es correcto (componente `Money`, convención #10 de
  `CLAUDE.md`).
- Cualquier lugar donde dos números se comparan en vertical (tabla de
  Resumen, lista de tarifas) fuerza `tabular-nums` aunque no sea dinero
  — mismo motivo: los dígitos deben alinearse en columna, no solo el
  importe final.
- `display` (la cifra protagonista) usa `tabular-nums` + tracking
  negativo (−0.01em): a 28px/800 sin ajustar el tracking, Inter deja
  demasiado aire entre dígitos anchos como "0" y "8".

### 2.3 Medida y comportamiento del texto

- Bloques de texto largo (artículos de Ayuda, descripciones): medida
  máxima ~65-75 caracteres por línea — el rango clásico de legibilidad
  tipográfica, y el mismo motivo por el que un párrafo de Ayuda no debe
  ocupar todo el ancho de una pantalla ancha sin un límite de `max-width`.
- Etiquetas de una sola línea (nombre de escuela/curso en una fila,
  chip de filtro): siempre `truncate` con elipsis, nunca salto de línea
  inesperado que descuadre un grid de columnas — refuerza la convención
  7 de `CLAUDE.md` ("nunca scroll lateral: `grid` con columnas fijas").
- Títulos (`title`/`subtitle`): `text-wrap: balance` cuando el título
  puede ocupar más de una línea (nombre largo de escuela en cabecera de
  tarjeta) — evita el "título con una sola palabra huérfana" en la
  segunda línea.

## 3. Color

### 3.1 Primitivos (de la marca — valores exactos del vectorial real,
ver §1.1; hasta el 2026-09-07 venían de muestreo de píxel sobre JPG)

| Token | Hex | Rol |
|---|---|---|
| `brand-navy` | `#063256` | Primario — texto de marca, iconos, CTA principal |
| `brand-sky` | `#8AACCE` | Secundario — superficies, fondos decorativos, estados "info" suaves |
| `brand-ink` | `#191919` | Casi-negro — texto de máximo contraste, base de tema oscuro futuro |
| `brand-ocean` | `#146A96` | Azul intermedio entre navy y sky (2026-09-07) — acento para material de campaña/redes que necesite un azul propio distinto del navy de texto |
| `brand-foam` | `#EAF2F8` | Azul casi blanco (2026-09-07) — fondo de sección muy suave en material de campaña, nunca texto |
| `brand-white` | `#FFFFFF` | Base — fondos claros, texto sobre navy |

### 3.2 Escala tonal (método Material 3, simplificado — sin motor HCT)

Material Design 3 genera paletas tonales completas con el espacio de
color perceptual HCT; implementar ese motor de color para una app de un
solo usuario es complejidad sin necesidad real (principio de producto
#1: no abstraer para escenarios que no existen). Se adopta el mismo
*principio* — una escala graduada de tonos por color de marca, en vez de
colores sueltos inventados por pantalla — con el método probado y más
simple de Tailwind/Radix (escalas 50→900 por mezcla lineal con blanco/negro),
**verificada contraste a contraste, no solo generada y dada por buena**:

```
navy-50   #E6EDF2   fondo de tarjeta info sobre blanco
navy-100  #D2DAE1   borde/división sutil
navy-300  #6690AD   3.41:1 sobre blanco → solo UI/iconos grandes, nunca texto body
navy-500  #063256   ← brand-navy — 13.14:1 sobre blanco, texto principal
navy-700  #002440   15.83:1 sobre blanco — texto de máximo peso visual
navy-900  #001526   base de superficie en tema oscuro futuro

sky-50    #F1F6FA   fondo de chip/pill "info" muy suave
sky-100   #E3ECF5   fondo de fila seleccionada en desplegables
sky-300   #ABC6DE   9.93:1 sobre ink #191919 — texto secundario en tema oscuro
sky-500   #8AACCE   ← brand-sky — 7.43:1 sobre ink, 2.37:1 sobre blanco (ver §3.3)
sky-700   #5C82A3   4.06:1 sobre blanco → válido solo como UI/borde, no texto body

muted-600 #3D5C73   7.05:1 sobre blanco — texto secundario en tema claro (sustituye al gris neutro "sin marca" que usaría cualquier app)
```

**Corrección 2026-09-07 (Fase 7, 7.5):** `navy-500`/`sky-500` (= las
propias `brand-navy`/`brand-sky`) se corrigieron a los valores exactos
del vectorial real del logo — ver nota en §1.1. `navy-100` también se
recalculó (es la única tonalidad derivada que se usa de verdad en
código, `shared.jsx` — ver §3.1 arriba) con la misma proporción de
mezcla que antes, sobre la nueva base. El resto de tonalidades
derivadas (`navy-50/300/700/900`, `sky-50/100/300/700`, `muted-600`) NO
se regeneran en esta corrección — ninguna se usa hoy en código real
(son especificación para cuando se implemente el resto de esta escala),
y la diferencia que arrastrarían de la base anterior es imperceptible;
regenerarlas todas a mano sin necesidad real de código sería trabajo
sin beneficio medible (principio de producto #1, `docs/PRODUCT.md`).

`muted-600` es la pieza que evita el error típico de "texto secundario
= gris Tailwind por defecto": es un navy desaturado, no un gris neutro —
así el texto de apoyo sigue "hablando" en el idioma de color de la marca
incluso cuando no es el dato protagonista.

### 3.3 Contraste verificado (WCAG 2.2) — qué combinaciones son legales

Calculado con la fórmula real de luminancia relativa de WCAG, no a ojo:

| Par | Ratio | Resultado |
|---|---|---|
| `brand-navy` sobre `brand-white` | 13.14:1 | ✅ Texto normal (AA y AAA) |
| `brand-ink` sobre `brand-white` | 17.58:1 | ✅ Texto normal (AA y AAA) |
| `muted-600` sobre `brand-white` | 7.05:1 | ✅ Texto normal (AA y AAA) |
| `brand-sky` sobre `brand-navy` | 5.55:1 | ✅ Texto normal AA |
| `brand-ink` sobre `brand-sky` | 7.43:1 | ✅ Texto normal AA |
| `sky-300` sobre `brand-ink` | 9.93:1 | ✅ Texto normal AA (tema oscuro) |
| **`brand-white` sobre `brand-sky`** | **2.37:1** | ❌ No pasa ni el mínimo de elementos grandes (3:1) |
| `brand-ocean` sobre `brand-white` | 5.95:1 | ✅ Texto normal AA |
| `brand-gold` sobre `brand-white` | 5.47:1 | ✅ Texto normal AA |
| `brand-slate` sobre `brand-white` | 5.00:1 | ✅ Texto normal AA |
| `brand-slate-fill` sobre `brand-white` | 8.51:1 | ✅ Texto normal (AA y AAA) |

**Regla de uso derivada:** `brand-sky` nunca lleva texto/iconos blancos
encima salvo el logotipo (WCAG exime explícitamente a logotipos del
requisito de contraste — no es una excepción inventada aquí). Como
fondo de tarjeta/superficie, `brand-sky` siempre lleva texto en
`brand-navy` o `brand-ink`. Esto es además coherente con el contexto de
uso real de Ocean Flow (sol directo, regla 3 de `CLAUDE.md`): un tono
pastel con texto blanco encima es ilegible al sol mucho antes de fallar
WCAG en un laboratorio.

### 3.4 Colores semánticos (estado, no marca)

Sin cambios de rol respecto a hoy — solo se re-derivan de la nueva base
para mantener coherencia tonal, y se listan aquí como tokens oficiales
en vez de vivir sueltos en `App.jsx`:

| Token | Hex | Uso |
|---|---|---|
| `success` | `#15803D` (GREEN actual, se mantiene — ya pasa contraste) | Cobrado, pagado, confirmación |
| `warning` | `#B45309` (SUN actual, se mantiene) | Pendiente, atención |
| `danger` | `#C2542F` (CORAL actual, se mantiene) | Eliminar, error |

**Regla de separación marca/estado:** `brand-navy` es el color de "esto
es interactivo" (botón, enlace, control activo); los tres semánticos de
arriba son el color de "este es el estado de algo" (pagado, pendiente,
error). Nunca se usan como sinónimos — un botón de acción nunca es verde
solo porque "parece positivo", y un estado "pagado" nunca se pinta en
navy solo porque es el azul de marca. Es la misma distinción que ya
hacía `StatusPill`/`StatusSwitch` frente a un botón normal; aquí se
formaliza como regla de color, no solo de componente.

Los colores de entidad de negocio (escuela, actividad…) **siguen sin
tocar** — convención #2 de `CLAUDE.md`, se leen de su propia tabla, esto
no cambia con el rediseño.

### 3.5 Colores de marca por tipo de movimiento (Curso/Comisión/Ajuste)

Añadido 2026-09-07, pedido explícito: "define colores de marca para
cursos, comisiones y ajustes por si hacemos campañas particulares haya
colores identificativos y de marca". Fuente única de verdad:
`MOVEMENT_TYPE_META` (`shared.jsx`).

| Token | Hex | Tipo | Nota |
|---|---|---|---|
| `teal` (ya existente) | `#0F766E` | Curso | Sin cambios — ya era un color de marca dedicado |
| `brand-gold` | `#8C6118` | Comisión | Antes usaba `warning`/SUN (§3.4) — un semántico de ESTADO, no de tipo. Rompía la propia regla de separación marca/estado de arriba; corregido con un color dedicado |
| `brand-slate` | `#5B7286` | Ajuste (badge/icono fijo) | Solo para la identidad visual del TIPO (badge, pestaña de selección). El **importe** de un Ajuste sigue coloreándose por signo (`danger`/`success`), eso no cambia — ver `rowAccent`/`formAccentColor` |
| `brand-slate-fill` | `#3A4F60` | Ajuste (relleno sólido) | Escalón más oscuro de `brand-slate`, para superficies con texto blanco encima (botón activo, tarjeta de total) donde `brand-slate` no da contraste suficiente |

**Por qué no reutilizar los semánticos de estado para esto:** un tipo de
movimiento (qué clase de dinero es) y un estado (en qué situación está
ese dinero — pendiente, pagado...) son preguntas distintas sobre el
mismo apunte; pintarlos con el mismo color mezclaría las dos preguntas
en una — exactamente lo que la regla de separación marca/estado de
arriba ya prohíbe, aplicada ahora también a "tipo" además de a "marca".

## 4. Espaciado, radio y elevación

- **Espaciado:** escala de 4px (`4/8/12/16/24/32`), ya es lo que usa
  Tailwind por defecto en el código actual — se formaliza, no se cambia.
- **Radio — tres niveles, no dos:**
  - `radius-control` (10px): botones, inputs, chips rectangulares —
    nuevo nombre explícito para lo que hoy ya usan los inputs, pero sin
    un token con nombre propio.
  - `radius-card` (10-14px, igual que hoy): `rounded-lg` contenedores de
    lista/sección, `rounded-xl` reservado a la tarjeta de "cifra
    protagonista" — decisión ya tomada en la auditoría de unificación
    visual de `docs/ESTILO.md` (2026-09-04), se mantiene sin reabrir.
  - `radius-sheet` (20px, nuevo): esquinas superiores de cualquier hoja
    inferior — mayor que el radio de tarjeta a propósito: una hoja
    ocupa toda la anchura de la pantalla, un radio igual al de una
    tarjeta pequeña se ve "tímido" a esa escala; es el mismo criterio
    que usan la mayoría de bottom sheets nativos de iOS/Android.
- **Elevación:** `shadow-*` solo en overlays reales (hojas, diálogos,
  toasts, menús flotantes, FAB) — nunca en tarjetas de flujo normal.
  Regla ya vigente, se mantiene.
- **Glass (nuevo):** superficie semitransparente + blur, **solo** en
  cabecera fija y FAB — nunca en el fondo de contenido ni en tarjetas.
  Justificación: (a) coincide con el hallazgo ya hecho en la rama
  experimental `feature/design-lab-preview` (2026-08-27); (b) es la
  dirección de toda la industria en 2025-2026 (Liquid Glass de Apple,
  WWDC25); (c) no compromete la legibilidad al sol porque nunca cubre el
  contenido con el que se lee/decide (importes, fechas). En v1, el
  `backdrop-filter: blur()` real queda pendiente de medir coste en gama
  baja de Android — mientras tanto, un color sólido semitransparente sin
  blur consigue el mismo lenguaje visual sin ese riesgo (ver §9).

## 5. Motion

**Sin cambios de vocabulario** — `src/motion.js` ya está fundamentado en
los tokens de movimiento de Material Design 3 (`emphasized decelerate`/
`accelerate`/`standard`), que es exactamente el estándar consolidado que
esta investigación confirma como vigente. El rediseño reutiliza
`listItemVariants`/`panelVariants`/`sheetVariants`/`toastVariants` tal
cual — cualquier animación nueva que necesite una pantalla rediseñada
usa este mismo vocabulario, nunca una curva/duración ad-hoc.

**Micro-interacciones de control (nuevo, no cubierto antes por
`motion.js` porque son de escala/opacidad de un elemento fijo, no de
entrada/salida):**

| Interacción | Cambio | Duración |
|---|---|---|
| Botón/FAB al pulsar | `scale(0.96)` | `DURATION.xs` (150ms), easing `standard` |
| Fila al pulsar (tap feedback) | fondo pasa a `sky-50` | `DURATION.xs` |
| Switch al cambiar | el thumb se desliza + el track cambia de color | `DURATION.sm` (200ms), easing `standard` |
| Icono activo de navegación | el indicador (ver §7.1) hace fade+scale desde el icono anterior | `DURATION.sm` |

Todas respetan `prefers-reduced-motion` igual que el resto de
`motion.js` (colapsan a ~0 sin cambiar el resultado final).

## 6. Controles

Inventario completo de estados por control — hoy `docs/ESTILO.md` dice
**qué** componente reusar, pero no fija sus estados visuales de forma
exhaustiva; eso es lo que se cierra aquí, control a control, para que
ninguna pantalla nueva "invente" un hover/press/disabled propio.

### 6.1 Botones

| Variante | Reposo | Hover/press | Disabled | Foco (teclado) |
|---|---|---|---|---|
| **Primario** (Guardar, CTA principal) | `navy-500` fondo, blanco texto, `radius-control` | `navy-700` fondo | `navy-500` @ 40% opacidad, `cursor: not-allowed` | anillo `sky-300` de 2px, offset 2px |
| **Secundario/ghost** (Cancelar) | transparente, borde `navy-100`, texto `navy-700` | fondo `sky-50` | texto `muted-600` @ 50%, sin borde | mismo anillo que primario |
| **Destructivo** (confirmar eliminar) | `danger` fondo, blanco texto | `danger` oscurecido 15% | igual patrón que primario | mismo anillo, color `danger` en vez de `sky-300` |
| **Texto/link** (acciones terciarias) | texto `navy-500`, sin fondo | subrayado | texto `muted-600` | mismo anillo |

El anillo de foco es siempre visible y siempre un color distinto al de
hover/press — necesario para que un usuario de teclado/lector de
pantalla (o alguien reactivando el foco tras un `ErrorBoundary`) pueda
distinguir "esto tiene el foco" de "esto se está pulsando ahora mismo".

### 6.2 FAB

Sin cambios de posición/tamaño (`fixed bottom-24 right-4`, 52×52,
convención #3 de `CLAUDE.md`) — lo que se formaliza es su estado:
`navy-500` reposo, `navy-700` press + `scale(0.96)` (§5), sombra
`shadow-lg` (única tarjeta "de flujo" — en realidad flotante, no de
flujo — con sombra por diseño, ya que es un overlay). Color de acento
de sección (`accentColor` de `nav_sections`) sigue anulando `navy-500`
cuando la pantalla tiene su propio color de sección — esto no cambia,
es dato de negocio, no de marca (convención #2).

### 6.3 Campos de formulario (`Field`, `Select`, `MultiSelect`,
`SearchSelect`, `DatePicker`, `MoneyInput`)

| Estado | Tratamiento |
|---|---|
| Reposo | borde 1px `navy-100`, fondo blanco, `radius-control`, 44px alto mínimo |
| Foco | borde 2px `navy-500` + halo `sky-100` de 3px (`box-shadow`, no cambia el layout) |
| Error | borde `danger`, texto de ayuda en `danger` debajo, icono de alerta 14px |
| Disabled | fondo `navy-50`, texto `muted-600`, borde `navy-100`, `cursor: not-allowed` |
| Panel desplegado (Select/MultiSelect/SearchSelect/DatePicker) | superficie blanca, `shadow-md` (overlay), `radius-card` |
| Opción seleccionada dentro del panel | fondo `sky-50`, texto `navy-700`, icono de check `navy-500` a la derecha |

El icono de ayuda ("?") de `Field` mantiene el área pulsable 44×44
superpuesta con `position: absolute` (bug real ya documentado y resuelto
en `docs/ESTILO.md`, 2026-09-02) — no se toca, sigue siendo la única
forma correcta de dar un objetivo táctil grande sin estirar la fila.

### 6.4 `StatusPill` / `StatusSwitch`

- **`StatusPill`**: `radius-full`, `caption` (12px/600), fondo al 10% de
  opacidad del color semántico + texto al 100% del mismo color (nunca
  fondo sólido saturado + texto blanco — mismo razonamiento de
  legibilidad al sol que en §3.3). Ejemplo: "Cobrado" → fondo
  `success` @10%, texto `success` sólido.
- **`StatusSwitch`**: apagado → track `navy-100`, thumb blanco con
  sombra sutil; encendido → track `success` (no `navy-500` — un switch
  de estado usa el color semántico de "activado/positivo", no el color
  de marca, por la misma regla de separación marca/estado de §3.4).

### 6.5 `RowMenu`, `EditActions`, `DeleteButton`/`ConfirmDialog`

- **`RowMenu`** ("⋯"): icono `navy-500` en reposo, `navy-700` en
  press/abierto; panel de opciones = mismas reglas que un desplegable
  (§6.3): superficie blanca, `shadow-md`, filas de 44px, hover/press
  `sky-50`.
- **`EditActions`**: "Guardar" = botón primario; "Cancelar" = botón
  ghost. Nunca al revés (un "Cancelar" primario compite visualmente con
  la acción que de verdad se quiere que el usuario tome).
- **`DeleteButton` + `ConfirmDialog`**: el diálogo usa `radius-card`
  (14px) + `shadow-lg`; botón de confirmación = variante destructiva de
  §6.1; botón de cancelar = ghost. El propio `DeleteButton` (icono en la
  fila) usa `danger` solo al pulsar/mantener pulsado — en reposo es
  neutro (`muted-600`) para no pintar de rojo toda lista por defecto.

### 6.6 Toast

Fondo tintado suave del color semántico (no sólido saturado — mismo
criterio de legibilidad que `StatusPill`), barra de acento de 3px a la
izquierda en el color sólido, icono + texto en el tono "700" del mismo
semántico. Entrada/salida: `toastVariants` de `motion.js`, sin cambios.

### 6.7 `Sheet` (hoja inferior)

`radius-sheet` (20px) en las esquinas superiores, barra de arrastre
(`4px alto, 36px ancho, radius-full, navy-100`) centrada en la parte
superior como affordance visual de "esto se puede deslizar para
cerrar" — hoy existe el gesto pero no siempre una señal visual explícita
de que existe; se añade aquí. Backdrop: `brand-ink` al 45% de opacidad
(no un negro genérico — el fondo del overlay también "habla" en el
color de marca).

### 6.8 Selector en carrusel horizontal (nuevo, implementado 2026-09-06)

Patrón para elegir un valor de un catálogo cerrado cuando ese catálogo
puede crecer: una sola fila con `scroll-snap-x`/`snap-mandatory` +
flechas prev/siguiente a los lados, en vez de un grid que crece en
filas verticales según el tamaño del catálogo. Mantiene siempre la
misma altura — importante en el contexto de uso real de Ocean Flow
(pantallas cortas, poco tiempo entre inmersiones, CLAUDE.md regla 3).
Primer uso real: selector de icono de avatar (`ProfileTab.jsx`,
`IconCarousel`, 14 opciones) — antes un `grid grid-cols-3` que con más
de 6 iconos habría crecido a 5 filas. Botones prev/siguiente 44×44,
icono 16px, deshabilitados visualmente (no ocultos) cuando no hay más
que desplazar en esa dirección. Extraer a `shared.jsx` como componente
compartido en cuanto aparezca un segundo caso real (convención de
"extraer solo cuando exista necesidad real", CLAUDE.md sección 3) — hoy
solo tiene un uso, se mantiene local a propósito.

## 7. Iconografía

Se mantiene `lucide-react` (ya en uso, catálogo amplio, coherente con la
convención de "catálogos cerrados: el tamaño lo decide lo que existe de
verdad" ya documentada en `docs/ESTILO.md`) — **siempre estilo outline**,
nunca mezclar con una variante rellena (lucide-react es outline-only por
defecto; se deja explícito para que ninguna librería de iconos futura
introduzca un segundo lenguaje visual).

### 7.1 Tabla de uso por contexto

| Contexto | Tamaño | Grosor de trazo | Color |
|---|---|---|---|
| Navegación inferior, inactivo | 22-24px | 1.8 | `muted-600` |
| Navegación inferior, activo | 22-24px | 2.3 | `navy-500`, con indicador (ver abajo) |
| Acción de fila (editar/eliminar/RowMenu) | 20px | 1.8 reposo / 2.2 press | `navy-500` / `navy-700` en press |
| Dentro de un input (moneda, calendario, buscar) | 18px | 1.8 | `muted-600` |
| Junto a un `StatusPill` (check, reloj, alerta) | 14px | 2.0 | el mismo tono "700" del semántico del pill |
| Decorativo (cabecera de sección, estado vacío) | 28-40px | 1.5 | `navy-100`/`sky-300` — nunca el color de acción, para no sugerir que es pulsable |

**Indicador de pestaña activa (nuevo):** un fondo tipo píldora
(`sky-50`, `radius-full`, contenida detrás del icono+etiqueta) que
aparece solo en la pestaña activa de la navegación inferior — patrón
documentado del componente *Navigation Bar* de Material Design 3 (el
"active indicator" que distingue el destino actual sin depender solo
del color del icono). Con solo 3 pestañas primarias (Home/Mi
trabajo/Resumen), este indicador es barato de construir y ayuda
especialmente con luz solar directa, donde un simple cambio de color de
icono es más difícil de percibir de un vistazo que un bloque de fondo.

### 7.2 Reglas generales

- Todo icono decorativo lleva `aria-hidden="true"` — ya es la práctica
  actual (convención 7 de `CLAUDE.md`), se mantiene.
- Ningún icono cambia de significado según el color de la pantalla que
  lo usa: "papelera = eliminar" y "check = confirmado/positivo" son
  fijos en toda la app, no reinterpretables por pantalla.
- Catálogo del icono de carga configurable: sin cambios (6 iconos,
  `ICON_OPTIONS` de `ConfigTab.jsx`) — decisión ya tomada, el tamaño lo
  sigue decidiendo lo que existe de verdad en `lucide-react`, no un
  número redondo.
- **Catálogo de avatares, ampliado 2026-09-06** (implementado, ver
  `docs/REDISENO-V2-PROGRESS.md`): de 6 a 14 iconos. El criterio de
  `docs/ESTILO.md` (2026-09-04, "solo animales marinos reales") se
  relaja a "iconografía real de mar/buceo" — se retiran las 4
  sustituciones forzadas que ya estaban documentadas como débiles
  (Shrimp de tiburón ballena, Snail de manta, Shell de pulpo,
  FishSymbol de tiburón: ninguna tenía relación visual real con el
  animal que decía representar). Cada icono pasa a representar lo que
  su nombre dice: 6 animales reales (Fish, FishSymbol, Turtle, Shrimp,
  Snail, Shell) + 8 de mar/buceo (Anchor, Compass, LifeBuoy, Sailboat,
  ShipWheel, Bubbles, TreePalm, Droplets) — 4 de estos últimos ya eran
  iconografía de marca aceptada en `ICON_OPTIONS` del icono de carga,
  mismo lenguaje visual, no uno nuevo.

## 8. Tema oscuro — preparado, no construido en v1

El logo incluye una variante explícita para fondo casi negro — señal de
marca real, no una ocurrencia de esta sesión. Construir un tema oscuro
completo para las ~9 pantallas de la app es un salto de alcance grande
para esta fase. **Decisión MVP:** todos los tokens de este documento se
definen como semánticos (`surface`, `ink`, `border`, `accent`...), nunca
como valores hardcodeados por pantalla — así, activar un tema oscuro más
adelante es redefinir los valores de un token una vez, no reescribir
cada pantalla. El propio `brand-ink` (`#191919`) ya es el candidato
natural a `surface` de un tema oscuro futuro, y `sky-300`/`sky-500` ya
están verificados como texto/icono válido sobre él (§3.3). Tema oscuro
real queda en `docs/BACKLOG.md` como ítem de roadmap, no en el alcance
de esta fase.

## 9. Ideas descartadas / roadmap (con coste estimado)

Toda idea de esta lista se evaluó y se descarta **para esta fase**, no
se descarta como mala idea en abstracto — ver el porqué de cada una:

| Idea | Por qué se descarta ahora | Esfuerzo si se retoma |
|---|---|---|
| Segunda tipografía "amigable" que ecualice con la rotulación del logo | La convención de tipografía única ya tiene precedente real de industria citado en el propio código (Stripe/Linear/Mercury); el carácter joven de la marca ya se transmite con color/radio/motion sin el coste de mantenimiento y rendimiento de una segunda web font | S, si en el futuro se decide reabrir explícitamente con un ADR |
| Color dinámico estilo Material You (paleta que reacciona al contenido/wallpaper) | Sobreingeniería clara: Ocean Flow tiene una marca ya definida y un solo usuario por cuenta, no necesita personalización algorítmica de color | No recomendado — no es solo "después", es "no" salvo cambio real de producto |
| `backdrop-filter: blur()` real en la cabecera/FAB | Coste de rendimiento no medido en gama baja de Android; v1 usa un color sólido semitransparente que da el mismo lenguaje visual sin el riesgo | S, una vez medido con datos reales de rendimiento |
| Tema oscuro completo | Ver §8 — alcance grande, no bloqueante si los tokens quedan bien preparados | L |
| Rediseñar la arquitectura de navegación (tabs/accesos) | Ya está alineada con la evidencia de zona de pulgar (3 primarios abajo, secundarios en cabecera) — no hay problema real que resolver | — (no se retoma salvo que aparezca un problema real de uso) |
| Set de iconos ilustrados/custom (en vez de `lucide-react`) | Coste de diseño e ilustración real (docenas de iconos) para un beneficio marginal frente al catálogo outline ya coherente — se revisita solo si el logo/marca acaba necesitando un lenguaje ilustrado propio más amplio | L |

## 10. Fuentes consultadas

Benchmarking hecho con fuentes contrastadas, per regla 5 de "Reglas
permanentes — Release V1" de `CLAUDE.md`:

- Gridwise (encuesta 2025 a 1.200 repartidores) y cobertura de la
  pantalla de earnings de DoorDash — vía [ShiftTracker, "DoorDash vs
  Uber Eats vs Grubhub: App Interface Compared (2026)"](https://shifttrackerapp.com/blog/doordash-vs-uber-eats-vs-grubhub-app-interface-compared-2026)
  y [Instawork, "Best Gig Work Apps and Gig Platforms in 2026"](https://www.instawork.com/blog/gig-economy-platforms).
- Apps de contabilidad para autónomos — [GetApp, comparativa Wave vs
  QuickBooks Solopreneur (2026)](https://www.getapp.com/finance-accounting-software/a/wave-apps/compare/quickbooks-self-employed/),
  [Bench Accounting, "7 Bookkeeping Software Picks for Freelancers in
  2026"](https://www.bench.co/blog/bookkeeping/7-bookkeeping-software-picks-for-freelancers-in-2026).
- Apps de buceo (para descartar como análogo funcional) —
  [Dresseldivers, ranking de apps de buceo](https://www.dresseldivers.com/blog/scuba-diving-apps/),
  ficha de [Diviac en la App Store](https://apps.apple.com/us/app/diviac-scuba-diving-logbook/id930068909).
- Material Design 3, color HCT y paletas tonales —
  [material-color-utilities (repositorio oficial de Google)](https://github.com/material-foundation/material-color-utilities/blob/main/concepts/dynamic_color_scheme.md),
  [Coloracci, "Material Design 3 Color System"](https://coloracci.ai/blog/material-design-3-color-system).
- Apple HIG y Liquid Glass — [Apple Developer, "Meet Liquid Glass"
  (WWDC25)](https://developer.apple.com/videos/play/wwdc2025/219/),
  [Apple Developer, Typography](https://developer.apple.com/design/human-interface-guidelines/typography).
- WCAG 2.2, contraste — [W3C, WCAG 2.2](https://www.w3.org/TR/WCAG22/),
  [Deque University, "1.4.11 Non-Text Contrast (AA)"](https://dequeuniversity.com/resources/wcag2.1/1.4.11-non-text-contrast).
- Legibilidad al sol / UI de exterior — [Riverdi, "Guide to perfecting
  the outdoor display"](https://riverdi.com/blog/guide-to-perfecting-the-outdoor-display).
- Zona de pulgar / navegación inferior — agregado de investigación de
  Nielsen Norman Group vía [Inkbot Design, "Mobile UX Best Practices:
  Designing For Thumbs In 2026"](https://inkbotdesign.com/mobile-ux/).
- Tipografías redondeadas/geométricas (evaluadas y descartadas, ver
  §9) — [Mojomox, "Soft Fonts: 12 Rounded Fonts for Friendly
  Brands"](https://fonts.mojomox.com/blogs/on-type/soft-fonts).

Contraste de color (§3.3) y valores hex de marca (§3.1) calculados
directamente en esta sesión a partir del muestreo de píxel real de los
JPG entregados y de la fórmula oficial de luminancia relativa de WCAG —
no estimados ni tomados de una fuente externa.
