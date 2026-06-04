import { useState, useMemo } from 'react'
import { X, Loader2, Clock, Repeat } from 'lucide-react'
import { useHabits } from '../../contexts/HabitsContext'
import { useToast } from '../../contexts/ToastContext'
import './HabitForm.css'

const CATEGORIES = [
  { value: 'hidratacao', label: 'Hidratação', icon: '💧' },
  { value: 'treino', label: 'Treino', icon: '🏋️' },
  { value: 'alimentacao', label: 'Alimentação', icon: '🍽️' },
  { value: 'meditacao', label: 'Meditação', icon: '🧘‍♀️' },
  { value: 'leitura', label: 'Leitura', icon: '📚' },
  { value: 'medicamento', label: 'Medicamento', icon: '💊' },
  { value: 'ar_livre', label: 'Ar Livre', icon: '☀️' },
  { value: 'autocuidado', label: 'Autocuidado', icon: '💆‍♀️' },
  { value: 'alongamento', label: 'Alongamento', icon: '🤸' },
  { value: 'tela', label: 'Telas', icon: '👀' },
  { value: 'sono', label: 'Sono', icon: '🌙' },
  { value: 'outro', label: 'Outro', icon: '📋' },
]

const DAYS_FULL = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const INTERVAL_OPTIONS = [
  { label: '20 min', minutes: 20 },
  { label: '30 min', minutes: 30 },
  { label: '1 hora', minutes: 60 },
  { label: '2 horas', minutes: 120 },
  { label: '3 horas', minutes: 180 },
  { label: '4 horas', minutes: 240 },
]

