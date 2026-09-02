# ADR 0003 — Eliminar `payment_type`: modelo de tarifa único (tarifa × personas)

**Fecha:** 2026-08-27
**Estado:** Pasos 1-2 (frontend) ejecutados 2026-09-02 · Pasos 3-5 (BD) diferidos a un bloque futuro

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

## Addendum (2026-09-02) — pasos 1-2 ejecutados, sin tocar BD

Ejecutados los pasos 1 y 2 del plan de arriba, procesando este ítem del
backlog en rama aislada `backlog/eliminar-payment-type-frontend` (sin
integrar contra ninguna otra rama, siguiendo la instrucción vigente de
trabajo por backlog: cero migraciones de BD mientras se procesa backlog).

- `rateCalc.js`: `computeRateTotal` ya no distingue por `payment_type` —
  siempre `rate.rate * (Number(people) || 0)`. Si el objeto de tarifa aún
  trae `payment_type` (la columna sigue en BD), se ignora por completo.
- Quitado `payment_types`/`paymentTypes` de `App.jsx`, `RatesTab.jsx`,
  `WorkLogTab.jsx`, `ComisionesTab.jsx` y `ConfigTab.jsx` (incluida la
  sección "Tipos de pago" del menú de Configuración y su `CrudTable`).
  Ningún formulario expone ya, ni ha expuesto nunca en producción, un
  selector para este campo.
- Las tres pantallas que dan de alta una tarifa al vuelo
  (`RatesTab.jsx`, `WorkLogTab.jsx`, `ComisionesTab.jsx`,
  `MovementSheet.jsx`) escriben ahora el literal fijo `payment_type:
  "Per Person"` directamente, sin depender del catálogo `payment_types`
  de la cuenta — elimina de raíz el workaround temporal de `"Estado de
  la implementación"` de arriba (ya no hace falta: no hay ningún
  fallback que mantener porque no hay ninguna elección que hacer) y,
  de paso, el bug real descrito en el addendum de 2026-08-30 (una
  cuenta con catálogo propio ya no puede "elegir sin querer" un
  `payment_type` distinto de "Per Person").
- Al editar una tarifa existente, el payload de `updateRow` ya no
  incluye `payment_type` en absoluto (se confía en que
  `JSON.stringify` descarta claves `undefined`), así que una edición
  nunca toca esa columna.
- Quitados los tests que distinguían Fixed/Per-Person en
  `rateCalc.test.js`, y actualizados los tests de `RatesTab.jsx`,
  `ConfigTab.jsx` y `MiTrabajoTab.jsx` a las nuevas firmas de props.
  Quitadas las claves i18n huérfanas `sections.tiposPago.*` y
  `crud.{nuevoTipoPago,editarTipoPago}` (`es`/`en`).
- **No tocado a propósito, por ser BD:** la tabla `payment_types`, la
  columna `payment_type` en `rates`/`commission_rates`/
  `setup_dataset_rates`/`setup_dataset_commission_rates`, ni
  `clone_setup_dataset`. Los pasos 3-5 de este documento siguen
  pendientes, sin cambios respecto al plan original.

## Addendum (2026-08-30) — confirmado en datos reales, no solo en teoría

Investigado un caso concreto reportado por el usuario: una tarifa creada
en línea para "Reef Divers – Adventure Dive" a 150, usada en un
movimiento de 3 personas, mostraba un total de 150 (no 450). Consultada
la base real (solo lectura, sin modificar nada): la cuenta de esa tarifa
tiene un catálogo `payment_types` propio con **"Instructor"** (marcado
`is_default`) y **"Comisión"** — sin ninguna fila llamada "Per Person".
El fallback ya documentado en esta ADR (`defaultPaymentType`: usa "Per
Person" si existe, si no el `is_default` de la cuenta, si no el primero)
asignó la tarifa nueva a `payment_type: "Instructor"` — y
`computeRateTotal` (`rateCalc.js`) solo multiplica por personas cuando
`payment_type === "Per Person"` exactamente; cualquier otro valor cae al
importe fijo. Resultado: **150 fijo, no 150 × 3**.

**Diagnóstico — no es un bug de aritmética, es la ambigüedad que esta ADR
ya identificaba.** `computeRateTotal` hace exactamente lo que su código
dice que hace. El problema real es más profundo: `payment_type` es, por
diseño de la app, un catálogo editable por el usuario (`payment_types`,
igual que escuelas o cursos — ver CLAUDE.md, convención 1, "nada
hardcodeado que sea configuración del negocio"), pero la lógica de
cálculo compara contra el **literal `"Per Person"`** como si fuera una
constante interna, no un dato de catálogo. Cualquier cuenta cuyo
catálogo no incluya exactamente esa fila (por no haberla creado, por
haberla renombrado, o — como aquí — por tener un catálogo propio con
otros nombres) obtiene tarifas fijas de forma silenciosa, sin ningún
aviso ni error, indistinguible en la UI de una tarifa fija elegida a
propósito.

**No se ha aplicado ningún parche puntual esta noche.** Un arreglo
aislado (p. ej., forzar `defaultPaymentType` a ignorar el catálogo de la
cuenta y usar siempre el literal "Per Person") sería exactamente el tipo
de solución a medias que esta ADR ya advierte no introducir por
separado — el plan de esta ADR (`importe = tarifa × número de personas`,
sin excepciones, sin `payment_type`) ya resuelve esto de raíz para
cualquier cuenta, sea cual sea su catálogo. Este hallazgo es evidencia
real (no hipotética) de que el paso 4 del plan de migración de abajo
("verificar que no hay valores fuera de 'Per Person' antes de nada
destructivo") encontrará al menos un caso real que requiere decidir su
tratamiento (¿tarifa fija de verdad, o "Per Person" mal etiquetado?)
antes del `DROP`.

**Efecto colateral aparte, ya explicado por el modelo de datos:** la
tarifa de comisión para esa misma escuela+curso no existe
(`commission_rates` vacío para "Reef Divers") — es la causa, ya conocida
y correcta, de que Comisión no tenga total ahí; no relacionado con este
bug.

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
