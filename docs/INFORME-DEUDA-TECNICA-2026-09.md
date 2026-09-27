# Informe de deuda técnica — Ocean Flow (2026-09)

> Auditoría de solo lectura, sin cambios de código, encargada como parte
> del lote nocturno del 2026-09-26 (ver `docs/LOTE-2026-09-26-PROGRESS.md`).
> Basada en evidencia real del repositorio (grep, `wc`, `npm outdated`,
> `npm audit`, `depcheck`), no en suposiciones genéricas sobre "cómo
> suelen ser estos proyectos".

## Resumen ejecutivo

El estado general del proyecto es **bueno**: cero vulnerabilidades (`npm
audit`), dependencias casi al día (solo desfases menores), cero
`window.confirm`, cero `console.log` sueltos, cero comentarios
`TODO/FIXME/HACK` reales, convenciones propias (FAB+hoja, `EditActions`,
`DeleteButton`, `useSupabaseTable`) seguidas de forma consistente y las
excepciones (llamadas directas a `supabase.from()` fuera del hook) están
justificadas y en su mayoría documentadas inline. El riesgo real más
serio no es "deuda técnica" en el sentido clásico de código sucio, sino
un **límite de infraestructura ya alcanzado**: `api/` está exactamente en
las 12 Serverless Functions del plan Hobby de Vercel, sin margen.

## 1. Inventario y tamaño de ficheros

Ficheros JS/JSX más grandes de `src/` (excluyendo tests):

| Fichero | Líneas |
|---|---|
| `src/shared.jsx` | 2750 |
| `src/ConfigTab.jsx` | 2241 |
| `src/MiTrabajoTab.jsx` | 1113 |
| `src/ProfileTab.jsx` | 991 |
| `src/trainingRecords/TrainingRecordsTab.jsx` | 960 |
| `src/App.jsx` | 932 |
| `src/SummaryTab.jsx` | 826 |
| `src/HomeTab.jsx` | 632 |
| `src/MovementSheet.jsx` | 544 |
| `src/RatesTab.jsx` | 509 |

**Sobre el umbral "correcto" de tamaño**: no existe un estándar oficial de
React/JS que fije un número de líneas — ni la guía de estilo de Airbnb JS
ni la documentación de React se pronuncian sobre tamaño de fichero. La
heurística más citada en la comunidad (Kent C. Dodds, Bulletproof React,
y la propia regla de ESLint `max-lines`) es "divide por responsabilidad,
no por conteo de líneas": un fichero grande con una sola responsabilidad
clara (una pantalla completa con sus subcomponentes privados colocados al
lado) no es peor que 10 ficheros pequeños con una responsabilidad difusa
entre ellos. Este informe aplica ese criterio, no un número arbitrario.

Con ese criterio:

- **`src/shared.jsx` (2750 líneas, ~45 exports)**: es el caso más claro de
  "god file" real. Mezcla primitivas de UI genéricas (`Select`,
  `MultiSelect`, `Sheet`, `ConfirmDialog`), lógica de negocio transversal
  (`formatMoney`, `colorFor`, `applyListFilters`), hooks de comportamiento
  (`useClickOutside`, `useFloatingDropdown`, `useEscapeClose`) y un
  componente enorme y autocontenido (`MonthCalendar`, líneas 1278-1822,
  ~545 líneas él solo) que no tiene relación directa con el resto de la
  librería. No es duplicación ni mal código — es una única "bolsa" que ha
  ido creciendo. Coste de no tocarlo: bajo hoy (todo tiene tests, todo
  funciona), pero cada nueva incorporación a la librería compartida hace
  más cara la navegación y el diff de cualquier PR que la toque.
- **`src/ConfigTab.jsx` (2241 líneas)**: aquí sí hay una mezcla de
  responsabilidades real y desigual. De las 2241 líneas, ~1500 (líneas
  595-2095: `UserDetailSheet`, `ActivationLinkPanel`, `CreateUserSheet`,
  `UsersDirectory`) son la funcionalidad completa de administración de
  usuarios — una feature grande y autocontenida — conviviendo en el mismo
  fichero que el `CrudTable` genérico usado por Escuelas/Actividades/
  Monedas/Estados de pago. Son dos cosas distintas por tamaño y por
  audiencia (config general vs. administración de cuentas).
