import { useState, useMemo } from 'react'
import { X, Share2, Plus } from 'lucide-react'
import { useHabits } from '../contexts/HabitsContext'
import { useToast } from '../contexts/ToastContext'
import HabitHeatmap from '../components/habits/HabitHeatmap'
import GoalProgressCard from '../components/goals/GoalProgressCard'
import CreateGoalModal from '../components/goals/CreateGoalModal'
import { useGoals } from '../hooks/useGoals'
import './ProgressPage.css'

const PERIOD_OPTIONS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '3 meses', value: 90 },
]

export default function ProgressPage() {
  const [period, setPeriod] = useState(30)
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const { getHeatmapData, getStats, getWeeklyStats, schedules, habits, logs, loading, refreshData } = useHabits()
  const toast = useToast()
  const { goalsEnabled, activeGoals, weeklyGoal, goodDays, refresh: refreshGoals } = useGoals()
  const { matrix, dates } = useMemo(() => getHeatmapData(period), [logs, schedules, period])
  const stats = useMemo(() => getStats(period), [logs, schedules, period])
  const weeklyData = useMemo(() => getWeeklyStats(8), [logs, schedules])

  async function handleShare() {
    const text = `🔥 Estou com ${stats.streak} dias seguidos no Evolui!\n✅ ${stats.adherenceRate}% de adesão nos últimos ${period} dias\n💪 ${stats.totalDone} hábitos concluídos\n\nConsistência bate intensidade. #Evolui`
    if (navigator.share) {
      try { await navigator.share({ title: 'Meu progresso no Evolui', text }) } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
      toast.success('Copiado para a área de transferência!')
    }
  }

  async function handleGoalCreated() {
    await Promise.allSettled([refreshGoals(), refreshData()])
  }

  return (
    <div className="page">
      <div className="container progress-page">
        <div className="progress-header">
          <h1 className="text-2xl font-bold">Progresso</h1>
          <div className="progress-header-right">
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
            <button
              className="btn btn-secondary btn-icon-text"
              onClick={() => setShowGoalModal(true)}
              aria-label="Criar meta"
            >
              <Plus size={17} />
              <span>Criar meta</span>
            </button>
            <button
              className="btn btn-ghost btn-icon"
              onClick={handleShare}
              aria-label="Compartilhar progresso"
              title="Compartilhar"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Metas */}
        {goalsEnabled !== false && (
          <section>
            <div className="progress-section-heading">
              <h2>Metas</h2>
              {weeklyGoal && <span>{goodDays} dias bons esta semana</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {activeGoals.length > 0 ? (
                activeGoals.map(goal => (
                  <GoalProgressCard key={goal.id} goal={goal} onUpdated={refreshGoals} />
                ))
              ) : (
                <div className="progress-empty-goals glass-card">
                  <strong>Nenhuma meta criada ainda</strong>
                  <span>Crie uma meta simples, conecte a um habito existente ou crie uma meta com lembrete.</span>
                  <button className="btn btn-primary" onClick={() => setShowGoalModal(true)}>Criar primeira meta</button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Summary stats */}
        <div className="progress-stats">
          <div className="progress-stat-big glass-card">
            <span className="progress-stat-value" style={{ color: 'var(--color-done)' }}>
              {stats.adherenceRate}%
            </span>
            <span className="text-sm text-secondary">Taxa de adesão</span>
          </div>
          <div className="progress-stat-row">
            <div className="progress-stat-small glass-card">
              <span className="progress-stat-value-sm">🔥 {stats.streak}</span>
              <span className="text-xs text-secondary">Dias seguidos</span>
            </div>
            <div className="progress-stat-small glass-card">
              <span className="progress-stat-value-sm">✅ {stats.totalDone}</span>
              <span className="text-xs text-secondary">Conquistas</span>
            </div>
            <div className="progress-stat-small glass-card">
              <span className="progress-stat-value-sm">📋 {schedules.length}</span>
              <span className="text-xs text-secondary">Hábitos ativos</span>
            </div>
          </div>
        </div>

        {/* Weekly evolution chart */}
        {weeklyData.some(w => w.pct !== null) && (
          <section className="progress-weekly glass-card">
            <h2 className="text-md font-semibold" style={{ marginBottom: 'var(--space-4)' }}>Evolução semanal</h2>
            <div className="weekly-chart" aria-label="Gráfico de adesão semanal">
              <svg viewBox="0 0 320 80" className="weekly-svg" preserveAspectRatio="none">
                {/* Grid lines */}
                {[0, 25, 50, 75, 100].map(v => (
                  <line key={v} x1="0" y1={80 - v * 0.8} x2="320" y2={80 - v * 0.8}
                    stroke="hsla(225,15%,30%,0.25)" strokeWidth="1" />
                ))}
                {/* Area fill */}
                <defs>
                  <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142,71%,45%)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(142,71%,45%)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {(() => {
                  const pts = weeklyData.map((w, i) => {
                    const x = (i / (weeklyData.length - 1)) * 320
                    const y = w.pct !== null ? 80 - w.pct * 0.8 : null
                    return { x, y }
                  })
                  const validPts = pts.filter(p => p.y !== null)
                  if (validPts.length < 2) return null
                  const lineD = validPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
                  const areaD = `${lineD} L ${validPts[validPts.length-1].x} 80 L ${validPts[0].x} 80 Z`
                  return (
                    <>
                      <path d={areaD} fill="url(#chart-fill)" />
                      <path d={lineD} fill="none" stroke="hsl(142,71%,45%)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {validPts.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(142,71%,45%)" />
                      ))}
                    </>
                  )
                })()}
              </svg>
              <div className="weekly-labels">
                {weeklyData.map((w, i) => (
                  <span key={i} className="weekly-label text-xs text-tertiary">{w.label}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Full heatmap */}
        <section className="progress-heatmap glass-card">
          <h2 className="text-md font-semibold" style={{ marginBottom: 'var(--space-4)' }}>
            Mapa de Evolução
          </h2>
          {loading ? (
            <div className="skeleton" style={{ height: 120 }} />
          ) : (
            <HabitHeatmap matrix={matrix} dates={dates} />
          )}
        </section>

        {/* Per-habit adherence */}
        {matrix.length > 0 && (
          <section className="progress-per-habit">
            <h2 className="text-md font-semibold">Por hábito</h2>
            <div className="habit-adherence-list">
              {matrix.map(row => {
                const done = row.cells.filter(c => c.status === 'done').length
                const total = row.cells.filter(c => c.status === 'done' || c.status === 'missed').length
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div
                    key={row.habitId}
                    className="habit-adherence-card glass-card"
                    onClick={() => setSelectedHabit(row)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSelectedHabit(row)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Ver detalhes de ${row.habitName}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="habit-adherence-info">
                      <span className="habit-adherence-icon">{row.habitIcon}</span>
                      <span className="habit-adherence-name">{row.habitName}</span>
                      <span className="habit-adherence-detail-hint text-xs text-tertiary">ver detalhes →</span>
                    </div>
                    <div className="habit-adherence-bar-area">
                      <div className="progress-bar">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span
                        className="habit-adherence-pct text-xs font-semibold"
                        style={{ color: pct >= 70 ? 'var(--color-done)' : pct >= 40 ? 'var(--color-pending)' : 'var(--color-missed)' }}
                      >
                        {pct}%
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Habit detail drawer */}
        {selectedHabit && (
          <div className="modal-overlay" onClick={() => setSelectedHabit(null)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="habit-detail-header">
                <span className="habit-detail-icon">{selectedHabit.habitIcon}</span>
                <h2 className="text-xl font-bold">{selectedHabit.habitName}</h2>
                <button className="btn btn-ghost btn-icon" onClick={() => setSelectedHabit(null)} aria-label="Fechar">
                  <X size={20} />
                </button>
              </div>

              {(() => {
                const done = selectedHabit.cells.filter(c => c.status === 'done').length
                const total = selectedHabit.cells.filter(c => c.status === 'done' || c.status === 'missed').length
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                const streak = (() => {
                  let s = 0
                  for (let i = selectedHabit.cells.length - 1; i >= 0; i--) {
                    if (selectedHabit.cells[i].status === 'done') s++
                    else if (selectedHabit.cells[i].status === 'missed') break
                  }
                  return s
                })()
                return (
                  <div className="habit-detail-stats">
                    <div className="habit-detail-stat glass-card">
                      <span className="habit-detail-stat-value" style={{ color: pct >= 70 ? 'var(--color-done)' : pct >= 40 ? 'var(--color-pending)' : 'var(--color-missed)' }}>{pct}%</span>
                      <span className="text-xs text-secondary">Adesão</span>
                    </div>
                    <div className="habit-detail-stat glass-card">
                      <span className="habit-detail-stat-value">🔥 {streak}</span>
                      <span className="text-xs text-secondary">Sequência</span>
                    </div>
                    <div className="habit-detail-stat glass-card">
                      <span className="habit-detail-stat-value">✅ {done}</span>
                      <span className="text-xs text-secondary">Concluídos</span>
                    </div>
                  </div>
                )
              })()}

              <div className="habit-detail-heatmap glass-card">
                <HabitHeatmap matrix={[selectedHabit]} dates={dates} />
              </div>
            </div>
          </div>
        )}
      </div>

      {showGoalModal && (
        <CreateGoalModal
          habits={habits}
          onClose={() => setShowGoalModal(false)}
          onCreated={handleGoalCreated}
        />
      )}
    </div>
  )
}
