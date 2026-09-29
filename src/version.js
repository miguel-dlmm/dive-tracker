// Versión de producto mostrada en "Qué hay de nuevo" (ver WhatsNew.jsx) y
// usada para decidir si ya se ha visto — ver docs/ADR/0010-proceso-de-release.md,
// que fija que redactar esas novedades pasa a ser parte de preparar cada
// release. Se actualiza a mano en el mismo commit que mueve `## Unreleased`
// a `## [X.Y.Z]` en CHANGELOG.md — deliberadamente no se lee de package.json
// (ese número de versión no se ha mantenido al día históricamente en este
// proyecto) ni se genera en build time, para que sea un cambio explícito y
// revisable, no un efecto secundario silencioso del build.
//
// Excepción en v1.4.0 (2026-09-26, pedido explícito): esta release NO
// actualiza "Qué hay de nuevo" ni quiere volver a mostrárselo a los
// usuarios que ya lo vieron — por eso `APP_VERSION` se queda deliberadamente
// en "1.3.1" (la del contenido de WhatsNew vigente) aunque CHANGELOG.md y
// el tag de git sí avancen a v1.4.0. Sincronizar de nuevo con la versión
// real del changelog en la próxima release que sí traiga WhatsNew nuevo.
//
// v1.5.1 (2026-09-27, hotfix directo a producción): sí trae WhatsNew
// nuevo — el usuario aprobó el texto exacto de las 4 diapositivas en el
// chat antes de comitearlas (generador de informe PDF, Training Records
// más ligeros, portada renovada, Mi perfil reestructurado), cumpliendo
// la regla del addendum 2026-09-09 de arriba. `APP_VERSION` se sincroniza
// con la versión real por primera vez desde v1.3.1.
//
// v1.6.0 (2026-09-27): mismo criterio que v1.4.0 — esta release no trae
// diapositivas nuevas de WhatsNew (solo una corrección de redacción en
// una diapositiva ya existente de v1.5.1, y una funcionalidad nueva, el
// tour de bienvenida, que ya tiene su propio mecanismo de "una vez" y no
// es contenido para usuarios existentes). `APP_VERSION` se queda en
// "1.5.1" a propósito, para no volver a mostrarles "Qué hay de nuevo" a
// quienes ya lo vieron. Sincronizar de nuevo con la versión real en la
// próxima release que sí traiga diapositivas nuevas.
//
// v1.7.0, segunda vuelta (2026-09-28, pedido explícito ya con la sesión
// anterior dormida: "muestra un whats new en el próximo despliegue a pro,
// libro de koh tao disponible, una única slide... explica q el acceso
// está en la home"): sí trae WhatsNew nuevo — una única diapositiva
// anunciando el libro digital ya desplegado en v1.7.0 (que en su momento
// no llevó anuncio, ver nota de arriba). Texto redactado por Claude según
// pedido explícito del usuario ("piensa tú el texto"), sin aprobación
// palabra por palabra previa por no haber nadie despierto para dársela —
// preparado en `develop`, sin tocar `main` todavía; revisar el texto
// exacto antes de que este cambio llegue a producción.
//
// v1.8.0 (2026-09-29): el texto de la diapositiva del libro de Koh Tao se
// mostró y se aprobó palabra por palabra antes de preparar esta release
// (ADR-0010, addendum 2026-09-09) — el usuario pidió sustituir ", con
// búsqueda instantánea." por ". ¡Ahora puedes buscar el punto de buceo
// directamente!" en los 15 idiomas. Esta es la primera vez que ese
// contenido llega de verdad a producción (main seguía en "1.5.1"), así
// que `APP_VERSION` se sincroniza con "1.8.0" para que se muestre a todo
// el mundo.
//
// v1.9.0 (2026-09-29, pedido explícito: "q se mantenga el whatsnew
// antiguo a quien todavía no le haya salido"): mismo criterio que
// v1.4.0/v1.6.0 — esta release no trae ninguna diapositiva nueva
// (idioma por parámetro en la landing, email traducido a 15 idiomas,
// auditoría PWA/SEO — nada de eso es contenido para anunciar en "Qué
// hay de nuevo"). `APP_VERSION` se queda en "1.8.0" a propósito.
export const APP_VERSION = "1.8.0";
