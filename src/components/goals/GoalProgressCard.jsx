import { useState } from 'react'
import { Link } from 'react-router-dom'
import { logGoal } from '../../services/goalsService'
import { useToast } from '../../contexts/ToastContext'
import './goals.css'

const CATEGORY_LABEL = {
  hydration: 'Hidratacao',
  nutrition: 'Alimentacao',
  training: 'Treino',
  sleep: 'Sono',
  routine: 'Rotina',
  consistency: 'Consistencia',
  custom: 'Meta',
}

const MODE_LABEL = {
  manual: 'Manual',
  linked_habit: 'Habito conectado',
  habit_with_reminder: 'Habito com lembrete',
}

function actionLabel(goal) {
  if (goal.tracking_mode === 'linked_habit') return 'Ver habito'
  if (goal.tracking_mode === 'habit_with_reminder') return 'Editar lembretes'
  return 'Registrar progresso'
}

export default function GoalProgressCard({ goal, onUpdated }) {
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const {
    title,
    category,
    current_value,
    target_value,
    unit,
    status,
    tracking_mode = 'manual',
    reminders_enabled,
    linked_habits = [],
  } = goal

  const pct = target_value > 0 ? Math.min(1, (current_value ?? 0) / target_value) : 0
  const isCompleted = status === 'completed'
  const linkedHabitName = linked_habits?.[0]?.nome

  async function handleManualProgress() {
    if (saving) return
    setSaving(true)
    try {
      await logGoal({ goal_id: goal.id, value: 1 })
      await onUpdated?.()
      toast.success('Progresso registrado')
    } catch (err) {
      toast.error(`Erro ao registrar meta: ${err.message}`)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`goal-progress-card ${isCompleted ? 'completed' : ''}`}>
      <div className="goal-progress-header">
        <span className="goal-progress-category">{CATEGORY_LABEL[category] ?? category}</span>
        {isCompleted && <span className="goal-progress-badge">Concluida</span>}
      </div>

      <div className="goal-progress-title">{title}</div>

      <div className="goal-progress-meta">
        <span>{MODE_LABEL[tracking_mode] ?? MODE_LABEL.manual}</span>
        <span>{reminders_enabled ? 'Lembrete ativo' : 'Sem lembrete proprio'}</span>
        {linkedHabitName && <span>Habito: {linkedHabitName}</span>}
      </div>

      <div className="goal-progress-bar-wrap">
        <div className="goal-progress-bar">
          <div className="goal-progress-fill" style={{ width: `${pct * 100}%` }} />
        </div>
        <span className="goal-progress-value">
          {current_value ?? 0}{unit ? ` ${unit}` : ''} / {target_value ?? 0}{unit ? ` ${unit}` : ''}
        </span>
      </div>

      {tracking_mode === 'manual' ? (
        <button className="goal-action-btn" onClick={handleManualProgress} disabled={saving}>
          {saving ? 'Registrando...' : actionLabel(goal)}
        </button>
      ) : (
        <Link className="goal-action-btn secondary" to="/habits">
          {actionLabel(goal)}
        </Link>
      )}
    </div>
  )
}
