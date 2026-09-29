import { defineConfig, loadEnv } from 'vite'
import { configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// api/*.js (Vercel) es un adaptador fino sobre server/users/*.js — recibe
// {method, headers, body} y devuelve {status, payload}, sin nada
// específico de Vercel (ver comentarios en esos propios archivos). Bajo
// `vite dev` puro no existe ningún runtime de funciones serverless:
// cualquier fetch("/api/...") devuelve 404 (confirmado al investigar "no
// puedo eliminar usuarios: me da error" — no era un bug de deleteUser.js,
// era que /api/delete-user nunca llega a ejecutarse en local). Este plugin
// es un SEGUNDO adaptador, solo para el propio servidor de desarrollo de
// Vite — monta los mismos handlers sin nada nuevo que mantener.
// `configureServer` solo se ejecuta en `vite`/`vite dev`, nunca en
// `vite build`, así que no aparece en el bundle de producción.
//
// Los handlers se importan de forma DINÁMICA, dentro de configureServer, no
// arriba del archivo con un `import` estático: server/supabaseAdmin.js lee
// SUPABASE_SERVICE_ROLE_KEY de process.env en una constante de módulo,
// evaluada una sola vez al cargar el módulo. Un `import` estático se
// resuelve antes que cualquier otra línea del archivo (hoisting), así que
// se ejecutaría antes de que Object.assign(process.env, loadEnv(...)) de
// más abajo llegue a rellenar esa variable — y supabaseAdmin.js capturaría
// `undefined` para siempre. El import() dinámico, en cambio, se ejecuta en
// el momento en que se llama, así que puede colocarse después de rellenar
// process.env.
function localApiRoutes() {
  return {
    name: 'local-api-routes',
    configureServer(server) {
      let routesPromise
      const getRoutes = () => {
        if (!routesPromise) {
          routesPromise = Promise.all([
            import('./server/users/createUser.js'),
            import('./server/users/updateAdminStatus.js'),
            import('./server/users/deleteUser.js'),
            import('./server/users/setUserActive.js'),
            import('./server/users/listUserStatus.js'),
            import('./server/users/regenerateActivationLink.js'),
            import('./server/users/regeneratePassword.js'),
            import('./server/users/requestPasswordReset.js'),
            import('./server/users/externalRegister.js'),
          ]).then(([createUser, updateAdminStatus, deleteUser, setUserActive, listUserStatus, regenerateActivationLink, regeneratePassword, requestPasswordReset, externalRegister]) => ({
            '/api/create-user': createUser.handleCreateUser,
            '/api/update-admin-status': updateAdminStatus.handleUpdateAdminStatus,
            '/api/delete-user': deleteUser.handleDeleteUser,
            '/api/set-user-active': setUserActive.handleSetUserActive,
            '/api/list-user-status': listUserStatus.handleListUserStatus,
            '/api/regenerate-activation-link': regenerateActivationLink.handleRegenerateActivationLink,
            '/api/regenerate-password': regeneratePassword.handleRegeneratePassword,
            '/api/request-password-reset': requestPasswordReset.handleRequestPasswordReset,
            '/api/external-register': externalRegister.handleExternalRegister,
          }))
        }
        return routesPromise
      }

      server.middlewares.use(async (req, res, next) => {
        const routes = await getRoutes()
        const handler = routes[req.url]
        if (!handler) return next()
        let body = ''
        req.on('data', (chunk) => { body += chunk })
        req.on('end', async () => {
          try {
            const { status, payload } = await handler({ method: req.method, headers: req.headers, body })
            res.statusCode = status
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(payload))
          } catch (err) {
            console.error('[local-api-routes]', req.url, err)
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Error interno del servidor de desarrollo.' }))
          }
        })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Ver nota de localApiRoutes(): esto debe ejecutarse antes de que se
  // importe cualquier módulo que lea process.env en una constante de
  // módulo — por eso va aquí, antes de construir los plugins, y por eso
  // localApiRoutes() usa import() dinámico en vez de un import estático.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))

  return {
    plugins: [
      react(),
      tailwindcss(),
      localApiRoutes(),
      // Service Worker (auditoría PWA/SEO, 2026-09-29) — alcance
      // deliberadamente mínimo: cachea solo el shell estático de la app
      // (JS/CSS/HTML/iconos ya construidos), nunca datos de Supabase ni
      // ninguna llamada a /api/* (excluida explícitamente de
      // navigateFallback y sin ninguna entrada runtimeCaching). Con eso
      // basta para lo que de verdad aporta un Service Worker aquí: que
      // Chrome/Android considere la app instalable de forma nativa
      // (criterio real, ver web.dev/articles/install-criteria) y que el
      // shell cargue aunque la conexión falle justo al abrir — la app
      // sigue necesitando red real para cualquier dato (Supabase), eso no
      // cambia ni se pretende que cambie.
      // manifest: false — ya existe public/manifest.json, enlazado a mano
      // en index.html; no hace falta que este plugin genere uno segundo.
      VitePWA({
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
          // Los 3 chunks de PDF (pdfWorkerEntry/pdfToJpg/generateExportReportPdf)
          // son import() dinámico, cargados solo al exportar/convertir un
          // PDF — no forman parte del "shell" que este Service Worker
          // debe precachear, y entre los tres suman ~4.6 MB que inflarían
          // el precache sin aportar nada al objetivo real (que la app
          // abra aunque falle la conexión justo al entrar). El navegador
          // los sigue pidiendo normalmente cuando de verdad hacen falta.
          globIgnores: ['**/pdfWorkerEntry-*.js', '**/pdfToJpg-*.js', '**/generateExportReportPdf-*.js'],
          // El bundle principal (core de React + toda la app, no lazy)
          // pesa ~2.6 MB, por encima del límite por defecto de Workbox
          // (2 MiB) — se sube lo justo para que quepa, no un valor
          // arbitrariamente alto.
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
      }),
    ],
    server: {
      host: true,
      allowedHosts: ['.trycloudflare.com'],
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.js',
      globals: true,
      // Sin esto, Vitest recorre también .claude/worktrees/** (checkouts
      // completos de git worktree para agentes en paralelo, cada uno con
      // su propio node_modules) y ejecuta sus tests A LA VEZ que los del
      // propio checkout — encontrado en vivo la noche del despliegue de
      // v1.0.0 (2026-09-04): con 8 agentes trabajando en paralelo, `npm
      // run test` desde el checkout principal recogía y ejecutaba también
      // los test files de dentro de cada worktree, multiplicando la carga
      // real varias veces y provocando timeouts en tests sin ninguna
      // relación con el cambio real (contención de CPU, no un bug). El
      // exclude por defecto de Vitest ya cubre node_modules/dist/.git,
      // pero no .claude — se añade explícitamente sobre esa base, no en
      // vez de ella (configDefaults.exclude, no una lista inventada).
      exclude: [...configDefaults.exclude, '**/.claude/**'],
    },
  }
})
