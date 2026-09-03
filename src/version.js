// Versión de producto mostrada en "Qué hay de nuevo" (ver WhatsNew.jsx) y
// usada para decidir si ya se ha visto — ver docs/ADR/0010-proceso-de-release.md,
// que fija que redactar esas novedades pasa a ser parte de preparar cada
// release. Se actualiza a mano en el mismo commit que mueve `## Unreleased`
// a `## [X.Y.Z]` en CHANGELOG.md — deliberadamente no se lee de package.json
// (ese número de versión no se ha mantenido al día históricamente en este
// proyecto) ni se genera en build time, para que sea un cambio explícito y
// revisable, no un efecto secundario silencioso del build.
export const APP_VERSION = "1.0.0";