- El resto de pantallas (`MiTrabajoTab`, `ProfileTab`, `SummaryTab`,
  `RatesTab`, etc.) son grandes pero **cada una es una sola pantalla con
  sus subcomponentes privados al lado** — el patrón que Bulletproof React
  llama colocalización por feature. Correcto, no es deuda.

## 2. Duplicación real

- **Patrón FAB + hoja inferior**: se usa consistentemente vía el
  componente compartido `<Fab>` (`src/shared.jsx:2231`), usado en
  `MiTrabajoTab.jsx`, `DatasetsSection.jsx`, `RatesTab.jsx`,
  `ConfigTab.jsx`. No hay boilerplate repetido — ya está extraído a un
  componente, no a copiar/pegar. **No es deuda.**
- **`useSupabaseTable`**: se instancia solo en `App.jsx` (que carga todas
  las tablas una vez, como marca CLAUDE.md) y en `DatasetsSection.jsx`. El
  resto de pantallas reciben `rows`/`insertRow`/`updateRow`/`deleteRow`
  por props — correcto, sin duplicación de la lógica CRUD.
- **Llamadas directas a `supabase.from()` fuera del hook** (6 ficheros:
  `useSession.js`, `ConfigTab.jsx`, `DatasetsSection.jsx`,
  `DeploymentNotice.jsx`, `trainingRecords/TrainingRecordsTab.jsx`,
  `ProfileTab.jsx`): revisadas una por una, **todas están justificadas**
  — o son lecturas de referencia de solo lectura (plantillas, adventures),
  o joins entre tablas que el hook genérico no modela, o (el caso de
  `ProfileTab.jsx`, que además lo documenta explícitamente en un
  comentario en la línea 18) escritura del propio perfil de usuario,
  protegido por RLS, que no encaja en el modelo "lista de filas" del hook.
  Ninguna es un atajo perezoso alrededor de la convención — es la
  convención reconociendo sus propios límites. **No es deuda, es una
  excepción razonada.**
- No se ha encontrado lógica de fecha/moneda duplicada entre pantallas —
  `formatMoney`, `Money`, `MoneyLine`, `todayStr`, `addDays` están
  centralizados en `shared.jsx` y se reusan.

**Conclusión de esta sección**: no hay duplicación real que justifique una
nueva abstracción ahora mismo — el proyecto ya tiene las abstracciones
correctas donde hacen falta y no las tiene donde no compensarían
(criterio de la propia convención 3 de CLAUDE.md).

## 3. Dependencias

- **`npm audit`: 0 vulnerabilidades.**
- **`npm outdated`**: todos los desfases son de versión menor o parche
  (ej. `react` 19.2.8→19.3.0, `@supabase/supabase-js` 2.112.4→2.117.2,
  `lucide-react` 1.33.0→1.48.0), salvo **`vitest` (4.1.11 actual, 5.0.2
  disponible — salto de versión mayor)**. Es una devDependency, sin
  impacto en producción; actualizarla es opcional y de bajo riesgo, pero
  un major puede tener breaking changes en la config (`vitest.config`),
  así que no es un "quick win" automático — merece su propio ciclo de
  prueba, no colarla en otro cambio.
- **`depcheck`**: marca `tailwindcss` como no usada. **Falso positivo,
  verificado**: Tailwind v4 se importa vía `@import "tailwindcss"` en
  `src/index.css:80`, resuelto por el plugin `@tailwindcss/vite` en
  `vite.config.js` — depcheck no analiza imports CSS. No hay dependencias
  realmente huérfanas.
- No se ha encontrado ningún paquete deprecado o sin mantenimiento activo
  entre las dependencias directas.

## 4. Consistencia con las convenciones propias

- `window.confirm`/`window.alert`: **0 apariciones**. La convención 5
  (usar `DeleteButton`) se cumple al 100%.
