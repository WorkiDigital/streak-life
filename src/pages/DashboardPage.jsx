import { useState, useEffect, useRef, useMemo } from 'react'
import { Flame, Target, TrendingUp, Calendar, X } from 'lucide-react'
import { useHabits } from '../contexts/HabitsContext'
import { useAuth } from '../contexts/AuthContext'
import HabitCard from '../components/habits/HabitCard'
import HabitHeatmap from '../components/habits/HabitHeatmap'
import { useTodayNutrition } from '../hooks/useTodayNutrition'
import NutritionSetupModal from '../components/nutrition/NutritionSetupModal'
import GoalSummaryBanner from '../components/goals/GoalSummaryBanner'
import GoalsSetupBanner from '../components/goals/GoalsSetupBanner'
import { useGoals } from '../hooks/useGoals'
import '../components/nutrition/nutrition.css'
import './DashboardPage.css'

const BANNER_DISMISSED_KEY = 'nutrition_banner_dismissed'

const PERIOD_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '3 meses', value: 90 },
]

export default function DashboardPage() {
  const [period, setPeriod] = useState(30)
  const [confetti, setConfetti] = useState(false)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const { loading: goalsLoading, goalsEnabled, weeklyGoal, goodDays, activeGoals } = useGoals()
  const [bannerDismissed, setBannerDismissed] = useState(
    () => localStorage.getItem(BANNER_DISMISSED_KEY) === '1'
  )
  const prevDoneCount = useRef(null)
  const { getTodayHabits, getHeatmapData, getStats, loading, logs, schedules, refreshData } = useHabits()
  const { profile, refreshProfile } = useAuth()

  function dismissBanner(e) {
    e.stopPropagation()
    localStorage.setItem(BANNER_DISMISSED_KEY, '1')
    setBannerDismissed(true)
  }

  async function handlePlanApplied() {
    await Promise.allSettled([refreshProfile(), refreshData()])
  }

  // Mostra banner quando: perfil carregado + nutrition não ativo + não dispensado
  // nutrition_enabled pode ser false, null ou undefined — todos significam "sem plano"
  const showNutritionBanner = !!profile && profile.nutrition_enabled !== true && !bannerDismissed
  const today = new Date().toISOString().slice(0, 10)
  const { data: nutritionData, refresh: refreshNutrition } = useTodayNutrition(
    profile?.nutrition_enabled ? today : null
  )

  async function handleNutritionLogged() {
    await Promise.allSettled([refreshNutrition(), refreshData()])
  }

  const nutritionMealsMap = useMemo(() => {
    const map = {}
    for (const meal of nutritionData?.meals ?? []) {
      map[meal.id] = meal
    }
    return map
  }, [nutritionData])

  // Memoize expensive calculations — only recompute when underlying data changes
  const todayHabits = useMemo(() => getTodayHabits(), [logs, schedules]) // eslint-disable-line react-hooks/exhaustive-deps
  const { matrix, dates } = useMemo(() => getHeatmapData(period), [period, logs, schedules]) // eslint-disable-line react-hooks/exhaustive-deps
  const stats = useMemo(() => getStats(period), [period, logs, schedules]) // eslint-disable-line react-hooks/exhaustive-deps

  const doneCount = todayHabits.filter(h => h.status === 'feito').length
  const totalCount = todayHabits.length
  const progressPct = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  // Dispara celebração ao completar 100% dos hábitos do dia
  useEffect(() => {
    if (totalCount === 0 || loading) return
    const justCompleted = prevDoneCount.current !== null
      && prevDoneCount.current < totalCount
      && doneCount === totalCount
    if (justCompleted) {
      setConfetti(true)
      setTimeout(() => setConfetti(false), 2800)
    }
    prevDoneCount.current = doneCount
  }, [doneCount, totalCount, loading])

  if (loading) {
    return (
      <div className="page">
        <div className="container dashboard-loading">
          {!goalsLoading && goalsEnabled !== false && activeGoals.length === 0 && (
            <GoalsSetupBanner onActivated={() => { window.location.reload() }} />
          )}
          {!goalsLoading && goalsEnabled !== false && activeGoals.length > 0 && (
            <GoalSummaryBanner weeklyGoal={weeklyGoal} goodDays={goodDays} activeGoals={activeGoals} />
          )}
          {showNutritionBanner && (
            <div
              className="nutrition-banner"
              onClick={() => setShowSetupModal(true)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setShowSetupModal(true)}
            >
              <span className="nutrition-banner-icon">🥗</span>
              <div className="nutrition-banner-text">
                <div className="nutrition-banner-title">Organizar alimentação</div>
                <div className="nutrition-banner-sub">A IA monta sugestões de refeições para sua rotina</div>
              </div>
              <button className="nutrition-banner-dismiss" onClick={dismissBanner} aria-label="Dispensar">
                <X size={14} />
              </button>
            </div>
          )}
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
        {showSetupModal && (
          <NutritionSetupModal
            onClose={() => setShowSetupModal(false)}
            onApplied={handlePlanApplied}
          />
        )}
      </div>
    )
  }

  return (
    <div className="page">
      {confetti && (
        <div className="confetti-overlay" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className="confetti-piece" style={{ '--i': i }} />
          ))}
          <div className="confetti-banner">
            🎉 Todos os hábitos concluídos!
          </div>
        </div>
      )}
      <div className="container dashboard">

        {/* Banner de metas */}
        {!goalsLoading && goalsEnabled !== false && activeGoals.length === 0 && (
          <GoalsSetupBanner onActivated={() => { window.location.reload() }} />
        )}
        {!goalsLoading && goalsEnabled !== false && activeGoals.length > 0 && (
          <GoalSummaryBanner
            weeklyGoal={weeklyGoal}
            goodDays={goodDays}
            activeGoals={activeGoals}
          />
        )}

        {/* Banner nutricional */}
        {showNutritionBanner && (
          <div
            className="nutrition-banner"
            onClick={() => setShowSetupModal(true)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setShowSetupModal(true)}
          >
            <span className="nutrition-banner-icon">🥗</span>
            <div className="nutrition-banner-text">
              <div className="nutrition-banner-title">Organizar alimentação</div>
              <div className="nutrition-banner-sub">A IA monta sugestões de refeições para sua rotina</div>
            </div>
            <button className="nutrition-banner-dismiss" onClick={dismissBanner} aria-label="Dispensar">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Today Section */}
        <section className="dashboard-section">
          <div className="dashboard-today-header">
            <div>
              <h2 className="dashboard-section-title">Hoje</h2>
              <p className="text-sm text-secondary">
                {doneCount} de {totalCount} hábito{totalCount !== 1 ? 's' : ''} concluído{doneCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="today-progress-ring" aria-label={`${Math.round(progressPct)}% concluído`}>
              <svg viewBox="0 0 36 36" className="ring-svg">
                <circle className="ring-bg" cx="18" cy="18" r="15.9" />
                <circle
                  className="ring-fill"
                  cx="18"
                  cy="18"
                  r="15.9"
                  strokeDasharray={`${progressPct} ${100 - progressPct}`}
                  strokeDashoffset="25"
                />
              </svg>
              <span className="ring-label">{Math.round(progressPct)}%</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-bar" style={{ marginBottom: 'var(--space-4)' }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Habit cards */}
          <div className="habit-list">
            {todayHabits.length === 0 ? (
              <div className="empty-today glass-card">
                <span style={{ fontSize: '2rem' }}>🌟</span>
                <p className="text-secondary text-sm">
                  Nenhum hábito agendado para hoje.
                </p>
                <a href="/habits" className="btn btn-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                  Configurar hábitos
                </a>
              </div>
            ) : (
              todayHabits.map(schedule => {
                const mealId = schedule.habit?.nutrition_meal_id
                const nutritionMeal = mealId ? nutritionMealsMap[mealId] : null
                return (
                  <HabitCard
                    key={schedule.id}
                    schedule={schedule}
                    nutritionMeal={nutritionMeal}
                    nutritionMode={profile?.nutrition_mode ?? 'simples'}
                    onNutritionLogged={handleNutritionLogged}
                  />
                )
              })
            )}
          </div>
        </section>

        {/* Stats Section */}
        <section className="dashboard-section">
          <h2 className="dashboard-section-title">Resumo</h2>
          <div className="stats-grid">
            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ color: 'var(--color-done)' }}>
                <Target size={20} />
              </div>
              <div className="stat-value">{stats.adherenceRate}%</div>
              <div className="stat-label text-xs text-secondary">Adesão ({period}d)</div>
            </div>
            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ color: 'var(--color-pending)' }}>
                <Flame size={20} />
              </div>
              <div className="stat-value">{stats.streak}</div>
              <div className="stat-label text-xs text-secondary">Dias seguidos</div>
            </div>
            <div className="stat-card glass-card">
              <div className="stat-icon" style={{ color: 'var(--color-accent)' }}>
                <TrendingUp size={20} />
              </div>
              <div className="stat-value">{stats.totalDone}</div>
              <div className="stat-label text-xs text-secondary">Conquistas</div>
            </div>
          </div>
        </section>

        {/* Heatmap Section */}
        <section className="dashboard-section">
          <div className="dashboard-heatmap-header">
            <h2 className="dashboard-section-title">
              <Calendar size={18} />
              Mapa de Evolução
            </h2>
            <div className="period-selector">
              {PERIOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`chip ${period === opt.value ? 'active' : ''}`}
                  onClick={() => setPeriod(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="heatmap-container glass-card">
            <HabitHeatmap matrix={matrix} dates={dates} />
          </div>
        </section>

      </div>

      {showSetupModal && (
        <NutritionSetupModal
          onClose={() => setShowSetupModal(false)}
          onApplied={handlePlanApplied}
        />
      )}
    </div>
  )
}
