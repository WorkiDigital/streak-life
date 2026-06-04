import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useHabits } from '../contexts/HabitsContext'
import { useToast } from '../contexts/ToastContext'
import {
  User, Phone, Smile, Target,
  Clock, Repeat, ChevronRight, ChevronLeft, Check, Bell
} from 'lucide-react'
import './OnboardingPage.css'

const INTERVAL_OPTIONS = [
  { label: '20 min', minutes: 20 },
  { label: '30 min', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
]

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
function minutesToTime(m) {
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}
function generateTimes(inicio, fim, intervalMinutes) {
  if (!inicio || !fim || !intervalMinutes) return []
  const start = timeToMinutes(inicio)
  const end = timeToMinutes(fim)
  if (start >= end) return []
  const times = []
  for (let t = start; t <= end && times.length < 48; t += intervalMinutes) times.push(minutesToTime(t))
  return times
}

const TOM_OPTIONS = [
  { value: 'amigavel', label: 'Amigável 😊', desc: 'Leve e acolhedor' },
  { value: 'direto', label: 'Direto 🎯', desc: 'Objetivo e prático' },
  { value: 'motivacional', label: 'Motivacional 🔥', desc: 'Energético e inspirador' },
]

const STEPS = ['Perfil', 'Hábitos', 'Horários', 'Notificações']

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [tom, setTom] = useState('amigavel')
  const [selectedHabits, setSelectedHabits] = useState([])
  const [schedulesConfig, setSchedulesConfig] = useState({})
  const [saving, setSaving] = useState(false)

  const { profile, updateProfile } = useAuth()
  const { habits, addFromTemplates } = useHabits()
  const toast = useToast()
  const navigate = useNavigate()

  // Pre-fill from existing profile
  useEffect(() => {
    if (profile) {
      setNome(profile.nome || '')
      setWhatsapp(profile.whatsapp || '')
      setTom(profile.tom_preferido || 'amigavel')
    }
  }, [profile])

  // Get template habits (user_id is null)
  const templates = habits.filter(h => !h.user_id)

  function toggleHabit(id) {
    setSelectedHabits(prev =>
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    )
  }

  function updateScheduleConfig(habitId, field, value) {
    setSchedulesConfig(prev => ({
      ...prev,
      [habitId]: {
        ...prev[habitId],
        [field]: value,
      },
    }))
  }

  function formatPhone(value) {
    const digits = value.replace(/\D/g, '')
    if (digits.length <= 2) return `+${digits}`
    if (digits.length <= 4) return `+${digits.slice(0, 2)} ${digits.slice(2)}`
    if (digits.length <= 9) return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9, 13)}`
  }

  async function handleFinish() {
    setSaving(true)
    try {
      await updateProfile({
        nome,
        whatsapp: whatsapp.replace(/\D/g, '').replace(/^(\d{2})/, '+$1'),
        tom_preferido: tom,
      })

      if (selectedHabits.length > 0) {
        // Resolve horarios[] from each habit's schedMode before sending
        const resolvedConfig = {}
        for (const id of selectedHabits) {
          const cfg = schedulesConfig[id] || {}
          const mode = cfg.schedMode || 'fixo'
          resolvedConfig[id] = {
            ...cfg,
            horarios: mode === 'intervalo'
              ? generateTimes(cfg.inicio || '06:00', cfg.fim || '21:00', cfg.intervalMinutes || 60)
              : [cfg.horario || '08:00'],
          }
        }
        await addFromTemplates(selectedHabits, resolvedConfig)
      }

      toast.success('Perfil configurado! Bora começar! 🚀')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error('Erro ao salvar. Tente novamente.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  function canAdvance() {
    if (step === 0) return nome.trim().length >= 2
    if (step === 1) return selectedHabits.length > 0
    if (step === 2) return selectedHabits.every(id => {
      const cfg = schedulesConfig[id] || {}
      const days = cfg.diasSemana ?? [0,1,2,3,4,5,6]
      if (days.length === 0) return false
      const mode = cfg.schedMode || 'fixo'
      if (mode === 'intervalo') {
        const times = generateTimes(cfg.inicio || '06:00', cfg.fim || '21:00', cfg.intervalMinutes || 60)
        if (times.length === 0) return false
      }
      return true
    })
    return true
  }

  function stepHint() {
    if (step === 0 && nome.trim().length < 2) return 'Digite seu nome para continuar'
    if (step === 1 && selectedHabits.length === 0) return 'Selecione pelo menos 1 hábito'
    if (step === 2) {
      for (const id of selectedHabits) {
        const cfg = schedulesConfig[id] || {}
        const days = cfg.diasSemana ?? [0,1,2,3,4,5,6]
        if (days.length === 0) return 'Selecione pelo menos 1 dia para cada hábito'
        const mode = cfg.schedMode || 'fixo'
        if (mode === 'intervalo') {
          const times = generateTimes(cfg.inicio || '06:00', cfg.fim || '21:00', cfg.intervalMinutes || 60)
          if (times.length === 0) return 'Corrija o intervalo: início deve ser antes do fim'
        }
      }
    }
    return null
  }

  function requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission()
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-bg-pattern" />

      <div className="onboarding-container">
        {/* Progress */}
        <div className="onboarding-progress">
          {STEPS.map((label, i) => (
            <div key={label} className={`onboarding-step-dot ${i <= step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              {i < step ? <Check size={12} /> : i + 1}
            </div>
          ))}
          <div className="onboarding-progress-bar">
            <div
              className="onboarding-progress-fill"
              style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>

        <div className="onboarding-step-label text-sm text-secondary">
          Etapa {step + 1} de {STEPS.length} — {STEPS[step]}
        </div>

        {/* Step 0: Profile */}
        {step === 0 && (
          <div className="onboarding-step" key="profile">
            <div className="onboarding-header">
              <h2>Vamos começar! 👋</h2>
              <p className="text-secondary">Como podemos te chamar?</p>
            </div>

            <div className="onboarding-fields">
              <div className="input-group">
                <label className="input-label" htmlFor="onb-nome">Seu nome</label>
                <input
                  id="onb-nome"
                  type="text"
                  className="input"
                  placeholder="Ex: João"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="onb-whatsapp">
                  WhatsApp <span className="text-tertiary">(opcional)</span>
                </label>
                <input
                  id="onb-whatsapp"
                  type="tel"
                  className="input"
                  placeholder="+55 85 99999-9999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Tom dos lembretes</label>
                <div className="tom-options">
                  {TOM_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      className={`tom-card glass-card ${tom === opt.value ? 'active' : ''}`}
                      onClick={() => setTom(opt.value)}
                    >
                      <span className="tom-label">{opt.label}</span>
                      <span className="tom-desc text-xs text-tertiary">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Select Habits */}
        {step === 1 && (
          <div className="onboarding-step" key="habits">
            <div className="onboarding-header">
              <h2>Escolha seus hábitos 🎯</h2>
              <p className="text-secondary">Selecione os que quer acompanhar</p>
            </div>

            <div className="habit-grid">
              {templates.map(habit => (
                <button
                  key={habit.id}
                  className={`habit-select-card glass-card ${
                    selectedHabits.includes(habit.id) ? 'selected' : ''
                  }`}
                  onClick={() => toggleHabit(habit.id)}
                >
                  <span className="habit-select-icon">{habit.icone}</span>
                  <span className="habit-select-name">{habit.nome}</span>
                  {selectedHabits.includes(habit.id) && (
                    <span className="habit-select-check animate-check-pop">
                      <Check size={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>

            <p className="text-xs text-tertiary" style={{ textAlign: 'center', marginTop: 'var(--space-2)' }}>
              Você pode criar hábitos personalizados depois
            </p>
          </div>
        )}

        {/* Step 2: Configure Schedules */}
        {step === 2 && (
          <div className="onboarding-step" key="schedules">
            <div className="onboarding-header">
              <h2>Defina os horários ⏰</h2>
              <p className="text-secondary">Quando quer ser lembrado?</p>
            </div>

            <div className="schedule-list">
              {selectedHabits.map(habitId => {
                const habit = templates.find(h => h.id === habitId)
                const config = schedulesConfig[habitId] || {}
                const days = config.diasSemana || [0, 1, 2, 3, 4, 5, 6]
                const mode = config.schedMode || 'fixo'
                const preview = mode === 'intervalo'
                  ? generateTimes(config.inicio || '06:00', config.fim || '21:00', config.intervalMinutes || 60)
                  : []
                const intervalError = mode === 'intervalo' && (
                  timeToMinutes(config.inicio || '06:00') >= timeToMinutes(config.fim || '21:00')
                    ? 'Início deve ser antes do fim'
                    : preview.length === 0 ? 'Nenhum horário gerado' : null
                )

                return (
                  <div key={habitId} className="schedule-card glass-card">
                    <div className="schedule-header">
                      <span className="schedule-icon">{habit?.icone}</span>
                      <span className="schedule-name">{habit?.nome}</span>
                    </div>

                    {/* Mode tabs */}
                    <div className="onb-sched-tabs">
                      <button
                        type="button"
                        className={`onb-sched-tab ${mode === 'fixo' ? 'active' : ''}`}
                        onClick={() => updateScheduleConfig(habitId, 'schedMode', 'fixo')}
                      >
                        <Clock size={12} /> Fixo
                      </button>
                      <button
                        type="button"
                        className={`onb-sched-tab ${mode === 'intervalo' ? 'active' : ''}`}
                        onClick={() => updateScheduleConfig(habitId, 'schedMode', 'intervalo')}
                      >
                        <Repeat size={12} /> Intervalo
                      </button>
                    </div>

                    {mode === 'fixo' ? (
                      <div className="schedule-time">
                        <Clock size={16} className="text-secondary" />
                        <input
                          type="time"
                          className="input time-input"
                          value={config.horario || '08:00'}
                          onChange={e => updateScheduleConfig(habitId, 'horario', e.target.value)}
                          style={{ colorScheme: 'dark' }}
                        />
                      </div>
                    ) : (
                      <div className="onb-interval-config">
                        <div className="onb-interval-row">
                          <div style={{ flex: 1 }}>
                            <p className="text-xs text-secondary" style={{ marginBottom: 4 }}>Início</p>
                            <input
                              type="time"
                              className="input time-input"
                              value={config.inicio || '06:00'}
                              onChange={e => updateScheduleConfig(habitId, 'inicio', e.target.value)}
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <p className="text-xs text-secondary" style={{ marginBottom: 4 }}>Fim</p>
                            <input
                              type="time"
                              className="input time-input"
                              value={config.fim || '21:00'}
                              onChange={e => updateScheduleConfig(habitId, 'fim', e.target.value)}
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>
                        <div className="onb-interval-pills">
                          {INTERVAL_OPTIONS.map(opt => (
                            <button
                              key={opt.minutes}
                              type="button"
                              className={`chip ${(config.intervalMinutes || 60) === opt.minutes ? 'active' : ''}`}
                              onClick={() => updateScheduleConfig(habitId, 'intervalMinutes', opt.minutes)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                        {intervalError ? (
                          <p className="text-xs" style={{ color: 'var(--color-missed)' }}>{intervalError}</p>
                        ) : (
                          <p className="text-xs text-secondary">
                            {preview.length} lembrete{preview.length !== 1 ? 's' : ''}:&nbsp;
                            {preview.slice(0, 4).join(', ')}{preview.length > 4 ? ` … +${preview.length - 4}` : ''}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="schedule-days">
                      {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                        <button
                          key={i}
                          className={`chip ${days.includes(i) ? 'active' : ''}`}
                          onClick={() => {
                            const newDays = days.includes(i)
                              ? days.filter(d => d !== i)
                              : [...days, i].sort()
                            updateScheduleConfig(habitId, 'diasSemana', newDays)
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Notifications */}
        {step === 3 && (
          <div className="onboarding-step" key="notifications">
            <div className="onboarding-header">
              <h2>Quase lá! 🔔</h2>
              <p className="text-secondary">Ative as notificações para não esquecer</p>
            </div>

            <div className="notification-card glass-card">
              <div className="notification-icon-big">
                <Bell size={48} strokeWidth={1.5} />
              </div>
              <p>Permita notificações para receber lembretes no horário certo.</p>
              <button
                className="btn btn-secondary btn-full"
                onClick={requestNotificationPermission}
              >
                <Bell size={18} />
                Permitir notificações
              </button>
            </div>

            <div className="onboarding-summary glass-card">
              <h3 className="text-md font-semibold">Resumo</h3>
              <div className="summary-item">
                <User size={16} className="text-secondary" />
                <span>{nome}</span>
              </div>
              {whatsapp && (
                <div className="summary-item">
                  <Phone size={16} className="text-secondary" />
                  <span>{whatsapp}</span>
                </div>
              )}
              <div className="summary-item">
                <Smile size={16} className="text-secondary" />
                <span>Tom {TOM_OPTIONS.find(t => t.value === tom)?.label}</span>
              </div>
              <div className="summary-item">
                <Target size={16} className="text-secondary" />
                <span>{selectedHabits.length} hábito{selectedHabits.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        {stepHint() && (
          <p className="onboarding-hint text-xs text-secondary" style={{ textAlign: 'center', marginBottom: 'var(--space-2)' }}>
            ⚠️ {stepHint()}
          </p>
        )}
        <div className="onboarding-nav">
          {step > 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => setStep(s => s - 1)}
            >
              <ChevronLeft size={18} />
              Voltar
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <button
              className="btn btn-primary btn-lg"
              disabled={!canAdvance()}
              onClick={() => setStep(s => s + 1)}
            >
              Continuar
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              className="btn btn-primary btn-lg"
              disabled={saving}
              onClick={handleFinish}
            >
              {saving ? 'Salvando...' : 'Começar! 🚀'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
