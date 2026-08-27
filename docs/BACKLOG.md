# Ocean Pulse — Backlog

> Prioridad actual del producto, no un registro histórico de lo ya hecho
> (eso vive en `CHANGELOG.md` y en el historial de git). Si una fila deja
> de ser cierta, se corrige o se borra — no se acumula.

Alcance del producto (instructor freelance, no B2B) ya decidido — ver
`docs/PRODUCT.md` y `docs/ADR/0001-alcance-instructor-freelance-no-b2b.md`.
Este backlog no vuelve a discutir esa decisión, solo construye dentro de
ella. Cualquier ítem de arquitectura o modelo de datos necesita su propio
ADR en `docs/ADR/` antes de implementarse, esté en "Ahora" o en "Después".

## Cómo leer esta tabla

- **Valor**: cuánto lo nota el instructor freelance, no cuánto cuesta construirlo.
- **Esfuerzo**: XS/S/M/L/XL.
- **Prioridad**: Ahora / Después / No hacer.

## Ahora

| Ítem | Problema que resuelve | Valor | Esfuerzo | Riesgo | Dependencia |
|---|---|---|---|---|---|
| Sembrar `payment_statuses` (Pending/Paid) en el alta + autoservicio del instructor | Cuenta nueva nace sin estados de pago y hoy no puede gestionarlos ella misma | Medio-Alto | S | Bajo | Ninguna |
| Corregir `CLAUDE.md` — la sección "qué no existe todavía" sigue describiendo auth como pendiente | Documentación desalineada con el código real | Bajo | XS | Nulo | Ninguna |

## Después

| Ítem | Problema que resuelve | Valor | Esfuerzo | Riesgo | Dependencia |
|---|---|---|---|---|---|
| Eliminar `payment_type` del todo (frontend + esquema) | Causa raíz del incidente de altas nuevas; retira también el workaround temporal ya desplegado | Indirecto hoy, alto en fiabilidad | M | Bajo — plan incremental, ver `docs/ADR/0003-eliminar-payment-type.md` | Mejor después de sembrar `payment_statuses` — misma zona de catálogos |
| Pulido visual completo de Home + Pagos (jerarquía, densidad, estilo) | Las dos pantallas tienen ya la estructura final (ver `ADR-0004`) sin el pulido estético — inspirarse en la exploración ya hecha en `src/lab/` | Medio (percepción de calidad, no funcional) | M | Bajo | Ninguna — ya desplegadas ambas, lista para tomarse cuando toque. Decisión estética, no funcional — sin ADR propio salvo que surjan alternativas reales |
| Reutilizar componente entre Home y Resumen (calendario/agregación mensual) | La misma lógica de calendario mensual está reimplementada dos veces | Bajo (invisible) | S | Bajo | Ninguna — hacerlo cuando se toque cualquiera de las dos pantallas por otro motivo |
| Extraer componente de hoja de creación compartido (Registro/Comisiones) | ~285 líneas casi duplicadas — ya costó tiempo real en el hotfix de `payment_type` (hubo que tocar 3 archivos idénticos) | Bajo directo, medio en velocidad futura | M | Bajo | Después de resolver la hipótesis de "Movimiento" — si se fusiona el modelo, este componente se rehace igualmente |
| Decidir mitigación de `email_for_nickname` (RPC pública sin autenticar) | Superficie de enumeración de email — sin rate limit | Reducción de riesgo, no feature | S | Bajo hoy, crece si cambia el alcance de usuarios | Es una decisión de apetito de riesgo, no solo técnica |
| Cambiar nomenclatura global de "Actividades" a "Cursos" | "Actividad" es un término genérico que no coincide con cómo piensa el instructor — Open Water, Advanced, Rescue y las especialidades son "cursos", no "actividades" en su cabeza; desajuste entre modelo mental y lenguaje de la app | Medio (claridad de dominio, no cambia ningún cálculo) | XS solo textos de UI visibles; L si además se renombran variables/componentes/tabla | Bajo si es solo texto; Medio si se llega a renombrar la tabla `activities` o sus columnas (`rates.activity`, `worklog.activity`, etc. son texto libre por nombre, no FK — renombrar el concepto no rompe datos, pero sí requiere migración de esquema real) | Ninguna técnica; depende de decidir el alcance primero (ver nota) |

**Nota de alcance para "Actividades → Cursos"** (no ejecutar todavía, solo estrategia): en 3 fases independientes, cada una desplegable por separado — (1) **solo texto de UI** (labels, placeholders, mensajes) en las pantallas que lo muestran, coste XS, riesgo nulo, no toca código interno ni datos; (2) **renombrar variables/props/componentes internos** (`activities`, `activityColor`, `ACTIVITIES`, etc.) en todos los archivos que los usan, coste L por ser transversal a casi toda la app, riesgo bajo pero mucha superficie de cambio; (3) **renombrar la tabla `activities` y sus referencias en el esquema**, la única fase que es de verdad una migración — necesita su propio ADR y plan incremental antes de tocarse, siguiendo la regla del proyecto. No hacer la fase 3 sin las fases 1-2 ya asentadas.

## No hacer (por ahora)

| Ítem | Por qué | Qué lo reactivaría |
|---|---|---|
| Unificar `worklog`/`comisiones`/`colleague_payments` en un "Movimiento" único | Hipótesis sin evidencia suficiente; `colleague_payments` no encaja limpio (importe con signo, sin lookup de tarifa) — riesgo de abstracción equivocada | Que "Pagos unificado" y el componente compartido no resuelvan el dolor real, o aparezca una 4ª fuente de ingreso/gasto |
| Unificar `rates`/`commission_rates` en una tabla con tipo | Mismo criterio que el anterior; menor riesgo si llega a activarse | Se revisita junto con "Movimiento", no antes |
| Separar navegación instructor / administración de plataforma | Ya resuelto por los gates de rol existentes; contradice el alcance decidido mientras el único admin seas tú | Ver condiciones en `docs/ADR/0001-alcance-instructor-freelance-no-b2b.md` |
| Vender/ceder cuentas a otros instructores como negocio | Pregunta de negocio, no de producto — no es un entregable técnico | Necesita un dueño de decisión de negocio, no ingeniería |
