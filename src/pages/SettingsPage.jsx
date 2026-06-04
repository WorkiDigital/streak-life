import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../lib/push'
import {
  User, Bell, BellOff, LogOut,
  Loader2, Shield, Sun, Moon
} from 'lucide-react'
import './SettingsPage.css'

const TOM_OPTIONS = [
  { value: 'amigavel', label: 'Amigável 😊' },
  { value: 'direto', label: 'Direto 🎯' },
  { value: 'motivacional', label: 'Motivacional 🔥' },
]

export default function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [nome, setNome] = useState(profile?.nome || '')
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp || '')
  const [tom, setTom] = useState(profile?.tom_preferido || 'amigavel')
  const [saving, setSaving] = useState(false)
  const [silentMode, setSilentMode] = useState(profile?.silent_mode || false)
  const [lightMode, setLightMode] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'light'
  )

  function toggleTheme() {
    const next = !lightMode
    setLightMode(next)
    document.documentElement.setAttribute('data-theme', next ? 'light' : 'dark')
    localStorage.setItem('evolui-theme', next ? 'light' : 'dark')
  }

  const [silentSaving, setSilentSaving] = useState(false)

  async function toggleSilentMode() {
    if (silentSaving) return
    const newValue = !silentMode
    setSilentSaving(true)
    try {
      await updateProfile({ silent_mode: newValue })
      setSilentMode(newValue)
      toast.success(newValue ? 'Modo silêncio ativado 🔕' : 'Modo silêncio desativado 🔔')
    } catch {
      toast.error('Erro ao atualizar modo silêncio')
    } finally {
      setSilentSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({ nome, whatsapp, tom_preferido: tom })
      toast.success('Configurações salvas ✅')
    } catch {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Erro ao sair')
    }
  }

  async function togglePushNotifications() {
    try {
      if ('Notification' in window) {
        let perm = Notification.permission
        if (perm === 'default') {
          perm = await Notification.requestPermission()
        }

        if (perm === 'granted') {
          if (!profile?.push_token) {
            setSaving(true)
            const sub = await subscribeToPushNotifications()
            await updateProfile({ push_token: JSON.stringify(sub) })
            toast.success('Notificações ativadas! 🔔')
          } else {
            // Se já tem token e clicou de novo, pode querer desativar
            setSaving(true)
            await unsubscribeFromPushNotifications()
            await updateProfile({ push_token: null })
            toast.success('Notificações desativadas')
          }
        } else {
          toast.error('Gerencie as notificações nas configurações do seu navegador.')
        }
      } else {
        toast.error('Não suportado neste browser.')
      }
    } catch (err) {
      toast.error('Erro ao configurar push: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const pushStatus = 'Notification' in window ? Notification.permission : 'unsupported'
  const isPushActive = pushStatus === 'granted' && !!profile?.push_token

  return (
    <div className="page">
      <div className="container settings-page">
        <h1 className="text-2xl font-bold">Configurações</h1>

        {/* Profile section */}
        <section className="settings-section">
          <h2 className="settings-section-title">
            <User size={16} />
            Perfil
          </h2>
          <div className="settings-card glass-card">
            <div className="input-group">
              <label className="input-label" htmlFor="settings-nome">Nome</label>
              <input
                id="settings-nome"
                type="text"
                className="input"
                value={nome}
                onChange={e => setNome(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="settings-whatsapp">WhatsApp</label>
              <input
                id="settings-whatsapp"
                type="tel"
                className="input"
                placeholder="+55 85 99999-9999"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label">Tom dos lembretes</label>
              <div className="settings-tom-options">
                {TOM_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`chip ${tom === opt.value ? 'active' : ''}`}
                    onClick={() => setTom(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 size={18} className="spin" /> : 'Salvar alterações'}
            </button>
          </div>
        </section>

        {/* Notifications section */}
        <section className="settings-section">
          <h2 className="settings-section-title">
            <Bell size={16} />
            Notificações
          </h2>
          <div className="settings-card glass-card">
            <div className="settings-row" onClick={togglePushNotifications}>
              <div className="settings-row-info">
                <span className="settings-row-label">Notificações Push</span>
                <span className="text-xs text-secondary">
                  {pushStatus === 'granted' ? 'Ativas' :
                   pushStatus === 'denied' ? 'Bloqueadas (ajuste no navegador)' :
                   pushStatus === 'unsupported' ? 'Não suportado neste browser' :
                   'Não solicitado'}
                </span>
              </div>
              <div className={`settings-toggle ${isPushActive ? 'on' : 'off'}`}>
                {isPushActive ? <Bell size={16} /> : <BellOff size={16} />}
              </div>
            </div>

            <div className="settings-divider" />

            <div
              className={`settings-row ${silentSaving ? 'settings-row-disabled' : ''}`}
              onClick={toggleSilentMode}
              aria-busy={silentSaving}
            >
              <div className="settings-row-info">
                <span className="settings-row-label">Modo silêncio</span>
                <span className="text-xs text-secondary">Pausa todos os lembretes</span>
              </div>
              <div className={`settings-toggle ${silentMode ? 'on' : 'off'}`}>
                {silentSaving
                  ? <Loader2 size={16} className="spin" />
                  : silentMode ? <BellOff size={16} /> : <Bell size={16} />
                }
              </div>
            </div>
          </div>
        </section>

        {/* Appearance section */}
        <section className="settings-section">
          <h2 className="settings-section-title">
            {lightMode ? <Sun size={16} /> : <Moon size={16} />}
            Aparência
          </h2>
          <div className="settings-card glass-card">
            <div className="settings-row" onClick={toggleTheme}>
              <div className="settings-row-info">
                <span className="settings-row-label">Tema claro</span>
                <span className="text-xs text-secondary">
                  {lightMode ? 'Modo claro ativado' : 'Modo escuro ativado'}
                </span>
              </div>
              <div className={`settings-toggle ${lightMode ? 'on' : 'off'}`}>
                {lightMode ? <Sun size={16} /> : <Moon size={16} />}
              </div>
            </div>
          </div>
        </section>

        {/* About section */}
        <section className="settings-section">
          <h2 className="settings-section-title">
            <Shield size={16} />
            Sobre
          </h2>
          <div className="settings-card glass-card">
            <div className="settings-row" style={{ cursor: 'default' }}>
              <span className="settings-row-label">Versão</span>
              <span className="text-sm text-secondary">1.0.0 MVP</span>
            </div>
            <div className="settings-divider" />
            <div className="settings-row" style={{ cursor: 'default' }}>
              <div className="settings-row-info">
                <span className="settings-row-label text-xs text-secondary" style={{ fontWeight: 400 }}>
                  Streak Life não substitui profissionais de saúde. Em caso de relação difícil com comida ou corpo, procure um nutricionista ou psicólogo. 💚
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Logout */}
        <button
          className="btn-logout"
          onClick={handleSignOut}
        >
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </div>
  )
}
