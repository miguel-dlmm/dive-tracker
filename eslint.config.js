import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist: build de producción (vite build). .vercel: build/cache local de
  // `vercel dev`/`vercel build` — gitignored, nunca comiteado, pero sin
  // esto `npm run lint` local igual lo recorre y reporta cientos de
  // falsos positivos sobre JS ya minificado (detectado 2026-09-03,
  // auditoría previa a fusionar Release-V1 en develop).
  globalIgnores(['dist', '.vercel']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Auditoría 2026-09-03, previa a fusionar Release-V1 en develop
      // (con vistas a producción): desactivada toda la familia de reglas
      // de "preparación para React Compiler" que trae la versión más
      // reciente de eslint-plugin-react-hooks/react-refresh. Este
      // proyecto no adopta React Compiler (CLAUDE.md no lo menciona
      // entre el stack, y no hay plan de adoptarlo) — sin él, estas
      // reglas no protegen de ningún bug real, solo son más estrictas
      // que las propias garantías de React normal:
      // - set-state-in-effect: marca como error CUALQUIER setState
      //   dentro de un efecto, incluido "fetch on mount"
      //   (useEffect(() => { load(); }, [])), patrón correcto y
      //   deliberado usado en toda la app (useSupabaseTable.js y varias
      //   pantallas). ~12 falsos positivos sobre código ya revisado.
      // - refs: marca como error escribir en un ref durante el render,
      //   incluso en el patrón condicional que react.dev documenta como
      //   seguro ("Store information from previous renders" — solo
      //   escribe si el valor cambió). Es exactamente lo que hace
      //   useRetained (ConfigTab.jsx) para no perder el dato de una hoja
      //   mientras termina su animación de salida.
      // - preserve-manual-memoization: asume que el propio React
      //   Compiler va a re-memoizar el componente, así que cualquier
      //   dependencia de un useMemo/useCallback existente que "podría"
      //   mutar más tarde es un error — sin el compilador real
      //   ejecutándose, esa re-memoización nunca pasa, así que la regla
      //   solo repite información ya cubierta por exhaustive-deps.
      // - react-refresh/only-export-components: asume que cada archivo
      //   .jsx exporta solo componentes, para que el fast refresh de
      //   Vite pueda recargarlos en caliente sin perder estado. Varias
      //   pantallas exportan además una utilidad pequeña y muy ligada a
      //   su propio estado local (p. ej. HelpTab.jsx → clearStoredHelpOpen,
      //   ConfigTab.jsx → setStoredSection) — deliberado, no descuido; y
      //   shared.jsx es directamente una librería de componentes propia
      //   (ver CLAUDE.md, "Estructura") que mezcla componentes, hooks y
      //   utilidades puras a propósito. El coste (perder fast refresh en
      //   esos archivos concretos al tocar la utilidad) es aceptable
      //   frente al ruido de ~20 falsos positivos en cada `npm run lint`.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-refresh/only-export-components": "off",
    },
  },
  {
    files: ['api/**/*.js', 'server/**/*.js', 'scripts/**/*.js', 'vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.test.{js,jsx}'],
    languageOptions: {
      globals: globals.vitest,
    },
  },
])
