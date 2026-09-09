-- Dataset "prueba" — pedido explícito 2026-09-09: "crea un dataset copia
-- de ihasia que se llame prueba, crea una escuela de prueba con los
-- cursos del dataset ihasia y las tarifas del dataset ihasia pero ahora
-- es un dataset genérico de pruebas. Crear los usuarios a partir de ahora
-- con el dataset de pruebas y no con el de ihasia, será el nuevo
-- comportamiento por defecto".
--
-- Motivo: "ihasia" es la escuela real de la cuenta real del usuario
-- (migueldlmm@gmail.com) — cualquier alta nueva (registro externo, alta
-- por admin) heredaba hasta ahora ese catálogo real como punto de
-- partida (clone_setup_dataset(), schema.sql), mezclando datos de
-- pruebas de cuentas nuevas con el propio catálogo de producción del
-- usuario. Este dataset copia la MISMA estructura (mismos cursos y
-- tarifas, mismas monedas) pero con una escuela genérica "Escuela de
-- prueba" en vez de "Ihasia" — mismo valor de partida para probar la
-- app, sin implicar que una cuenta nueva ya "es" la escuela real del
-- usuario.
--
-- Solo cambia qué dataset es is_default (afecta a altas FUTURAS) — no
-- toca ninguna fila ya existente de schools/activities/rates de ninguna
-- cuenta ya creada.

insert into public.setup_datasets (key, label, is_active, is_default)
values ('prueba', 'Prueba', true, false)
on conflict (key) do nothing;

insert into public.setup_dataset_schools (dataset_id, name, color, is_default)
select id, 'Escuela de prueba', '#000000', true
from public.setup_datasets where key = 'prueba'
on conflict (dataset_id, name) do nothing;

insert into public.setup_dataset_activities (dataset_id, name, color, is_default)
select d.id, a.name, a.color, a.is_default
from public.setup_dataset_activities a
join public.setup_datasets src on src.id = a.dataset_id and src.key = 'ihasia'
join public.setup_datasets d on d.key = 'prueba'
on conflict (dataset_id, name) do nothing;

insert into public.setup_dataset_rates (dataset_id, school, activity, payment_type, rate, currency)
select d.id, 'Escuela de prueba', r.activity, r.payment_type, r.rate, r.currency
from public.setup_dataset_rates r
join public.setup_datasets src on src.id = r.dataset_id and src.key = 'ihasia'
join public.setup_datasets d on d.key = 'prueba'
on conflict (dataset_id, school, activity, payment_type) do nothing;

insert into public.setup_dataset_commission_rates (dataset_id, school, activity, payment_type, rate, currency)
select d.id, 'Escuela de prueba', r.activity, r.payment_type, r.rate, r.currency
from public.setup_dataset_commission_rates r
join public.setup_datasets src on src.id = r.dataset_id and src.key = 'ihasia'
join public.setup_datasets d on d.key = 'prueba'
on conflict (dataset_id, school, activity, payment_type) do nothing;

-- Nuevo comportamiento por defecto: "prueba", no "ihasia" — el índice
-- único setup_datasets_single_default exige exactamente un default, así
-- que se desactiva ihasia ANTES de activar prueba (nunca los dos a la vez).
update public.setup_datasets set is_default = false where key = 'ihasia';
update public.setup_datasets set is_default = true where key = 'prueba';

-- Rollback (documentado antes de ejecutar, por si hiciera falta revertir):
-- update public.setup_datasets set is_default = false where key = 'prueba';
-- update public.setup_datasets set is_default = true where key = 'ihasia';
-- delete from public.setup_dataset_commission_rates where dataset_id = (select id from public.setup_datasets where key = 'prueba');
-- delete from public.setup_dataset_rates where dataset_id = (select id from public.setup_datasets where key = 'prueba');
-- delete from public.setup_dataset_activities where dataset_id = (select id from public.setup_datasets where key = 'prueba');
-- delete from public.setup_dataset_schools where dataset_id = (select id from public.setup_datasets where key = 'prueba');
-- delete from public.setup_datasets where key = 'prueba';
