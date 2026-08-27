# Ocean Pulse — Backlog

> Priorizado por valor/esfuerzo, no por orden de descubrimiento. Cada
> entrada nace de una decisión razonada (ver histórico de sesiones de
> "Consejo de Producto"), no de una idea suelta. Los cambios de
> arquitectura/modelo de datos que estén "Aprobado" aquí deben tener un
> ADR en `docs/ADR/` antes de implementarse.

Alcance del producto (instructor freelance, no B2B) ya decidido — ver
`docs/PRODUCT.md` y `docs/ADR/0001-alcance-instructor-freelance-no-b2b.md`.
Este backlog no vuelve a discutir esa decisión, solo construye dentro de
ella.

## Cómo leer esta tabla

- **Impacto**: cuánto nota el instructor freelance el cambio.
- **Esfuerzo**: XS/S/M/L/XL.
- **Estado**: Aprobado / Pendiente / Rechazado / Requiere experimento.

## Resuelto

| Ítem | Tipo | Fecha | Notas |
|---|---|---|---|
| **Incidente:** cuenta de instructor nueva no podía crear tarifas ni registrar actividad | Bugfix (workaround temporal) | 27/08 | `payment_types` vacío en cuentas nuevas bloqueaba el guardado. Fix: fallback de `defaultPaymentType` a `"Per Person"` literal en `RatesTab.jsx`/`WorkLogTab.jsx`/`ComisionesTab.jsx`, marcado como workaround temporal en el código. Test de regresión: `RatesTab.test.jsx`. Se elimina como parte del ítem de abajo, no antes. Ver `docs/ADR/0003-eliminar-payment-type.md`. |

## Ahora

| Ítem | Tipo | Impacto | Esfuerzo | Riesgo | Estado | Notas |
|---|---|---|---|---|---|---|
| "¿Cuánto me deben?" unificado — extender la vista de Pagos para incluir Comisiones y Pagos de compañeros, no solo Registro | Producto / UX | Alto | S | Bajo | Aprobado | Reutiliza el patrón de unión por `_source` que ya existe en `HomeTab`/`SummaryTab`. Sin cambios de esquema. Sigue siendo el mejor candidato a próximo entregable tras el hotfix del 27/08. |
| Actualizar `CLAUDE.md`: la auth/roles/aprovisionamiento ya existen, no son "pendientes" | Documentación | Bajo | XS | Bajo | Aprobado | Housekeeping puro. Ver `docs/PRODUCT.md` para la redacción ya corregida del alcance. |

## Siguiente bloque

| Ítem | Tipo | Impacto | Esfuerzo | Riesgo | Estado | Notas |
|---|---|---|---|---|---|---|
| Eliminar `payment_type` (frontend + esquema) — retira también el workaround temporal de arriba | Producto / Arquitectura / Datos | Alto (resuelve la causa raíz del incidente del 27/08, no solo el síntoma) | M | Bajo (plan incremental en 5 pasos) | Aprobado el concepto, plan pendiente de ejecutar | Ver `docs/ADR/0003-eliminar-payment-type.md` para el plan completo de migración. |
| Sembrar `payment_statuses` (Pending/Paid) en el alta de cualquier cuenta nueva + mover "Estados de pago" de admin-only a autoservicio del instructor | Producto / UX | Medio-Alto | S | Bajo | Pendiente | Gap real que ADR-0003 no cubre — `payment_statuses` sí es dominio real (ver mensaje del 27/08) y hoy tampoco se siembra ni es autoservicio. |

## Próximo bloque

| Ítem | Tipo | Impacto | Esfuerzo | Riesgo | Estado | Notas |
|---|---|---|---|---|---|---|
| Extraer un componente de "hoja de creación de movimiento" compartido entre Registro y Comisiones | Código (deuda técnica) | Medio (velocidad futura, no visible al usuario) | M | Bajo | Pendiente | Resuelve la duplicación real (~285 líneas casi idénticas) sin tocar el modelo de datos. Requiere decidir la forma del componente compartido antes de tocarlo. |
| Dar acceso rápido a Pagos desde Home (tarjeta/atajo), sin mover pantallas de sitio | UX / Navegación | Medio-Alto | S | Bajo | Pendiente | Alternativa más barata a "sacar Tarifas/Pagos de Configuración". Ver decisión D4 de la revisión del 27/08. |

## Hipótesis pendientes de validar (no construir todavía)

| Hipótesis | Qué la validaría | Estado |
|---|---|---|
| Unificar `worklog` + `comisiones` + `colleague_payments` en un único concepto de "Movimiento" con tipo | Que la duplicación de código y el gap de "Pagos" sigan doliendo después de los dos entregables de arriba, o que aparezca una cuarta fuente de ingreso/gasto que haga evidente el patrón | Requiere experimento — ver decisión D2 |
| Unificar `rates` / `commission_rates` en una tabla con un tipo | Igual que la anterior — de menor riesgo, se revisita junto con Movimiento, no antes | Requiere experimento — ver decisión D2 |
| Separar navegación instructor / administración de plataforma | Que Ocean Pulse pase a operar cuentas de terceros de forma habitual (más allá del propio operador dando de alta instructores) — ver condiciones de revisión en `ADR-0001` | No hacer por ahora — ver `docs/ADR/0001-alcance-instructor-freelance-no-b2b.md` |
| Vender/ceder cuentas a otros instructores como negocio | Decisión de negocio, no de producto — distinta de lo que decide `ADR-0001` (esa decide cómo se *diseña* el producto hoy, no si algún día se *vende* a terceros) | Abierta, sin dueño de decisión todavía |

## Rechazado

| Ítem | Por qué |
|---|---|
| Fusionar la pantalla Home dentro de Resumen (recomendación del documento "Ocean Pulse 2.0") | Revisado y corregido — Home cubre un modo de uso distinto (vistazo rápido diario) al de Resumen (análisis deliberado). Fusionarlas mete los selectores de granularidad/fuente/escuela de Resumen en la pantalla de mayor frecuencia de uso. Ver decisión D3. La consolidación correcta es reutilizar componentes, no eliminar la pantalla. |
