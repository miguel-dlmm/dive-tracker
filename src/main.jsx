import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initBotId } from 'botid/client/core'
import './index.css'
import './i18n'
import App from './App.jsx'

// Vercel BotID (Fase 9, 2026-09-07, aprobado explícitamente por el
// usuario) — protege el registro externo (/api/external-register, el
// único endpoint público sin sesión que crea cuentas reales) contra
// altas masivas automatizadas. Nivel Basic (gratis en cualquier plan,
// suficiente hoy) — Deep Analysis es de pago y solo en plan Pro, sin
// necesidad todavía. initBotId() aquí, antes del render, es lo que la
// propia guía de Vercel pide para frameworks sin Next.js — decide qué
// peticiones llevan el desafío adjunto, checkBotId() en el servidor
// (externalRegister.js) es quien de verdad comprueba el resultado.
initBotId({
  protect: [{ path: '/api/external-register', method: 'POST' }],
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
