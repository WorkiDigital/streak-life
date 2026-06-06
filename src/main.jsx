import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Restore saved theme before first render
const savedTheme = localStorage.getItem('evolui-theme')
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme)

// Mantem o PWA atualizado tambem em desktop, onde o service worker pode segurar bundle antigo.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true)
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    setInterval(() => registration.update(), 60 * 60 * 1000)
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
