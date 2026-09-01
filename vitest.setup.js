import '@testing-library/jest-dom/vitest';
// i18next se inicializa aquí (no solo en main.jsx) para que cualquier
// componente que use useTranslation() funcione en tests sin que cada
// archivo de test tenga que importar src/i18n a mano. Los tests existentes
// que hacen screen.getByText("...") en español siguen funcionando sin
// cambios porque el idioma por defecto/de test es 'es' y el texto en
// es.json es idéntico, palabra por palabra, al que había hardcodeado antes
// (Release V1, Fase 2 — multidioma).
import './src/i18n';
