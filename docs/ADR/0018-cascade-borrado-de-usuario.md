# ADR 0018 — "Database error deleting user": faltaba ON DELETE CASCADE en 9 tablas

**Fecha:** 2026-08-30
**Estado:** **Ejecutada.** Causa raíz confirmada con datos reales,
`schema.sql` actualizado, y la migración de la sección "Migración" más
abajo ejecutada por el usuario en el SQL Editor de Supabase (confirmado
por el usuario — no verificable de forma independiente desde este
entorno, que no tiene acceso directo a Postgres, solo a la API de
PostgREST). Pendiente de una prueba real: eliminar una de las 5 cuentas
originalmente afectadas y confirmar que ya no da "Database error
deleting user".

## Síntoma reportado

`Database error deleting user` al eliminar ciertos usuarios desde
Configuración → Usuarios (nicknames `ll`, `lll`, `test-desactivar`, `a`,
`l`), mientras que otros usuarios sí se eliminan sin problema.

## Investigación (datos reales, no supuestos)

`schema.sql` declara 9 tablas de negocio con una columna `user_id uuid
not null references auth.users(id) default auth.uid()` — **sin `on
delete cascade`**: `schools`, `activities`, `payment_types`,
`payment_statuses`, `rates`, `commission_rates`, `worklog`, `comisiones`,
`colleague_payments`. Solo `profiles` (`on delete cascade`, ya
correcto) y `legal_consents` (idem) sí lo tenían.

`server/users/deleteUser.js` llama a `auth.admin.deleteUser(targetUserId)`
— el Admin API de Supabase Auth, que internamente hace un `DELETE FROM
auth.users WHERE id = ...` en Postgres. **Sin `on delete cascade`, una fila
de `auth.users` con cualquier fila hija en una de esas 9 tablas no se
puede borrar** — Postgres rechaza el `DELETE` por violación de la
restricción de clave foránea, y Supabase Auth traduce ese fallo en el
mensaje genérico "Database error deleting user".

**Confirmado con una consulta de solo lectura contra las 5 cuentas
reportadas** (script desechable, borrado tras usarlo, sin modificar
ningún dato): las 5 tienen filas en `schools`/`activities`/`rates`
(y algunas en `commission_rates`) — exactamente las tablas sin cascade.
Una cuenta sin ninguna fila en esas 9 tablas (una cuenta vacía, recién
creada y nunca usada) no dispara el fallo, lo que explica por qué
"algunos usuarios sí se eliminan": no es aleatorio ni depende del
nickname, depende de si la cuenta tiene datos reales o no.

**Veredicto:** limitación real del modelo de datos (falta de cascada),
no un bug de `deleteUser.js` — el código ya hace lo correcto
(`auth.admin.deleteUser`, la única vía correcta para borrar una cuenta
de Supabase Auth). El comentario que ya existía en ese archivo asumía
que la cascada ya cubría todo esto; era incorrecto, corregido en el
mismo commit que este ADR.

## Decisión

Añadir `on delete cascade` a las 9 FK. `schema.sql` (esquema
consolidado, estado objetivo para una base de datos nueva) ya se ha
actualizado en este mismo commit — pero **`create table if not
exists` no modifica una tabla que Postgres ya creó**, así que la base
de datos real de este proyecto necesita la migración de abajo,
ejecutada una sola vez.

### Migración (pendiente de ejecución manual del usuario)

Este entorno no tiene una cadena de conexión directa a Postgres (mismo
límite ya documentado en `docs/ADR/0017-politica-de-backups-mvp.md` —
solo existen las claves anon/service_role de la app), así que esta
migración no se ha podido ejecutar desde aquí. Ejecutar en el **SQL
Editor del dashboard de Supabase**:

```sql
alter table schools drop constraint schools_user_id_fkey,
  add constraint schools_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table activities drop constraint activities_user_id_fkey,
  add constraint activities_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table payment_types drop constraint payment_types_user_id_fkey,
  add constraint payment_types_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table payment_statuses drop constraint payment_statuses_user_id_fkey,
  add constraint payment_statuses_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table rates drop constraint rates_user_id_fkey,
  add constraint rates_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table commission_rates drop constraint commission_rates_user_id_fkey,
  add constraint commission_rates_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table worklog drop constraint worklog_user_id_fkey,
  add constraint worklog_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table comisiones drop constraint comisiones_user_id_fkey,
  add constraint comisiones_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;

alter table colleague_payments drop constraint colleague_payments_user_id_fkey,
  add constraint colleague_payments_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade;
```

Los nombres de restricción (`<tabla>_user_id_fkey`) son el nombre por
defecto que Postgres asigna a una FK declarada sin nombre explícito —
si alguna no coincide, `\d <tabla>` en `psql` o el propio SQL Editor
("Database" → "Tables" → la tabla → "Foreign Keys") lo confirma antes
de ejecutar.

**Reversible:** cada línea es `drop` + `add` de la misma restricción,
solo cambia el comportamiento `on delete`; revertir es la misma
operación sin `on delete cascade`. No borra ni modifica ninguna fila
existente — solo cambia qué pasa la PRÓXIMA vez que se borre un
usuario.

**Riesgo de la migración:** ninguno para los datos existentes (no toca
filas, solo la restricción). El único cambio de comportamiento futuro:
a partir de aplicarla, eliminar un usuario borra también, sin
posibilidad de deshacerlo, todas sus escuelas/cursos/tarifas/
movimientos — que es exactamente el comportamiento que `deleteUser.js`
y su propio texto de confirmación ("elimina también sus datos") ya
prometen hoy; hasta ahora esa promesa no se cumplía para cuentas con
datos.

## Por qué no se ha aplicado un parche alternativo

Alternativas descartadas:
- **Borrar manualmente fila a fila desde `deleteUser.js` antes de llamar
  a `auth.admin.deleteUser`** (recorrer las 9 tablas con `.delete().eq
  ("user_id", ...)`): funcionaría, pero mantiene la causa raíz sin
  corregir (el modelo de datos seguiría sin cascade) y añade lógica de
  aplicación que solo existe para compensar un hueco de esquema — el
  tipo de parche superficial que el usuario pidió explícitamente evitar.
- **Capturar el error y mostrar un mensaje más amable sin arreglar
  nada**: deja el bug intacto, solo lo disfraza.

La cascada a nivel de base de datos es la solución estándar de
PostgreSQL para exactamente este caso (una fila padre cuyo borrado debe
arrastrar a sus hijas) — no una solución inventada para este proyecto.

## Consecuencias

- Hasta que el usuario ejecute la migración, el bug reportado sigue
  activo para cualquier cuenta con datos reales en alguna de las 9
  tablas.
- `schema.sql` ya refleja el estado correcto — cualquier proyecto
  Supabase nuevo creado desde cero con este archivo nace ya sin el
  problema.
- Fila añadida a `docs/BACKLOG.md` ("Ahora") con un enlace a este ADR.
