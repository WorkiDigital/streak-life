import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { createGoal } from '../../services/goalsService'
import { useToast } from '../../contexts/ToastContext'
import './goals.css'

const CATEGORY_OPTIONS = [
  { value: 'routine', label: 'Rotina' },
  { value: 'training', label: 'Treino' },
  { value: 'nutrition', label: 'Alimentacao' },
  { value: 'hydration', label: 'Hidratacao' },
  { value: 'sleep', label: 'Sono' },
  { value: 'custom', label: 'Outra' },
]

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'daily', label: 'Diaria' },
  { value: 'monthly', label: 'Mensal' },
]

const TRACKING_OPTIONS = [
  {
    value: 'manual',
    title: 'Meta simples',
    desc: 'So acompanhar progresso, sem criar habito e sem lembrete.',
    facts: ['Cria meta', 'Registro manual', 'Sem lembrete'],
  },
  {
    value: 'linked_habit',
    title: 'Conectar a habito existente',
    desc: 'A meta acompanha um habito que voce ja usa.',
    facts: ['Cria meta', 'Usa habito atual', 'Nao cria lembrete novo'],
  },
  {
    value: 'habit_with_reminder',
    title: 'Criar habito e lembrete',
    desc: 'Cria uma acao com horario para ajudar a executar.',
    facts: ['Cria meta', 'Cria habito', 'Cria lembrete'],
  },
]

const WEEK_DAYS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'S' },
  { value: 2, label: 'T' },
  { value: 3, label: 'Q' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'S' },
  { value: 6, label: 'S' },
]

function defaultHabitName(title) {
  return title?.trim() || 'Novo habito'
}

