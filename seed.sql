-- =================================================================
-- Ocean Flow — seed mínimo para una base de datos nueva
--
-- Ejecutar UNA VEZ, justo después de `schema.sql`, contra una base de
-- datos vacía (Supabase TEST, o cualquier entorno nuevo futuro) — nunca
-- hace falta contra producción, que ya tiene sus propias filas reales.
-- Idempotente (`on conflict ... do nothing`): volver a ejecutarlo no
-- duplica nada ni falla.
--
-- Sin esto, `schema.sql` deja las tablas de configuración vacías y la
-- app no es utilizable: sin moneda por defecto, sin colores de sección,
-- sin fila de app_config, y sin dataset inicial para dar de alta un
-- usuario de prueba (scripts/create-demo-user.js espera que exista un
-- dataset con key = 'ihasia').
--
-- RLS no bloquea esto: el SQL Editor de Supabase se conecta con un rol
-- con privilegios elevados, no sujeto a RLS (a diferencia de las
-- conexiones normales vía API con anon/authenticated) — da igual que
-- esté activada o no.
--
-- El dataset "ihasia" de abajo es una copia exacta del real de
-- producción (traído el 2026-08-30) — es una plantilla de configuración
-- reutilizable por diseño (ver schema.sql, "Datasets de configuración
-- inicial"), no datos de negocio de ningún usuario real.
-- =================================================================

-- Moneda principal (uso real de producción: THB, Baht tailandés)
insert into currencies (code, name, symbol, is_default) values
  ('THB', 'Baht tailandés', '฿', true)
on conflict (code) do nothing;

-- app_config: fila única obligatoria
insert into app_config (id, logo_icon) values (true, 'Waves')
on conflict (id) do nothing;

-- nav_sections: claves usadas hoy en el código (App.jsx, sectionColor) —
-- cualquier clave que falte cae a un color por defecto, no rompe nada.
insert into nav_sections (key, label, color) values
  ('trabajo', 'Mi trabajo', '#0F766E'),
  ('log', 'Registro', '#0F766E'),
  ('comisiones', 'Comisiones', '#0E7C7B'),
  ('colegas', 'Compañeros', '#64748B')
on conflict (key) do nothing;

-- Dataset "ihasia" — idéntico al real de producción, para poder dar de
-- alta cuentas de prueba con scripts/create-demo-user.js sin cambios.
insert into setup_datasets (key, label) values ('ihasia', 'Ihasia')
on conflict (key) do nothing;

insert into setup_dataset_schools (dataset_id, name, color, is_default)
select id, 'Ihasia', '#000000', true from setup_datasets where key = 'ihasia'
on conflict (dataset_id, name) do nothing;

insert into setup_dataset_activities (dataset_id, name, color, is_default)
select id, v.name, v.color, v.is_default
from setup_datasets, (values
  ('Fun Dive 2T', '#b22cb4', false),
  ('Advanced', '#7a4a00', false),
  ('Refresh', '#3a88fe', false),
  ('Basic Diver', '#868686', false),
  ('Adventure Dive', '#ff9c0e', false),
  ('Try Scuba', '#00cbd2', false),
  ('Open Water', '#81b278', false),
  ('OW 2D', '#00dc83', true),
  ('Fun Dive 1T', '#b52fb9', false)
) as v(name, color, is_default)
where setup_datasets.key = 'ihasia'
on conflict (dataset_id, name) do nothing;

insert into setup_dataset_rates (dataset_id, school, activity, payment_type, rate, currency)
select id, 'Ihasia', v.activity, 'Per Person', v.rate, 'THB'
from setup_datasets, (values
  ('Try Scuba', 800),
  ('Refresh', 650),
  ('Open Water', 2000),
  ('OW 2D', 1500),
  ('Advanced', 2000),
  ('Fun Dive 2T', 300),
  ('Adventure Dive', 500)
) as v(activity, rate)
where setup_datasets.key = 'ihasia'
on conflict (dataset_id, school, activity, payment_type) do nothing;

insert into setup_dataset_commission_rates (dataset_id, school, activity, payment_type, rate, currency)
select id, 'Ihasia', v.activity, 'Per Person', v.rate, 'THB'
from setup_datasets, (values
  ('Try Scuba', 300),
  ('Open Water', 900),
  ('Advanced', 900)
) as v(activity, rate)
where setup_datasets.key = 'ihasia'
on conflict (dataset_id, school, activity, payment_type) do nothing;
