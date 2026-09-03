// Un paso numerado de la sección "Pasos" de un artículo.
//
// Rediseño 2026-09-04 ("Ayuda fácil de entender"): el número en sí lleva
// el color de la sección (`accentColor`, heredado de `nav_sections` vía
// HelpTab.jsx/content.js) en vez de un círculo gris neutro — mismo
// principio de "categorías identificadas por color" que ya usaba el
// icono de cabecera de cada categoría, aplicado también aquí para que
// los pasos se lean como una secuencia de un vistazo.
export default function HelpStep({ index, text, accentColor }) {
  return (
    <li className="flex gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
        style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
      >
        {index}
      </span>
      <p className="flex-1 pt-0.5 text-sm text-gray-700">{text}</p>
    </li>
  );
}
