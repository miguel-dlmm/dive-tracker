# ADR 0009 — Rediseño de Resumen: vistazo rápido + profundidad bajo demanda

**Fecha:** 2026-08-29
**Estado:** Aprobado e implementado (sesión nocturna autónoma, ver
`docs/SESSION-2026-08-28-rediseno-global.md`).

## Contexto

Resumen mostraba, siempre montado a la vez, sin ningún nivel de
profundidad: selector de granularidad, navegación de periodo, filtro de
fuente, un calendario mensual global, una tarjeta de total, dos tablas de
desglose (por escuela, por actividad), un desglose adicional de
Comisiones, y luego una **segunda sección casi idéntica** —con su propio
total, su propio desglose y un **segundo calendario**— para una única
escuela elegida en un desplegable aparte. Todo visible de golpe, sin
distinguir qué responde "¿cómo voy?" en 5 segundos de qué es para quien
quiere explotar los números a fondo.

## Problema evaluado

¿Qué necesita de verdad un instructor de esta pantalla? Dos perfiles
reales y distintos:
- **Vistazo rápido**: entra, entiende cómo va, sale.
- **Obsesionado con números**: quiere comparar, explorar, profundizar por
  escuela/curso, revisar el calendario, los ajustes con compañeros.

Servir al segundo perfil mostrándolo todo de golpe penaliza al primero
(la pantalla es pesada y no hay una respuesta clara arriba); servir solo
al primero perdería la potencia de análisis que la app ya tenía.

## Decisión

### 1. Tarjeta principal con comparación — la respuesta de 5 segundos

Arriba de todo, una única tarjeta protagonista con el total del periodo
elegido **y** cuánto ha cambiado respecto al periodo anterior equivalente
(mismo mes/trimestre/semestre/año, uno antes) — `HeroTotal`. La
comparación se omite (no se fuerza un número sin sentido) cuando: el
periodo es "Personalizado" (sin "anterior" natural), o cuando el total
actual o el anterior mezclan más de una moneda (un delta agregado entre
monedas distintas sería engañoso, no solo impreciso).

### 2. Todo lo demás, plegado por defecto — `ExpandableCard`

Un único componente de tarjeta plegable (icono + título + chevron),
reutilizado por las 5 secciones de profundidad: Por escuela (abierta por
defecto — es la pregunta más frecuente después del total), Por curso,
Calendario, Comisiones, Pagos de compañeros. Nada de esto ocupa espacio
ni hace trabajo de render hasta que se pide. Anima con `listItemVariants`
de `src/motion.js` — la convención de motion ya existente, no una
animación propia de esta pantalla.

### 3. "Por escuela" y "Por escuela dedicada" se fusionan en una sola exploración progresiva

La segunda sección de página completa (total + desglose + calendario
para UNA escuela, elegida en un `<Select>` aparte) desaparece. En su
lugar, `RankedList` (misma lista para Por escuela/Por curso/los
desgloses de Comisiones) permite **tocar una fila de escuela para
expandir su desglose por curso en el sitio**, sin cambiar de sección ni
de selector — la misma lógica de "explorar bajo demanda" que las
tarjetas plegables, aplicada dentro de una lista. Esto elimina una
duplicación real de UI (dos calendarios, dos totales, dos desgloses casi
idénticos) sin perder ninguna cifra: cualquier escuela sigue siendo
alcanzable, ahora comparándolas primero en la misma lista en vez de
eligiendo una a ciegas en un desplegable antes de ver nada.

**Alternativas descartadas:**
- *Selector de escuela + segunda sección, solo con mejor estilo* — es
  la opción "embellecer lo que ya había", explícitamente descartada por
  el encargo de esta sesión.
- *Widgets configurables ahora* — fuera de alcance explícito; en su
  lugar, cada `ExpandableCard` es ya, en sí misma, la unidad natural en
  la que un futuro sistema de widgets podría apoyarse (mostrar/ocultar
  cada una, o cambiar su orden) sin rediseñar la estructura de datos ni
  de componentes.

### 4. Un único calendario, no dos

El calendario "por escuela" (idéntico al global salvo por el filtro) se
elimina — quien quiera ver la actividad de una escuela concreta día a
día puede leerlo igual en el calendario global (coloreado por la escuela
dominante de cada día) o en el desglose expandido de esa escuela. Mantener
dos calendarios casi iguales era la duplicación que
`docs/BACKLOG.md` ya señalaba ("Reutilizar componente entre Home y
Resumen") — esta parte concreta de la duplicación (dentro del propio
Resumen) queda resuelta con este cambio; la reutilización con Home sigue
pendiente y fuera de alcance de este ADR.

### 5. Pagos de compañeros deja de filtrarse por escuela

Antes solo se veían los pagos de compañeros de la escuela elegida en el
selector. Al desaparecer ese selector de página, el desglose pasa a
cubrir todo el periodo, agrupado por persona — un pago a un compañero es
sobre una persona, no algo que tenga más sentido mirar escuela a escuela.
Es una simplificación de comportamiento, no solo de presentación:
documentada aquí porque cambia qué datos se ven, no solo cómo.

### 6. Nomenclatura: "Por actividad" → "Por curso"

Consistente con el rename de fase 1 ya aplicado en Configuración/Tarifas/
Home (ver `docs/ADR/0008-rediseno-configuracion.md`) — Resumen era la
única pantalla que seguía diciendo "actividad". Solo texto, sin tocar
`activityColor`/`activities` internos.

## Consecuencias

- Un usuario que solo quiere "¿cómo voy este mes?" ve la respuesta sin
  desplazarse ni tomar ninguna decisión.
- Un usuario que quiere profundizar tiene exactamente la misma
  información que antes (nada se ha quitado, salvo el filtro de
  compañeros por escuela — punto 5 — y el segundo calendario redundante
  — punto 4), alcanzable con como mucho un toque adicional.
- La estructura en tarjetas plegables es el punto de apoyo natural para
  el futuro sistema de widgets de Resumen (mostrar/ocultar/reordenar
  cada `ExpandableCard`) sin rediseño estructural cuando llegue ese
  momento.
- `docs/BACKLOG.md` actualizado: cerrada la fase 1 del rename
  Actividad→Curso (ya no quedan pantallas con "actividad" visible al
  usuario) y matizada la nota de "Reutilizar componente entre Home y
  Resumen" (la duplicación interna de Resumen ya no existe; la
  compartida con Home sigue abierta).
