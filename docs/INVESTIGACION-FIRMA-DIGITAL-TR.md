# Investigación — Firma digital y validez legal de los Training Records

> Investigación puntual (Fase 7 del rediseño v2, 2026-09-07), no una
> decisión de arquitectura ya tomada. Registra los hallazgos, las
> fuentes, y una recomendación — la decisión de si/cuándo construir algo
> de esto sigue pendiente del usuario. Ver fila correspondiente en
> `docs/BACKLOG.md`.

## Encargo original

El usuario recibió información (de terceros, sin confirmar directamente
con SSI) de que SSI empezará a exigir que los Training Records no se
rellenen "a máquina". Preguntó: ¿existe algún API o conexión con SSI
para que el generador de Training Records de Ocean Flow imprima una
"firma digital" del alumno y dé más validez al documento? ¿O es
imposible? Se pidió investigar y analizar para llegar a una solución
viable, en modelo MVP.

Aclaración posterior del usuario, relevante para el alcance: el alumno
tendría que hacer login contra SSI para cualquier función interna de
SSI — la idea de fondo era ver si se puede integrar eso en Ocean Flow
para "simular su firma digital" al crear el alumno.

## Hallazgo principal: SSI ya tiene firma digital propia — dentro de MySSI, sin API pública conocida

SSI ya lanzó su propio sistema de **"Digital Signature Training
Records"**: los documentos de alumno se completan y firman
digitalmente, y quedan guardados en el perfil **MySSI** del alumno
([divessi.com, anuncio oficial](https://www.divessi.com/en/blog/digital-training-records-8708.html)).
Sus propios procedimientos de certificación especifican que instructor
y alumno deben "initial and sign the training completion record" al
completar cada sesión, y que los registros digitales válidos son los
verificados **dentro** de MySSI
([SSI EMS: Certification Procedures](https://training.divessi.com/index.php?id=22207880)).

No se encontró ningún indicio público de un API, SDK o portal de
desarrolladores de SSI para que un tercero (como Ocean Flow) se
integre con ese sistema — ni en su web, ni en foros de instructores. No
se puede descartar que exista un acuerdo de partner privado no
indexado por buscadores (frecuente en agencias B2B grandes), pero no es
verificable desde aquí.

**Conclusión más importante de esta investigación**: lo que el usuario
escuchó ("SSI va a pedir que no se rellene a máquina") es, con alta
probabilidad, el empuje de SSI hacia que sus propios instructores usen
**MySSI**, no un requisito genérico sobre qué tecnología de firma debe
llevar cualquier documento digital de terceros. Un Training Record
generado por Ocean Flow, fuera de MySSI, muy probablemente **no puede
llegar a ser "oficial" para SSI** sin que SSI lo reconozca
explícitamente — y ese reconocimiento depende de un acuerdo con SSI,
no de qué tecnología de firma le añada Ocean Flow por su cuenta.

## Qué sí es alcanzable: la validez legal del documento en sí (no el reconocimiento de SSI)

Es importante separar dos preguntas distintas que el encargo mezclaba:
1. ¿Puede Ocean Flow hacer que su Training Record sea "oficial para
   SSI"? — Ver conclusión de arriba: no de forma unilateral, sin un
   acuerdo con SSI.
2. ¿Puede Ocean Flow hacer que la firma del alumno en su propio
   documento tenga más peso legal como firma electrónica? — Esto sí es
   alcanzable, y es donde tiene sentido invertir esfuerzo de MVP.

Bajo eIDAS (el marco aplicable en la UE/España), una firma electrónica
simple es legalmente válida si demuestra tres elementos: **intención**
(acción deliberada de firmar), **atribución** (vinculada a quien firma,
vía email/timestamp/registro de autenticación) e **integridad** (que el
documento no se alteró después de firmarse)
([eEvidence, "What Is a Simple Electronic Signature"](https://blog.eevidence.com/en/what-is-a-simple-electronic-signature-and-when-is-it-legally-valid/);
[Scrive, "Three levels of electronic signature"](https://www.scrive.com/resources/trust-centre/eidas-electronic-signatures)).
La firma actual de Ocean Flow (trazo dibujado a mano en un `<canvas>`,
`signature_pad`) cubre "intención" pero no aporta nada de atribución ni
integridad por sí sola.

### Opción evaluada y descartada para el MVP: un proveedor de firma electrónica (DocuSign/Dropbox Sign/Adobe Sign)

Comparadas las tres APIs de firma electrónica más conocidas — ninguna
encaja con el volumen de un solo instructor freelance:

- **DocuSign**: el *embedded signing* (necesario aquí, no una firma vía
  email) se reserva para planes Enterprise con precio a medida, sin
  tarifa pública ([Verdocs, "DocuSign Pricing 2026"](https://verdocs.com/blog/docusign-pricing);
  [signeasy, "Docusign API pricing"](https://signeasy.com/blog/business/docusign-api-pricing)).
- **Dropbox Sign (antes HelloSign)**: la opción más asequible de las
  tres, pero el plan con *embedded signing* arranca en ~$100/mes
  ([SignWell, "Dropbox Sign API"](https://www.signwell.com/resources/dropbox-sign-api/)).
- **Adobe Acrobat Sign**: requiere acuerdo Developer/Enterprise desde
  $1.000-5.000/año, sin tarifa por llamada pública
  ([esign.ai, "Does Adobe Acrobat Sign charge for API calls"](https://www.esign.ai/blog/does-adobe-sign-charge-api-calls-or-envelopes)).

Ninguna de las tres da reconocimiento SSI — solo añadirían una firma
legalmente más fuerte del documento en sí, a un coste recurrente
desproporcionado para el tamaño actual del negocio (coste claramente
por encima del beneficio real, criterio de arquitectura de
`CLAUDE.md`).

## Recomendación (modelo MVP)

1. **No contratar ningún proveedor de firma electrónica de pago ahora
   mismo** — el coste (≥$100/mes recurrente + integración real de
   webhooks/SDK) no está justificado por el problema real: no
   resolvería el reconocimiento SSI, que es lo que de verdad se pidió,
   y el volumen de un instructor no lo amortiza.
2. **Sí construir, sin coste añadido**: reforzar la firma que ya existe
   con los tres elementos legales reales de una firma electrónica
   simple válida —
   - **Intención**: un checkbox explícito ("He leído y confirmo...")
     antes de poder firmar, en vez de que dibujar el trazo sea la única
     acción.
   - **Atribución**: guardar junto a la firma el timestamp exacto del
     momento de la firma (ya se tiene fecha de generación, pero no
     necesariamente el instante preciso de la firma en sí).
   - **Integridad**: calcular y guardar un hash SHA-256 del PDF final
     generado, para poder demostrar después que ese documento concreto
     no se alteró tras firmarse.
   Esto deja el documento de Ocean Flow con una firma electrónica
   simple defendible bajo eIDAS, sin depender de SSI ni de ningún
   proveedor de pago — no implementado todavía en este commit (es
   investigación + recomendación, la implementación queda para cuando
   el usuario decida priorizarla, ver `docs/BACKLOG.md`).
3. **El paso de mayor valor real, y no es técnico**: preguntar
   directamente a SSI (Training Center/Service Center) qué van a
   exigir exactamente y si existe algún tipo de partnership o API para
   centros — antes de invertir más tiempo de ingeniería, porque si la
   respuesta es "tiene que hacerse en MySSI", ninguna integración de
   Ocean Flow lo resuelve.

## Sobre la aclaración de "login contra SSI para simular su firma"

No se investigó ni se propone simular un login de SSI dentro de Ocean
Flow — aparte de que no hay API pública conocida con la que
integrarse (ver hallazgo principal), "simular" una firma o
autenticación de un sistema de terceros sin su colaboración no le daría
ninguna validez real ante SSI y podría plantear un problema de
representación indebida frente a una marca de certificación de un
tercero. Si en el futuro SSI confirma un programa de partners con
acceso a MySSI, esa sería la vía real a explorar — no una simulación.
