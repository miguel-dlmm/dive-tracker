# Ocean Flow — Visión de producto

> Documento vivo. Se actualiza cuando cambia una decisión de producto, no
> solo cuando alguien se acuerda. Si algo aquí ya no es cierto, es un bug
> de documentación tan real como uno de código.

## Qué es Ocean Flow hoy

Una herramienta profesional para que **un instructor de buceo freelance**
lleve el control de su actividad económica: qué ha impartido, qué le deben,
qué ha ganado, cómo se compara entre escuelas/actividades, y cuáles son sus
tarifas.

> Nombre: hasta el 2026-08-30 el producto se llamaba "Ocean Pulse", "de la
> marca personal Ocean Flow". Se renombró a un único nombre, "Ocean Flow",
> en toda la interfaz visible al usuario — ver CHANGELOG.md.

No es (todavía) una herramienta para que un centro de buceo gestione a
varios instructores. Existe infraestructura de autenticación, roles y
aprovisionamiento de cuentas porque el operador actual (ver más abajo) la
necesita para dar de alta instructores como cuentas independientes — **no**
porque el producto esté diseñado para organizaciones con jerarquías,
equipos o permisos entre usuarios de una misma cuenta.

## Qué problemas resuelve

Antes de Ocean Flow, un instructor freelance lleva esto a mano (notas,
Excel, la cabeza): calcular tarifas por escuela/actividad cada vez,
saber cuánto le debe cada escuela y si ya se lo han pagado, saber cuánto
ha ganado en un periodo, y llevar la cuenta de quién le debe o a quién
le debe él a un compañero por cubrirse turnos o referirse clientes.
Ocean Flow resuelve estos cuatro problemas con captura rápida (registrar
en segundos, sin repetir cálculos) y una fuente única para "cuánto" y
"quién debe qué".

## Usuario objetivo

**El instructor individual.** Necesita, en este orden de frecuencia de uso:

1. Registrar rápido lo que ha hecho hoy (clase impartida, cliente referido,
   ajuste con un compañero).
2. Saber qué le deben ahora mismo.
3. Saber cuánto ha ganado este mes.
4. Analizar productividad por escuela/actividad en periodos más largos.
5. Mantener sus tarifas y catálogos (escuelas, actividades, tipos/estados
   de pago) al día.

## El operador

Hoy el operador del producto es una sola persona (quien mantiene este
repositorio), actuando como superadmin. El sistema de roles/auth existe
para que el operador pueda dar de alta instructores como cuentas nuevas —
no para que un instructor gestione a otros usuarios dentro de su propia
cuenta.

## Explícitamente fuera de alcance por ahora

No se diseña ni se construye todavía para:

- Centros de buceo con varios instructores compartiendo una cuenta.
- Equipos, managers o jerarquías organizativas.
- Permisos granulares entre usuarios de una misma organización.

Estas posibilidades se mantienen abiertas (el modelo de datos con
`user_id` por fila y roles a nivel de `profiles` no las bloquea), pero no
son un requisito a optimizar hoy. Cuando se conviertan en una necesidad
real, es una decisión de producto nueva, con su propio ADR — no una
consecuencia automática de "ya tenemos roles".

## Principios de producto y evolución

1. **No abstraer para escenarios que no existen todavía.** Si un concepto
   de negocio (p. ej. `payment_type`) no tiene un caso de uso real hoy, no
   se mantiene "por si acaso" — se elimina. Añadir flexibilidad para un
   futuro hipotético sale más caro de mantener que añadirla cuando el
   futuro llega de verdad.
2. **El modelo de datos debe representar cómo piensa el instructor**, no
   conceptos técnicos sin equivalente en su cabeza. Si una tabla o campo
   no corresponde a algo que el instructor reconocería como parte de su
   trabajo, es una señal de que el modelo se ha desviado del dominio real.
3. **Resolver primero con UX o navegación, después con arquitectura.**
   Antes de proponer un cambio de modelo de datos o estructural, agotar
   si el problema se resuelve reorganizando la interfaz, reutilizando un
   componente, o con un ajuste de flujo.
4. **Simplificar es una tarea continua, no una fase.** No se espera a
   tener "muchos usuarios" para corregir una decisión de diseño mejorable
   — es más barato hacerlo ahora que después.

## Principios de trabajo

1. **Decidir antes de construir.** Cada cambio con impacto real pasa por:
   entender el problema → alternativas → pros/contras → recomendación →
   entregable pequeño. Ver `docs/BACKLOG.md` y `docs/ADR/`.
2. **La solución más barata que resuelve el problema real gana**, aunque
   una más elaborada sea técnicamente más "correcta". Antes de tocar
   arquitectura o modelo de datos: ¿se resuelve con UX? ¿reorganizando
   navegación? ¿reutilizando un componente?
3. **Iteraciones pequeñas y desplegables.** Nada de migraciones grandes
   sin una decisión explícita y documentada primero.
4. **La conversación no es la fuente de verdad.** Las decisiones que
   importan se escriben en `docs/ADR/` o `docs/BACKLOG.md`, no solo en el
   historial de chat.
5. Se mantienen además las convenciones de `CLAUDE.md` (patrones de UI,
   reglas de commits/tests, nada de configuración de negocio hardcodeada).

## Estado de las decisiones abiertas

Ver `docs/BACKLOG.md` para el detalle priorizado y `docs/ADR/` para las
decisiones de arquitectura ya tomadas.