export default function CreateGoalModal({ habits = [], onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    category: 'routine',
    frequency: 'weekly',
    target_value: '3',
    unit: 'vezes',
    tracking_mode: 'manual',
    linked_habit_id: '',
    habit_name: '',
    habit_time: '08:00',
    habit_days: [1, 2, 3, 4, 5],
  })
  const toast = useToast()

  const userHabits = useMemo(() => habits.filter(h => h.user_id), [habits])
  const canContinue = form.title.trim() && Number(form.target_value) > 0
  const needsHabit = form.tracking_mode === 'linked_habit'
  const needsNewHabit = form.tracking_mode === 'habit_with_reminder'
  const canSave =
    canContinue &&
    (!needsHabit || form.linked_habit_id) &&
    (!needsNewHabit || form.habit_name.trim() || form.title.trim())

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleDay(day) {
    setForm(prev => {
      const exists = prev.habit_days.includes(day)
      const next = exists
        ? prev.habit_days.filter(d => d !== day)
        : [...prev.habit_days, day].sort((a, b) => a - b)
      return { ...prev, habit_days: next.length ? next : prev.habit_days }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSave || saving) return
    setSaving(true)

    try {
      await createGoal({
        goal: {
          title: form.title.trim(),
          category: form.category,
          type: 'process',
          target_value: Number(form.target_value),
          unit: form.unit.trim() || 'vezes',
          frequency: form.frequency,
          tracking_mode: form.tracking_mode,
          reminders_enabled: form.tracking_mode === 'habit_with_reminder',
        },
        linked_habit_id: form.tracking_mode === 'linked_habit' ? form.linked_habit_id : undefined,
        new_habit: form.tracking_mode === 'habit_with_reminder'
          ? {
              nome: form.habit_name.trim() || defaultHabitName(form.title),
              categoria: form.category,
              horario: form.habit_time,
              dias_semana: form.habit_days,
            }
          : undefined,
      })

      await onCreated?.()
      toast.success('Meta criada')
      onClose?.()
    } catch (err) {
      toast.error(`Erro ao criar meta: ${err.message}`)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="goal-modal-overlay" onClick={onClose}>
      <form className="goal-modal" onSubmit={handleSubmit} onClick={e => e.stopPropagation()}>
        <div className="goal-modal-header">
          <div>
            <h2>Criar meta</h2>
            <p>Escolha se a meta sera manual, conectada a um habito ou criada com lembrete.</p>
          </div>
          <button type="button" className="goal-modal-close" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="goal-step-indicator" aria-label={`Etapa ${step} de 2`}>
          <span className={step === 1 ? 'active' : ''}>1 Dados</span>
          <span className={step === 2 ? 'active' : ''}>2 Acompanhamento</span>
        </div>

        {step === 1 ? (
          <div className="goal-form-grid">
            <label className="goal-field full">
              <span>Titulo da meta</span>
              <input
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="Ex: Ler 3x por semana"
                autoFocus
              />
            </label>

            <label className="goal-field">
              <span>Categoria</span>
              <select value={form.category} onChange={e => update('category', e.target.value)}>
                {CATEGORY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="goal-field">
              <span>Frequencia</span>
              <select value={form.frequency} onChange={e => update('frequency', e.target.value)}>
                {FREQUENCY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="goal-field">
              <span>Valor alvo</span>
              <input
                type="number"
                min="1"
                step="0.1"
                value={form.target_value}
                onChange={e => update('target_value', e.target.value)}
              />
            </label>

            <label className="goal-field">
              <span>Unidade</span>
              <input
                value={form.unit}
                onChange={e => update('unit', e.target.value)}
                placeholder="vezes, L, dias"
              />
            </label>
          </div>
        ) : (
          <div className="goal-tracking-step">
            <div className="goal-tracking-options">
              {TRACKING_OPTIONS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`goal-tracking-option ${form.tracking_mode === option.value ? 'active' : ''}`}
                  onClick={() => update('tracking_mode', option.value)}
                >
                  <strong>{option.title}</strong>
                  <span>{option.desc}</span>
                  <div className="goal-mode-facts" aria-hidden="true">
                    {option.facts.map(fact => (
                      <small key={fact}>{fact}</small>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {needsHabit && (
              <div className="goal-mode-panel">
                <p>Essa meta usara os lembretes que o habito ja tiver. Nenhum novo horario sera criado.</p>
                <label className="goal-field full">
                  <span>Escolha um habito</span>
                  <select value={form.linked_habit_id} onChange={e => update('linked_habit_id', e.target.value)}>
                    <option value="">Selecione...</option>
                    {userHabits.map(habit => (
                      <option key={habit.id} value={habit.id}>{habit.nome}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {needsNewHabit && (
              <div className="goal-mode-panel">
                <p>Essa opcao cria a meta, um habito vinculado e um horario de lembrete.</p>
                <div className="goal-form-grid">
                <label className="goal-field full">
                  <span>Nome do habito</span>
                  <input
                    value={form.habit_name}
                    onChange={e => update('habit_name', e.target.value)}
                    placeholder={defaultHabitName(form.title)}
                  />
                </label>

                <label className="goal-field">
                  <span>Horario</span>
                  <input
                    type="time"
                    value={form.habit_time}
                    onChange={e => update('habit_time', e.target.value)}
                  />
                </label>

                <div className="goal-field full">
                  <span>Dias da semana</span>
                  <div className="goal-day-picker">
                    {WEEK_DAYS.map(day => (
                      <button
                        key={`${day.value}-${day.label}`}
                        type="button"
                        className={form.habit_days.includes(day.value) ? 'active' : ''}
                        onClick={() => toggleDay(day.value)}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              </div>
            )}
          </div>
        )}

        <div className="goal-modal-actions">
          {step === 2 && (
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)} disabled={saving}>
              Voltar
            </button>
          )}
          {step === 1 ? (
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)} disabled={!canContinue}>
              Continuar
            </button>
          ) : (
            <button type="submit" className="btn btn-primary" disabled={!canSave || saving}>
              {saving ? 'Salvando...' : 'Salvar meta'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