const MAX_SCHEDULES = 48

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesToTime(m) {
  const h = Math.floor(m / 60) % 24
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function generateIntervalTimes(inicio, fim, intervalMinutes) {
  if (!inicio || !fim || !intervalMinutes) return []
  const startMin = timeToMinutes(inicio)
  const endMin = timeToMinutes(fim)
  if (startMin >= endMin) return []
  const times = []
  for (let t = startMin; t <= endMin && times.length < MAX_SCHEDULES; t += intervalMinutes) {
    times.push(minutesToTime(t))
  }
  return times
}

// Detect if a schedule set was created by interval (all diffs equal)
function detectExistingMode(horarios) {
  if (!horarios || horarios.length <= 1) return { mode: 'fixo', horario: horarios?.[0] || '08:00' }
  const sorted = [...horarios].sort()
  const diffs = sorted.slice(1).map((t, i) => timeToMinutes(t) - timeToMinutes(sorted[i]))
  const allEqual = diffs.every(d => d === diffs[0])
  if (allEqual) {
    return {
      mode: 'intervalo',
      inicio: sorted[0],
      fim: sorted[sorted.length - 1],
      intervalMinutes: diffs[0],
    }
  }
  return { mode: 'fixo', horario: sorted[0] }
}

export default function HabitForm({ onClose, editingSchedule = null }) {
  const isEditing = !!editingSchedule
  const existingHabit = editingSchedule?.habits

  // Collect all horarios for this habit_id when editing
  const { schedules, createHabit, updateHabit } = useHabits()
  const existingHorarios = isEditing
    ? schedules
        .filter(s => s.habit_id === editingSchedule.habit_id)
        .map(s => s.horario?.slice(0, 5))
        .filter(Boolean)
    : []

  const detected = detectExistingMode(existingHorarios)

  const [nome, setNome] = useState(existingHabit?.nome || '')
  const [categoria, setCategoria] = useState(existingHabit?.categoria || 'outro')
  const [diasSemana, setDiasSemana] = useState(editingSchedule?.dias_semana || [0, 1, 2, 3, 4, 5, 6])
  const [canais, setCanais] = useState(editingSchedule?.canais || ['push', 'whatsapp'])
  const [saving, setSaving] = useState(false)

  // Schedule mode
  const [schedMode, setSchedMode] = useState(detected.mode)

  // Fixo
  const [horario, setHorario] = useState(detected.horario || '08:00')

  // Intervalo
  const [inicio, setInicio] = useState(detected.inicio || '06:00')
  const [fim, setFim] = useState(detected.fim || '21:00')
  const [intervalMinutes, setIntervalMinutes] = useState(detected.intervalMinutes || 60)

  const toast = useToast()
  const selectedCategory = CATEGORIES.find(c => c.value === categoria)

  const previewTimes = useMemo(() => {
    if (schedMode === 'fixo') return [horario]
    return generateIntervalTimes(inicio, fim, intervalMinutes)
  }, [schedMode, horario, inicio, fim, intervalMinutes])

  const intervalError = useMemo(() => {
    if (schedMode !== 'intervalo') return null
    if (!inicio || !fim) return 'Defina início e fim'
    if (timeToMinutes(inicio) >= timeToMinutes(fim)) return 'Início deve ser antes do fim'
    if (previewTimes.length === 0) return 'Nenhum horário gerado'
    return null
  }, [schedMode, inicio, fim, previewTimes])

  function toggleDay(day) {
    setDiasSemana(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    )
  }

  function toggleCanal(canal) {
    setCanais(prev =>
      prev.includes(canal) ? prev.filter(c => c !== canal) : [...prev, canal]
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim() || diasSemana.length === 0 || intervalError) return

    setSaving(true)
    try {
      const payload = {
        nome: nome.trim(),
        icone: selectedCategory?.icon || '📋',
        categoria,
        horarios: previewTimes,
        diasSemana,
        canais,
      }

      if (isEditing) {
        await updateHabit(editingSchedule.habit_id, editingSchedule.id, payload)
        toast.success(`"${nome}" atualizado! ✅`)
      } else {
        await createHabit(payload)
        toast.success(`"${nome}" criado! 🎉`)
      }
      onClose()
    } catch (err) {
      toast.error(isEditing ? 'Erro ao atualizar hábito.' : 'Erro ao criar hábito.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <div className="habit-form-header">
          <h2 className="text-xl font-bold">{isEditing ? 'Editar Hábito' : 'Novo Hábito'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="habit-form">
          {/* Name */}
          <div className="input-group">
            <label className="input-label" htmlFor="habit-nome">Nome do hábito</label>
            <input
              id="habit-nome"
              type="text"
              className="input"
              placeholder="Ex: Beber água"
              value={nome}
              onChange={e => setNome(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Category */}
          <div className="input-group">
            <label className="input-label">Categoria</label>
            <div className="category-grid">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`category-card glass-card ${categoria === cat.value ? 'active' : ''}`}
                  onClick={() => setCategoria(cat.value)}
                >
                  <span className="category-icon">{cat.icon}</span>
                  <span className="category-label text-xs">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule mode toggle */}
          <div className="input-group">
            <label className="input-label">Horário</label>
            <div className="sched-mode-tabs">
              <button
                type="button"
                className={`sched-mode-tab ${schedMode === 'fixo' ? 'active' : ''}`}
                onClick={() => setSchedMode('fixo')}
              >
                <Clock size={14} />
                Horário fixo
              </button>
              <button
                type="button"
                className={`sched-mode-tab ${schedMode === 'intervalo' ? 'active' : ''}`}
                onClick={() => setSchedMode('intervalo')}
              >
                <Repeat size={14} />
                Intervalo frequente
              </button>
            </div>

            {schedMode === 'fixo' ? (
              <input
                type="time"
                className="input"
                value={horario}
                onChange={e => setHorario(e.target.value)}
                style={{ colorScheme: 'dark' }}
              />
            ) : (
              <div className="interval-config">
                <div className="interval-row">
                  <div className="input-group" style={{ flex: 1, margin: 0 }}>
                    <label className="input-label text-xs">Início</label>
                    <input
                      type="time"
                      className="input"
                      value={inicio}
                      onChange={e => setInicio(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div className="input-group" style={{ flex: 1, margin: 0 }}>
                    <label className="input-label text-xs">Fim</label>
                    <input
                      type="time"
                      className="input"
                      value={fim}
                      onChange={e => setFim(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                </div>
                <div className="input-group" style={{ margin: 0 }}>
                  <label className="input-label text-xs">Repetir a cada</label>
                  <div className="interval-pills">
                    {INTERVAL_OPTIONS.map(opt => (
                      <button
                        key={opt.minutes}
                        type="button"
                        className={`chip ${intervalMinutes === opt.minutes ? 'active' : ''}`}
                        onClick={() => setIntervalMinutes(opt.minutes)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {intervalError ? (
                  <p className="interval-error text-xs">{intervalError}</p>
                ) : (
                  <div className="interval-preview">
                    <span className="text-xs text-secondary">
                      {previewTimes.length} lembrete{previewTimes.length !== 1 ? 's' : ''}:
                    </span>
                    <div className="interval-preview-times">
                      {previewTimes.slice(0, 6).map(t => (
                        <span key={t} className="interval-time-chip">{t}</span>
                      ))}
                      {previewTimes.length > 6 && (
                        <span className="interval-time-chip interval-time-more">
                          +{previewTimes.length - 6} mais
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Days */}
          <div className="input-group">
            <label className="input-label">Dias da semana</label>
            <div className="days-selector">
              {DAYS_FULL.map((day, i) => (
                <button
                  key={i}
                  type="button"
                  className={`chip ${diasSemana.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          {/* Channels */}
          <div className="input-group">
            <label className="input-label">Canais de notificação</label>
            <div className="channels-selector">
              {[
                { value: 'push', label: '📱 Notificação Push' },
                { value: 'whatsapp', label: '💬 WhatsApp' },
              ].map(ch => (
                <button
                  key={ch.value}
                  type="button"
                  className={`channel-toggle glass-card ${canais.includes(ch.value) ? 'active' : ''}`}
                  onClick={() => toggleCanal(ch.value)}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={saving || !nome.trim() || diasSemana.length === 0 || !!intervalError}
          >
            {saving
              ? <Loader2 size={20} className="spin" />
              : isEditing ? 'Salvar alterações ✅' : 'Criar Hábito 🌱'
            }
          </button>
        </form>
      </div>
    </div>
  )
}
