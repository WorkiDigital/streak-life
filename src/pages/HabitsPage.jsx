import { useState, useMemo } from 'react'
import { Plus, Trash2, Pencil, Clock } from 'lucide-react'
import { useHabits } from '../contexts/HabitsContext'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import HabitForm from '../components/habits/HabitForm'
import './HabitsPage.css'

const CATEGORY_META = {
  hidratacao:  '💧 Hidratação',
  treino:      '🏋️ Treino',
  alimentacao: '🍽️ Alimentação',
  meditacao:   '🧘 Meditação',
  leitura:     '📚 Leitura',
  medicamento: '💊 Medicamento',
  ar_livre:    '☀️ Ar Livre',
  autocuidado: '💆 Autocuidado',
  alongamento: '🤸 Alongamento',
  tela:        '👀 Telas',
  sono:        '🌙 Sono',
  outro:       '📋 Outro',
}

export default function HabitsPage() {
  const [showForm, setShowForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('all')

  const { schedules, deleteHabit, loading } = useHabits()
  const { profile } = useAuth()
  const toast = useToast()
  const canaisGlobais = profile?.canais_preferidos ?? ['push', 'whatsapp']

  const DAYS_LABEL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  // Build filter list from categories that actually exist in user's habits
  const categoryFilters = useMemo(() => {
    const seen = new Set(schedules.map(s => s.habits?.categoria).filter(Boolean))
    return [
      { value: 'all', label: 'Todos' },
      ...Object.entries(CATEGORY_META)
        .filter(([key]) => seen.has(key))
        .map(([key, label]) => ({ value: key, label })),
    ]
  }, [schedules])

  // Group schedules by habit_id so multi-horario habits appear as 1 card
  const groupedHabits = useMemo(() => {
    const filtered = categoryFilter === 'all'
      ? schedules
      : schedules.filter(s => s.habits?.categoria === categoryFilter)

    const map = new Map()
    for (const s of filtered) {
      if (!map.has(s.habit_id)) {
        map.set(s.habit_id, { ...s, horarios: [] })
      }
      const entry = map.get(s.habit_id)
      if (s.horario) entry.horarios.push(s.horario.slice(0, 5))
    }
    return Array.from(map.values()).map(entry => {
      entry.horarios.sort()
      return entry
    })
  }, [schedules, categoryFilter])

  async function handleDelete(habitId) {
    try {
      await deleteHabit(habitId)
      toast.success('Hábito removido')
      setConfirmDelete(null)
    } catch (err) {
      console.error('[deleteHabit]', err)
      toast.error('Erro ao remover hábito')
    }
  }

  return (
    <div className="page">
      <div className="container habits-page">

        <div className="habits-header">
          <div>
            <h1 className="text-2xl font-bold">Seus Hábitos</h1>
            <p className="text-sm text-secondary">
              {groupedHabits.length} hábito{groupedHabits.length !== 1 ? 's' : ''} configurado{groupedHabits.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Category filter */}
        <div className="habits-filter-scroll">
          {categoryFilters.map(f => (
            <button
              key={f.value}
              className={`chip ${categoryFilter === f.value ? 'active' : ''}`}
              onClick={() => setCategoryFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="habits-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : groupedHabits.length === 0 ? (
          <div className="habits-empty glass-card">
            <span style={{ fontSize: '3rem' }}>🌱</span>
            <h3 className="font-semibold">Nenhum hábito ainda</h3>
            <p className="text-secondary text-sm">
              Adicione seus primeiros hábitos para começar.
            </p>
          </div>
        ) : (
          <div className="habits-list">
            {groupedHabits.map(schedule => {
              const habit = schedule.habits
              const multiTime = schedule.horarios.length > 1
              return (
                <div key={schedule.habit_id} className="habit-item glass-card">
                  <div className="habit-item-main">
                    <span className="habit-item-icon">{habit?.icone || '📋'}</span>
                    <div className="habit-item-info">
                      <span className="habit-item-name">{habit?.nome}</span>
                      <div className="habit-item-meta">
                        <span className="habit-item-time text-xs text-secondary">
                          <Clock size={12} />
                          {multiTime
                            ? `${schedule.horarios[0]?.slice(0, 5)} … ${schedule.horarios[schedule.horarios.length - 1]?.slice(0, 5)} (${schedule.horarios.length}×)`
                            : schedule.horarios[0]?.slice(0, 5)}
                        </span>
                        <div className="habit-item-days">
                          {DAYS_LABEL.map((day, i) => (
                            <span
                              key={i}
                              className={`day-dot ${schedule.dias_semana?.includes(i) ? 'active' : ''}`}
                            >
                              {day}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="habit-item-channels">
                        {canaisGlobais.includes('push') && (
                          <span className="channel-badge">📱 Push</span>
                        )}
                        {canaisGlobais.includes('whatsapp') && (
                          <span className="channel-badge">💬 WhatsApp</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="habit-item-actions">
                    {confirmDelete === schedule.habit_id ? (
                      <div className="confirm-delete">
                        <span className="text-xs text-secondary">Remover?</span>
                        <button
                          className="btn btn-ghost text-xs"
                          onClick={() => setConfirmDelete(null)}
                        >
                          Não
                        </button>
                        <button
                          className="btn text-xs"
                          style={{ color: 'var(--color-missed)', background: 'var(--color-missed-subtle)' }}
                          onClick={() => handleDelete(schedule.habit_id)}
                        >
                          Sim
                        </button>
                      </div>
                    ) : (
                      <div className="habit-item-btns">
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => { setEditingSchedule(schedule); setShowForm(true) }}
                          aria-label="Editar hábito"
                        >
                          <Pencil size={16} style={{ color: 'var(--color-text-tertiary)' }} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon"
                          onClick={() => setConfirmDelete(schedule.habit_id)}
                          aria-label="Remover hábito"
                        >
                          <Trash2 size={18} style={{ color: 'var(--color-text-tertiary)' }} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* FAB — Add habit */}
        <button
          className="fab"
          onClick={() => { setEditingSchedule(null); setShowForm(true) }}
          aria-label="Adicionar hábito"
        >
          <Plus size={24} />
          <span>Novo Hábito</span>
        </button>

        {/* HabitForm Modal */}
        {showForm && (
          <HabitForm
            onClose={() => { setShowForm(false); setEditingSchedule(null) }}
            editingSchedule={editingSchedule}
          />
        )}
      </div>
    </div>
  )
}
