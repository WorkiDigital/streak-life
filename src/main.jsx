import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Restore saved theme before first render
const savedTheme = localStorage.getItem('evolui-theme')
if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme)

// Auto-update SW sem travar carregamento
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
