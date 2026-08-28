// Paleta de marca de Ocean Flow — sin ninguna dependencia propia a
// propósito. Vivía antes dentro de App.jsx, pero shared.jsx ya importaba
// esos mismos colores desde ahí (para ToastProvider/ConfirmDialog/etc,
// siempre dentro de una función o de JSX, nunca en el cuerpo del módulo) —
// un ciclo App.jsx ⇄ shared.jsx que llevaba tiempo siendo frágil en
// silencio. Se rompió de verdad al añadir MOVEMENT_TYPE_META (un export de
// shared.jsx que sí lee el VALOR de estos colores en el cuerpo del propio
// módulo, no dentro de una función): bajo el orden real de módulos ES de
// Vite en desarrollo, shared.jsx podía terminar de cargar antes de que
// App.jsx hubiera llegado a declarar estas constantes, y saltaba
// "Cannot access 'TEAL' before initialization". Este archivo, sin
// imports propios, hace que ese ciclo deje de poder producirse nunca —
// App.jsx sigue re-exportando estos nombres para no tocar ningún import
// existente en el resto de la app (`import { TEAL, ... } from "./App"`
// sigue funcionando igual en todos los sitios).
export const NAVY = "#0F172A";
export const TEAL = "#0F766E";
export const AQUA = "#0D9488";
export const CORAL = "#C2542F";
export const GREEN = "#15803D";
export const SUN = "#B45309";
export const BG = "#F7F8F8";
