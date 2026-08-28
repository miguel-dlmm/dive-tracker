# ADR 0011 — Rediseño de Ayuda: contenido reescrito + menú agrupado

**Fecha:** 2026-08-29
**Estado:** Aprobado e implementado (sesión nocturna autónoma, ver
`docs/SESSION-2026-08-28-rediseno-global.md`).

## Contexto

El contenido de Ayuda (`src/help/content.js`) describía una versión de
la app que ya no existe: Registro/Comisiones/Compañeros/Pagos como
pantallas separadas, "Ganado este mes" (ahora "Generado"), pestañas
horizontales en Configuración, ninguna mención a Mi trabajo ni al
rediseño de Resumen de esta misma sesión. Mantenerlo tal cual habría
significado enseñarle a un usuario real una app que ya no coincide con
lo que tiene delante.

## Decisión

### Contenido reescrito por completo

Mismo esqueleto de artículo que ya existía (`whatYouCanDo`/
`whenToUseIt`/`steps`/`tips`/`expectedResult`, renderizado por
`HelpArticleView.jsx`) — no se rediseñó ese formato porque ya cumplía
bien "pasos, consejos, resultado esperado" sin necesitar nada más. Lo
que cambia es el contenido: reescrito entero para describir Mi trabajo,
Home, Resumen y Configuración tal como quedaron tras esta sesión.

### Menú agrupado en "Quiero..." / "Funcionalidades"

`HELP_CATEGORIES` gana un campo opcional `group` (`"quiero"` |
`"funcionalidades"` | sin valor). `HelpCategoryList.jsx` agrupa por esa
clave con cabeceras de sección — mismo patrón visual que el menú de
Configuración de `ConfigTab.jsx` (`ADR-0008`): fila con icono + título +
descripción + chevron, agrupada bajo un título en mayúsculas. Reutilizar
el patrón en vez de inventar uno propio para Ayuda cumple directamente
el criterio del proyecto de que aprender una pantalla facilite usar las
demás.

- **"Quiero..."** (historias de uso, orientadas a una acción): Registrar
  un movimiento, Cobrar movimientos pendientes, Consultar cuánto has
  generado, Configurar tu aplicación.
- **"Funcionalidades"** (referencia por pantalla, para quien ya sabe qué
  quiere hacer): Mi trabajo, Resumen, Configuración, Filtros y búsqueda.
- **"Primeros pasos"** queda suelta, sin cabecera de grupo, siempre
  primera — no encaja en ninguno de los dos grupos (es contexto general,
  no una acción ni una pantalla).

### Sin capturas de pantalla, misma decisión que en "Qué hay de nuevo"

Se evaluaron capturas reales de esta sesión (Home, Mi trabajo, Resumen)
para ilustrar los pasos — ninguna era presentable: mostraban el nombre
de la cuenta de desarrollo ("dev-bypass") y datos de prueba repetidos
acumulados durante la noche. `HelpStep.jsx` ya soporta un campo `image`
opcional (sin usar desde antes de esta sesión) para cuando existan
capturas limpias generadas a propósito — no se ha tocado ese mecanismo,
solo se ha decidido no usarlo todavía con material no presentable.

## Efecto secundario encontrado y corregido: scroll no se reinicia al cambiar de pestaña

Verificando el nuevo menú agrupado con `mobile-check`, la cabecera
"Quiero..." y la tarjeta "Primeros pasos" no aparecían en la primera
captura — no por un fallo del contenido, sino porque `AppShell`
(`App.jsx`) nunca reiniciaba el scroll de la página al cambiar de
pestaña. Tras hacer scroll en Resumen (para comprobar la cabecera
sticky) y entrar en Ayuda, la pantalla nueva heredaba la posición de
scroll de la anterior, mostrando el menú a mitad en vez de desde arriba.

No es un problema del rediseño de Ayuda ni de ninguna pantalla en
concreto — es la navegación entre pestañas en general, así que la
corrección vive en `AppShell` (`useEffect(() => window.scrollTo(0, 0),
[tab])`), no en una pantalla suelta. Cualquier cambio de pestaña futuro
queda protegido por el mismo efecto.

## Consecuencias

- El contenido de Ayuda vuelve a describir la app real; un usuario que
  lo siga hoy llega al resultado que promete.
- El menú agrupado dejó sitio, sin coste adicional, para futuras
  categorías en cualquiera de los dos grupos sin rediseñar la pantalla.
- El fix de scroll-al-cambiar-de-pestaña beneficia a toda la
  navegación, no solo a Ayuda — un efecto colateral positivo de validar
  visualmente con `mobile-check` en vez de dar el contenido por bueno
  solo con el build pasando.
