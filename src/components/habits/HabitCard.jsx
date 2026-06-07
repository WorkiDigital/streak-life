import { useRef, useState } from 'react'
import { Check, Clock, X, Loader2, ChevronDown, PenLine } from 'lucide-react'
import { useHabits } from '../../contexts/HabitsContext'
import { useToast } from '../../contexts/ToastContext'
import NutritionMealCard from '../nutrition/NutritionMealCard'
import './HabitCard.css'

const LONG_PRESS_MS = 500

export default function HabitCard({ schedule, nutritionMeal = null, nutritionMode = 'simples', nutritionDate = null, onNutritionLogged }) {
  const [animating, setAnimating] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [showNutrition, setShowNutrition] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [valor, setValor] = useState('')
  const [nota, setNota] = useState('')
  const { markDone, undoMark } = useHabits()
  const toast = useToast()
  const longPressTimer = useRef(null)
  const didLongPress = useRef(false)

  const habit = schedule.habit || schedule.habits
  const hasNutrition = !!(habit?.nutrition_meal_id && nutritionMeal)
  const isDone = schedule.status === 'feito'
  const isMissed = schedule.status === 'nao_feito'

  const totalHorarios = schedule.horarios?.length ?? 1
  const isMulti = totalHorarios > 1
  const rawCount = parseInt(schedule.log?.valor)
  const currentCount = isMulti && rawCount > 0 && rawCount <= totalHorarios ? rawCount : 0
  const allDone = isDone

  function openExtras() {
    setShowNutrition(false)
    setShowExtra(true)
  }

  function startLongPress() {
    didLongPress.current = false
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true
      if (!isDone && !isMulti && !hasNutrition) openExtras()
    }, LONG_PRESS_MS)
  }

  function cancelLongPress() {
    clearTimeout(longPressTimer.current)
  }

  // Ação primária do botão de check: marca direto, sem modal
  async function handleCheckPress() {
    if (saving) return
    setSaving(true)
    try {
      if (isDone) {
        await undoMark(schedule.habit_id)
        toast.success('Hábito desmarcado')
      } else {
        setAnimating(true)
        setTimeout(() => setAnimating(false), 600)
        await markDone(schedule.habit_id, new Date(), { totalHorarios })
        if (!isMulti || currentCount + 1 >= totalHorarios) {
          toast.success(`${habit?.nome} marcado! ✨`)
        }
      }
    } catch (err) {
      toast.error(`Erro ao atualizar hábito: ${err.message}`)
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
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchCancel={cancelLongPress}
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
            {hasNutrition && (
              <span className="text-xs text-secondary" style={{ marginTop: 2 }}>
                {nutritionMeal?.descricao_simples?.slice(0, 40) ?? 'Ver refeição'}...
              </span>
            )}
          </div>
        </div>

        {/* Botão de extras (lápis) — só para hábitos fixos sem nutrição */}
        {!isMulti && !hasNutrition && !isDone && (
          <button
            className="habit-card-expand-btn"
            onClick={e => { e.stopPropagation(); openExtras() }}
            aria-label="Adicionar detalhe"
          >
            <PenLine size={15} />
          </button>
        )}

        {hasNutrition && (
          <button
            className="habit-card-expand-btn"
            onClick={() => { setShowExtra(false); setShowNutrition(v => !v) }}
            aria-label={showNutrition ? 'Fechar refeição' : 'Ver refeição'}
          >
            <ChevronDown size={16} style={{ transform: showNutrition ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}

        <button
          className={`habit-card-btn ${allDone ? 'btn-done' : 'btn-pending'}`}
          onClick={handleCheckPress}
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

      {/* Painel de nutrição expansível */}
      {hasNutrition && showNutrition && (
        <NutritionMealCard
          meal={{ ...nutritionMeal, log: schedule.log?.nutrition_meal_log ?? nutritionMeal.log }}
          mode={nutritionMode}
          date={nutritionDate}
          onLogged={onNutritionLogged}
        />
      )}

      {/* Painel de extras — abre via lápis ou long-press */}
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
