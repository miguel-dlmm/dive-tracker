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
| Crear rama `test` como entorno de integración | Permite validar varias features juntas antes de que las vea el grupo de prueba actual, sin usar `develop` para ello | Bajo hoy (sin evidencia de que haga falta) | S | Bajo | Ninguno de los disparadores de `docs/ADR/0006-estrategia-de-ramas-y-entornos.md` se ha cumplido todavía — no crear por adelantado |
| Crear rama `main` + producción pública real (dominio propio, posible Supabase separado) | Separa a los usuarios de prueba actuales de un futuro lanzamiento público más amplio | Alto el día que exista lanzamiento público, nulo hoy | M | Medio — implica decidir aislamiento de datos | Condicionado a que exista de verdad un lanzamiento público — ver `docs/ADR/0006-estrategia-de-ramas-y-entornos.md` |
| **"Mi trabajo" — Fase 2:** posible migración física del modelo (fusionar `worklog`/`comisiones`/`colleague_payments`) | Solo si, en uso real, el adaptador (`buildActivityEntries`) demuestra no ser suficiente — no por limpieza arquitectónica | Bajo hoy (sin evidencia de que haga falta) | L | Medio — migración de datos real, necesita ADR propio | Evidencia de uso real de "Mi trabajo" (Fase 1, ya en producción — ver `docs/ADR/0005-mi-trabajo-unificacion-economica.md`) |
| Actualizar Resumen y el calendario de Home al lenguaje Curso/Comisión/Ajuste (hoy siguen en Ganado/Comisión/Compañeros) | "Compañeros" no ha desaparecido de verdad de la interfaz mientras estas 2 pantallas no se toquen — contradicción detectada en `ADR-0005` | Medio (coherencia de lenguaje) | S | Bajo | Ninguna |
| Eliminar `payment_type` del todo (frontend + esquema) | Causa raíz del incidente de altas nuevas; retira también el workaround temporal ya desplegado | Indirecto hoy, alto en fiabilidad | M | Bajo — plan incremental, ver `docs/ADR/0003-eliminar-payment-type.md` | Mejor después de sembrar `payment_statuses` — misma zona de catálogos |
| Pulido visual completo de Home + Pagos (jerarquía, densidad, estilo) | Las dos pantallas tienen ya su estructura final (Home por `ADR-0004`, Pagos rediseñada como liquidación por escuela en `ADR-0005`) sin el pulido estético — inspirarse en la exploración ya hecha en `src/lab/` | Medio (percepción de calidad, no funcional) | M | Bajo | Ninguna — ya desplegadas ambas, lista para tomarse cuando toque. Decisión estética, no funcional — sin ADR propio salvo que surjan alternativas reales |
| Reutilizar componente entre Home y Resumen (calendario/agregación mensual) | La misma lógica de calendario mensual está reimplementada dos veces | Bajo (invisible) | S | Bajo | Ninguna — hacerlo cuando se toque cualquiera de las dos pantallas por otro motivo |
| Decidir mitigación de `email_for_nickname` (RPC pública sin autenticar) | Superficie de enumeración de email — sin rate limit | Reducción de riesgo, no feature | S | Bajo hoy, crece si cambia el alcance de usuarios | Es una decisión de apetito de riesgo, no solo técnica |
| Cambiar nomenclatura global de "Actividades" a "Cursos" | "Actividad" es un término genérico que no coincide con cómo piensa el instructor — Open Water, Advanced, Rescue y las especialidades son "cursos", no "actividades" en su cabeza; desajuste entre modelo mental y lenguaje de la app | Medio (claridad de dominio, no cambia ningún cálculo) | XS solo textos de UI visibles; L si además se renombran variables/componentes/tabla | Bajo si es solo texto; Medio si se llega a renombrar la tabla `activities` o sus columnas (`rates.activity`, `worklog.activity`, etc. son texto libre por nombre, no FK — renombrar el concepto no rompe datos, pero sí requiere migración de esquema real) | Ninguna técnica; depende de decidir el alcance primero (ver nota) |

**Nota de alcance para "Actividades → Cursos"** (no ejecutar todavía, solo estrategia): en 3 fases independientes, cada una desplegable por separado — (1) **solo texto de UI** (labels, placeholders, mensajes) en las pantallas que lo muestran, coste XS, riesgo nulo, no toca código interno ni datos; (2) **renombrar variables/props/componentes internos** (`activities`, `activityColor`, `ACTIVITIES`, etc.) en todos los archivos que los usan, coste L por ser transversal a casi toda la app, riesgo bajo pero mucha superficie de cambio; (3) **renombrar la tabla `activities` y sus referencias en el esquema**, la única fase que es de verdad una migración — necesita su propio ADR y plan incremental antes de tocarse, siguiendo la regla del proyecto. No hacer la fase 3 sin las fases 1-2 ya asentadas.

## No hacer (por ahora)

| Ítem | Por qué | Qué lo reactivaría |
|---|---|---|
| Unificar `rates`/`commission_rates` en una tabla con tipo | Fuera del alcance de `ADR-0005` — "Mi trabajo" unifica la experiencia sobre `worklog`/`comisiones`/`colleague_payments` vía adaptador, sin tocar `rates`/`commission_rates`, que siguen siendo 2 tablas separadas detrás de `RatesTab` | Si la Fase 2 de `ADR-0005` (migración de modelo) llega a ejecutarse y en ese momento se justifica hacerlo junto |
| Migración física de `worklog`/`comisiones`/`colleague_payments` a una tabla única | Ya no es una hipótesis sin decidir — es la Fase 2 de `ADR-0005`, condicionada a que la Fase 1 (adaptador + UI, ya en producción) demuestre no ser suficiente | Ver condiciones en `docs/ADR/0005-mi-trabajo-unificacion-economica.md` |
| Separar navegación instructor / administración de plataforma | Ya resuelto por los gates de rol existentes; contradice el alcance decidido mientras el único admin seas tú | Ver condiciones en `docs/ADR/0001-alcance-instructor-freelance-no-b2b.md` |
| Vender/ceder cuentas a otros instructores como negocio | Pregunta de negocio, no de producto — no es un entregable técnico | Necesita un dueño de decisión de negocio, no ingeniería |
