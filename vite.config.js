import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
    plugins: [react(), tailwindcss(), localApiRoutes()],
    server: {
      host: true,
      allowedHosts: ['.trycloudflare.com'],
    },
    test: {
      environment: 'jsdom',
      setupFiles: './vitest.setup.js',
      globals: true,
    },
  }
})
