# ADR 0021 — EmailService: única puerta de entrada al envío de emails transaccionales

**Fecha:** 2026-08-31
**Estado:** Aprobado e implementado.

## Contexto y problema

El alta de usuarios (`createUser.js`) ya generaba un enlace de activación de
un solo uso y, desde el commit `3dc3947`, intentaba enviarlo por email a
través de Resend (`server/email/sendWelcomeEmail.js`, llamada REST directa
sin SDK). En la práctica ese envío nunca ha llegado a funcionar: ningún
entorno (`.env.local`, `.env.vercel`, `.env.test.local`, ni Vercel/Netlify)
tiene configuradas `RESEND_API_KEY`/`EMAIL_FROM`, así que el flujo real
seguía siendo "el superadmin comparte el enlace a mano" — el problema que
esta sesión encarga resolver.

Además, `sendWelcomeEmail.js` estaba acoplado 1:1 a Resend (URL, cabeceras y
formato de payload de Resend hardcodeados dentro de la función) y a una
única plantilla de "bienvenida". Los otros dos flujos que generan el mismo
tipo de enlace — `regenerateActivationLink.js` (reactivar cuenta) y
`regeneratePassword.js` (invalidar contraseña) — nunca intentaban enviar
email: siempre devolvían el enlace para compartir a mano, sin motivo técnico
que lo justificara, solo porque nadie los había conectado.

Encargo explícito de esta sesión: activar el envío automático en los tres
flujos, sin acoplar el resto de la aplicación a Resend en concreto, para
poder cambiar de proveedor en el futuro sin tocar lógica de negocio.

## Decisión

### 1. `EmailService.sendActivationEmail()` como única puerta de entrada

`server/email/EmailService.js` expone una única función semántica,
`sendActivationEmail({ email, firstName, nickname, actionLink, reason })`.
`createUser.js`, `regenerateActivationLink.js` y `regeneratePassword.js`
dependen solo de esta función — ninguno de los tres importa Resend, conoce
su formato de payload o su endpoint. Es la interfaz que blinda al resto de
la app frente al proveedor concreto.

### 2. Proveedor aislado en `server/email/providers/`

`resendProvider.js` es el único archivo que sabe que el proveedor es
Resend. Expone una firma genérica: `send({ to, subject, html, text }) →
{ sent, error }` — nada de esa firma menciona Resend. `EmailService`
importa `sendViaResend` como su único proveedor activo hoy. Sustituir
Resend en el futuro es escribir un archivo hermano (`providers/otro.js`)
con la misma firma y cambiar ese import — sin tocar `createUser.js`,
`regenerateActivationLink.js`, `regeneratePassword.js` ni sus tests (que
mockean `EmailService.js`, nunca Resend).

### 3. Plantilla única parametrizada por motivo

`server/email/templates/activationEmailTemplate.js` sustituye a
`welcomeEmailTemplate.js`. Los tres flujos envían, en el fondo, el mismo
email — "aquí tienes un enlace de un solo uso para entrar y fijar tu
contraseña" — así que comparten layout HTML/texto y solo cambia el copy
(`ACTIVATION_EMAIL_COPY.signup | reactivation | password_reset`):
asunto, título, intro y texto del botón. Evita triplicar HTML/texto para
tres emails que son el mismo email con distinto contexto.

### 4. Sin selector de proveedor (`EMAIL_PROVIDER`) ni sistema multi-provider

`EmailService` resuelve el proveedor con una constante interna
(`const sendEmail = sendViaResend`), no con una variable de entorno ni un
registro de proveedores. Con un único proveedor real en producción, un
selector configurable sería complejidad especulativa sin ningún caso de
uso presente que la justifique — el nivel de abstracción ya alcanzado (un
archivo con una firma fija) es suficiente para que cambiar de proveedor
sea barato el día que haga falta, sin necesitar hoy soportar dos a la vez.

## Alternativas consideradas

- **Mantener `sendWelcomeEmail.js` tal cual y solo configurar las variables
  de entorno.** Resolvía el síntoma (nunca se envía el email) pero no el
  problema de fondo: seguiría sin poder reutilizarse en
  `regenerateActivationLink`/`regeneratePassword` sin duplicar la llamada a
  Resend en cada uno, y cualquier cambio de proveedor futuro tocaría los
  tres flujos de negocio directamente.
- **Registro de proveedores configurable por `EMAIL_PROVIDER=` con varios
  adaptadores ya escritos "por si acaso".** Descartado: no hay hoy ningún
  segundo proveedor real que soportar, y mantener adaptadores sin usar es
  el tipo de sobreingeniería que el encargo pedía evitar explícitamente.
