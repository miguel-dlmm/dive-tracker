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
// Misma excepción en v1.5.0 (2026-09-27): tampoco hay texto de
// diapositivas aprobado para el rediseño de portada de esta release
// (regla del proyecto: el copy exacto de WhatsNew necesita aprobación
// explícita antes de comitearse, no basta una descripción en abstracto
// del cambio — ver docs/ADR/0010-proceso-de-release.md, addendum
// 2026-09-09). `APP_VERSION` se queda otra vez en "1.3.1" a propósito.
export const APP_VERSION = "1.3.1";
