# ADR 0003 — Eliminar `payment_type`: modelo de tarifa único (tarifa × personas)

**Fecha:** 2026-08-27
**Estado:** Aprobado (concepto) · Implementación diferida a un bloque futuro

## Contexto

`rates`/`commission_rates` tienen una columna `payment_type` y un catálogo
`payment_types` que en teoría permiten distintos modelos de tarifa
("Per Person" vs. fija). En la práctica, ningún formulario de creación o
edición de la app expone nunca un selector para este campo — se asigna
siempre en código a `"Per Person"`. Auditoría completa del repo (código,
tests, scripts, `schema.sql`) confirma que no hay ningún flujo real que use
un valor distinto.

Este concepto también fue la causa de un incidente en producción: una
cuenta de instructor recién creada nace con `payment_types` vacío (no lo
siembra `clone_setup_dataset`) y esa tabla está gateada como sección
admin-only en Configuración — así que el instructor no podía crear ninguna
tarifa, ni por tanto registrar actividad, sin intervención manual de un
administrador.

## Decisión

Se elimina `payment_type` como concepto de la aplicación. El único cálculo
de importe válido pasa a ser:

```
importe = tarifa × número de personas
```

Sin excepciones ni configuración alternativa — no se introduce ningún otro
enum ni tabla en su lugar. No se modela (todavía) tarifa fija por grupo,
por salida o por barco porque no es una necesidad real del negocio hoy; si
llega a serlo, es una decisión de producto nueva, no una reactivación de
`payment_type`.

**Alcance de la eliminación** (auditado, ver conversación de origen):
tabla `payment_types`, columna `rates.payment_type`, columna
`commission_rates.payment_type`, columnas equivalentes en
`setup_dataset_rates`/`setup_dataset_commission_rates` (incluida su
redefinición de clave primaria), las dos referencias dentro de
`clone_setup_dataset`, y toda la lógica de frontend en `RatesTab.jsx`,
`WorkLogTab.jsx`, `ComisionesTab.jsx`, `ConfigTab.jsx` y `App.jsx`.

## Estado de la implementación

**Diferida a un bloque futuro, a propósito.** El 27/08 se detectó el
bloqueo de producción descrito arriba y se decidió resolverlo con el
mínimo cambio posible en vez de adelantar esta migración bajo presión de
incidente. Se aplicó un **workaround temporal**: el último fallback de
`defaultPaymentType` en `RatesTab.jsx`, `WorkLogTab.jsx` y
`ComisionesTab.jsx` pasa de `""` a `"Per Person"` literal, para que una
cuenta con `payment_types` vacío pueda seguir creando tarifas. No toca
modelo de datos, no añade tablas, es reversible con un `git revert`.
Marcado explícitamente en el código con un comentario `WORKAROUND
TEMPORAL` que referencia este documento.

Ese workaround **debe eliminarse como parte de esta migración**, no antes
ni por separado — es deuda técnica intencionalmente contraída, no una
solución alternativa a esta decisión.

## Plan de migración (propuesto, pendiente de ejecutar)

1. **Frontend — cálculo.** Simplificar `rateCalc.js` a `rate.rate *
   (Number(people) || 0)`, sin condicional. Sin riesgo: mismo resultado
   que hoy para toda tarifa existente.
2. **Frontend — UI.** Quitar `payment_types`/`paymentTypes` de
   `ConfigTab.jsx`, `RatesTab.jsx`, `WorkLogTab.jsx`, `ComisionesTab.jsx`,
   `App.jsx` y sus tests. Esto retira también el workaround temporal de
   esta ADR.
3. **BD — preparatoria.** Redefinir las PK de `setup_dataset_rates`/
   `setup_dataset_commission_rates` sin `payment_type`; actualizar
   `clone_setup_dataset`.
4. **BD — verificación.** `select distinct payment_type from
   rates`/`commission_rates` en la base real antes de borrar nada, para
   confirmar que no hay valores fuera de `"Per Person"`.
5. **BD — destructiva, solo tras el paso 4 en verde.** Drop de las
   columnas `payment_type` y de la tabla `payment_types`.

Cada paso se despliega y valida por separado — nada de este plan se hace
en un único cambio, siguiendo la regla de migraciones incrementales del
proyecto.

## Consecuencias

- El bootstrap de una cuenta nueva deja de depender de `payment_types` en
  absoluto — se resuelve mejor que dándole autoservicio (alternativa
  descartada por innecesaria: si el concepto desaparece, no hace falta que
  nadie pueda gestionarlo).
- Queda un gap real y distinto que esta ADR no resuelve: `payment_statuses`
  sigue sin sembrarse en el alta y sigue siendo admin-only, a pesar de ser
  un catálogo de dominio real que sí debe evolucionar (Partial/Cancelled/
  Refunded). Se registra como ítem aparte en `docs/BACKLOG.md`.
- Referenciar este documento en cualquier PR que toque `payment_type`.
