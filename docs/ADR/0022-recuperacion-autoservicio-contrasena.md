# ADR 0022 — Recuperación de contraseña autoservicio: sin enumeración de usuarios

**Fecha:** 2026-08-31
**Estado:** Aprobado e implementado.

## Contexto y problema

El encargo original de "recuperación de contraseña" especificaba dos
mensajes distintos según el email introducido en el login existiera o no:
uno para "email inexistente" (mensaje claro) y otro para "email existente"
("revisa tu bandeja de entrada"). Esa distinción es una vulnerabilidad de
**enumeración de usuarios**: cualquiera podría probar emails uno a uno y
saber, por la respuesta, cuáles tienen cuenta en Ocean Flow — exactamente
el mismo riesgo que `docs/BACKLOG.md` ya señala sin resolver para
`email_for_nickname()` (RPC pública sin rate limit).

## Decisión

`handleRequestPasswordReset` (`server/users/requestPasswordReset.js`)
devuelve **siempre** `{ status: 200, payload: { ok: true } }`, exista o no
la cuenta, funcione o no el envío de email. `ForgotPasswordScreen.jsx`
muestra siempre el mismo mensaje de confirmación. Nunca hay una rama de
código, en cliente ni en servidor, que distinga ambos casos hacia afuera.

Dos decisiones más, ambas derivadas de que este es el único endpoint
público (sin sesión) de `server/users/`:

- **Nunca devuelve `action_link`.** Los flujos de admin
  (`regenerateActivationLink.js`, `regeneratePassword.js`) sí lo hacen como
  fallback si el email falla — es seguro porque quien lo ve ya es un
  superadmin autenticado. Aquí lo vería cualquiera que rellene el
  formulario público: equivaldría a poder resetear la contraseña de
  cualquier cuenta sin demostrar acceso a su bandeja.
- **Nunca quita el baneo de la cuenta.** `regenerateActivationLink.js` sí
  lo hace porque lo dispara un superadmin decidiendo reactivar. Aquí lo
  dispararía cualquiera con el formulario — sería una vía pública para
  reactivar cuentas desactivadas sin supervisión. El enlace se genera
  igualmente sobre una cuenta baneada; `activateAccount()` ya lo rechaza
  con el mensaje de "cuenta desactivada" al intentar canjearlo (mismo
  comportamiento que un enlace de activación viejo sobre una cuenta que se
  desactivó después — nada nuevo que testear).

Reutiliza `generateActivationLink()` y `sendActivationEmail()` tal cual
(motivo nuevo `password_reset_request` en `activationEmailTemplate.js`,
distinto de `password_reset` porque el tono es "lo pediste tú" en vez de
"un admin te la ha invalidado"). El "cambiar contraseña" tras pulsar el
enlace no necesitó código nuevo: es el mismo `type=recovery` que ya
resuelve `activateAccount()`/`CreatePasswordScreen` para alta,
reactivación y regenerar contraseña — self-service converge en el mismo
punto único.

## Alternativas descartadas

- **Mensaje distinto por existencia del email (lo pedido originalmente).**
  Descartado por la vulnerabilidad de enumeración ya explicada — es una
  desviación deliberada del encargo literal, documentada aquí en vez de
  implementada en silencio.
- **Rate limiting por IP/email con una tabla nueva.** Evaluado y
  descartado por ahora: añadiría una tabla y lógica nueva para un endpoint
  que ya comparte el mismo nivel de riesgo aceptado que
  `email_for_nickname()` (documentado, no bloqueante, sin mitigación
  todavía). Se añade una entrada gemela en `docs/BACKLOG.md` en vez de
  resolverlo de forma distinta aquí sin criterio unificado.

## Consecuencias

- Cero superficie de enumeración nueva en el login (mismo nivel de riesgo
  ya aceptado en el resto del proyecto, no uno nuevo).
- Ninguna cuenta desactivada puede reactivarse por esta vía sin que un
  admin lo decida explícitamente.
- `docs/BACKLOG.md` gana una entrada gemela a la de `email_for_nickname()`
  para rate limiting de endpoints públicos — pendiente, no bloqueante.
