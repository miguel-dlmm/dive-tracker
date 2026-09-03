import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
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
      // Bloque final del job nocturno 2026-09-03 (análisis de código):
      // esta regla, nueva en eslint-plugin-react-hooks, marca como error
      // CUALQUIER setState dentro de un efecto — incluido el patrón
      // "fetch on mount" (useEffect(() => { load(); }, [])) que
      // useSupabaseTable.js y varias pantallas usan de forma correcta y
      // deliberada en toda la app. Generaba ~12 falsos positivos sobre
      // código ya revisado, no un problema real — desactivada para que
      // `npm run lint` vuelva a ser una señal de fiar en vez de ruido.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ['netlify/functions/**/*.js', 'api/**/*.js', 'server/**/*.js', 'scripts/**/*.js'],
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
