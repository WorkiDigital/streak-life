import './goals.css'

const CATEGORY_LABEL = {
  hydration: 'Hidratação 💧',
  nutrition: 'Alimentação 🍽️',
  training: 'Treino 🏋️',
  sleep: 'Sono 🌙',
  routine: 'Rotina 📋',
  consistency: 'Consistência 🔥',
  custom: 'Meta ⭐',
}

export default function GoalProgressCard({ goal }) {
  const { title, category, current_value, target_value, unit, status } = goal
  const pct = target_value > 0 ? Math.min(1, (current_value ?? 0) / target_value) : 0
  const isCompleted = status === 'completed'

  return (
    <div className={`goal-progress-card ${isCompleted ? 'completed' : ''}`}>
      <div className="goal-progress-header">
        <span className="goal-progress-category">{CATEGORY_LABEL[category] ?? category}</span>
        {isCompleted && <span className="goal-progress-badge">✓ Concluída</span>}
      </div>
      <div className="goal-progress-title">{title}</div>
      <div className="goal-progress-bar-wrap">
        <div className="goal-progress-bar">
          <div className="goal-progress-fill" style={{ width: `${pct * 100}%` }} />
        </div>
        <span className="goal-progress-value">
          {current_value ?? 0}{unit ? ` ${unit}` : ''} / {target_value ?? 0}{unit ? ` ${unit}` : ''}
        </span>
      </div>
    </div>
  )
}