- **Tres plantillas independientes, una por flujo.** Descartado: el layout
  es idéntico en los tres casos; solo cambia el copy. Triplicar HTML/texto
  para eso viola la convención del proyecto de una única fuente de verdad
  por regla de negocio.
- **Emails nativos de Supabase Auth (SMTP propio configurado en el
  dashboard).** Evaluado y descartado en la auditoría previa a este ADR:
  obligaría a renunciar a `buildActivationUrl()` (la URL de activación
  propia que evita que un escáner de email precargue y queme el
  `action_link` nativo de Supabase — ver `server/users/activationLink.js`),
  perdiendo un control que ya soluciona un bug real y documentado.

## Consecuencias

**Positivas**

- Los tres flujos de alta/reactivación/regeneración de contraseña envían
  email automáticamente, con fallback intacto al enlace manual si el envío
  falla — nunca deja a un usuario sin forma de completar el acceso.
- Cambiar de proveedor de email en el futuro (por coste, límites o
  fiabilidad) es aislado a `server/email/providers/`: cero cambios en
  `server/users/*.js` ni en `ConfigTab.jsx`.
- Un único sitio (`activationEmailTemplate.js`) controla el copy de los
  tres emails — corregir un texto o el diseño se hace una vez.

**Negativas / coste asumido**

- El mock de `EmailService.js` en los tests de `createUser`/
  `regenerateActivationLink`/`regeneratePassword` no garantiza en tiempo de
  ejecución que la forma de sus argumentos siga coincidiendo con la firma
  real de `sendActivationEmail()` — JavaScript no tiene tipos que lo
  impidan. Se mitiga con `EmailService.integration.test.js`, que ejercita
  la función real (sin mockear el proveedor) con los mismos argumentos que
  usan los tres flujos, cerrando la cadena hasta la llamada real a fetch.
- Un único template para tres motivos significa que un cambio de copy para
  un motivo obliga a revisar que no rompa visualmente a los otros dos
  (comparten la misma función de render).

## Fuera de alcance ahora

- Recuperación de contraseña **autoservicio** (el propio usuario la pide
  desde login) — hoy solo existe la vía admin ("regenerar contraseña"),
  que ya reutiliza este mismo `EmailService`. Añadir un endpoint público de
  "olvidé mi contraseña" es una decisión de producto y seguridad
  (rate-limiting, enumeración de emails) que no estaba en el encargo de
  esta sesión.
- ~~Verificar un dominio propio en Resend.~~ Hecho — ver addendum
  2026-09-01 abajo.
- Selector de proveedor configurable (`EMAIL_PROVIDER=`) — ver punto 4 de
  la Decisión. Se añadirá el día que exista un segundo proveedor real que
  soportar, no antes.

## Addendum 2026-09-01 (noche) — dominio verificado, `EMAIL_FROM` corregido en local, pendiente en Vercel

Encontrado durante Release V1 (registro externo real probado por el
usuario contra TEST): `EMAIL_FROM` seguía apuntando al dominio de
pruebas de Resend (`onboarding@resend.dev`), que Resend solo entrega al
email del titular de la cuenta — cualquier registro con OTRO email
fallaba en silencio (best-effort: la cuenta se creaba igual, pero el
email de activación nunca llegaba, sin ningún error visible para quien
se registraba). El dominio `oceanflow.money` ya estaba verificado en
Resend (`status: verified`, comprobado vía API) desde esta misma sesión,
pero nadie había actualizado `EMAIL_FROM` para usarlo — exactamente el
paso manual que este ADR ya dejó anotado como pendiente el 2026-08-31.

- **`EMAIL_FROM` corregido a `Ocean Flow <no-reply@oceanflow.money>` en
  `.env.local`** (verificado con un envío real de prueba — `200`, y
  reenviado con éxito el email de activación pendiente de la cuenta de
  prueba afectada).
- **Pendiente, acción manual fuera del alcance de esta sesión:**
  actualizar `EMAIL_FROM` en las variables de entorno de Vercel — tanto
  en el proyecto `dive-tracker` (TEST) como en `dive-tracker-exgg`
  (producción) — al mismo valor. Hasta que se haga, el registro externo y
  cualquier alta de usuario en TEST/producción seguirán sin enviar el
  email de activación a nadie que no sea el titular de la cuenta Resend.
  Ver `docs/RELEASE-V1-PROGRESS.md`, sección "Nota — dominio de Resend",
  para el seguimiento.
