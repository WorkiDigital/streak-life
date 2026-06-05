import { useState } from 'react'
import { Check, Clock, X, Loader2 } from 'lucide-react'
import { useHabits } from '../../contexts/HabitsContext'
import { useToast } from '../../contexts/ToastContext'
import NutritionMealCard from '../nutrition/NutritionMealCard'
import './HabitCard.css'

export default function HabitCard({ schedule, nutritionMeal = null, nutritionMode = 'simples', onNutritionLogged }) {
  const [animating, setAnimating] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [valor, setValor] = useState('')
  const [nota, setNota] = useState('')
  const { markDone, undoMark } = useHabits()
  const toast = useToast()

  const habit = schedule.habit || schedule.habits
  const hasNutrition = !!(habit?.nutrition_meal_id && nutritionMeal)
  const isDone = schedule.status === 'feito'
  const isMissed = schedule.status === 'nao_feito'

  const totalHorarios = schedule.horarios?.length ?? 1
  const isMulti = totalHorarios > 1
  const rawCount = parseInt(schedule.log?.valor)
  const currentCount = isMulti && rawCount > 0 && rawCount <= totalHorarios ? rawCount : 0
  const allDone = isDone

  async function handleToggle() {
    if (saving) return
    setSaving(true)
    try {
      if (isDone) {
        await undoMark(schedule.habit_id)
        toast.success('Hábito desmarcado')
      } else if (isMulti) {
        // Multi-horário: incrementa direto, sem mini-modal
        setAnimating(true)
        setTimeout(() => setAnimating(false), 600)
        await markDone(schedule.habit_id, new Date(), { totalHorarios })
        const next = currentCount + 1
        if (next >= totalHorarios) {
          toast.success(`${habit?.nome} completo! ✨`)
        }
      } else {
        setAnimating(true)
        setShowExtra(true)
        setTimeout(() => setAnimating(false), 600)
      }
    } catch (err) {
      toast.error(`Erro ao atualizar hábito: ${err.message}`)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirm() {
    if (confirming) return
    setConfirming(true)
    try {
      await markDone(schedule.habit_id, new Date(), {
        valor: valor.trim() || null,
        nota: nota.trim() || null,
        totalHorarios,
      })
      toast.success(`${habit?.nome} marcado! ✨`)
    } catch (err) {
      toast.error(`Erro ao salvar hábito: ${err.message}`)
      console.error(err)
    } finally {
      setConfirming(false)
      setShowExtra(false)
      setValor('')
      setNota('')
    }
  }

  return (
    <>
      <div
        className={`habit-card glass-card ${allDone ? 'done' : ''} ${isMissed ? 'missed' : ''} ${animating ? 'animate-burst' : ''}`}
      >
        <div className="habit-card-info">
          <span className="habit-card-icon">{habit?.icone || '📋'}</span>
          <div className="habit-card-text">
            <span className="habit-card-name">{habit?.nome || 'Hábito'}</span>
            <span className="habit-card-time text-xs text-secondary">
              <Clock size={12} />
              {isMulti
                ? `${schedule.horarios[0]?.slice(0, 5)} … ${schedule.horarios[schedule.horarios.length - 1]?.slice(0, 5)} (${totalHorarios}×)`
                : (schedule.horarios?.[0] || schedule.horario)?.slice(0, 5) || '--:--'}
            </span>
            {isMulti && !allDone && (
              <span className="habit-card-progress text-xs text-secondary">
                {currentCount}/{totalHorarios} {habit?.icone || '✓'}
              </span>
            )}
            {!isMulti && isDone && schedule.log?.valor && (
              <span className="habit-card-valor text-xs text-secondary">{schedule.log.valor}</span>
            )}
          </div>
        </div>

        <button
          className={`habit-card-btn ${allDone ? 'btn-done' : 'btn-pending'}`}
          onClick={handleToggle}
          disabled={saving}
          aria-label={allDone ? 'Desmarcar hábito' : isMulti ? `Registrar (${currentCount}/${totalHorarios})` : 'Marcar como feito'}
          aria-busy={saving}
        >
          {saving ? (
            <Loader2 size={18} className="spin" />
          ) : allDone ? (
            <>
              <Check size={18} />
              <span>Feito</span>
            </>
          ) : isMulti ? (
            <span>+1 ({currentCount}/{totalHorarios})</span>
          ) : (
            <span>Marcar ✓</span>
          )}
        </button>
      </div>

      {/* Plano nutricional expansível — quando refeição vinculada existe */}
      {hasNutrition && (
        <NutritionMealCard
          meal={{ ...nutritionMeal, log: schedule.log?.nutrition_meal_log ?? nutritionMeal.log }}
          mode={nutritionMode}
          onLogged={onNutritionLogged}
        />
      )}

      {/* Mini-modal de valor/nota — apenas para hábitos de horário fixo sem nutrição */}
      {showExtra && !isMulti && !hasNutrition && (
        <div className="habit-extra-panel glass-card">
          <div className="habit-extra-header">
            <span className="text-sm font-semibold">Adicionar detalhe <span className="text-tertiary">(opcional)</span></span>
            <button className="btn btn-ghost btn-icon" onClick={handleConfirm} aria-label="Pular">
              <X size={16} />
            </button>
          </div>
          <input
            className="input"
            placeholder="Detalhe rápido (opcional)"
            value={valor}
            onChange={e => setValor(e.target.value)}
            autoFocus
          />
          <input
            className="input"
            placeholder="Nota rápida (opcional)"
            value={nota}
            onChange={e => setNota(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleConfirm()}
          />
          <button className="btn btn-primary btn-full" onClick={handleConfirm} disabled={confirming} aria-busy={confirming}>
            {confirming ? <Loader2 size={18} className="spin" /> : 'Confirmar ✅'}
          </button>
        </div>
      )}
    </>
  )
}