- `console.log`: **0 apariciones** fuera de tests. `console.error`: 25
  apariciones, todas en rutas de manejo de error reales (junto a un
  `throw`, un `toast.error()`, o el propio `useSupabaseTable.js`) —
  ninguna es un resto de depuración olvidado.
- `TODO`/`FIXME`/`HACK`/`XXX`: **0 apariciones reales** (los matches de
  grep eran falsos positivos de la palabra española "TODOS").
- Colores hardcodeados: la mayoría de los hex fuera de `colors.js` son
  neutros de interfaz (grises tipo `#9CA3AF`, `#D1D5DB`, `#6B7280` —
  equivalentes a la paleta gray de Tailwind) usados como valor de
  fallback en `colorFor(rows, name, "#94A3AF")` o para estados
  deshabilitado/placeholder — **no son colores de negocio**, así que no
  violan la convención 2 (colores de entidad desde su tabla). Es una
  inconsistencia menor de estilo (podrían ser clases Tailwind
  `text-gray-400` en vez de hex inline), no una violación de la regla de
  negocio-en-tabla.
- **Hallazgo real, de coste cero**: `src/index.css:80` —
  `@import "tailwindcss";// vercel test`. Resto de un commit de prueba de
  autodeploy de hace más de un mes (commit `2dc486b`, "test vercel
  autodeploy", 2026-08-25). `//` no es sintaxis de comentario válida en
  CSS; ha sobrevivido porque el parser lo ignora en silencio, pero es
  basura muerta en un fichero de producción. Quick win trivial: borrar
  `// vercel test`.
- **i18n (13 namespaces × 15 idiomas = 195 ficheros JSON)**: comprobación
  puntual de paridad de claves de primer nivel entre `es` y `en` en 5
  namespaces — coinciden exactamente, sin deriva detectada hoy. Pero **no
  existe ningún test/script que verifique automáticamente que los 15
  idiomas tienen las mismas claves** — el único mecanismo actual es la
  disciplina manual. Es un riesgo latente barato de mitigar (un test
  unitario que compare `Object.keys()` de cada namespace entre los 15
  idiomas tardaría minutos en escribirse y evitaría descubrir un idioma
  roto en producción).

## 5. Patrón de arquitectura — no existe un ADR que lo formalice

El patrón real de pantalla-lista está descrito en la lista de
convenciones de `CLAUDE.md`, pero **no hay ningún ADR en `docs/ADR/` (25
ADRs existentes, ninguno) que lo documente formalmente con ejemplos**. El
patrón observado, con evidencia:

1. `App.jsx` instancia un `useSupabaseTable(tabla, ordenPor, ...)` por
   tabla de negocio y pasa `{rows, insertRow, updateRow, deleteRow}` como
   props a la pantalla (`src/App.jsx:154-193`).
2. La pantalla renderiza una lista, un `<Fab onClick={...}
   color={accentColor} />` (`src/RatesTab.jsx:437`) y una `<Sheet
   open={sheetOpen} onClose={closeSheet}>` (`src/RatesTab.jsx:439`) para
   crear/editar.
3. Las mutaciones van siempre envueltas en try/catch contra el método del
   hook, con toast de resultado (`src/RatesTab.jsx:240-281`:
   `updateRow`/`insertRow`/`deleteRow` sobre `tableFor(...)`).

Es un patrón real, consistente, usado en 5+ pantallas (Escuelas/
Actividades/Tarifas/Comisiones/etc.) — vale la pena un ADR nuevo que lo
capture con estos mismos ejemplos, para que una pantalla futura lo siga
sin tener que releer 5 ficheros distintos para inferirlo. No es urgente
(el patrón ya se sigue bien en la práctica), pero es exactamente el tipo
de "documentación viva de decisiones" que pide la regla 7 de CLAUDE.md.

## 6. `api/*.js` y el límite de 12 Serverless Functions

**Hallazgo crítico de infraestructura, no de código.** `api/` tiene hoy
**exactamente 12 ficheros**:

```
create-user.js, delete-own-account.js, delete-user.js, external-register.js,
generate-invitation-link.js, list-user-status.js, notify-deployment.js,
regenerate-activation-link.js, regenerate-password.js, request-password-reset.js,
set-user-active.js, update-admin-status.js
```

**Cero margen.** El límite del plan Hobby (12) ya está tocado, no cerca
de tocarse. Cualquier endpoint nuevo — por pequeño que sea — romperá el
deployment igual que ocurrió el 2026-09-07 con
`get-user-activity-summary.js`, salvo que se fusione dentro de un
endpoint hermano existente (el patrón de "rama por campo del body", ya
usado en `activitySummaryFor()` de `server/users/listUserStatus.js`) o se
apruebe subir a plan Pro. Esto ya está recogido como advertencia en
`CLAUDE.md`, pero este informe confirma que la situación es peor de lo
que "hay que tener cuidado" sugiere: **no queda ni un hueco.**

## 7. Priorización final

### Alta prioridad / coste bajo (quick wins)

1. **Límite de Serverless Functions ya agotado (0 de 12 libres)** —
   impacto real: el próximo endpoint nuevo tumba el deployment si no se
   avisa antes. Recomendación: nada que arreglar hoy en el código, pero
   cualquier feature futura que necesite un `api/*.js` nuevo debe
   evaluarse primero contra el patrón de rama-por-campo antes de crear
   fichero, y si eso no basta, avisar del coste de pasar a Pro antes de
   escribir el endpoint (ya es la regla escrita en CLAUDE.md — este
   hallazgo solo confirma que hay que tomársela en serio ya, no "cuando
   llegue el momento").
2. **`// vercel test` muerto en `src/index.css:80`** — coste cero, cero
   riesgo, una línea. Sin impacto funcional hoy, pero es basura visible
   en un fichero de producción.
3. **Sin test de paridad de claves i18n entre los 15 idiomas** — coste
   bajo (un test nuevo), evita que un idioma se rompa en silencio sin que
   ningún test lo detecte.

### Alta prioridad / coste alto

4. **`ConfigTab.jsx` mezcla "configuración general" (CrudTable genérico)
   con "administración de usuarios" (~1500 líneas: `UserDetailSheet`,
   `CreateUserSheet`, `UsersDirectory`, `ActivationLinkPanel`)** — no es
   urgente porque hoy funciona y está bien testeado, pero cada cambio
   futuro en la gestión de usuarios (una feature grande y sensible, con
   roles/activación/borrado) se vuelve más caro de revisar por venir
   mezclado con la config genérica de catálogos. Recomendación: cuando
   llegue el próximo cambio real en la administración de usuarios,
   extraer esas ~1500 líneas a `src/admin/` (o similar) como una feature
   propia, en vez de seguir creciendo dentro de `ConfigTab.jsx`. No
   hacerlo preventivamente ahora — esperar al disparador real, según el
   propio criterio del proyecto de "nunca construir complejidad antes de
   que exista la necesidad real".

### Baja prioridad

5. **`shared.jsx` como "bolsa" de 2750 líneas / 45 exports** — funciona
   bien, todo tiene test, pero seguirá creciendo. No merece una
   refactorización ahora (coste alto, beneficio incierto mientras nadie
   se está tropezando con ello); si en el futuro se vuelve doloroso
   navegar, dividir por dominio (`shared/inputs.jsx`, `shared/calendar.jsx`,
   `shared/feedback.jsx`) sería la vía natural — pero es una decisión
   para cuando el dolor sea real, no antes.
6. **Colores hex inline usando la paleta gris de Tailwind en vez de
   clases** — puramente estético, sin riesgo funcional, sin prisa.
7. **`vitest` un major por detrás (4→5)** — sin vulnerabilidades ni
   bloqueo, actualizar cuando convenga dedicarle su propio ciclo de
   prueba, no colado en otro cambio.
8. **Paleta de color propia y distinta en `generateExportReportPdf.js`**
   (valores hex distintos a `colors.js`) — probablemente intencional
   (colores ajustados para impresión/PDF), pero no está documentado como
   decisión deliberada en ningún sitio. Sin acción necesaria salvo
   dejarlo anotado por si en el futuro alguien lo confunde con una deriva
   de marca no intencional.

---

*Informe generado en una auditoría de solo lectura; no se hizo ningún
cambio de código como parte de esta fase.*
