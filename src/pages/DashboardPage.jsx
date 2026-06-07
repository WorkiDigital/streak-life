import { useState, useEffect, useRef, useMemo } from 'react'
import { Flame, Target, TrendingUp, Calendar } from 'lucide-react'
import { useHabits } from '../contexts/HabitsContext'
import { useAuth } from '../contexts/AuthContext'
import HabitCard from '../components/habits/HabitCard'
import HabitHeatmap from '../components/habits/HabitHeatmap'
import { useTodayNutrition } from '../hooks/useTodayNutrition'
import NutritionSetupModal from '../components/nutrition/NutritionSetupModal'
import GoalSummaryBanner from '../components/goals/GoalSummaryBanner'
import GoalsSetupBanner from '../components/goals/GoalsSetupBanner'
import NutritionBanner from '../components/nutrition/NutritionBanner'
import { useGoals } from '../hooks/useGoals'
import '../components/nutrition/nutrition.css'
import './DashboardPage.css'

const BANNER_DISMISSED_KEY = 'nutrition_banner_dismissed'

function todayInTz(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = type => parts.find(part => part.type === type)?.value
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

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

  // Só 1 banner por vez — ordem de prioridade
  const activeBanner = !goalsLoading
    ? (goalsEnabled === false && activeGoals.length === 0) ? 'goals-setup'
    : (activeGoals.length > 0)                            ? 'goals-summary'
    : showNutritionBanner                                  ? 'nutrition'
    : null
    : null
  const today = useMemo(() => todayInTz(profile?.timezone), [profile?.timezone])
  const { data: nutritionData, refresh: refreshNutrition } = useTodayNutrition(
    profile?.nutrition_enabled ? today : null
  )

  async function handleNutritionLogged() {
    await Promise.allSettled([refreshNutrition(), refreshData()])
  }

  function scrollToTodayPlan() {
    document.getElementById('today-habit-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
          {activeBanner === 'goals-setup' && (
            <GoalsSetupBanner onActivated={() => { window.location.reload() }} />
          )}
          {activeBanner === 'goals-summary' && (
            <GoalSummaryBanner weeklyGoal={weeklyGoal} goodDays={goodDays} activeGoals={activeGoals} />
          )}
          {activeBanner === 'nutrition' && (
            <NutritionBanner onClick={() => setShowSetupModal(true)} onDismiss={dismissBanner} />
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

        {/* Banner — apenas 1 por vez, por prioridade */}
        {activeBanner === 'goals-setup' && (
          <GoalsSetupBanner onActivated={() => { window.location.reload() }} />
        )}
        {activeBanner === 'goals-summary' && (
          <GoalSummaryBanner weeklyGoal={weeklyGoal} goodDays={goodDays} activeGoals={activeGoals} />
        )}
        {activeBanner === 'nutrition' && (
          <NutritionBanner onClick={() => setShowSetupModal(true)} onDismiss={dismissBanner} />
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

          {nutritionData?.meals?.length > 0 && (
            <div className="nutrition-today-card glass-card">
              <div className="nutrition-today-head">
                <div>
                  <h3>Plano alimentar de hoje</h3>
                  <p>{nutritionData.meals.filter(meal => meal.log?.status === 'feito' || meal.log?.status === 'adaptado').length} de {nutritionData.meals.length} refeicoes concluidas</p>
                </div>
                <button className="btn btn-secondary" onClick={scrollToTodayPlan}>Ver plano</button>
              </div>
              <div className="nutrition-today-list">
                {nutritionData.meals.slice(0, 4).map(meal => (
                  <button key={meal.id} className="nutrition-today-row" onClick={scrollToTodayPlan}>
                    <span>{meal.nome}</span>
                    <strong>{meal.horario?.slice(0, 5) ?? '--:--'}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Habit cards */}
          <div className="habit-list" id="today-habit-list">
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
                    nutritionDate={today}
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
