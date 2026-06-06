import { useNavigate } from 'react-router-dom'
import './goals.css'

const CATEGORY_LABEL = {
  hydration: 'Hidratação',
  nutrition: 'Alimentação',
  training: 'Treino',
  sleep: 'Sono',
  routine: 'Rotina',
  consistency: 'Consistência',
  custom: 'Meta',
}

export default function GoalSummaryBanner({ weeklyGoal, goodDays, activeGoals }) {
  const navigate = useNavigate()

  if (!weeklyGoal && !activeGoals?.length) return null

  const target = weeklyGoal?.target_value ?? 5
  const pct = target > 0 ? Math.min(1, goodDays / target) : 0

  // Meta em destaque: consistência ou a de maior prioridade
  const highlight = weeklyGoal ?? activeGoals[0]
  const highlightPct = highlight?.target_value > 0
    ? Math.min(1, (highlight.current_value ?? 0) / highlight.target_value)
    : 0

  return (
    <div className="goal-banner" onClick={() => navigate('/progresso')} role="button" tabIndex={0}>
      <div className="goal-banner-left">
        <span className="goal-banner-title">
          {weeklyGoal ? 'Dias bons esta semana' : (CATEGORY_LABEL[highlight?.category] ?? 'Meta')}
        </span>
        <span className="goal-banner-sub">
          {weeklyGoal
            ? `${goodDays} de ${target} dias`
            : `${highlight?.current_value ?? 0}${highlight?.unit ? ` ${highlight.unit}` : ''} / ${highlight?.target_value ?? 0}${highlight?.unit ? ` ${highlight.unit}` : ''}`
          }
        </span>
      </div>
      <div className="goal-banner-right">
        <div className="goal-banner-ring">
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-border)" strokeWidth="3.5" />
            <circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="3.5"
              strokeDasharray={`${(weeklyGoal ? pct : highlightPct) * 100.5} 100.5`}
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
            />
          </svg>
          <span className="goal-banner-pct">
            {Math.round((weeklyGoal ? pct : highlightPct) * 100)}%
          </span>
        </div>
      </div>
    </div>
  )
}
