// Un paso numerado de la sección "Pasos" de un artículo.
//
// Rediseño 2026-09-04 ("Ayuda fácil de entender" — ver comentario en
// content.js sobre por qué se retiran las capturas de pantalla): antes
// tenía soporte para una imagen por paso (`image: { src, alt }`,
// generada con scripts/capture-help-screenshots.mjs); se retira porque
// el CUERPO de esas capturas seguía mostrando datos reales del dataset
// de prueba, no presentable a un usuario real (mismo motivo por el que
// WhatsNew.jsx nunca ha usado capturas).
export default function HelpStep({ index, text }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-500">
        {index}
      </span>
      <p className="flex-1 pt-0.5 text-sm text-gray-700">{text}</p>
    </li>
  );
}
