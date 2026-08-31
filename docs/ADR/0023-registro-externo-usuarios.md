# ADR 0023 — Registro externo: autoservicio del mismo alta que ya hace el superadmin

**Fecha:** 2026-08-31
**Estado:** Aprobado e implementado (código en TEST y en `schema.sql`; migración de `app_config` ejecutada solo contra Supabase TEST — ver "Aplicado" al final).

## Contexto y problema

Hasta ahora, la única forma de que exista una cuenta nueva en Ocean Flow
era que el superadmin la creara a mano desde Configuración → Usuarios
(`createUser.js`). El encargo pide una opción "Permitir registro externo"
que, activada, muestre "Regístrate" en el login y deje que cualquiera cree
su propia cuenta sin intervención del superadmin.

Antes de tocar código, se revisó si esto entra en conflicto con
`docs/ADR/0001-alcance-instructor-freelance-no-b2b.md` (Ocean Flow no es
multi-tenant, no hay conceptos de organización/equipo). **No hay
conflicto**: cada cuenta — se cree a mano o por registro externo — sigue
siendo un instructor freelance aislado, con su propio dataset clonado
(`clone_setup_dataset`), sin compartir datos con nadie más. El registro
externo solo cambia QUIÉN dispara la creación de una cuenta, nunca EL
MODELO de datos de esa cuenta.

## Decisión

### 1. Un único núcleo de aprovisionamiento, dos disparadores

Se extrae de `createUser.js` la secuencia real de Supabase (crear cuenta
sin contraseña, clonar dataset, generar enlace, enviar email) a
`provisionUser.js`. La llaman:

- `createUser.js` — admin, superadmin verificado, `dataset_key` elegido a
  mano en el formulario, `reason: "signup"`.
- `externalRegister.js` (nuevo) — público, gateado por
  `app_config.allow_external_registration`, `dataset_key` elegido
  automáticamente (primer dataset disponible en `setup_datasets`, hoy solo
  existe "ihasia"), `reason: "external_signup"`.

La única diferencia entre ambos es CÓMO deciden si pueden llamar y qué
`dataset_key`/`reason` pasan — nunca la orquestación de Supabase en sí. Sin
esta extracción, el registro externo habría duplicado ~40 líneas de lógica
ya escrita y ya probada.

### 2. Cero UI nueva para contraseña/bases legales

`RegisterScreen.jsx` solo pide email/nombre/apellidos/nickname — **nunca
contraseña**. El "crear tu contraseña" y "aceptar bases legales" ya existen
enteros en `CreatePasswordScreen.jsx` (usa `activateAccount()`, que ya
inserta los consentimientos legales como parte del mismo flujo). El enlace
del email de confirmación reutiliza exactamente el mismo mecanismo que
alta/reactivación/regenerar contraseña — mismo `type=recovery`, mismo
`activateAccount()`. Cero caminos paralelos de autenticación.

### 3. El toggle es solo UX — el control de acceso real vive en el servidor

`app_config.allow_external_registration` (columna nueva, off por defecto)
decide si "Regístrate" aparece en el login, vía la RPC pública
`external_registration_enabled()` (mismo patrón que `email_for_nickname`:
security definer, invocable por `anon`, porque `app_config` no es legible
sin sesión). **Pero `handleExternalRegister` comprueba el mismo flag por
su cuenta en cada petición**, antes de tocar Supabase — nunca se fía de que
el botón esté oculto en el cliente. Si alguien llama al endpoint
directamente con el flag en `false`, recibe 403 sin crear nada.

## Alternativas descartadas

- **Registro con contraseña inmediata (`supabase.auth.signUp()` +
  confirmación de email nativa de Supabase).** Es lo que describía el
  encargo literalmente ("creación contraseña" antes de "cuenta creada").
  Descartado: usaría un mecanismo de Auth completamente distinto
  (`signUp` + confirmación por token propio de Supabase) en paralelo al
  que ya usan alta/reactivación/recuperación — exactamente el "camino
  paralelo" que el encargo pedía evitar explícitamente, y perdería el
  control fino del enlace de activación que ya soluciona el problema de
  escáneres de email (ver `server/users/activationLink.js`).
- **Relajar la policy de SELECT de `app_config` para que "anon" la lea
  entera.** Descartado en favor de una RPC estrecha: exponer toda la
  configuración (incluido lo que sea sensible en el futuro) a cualquiera
  sin autenticar es más superficie de la necesaria para resolver "¿se
  puede registrar quien no tiene cuenta?".
- **Dejar elegir el dataset inicial al registrante.** Con un único dataset
  hoy no hay elección real que ofrecer; se anota como mejora futura si
  algún día hay varios "templates" (ver Consecuencias).

## Consecuencias

- Reutiliza el 100% de la infraestructura de email/activación ya
  construida y probada esta misma sesión — cero deuda nueva de
  mantenimiento en ese frente.
- Nuevo endpoint público (`external-register`) es el segundo sin sesión de
  `server/users/`, junto a `request-password-reset` — mismo nivel de
  cuidado aplicado (nunca expone `user_id`/enlaces por error salvo el
  fallback ya existente para email fallido, que aquí sí es aceptable
  porque quien lo ve es quien acaba de rellenar el formulario con su
  propio email, no un tercero).
- Si en el futuro existen varios `setup_datasets`, `externalRegister.js`
  sigue usando "el primero por label" — decisión explícita a revisar
  entonces (dejar elegir, o marcar uno como `is_default`).

## Aplicado

- Columna `app_config.allow_external_registration` y RPC
  `external_registration_enabled()`: **ejecutadas contra Supabase TEST**
  (`rwzbfrdidbjgkkuyuuzm`), no contra producción — mismo límite que el
  resto de esta sesión (nunca tocar PROD sin aprobación explícita aparte).
  `schema.sql` documenta el bloque de migración aditiva para replicarlo en
  cualquier otra instalación, incluida producción cuando se apruebe.
