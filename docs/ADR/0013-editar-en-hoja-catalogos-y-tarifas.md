# ADR 0013 — Editar en la misma hoja de creación (Tarifas y catálogos de Configuración)

**Fecha:** 2026-08-29
**Estado:** Aprobado e implementado (sesión larga autónoma, ver
`docs/SESSION-2026-08-28-rediseno-global.md`).

## Contexto

Encargo explícito: máxima coherencia de Tarifas con Mi trabajo, y
libertad de rediseño en el resto de Configuración, con el criterio
transversal de que aprender una parte de la app facilite usar las
demás.

`RatesTab.jsx` ya compartía con Mi trabajo el menú "⋯" (`RowMenu`,
ver ADR-0012) para Editar/Eliminar, pero **editar seguía abriendo un
formulario en línea**, dentro de la propia fila (con `EditActions`
Guardar/Cancelar) — un patrón distinto al de Mi trabajo, donde "Editar"
abre `MovementSheet`, la misma hoja inferior que "Añadir movimiento",
precargada. `CrudTable` (el componente genérico que usan Escuelas,
Cursos, Tipos de pago, Estados de pago y Monedas) tenía el mismo
patrón de edición en línea, además de iconos sueltos (lápiz + papelera)
en vez de `RowMenu`.

## Decisión

**Crear y editar comparten siempre la misma hoja inferior**, en las
5 pantallas de `CrudTable` y en `RatesTab`. Un único `form` en estado,
un `editingRow`/`editingEntry` (`null` = alta) que decide si el envío
llama a `insertRow` o `updateRow`, y el título de la hoja ("Nueva
escuela" vs. "Editar escuela") como única señal visible de en qué modo
está. El botón "Guardar" intercambia su icono (`Plus` en alta, `Check`
en edición) — mismo criterio que ya usaba `MovementSheet`.

Todas las filas usan ahora `RowMenu` (Editar/Eliminar) en vez de
iconos sueltos — incluido `CrudTable`, la última pieza de Configuración
que no lo usaba.

**Caso especial — Estados de pago, fila predeterminada:** no puede
eliminarse (`is_default` decide qué cuenta como "pendiente" en toda la
app, ver `isPendingStatus`). Antes esto se resolvía con un icono de
papelera deshabilitado, sustituyendo por completo el botón de eliminar.
Con `RowMenu` unificado en todas partes, la alternativa de "omitir el
menú entero para esa fila" habría sido un paso atrás en coherencia. Se
añade en su lugar `deleteDisabled`/`deleteDisabledReason` a `RowMenu`
(shared.jsx): un "Eliminar" visible pero desactivado, con el motivo en
el `title`, en vez de un segundo componente o de ocultar la opción del
todo — sigue siendo obvio que la acción existe, solo que no está
disponible ahí.

**Qué NO se tocó:** el toggle de color (input `type="color"`, con
actualización inmediata) y la estrella de "favorito" siguen siendo
ediciones en el sitio, sin pasar por la hoja — son toques de un único
campo, no una edición completa de la fila, y forzarlos a la hoja habría
añadido pasos sin ganar nada. Ningún dato de negocio ni regla de
cálculo cambió — es puramente una reorganización de la UI de
edición.

## Alternativas descartadas

- **Mantener la edición en línea, solo añadir `RowMenu` encima** —
  resolvía la coherencia del menú pero no la de "formularios" que pedía
  explícitamente el encargo (Tarifas/catálogos seguirían teniendo dos
  mecanismos de edición distintos según se entrara por "Editar" en línea
  o por la hoja de alta).
- **Un segundo componente de menú para la fila protegida** (sin
  "Eliminar" en absoluto) — más complejidad para un caso que ya se
  resuelve con una única fila de código en `RowMenu`, y menos coherente
  (una fila con un menú de forma distinta al resto).

## Consecuencias

- Un único mecanismo de edición en toda la app: crear y editar es
  siempre "la misma hoja, con o sin datos precargados" — Mi trabajo,
  Tarifas y los 5 catálogos de Configuración comparten ahora el mismo
  modelo mental.
- `RowMenu` gana una capacidad genérica (`deleteDisabled`) reutilizable
  por cualquier pantalla futura que necesite proteger una fila concreta
  de borrado, sin inventar un patrón nuevo cuando aparezca ese caso.
- Menos código: desaparecen `editingId`/`editForm` (RatesTab) y
  `editingPk`/`editForm`/`renderBoolField` (`CrudTable`, este último ya
  no se usaba desde ningún catálogo existente).
