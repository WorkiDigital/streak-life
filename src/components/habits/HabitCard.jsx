import { useState } from 'react'
import { Check, Clock, X, Loader2 } from 'lucide-react'
import { useHabits } from '../../contexts/HabitsContext'
import { useToast } from '../../contexts/ToastContext'
import './HabitCard.css'

export default function HabitCard({ schedule }) {
  const [animating, setAnimating] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [valor, setValor] = useState('')
  const [nota, setNota] = useState('')
  const { markDone, undoMark } = useHabits()
  const toast = useToast()

  const habit = schedule.habit || schedule.habits
  const isDone = schedule.status === 'feito'
  const isMissed = schedule.status === 'nao_feito'

  async function handleToggle() {
    if (saving) return
    setSaving(true)
    try {
      if (isDone) {
        await undoMark(schedule.habit_id)
        toast.success('Hábito desmarcado')
      } else {
        setAnimating(true)
        setShowExtra(true)
        setTimeout(() => setAnimating(false), 600)
      }
    } catch {
      toast.error('Erro ao atualizar hábito')
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
      })
      toast.success(`${habit?.nome} marcado! ✨`)
    } catch {
      toast.error('Erro ao salvar hábito')
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
        className={`habit-card glass-card ${isDone ? 'done' : ''} ${isMissed ? 'missed' : ''} ${animating ? 'animate-burst' : ''}`}
      >
        <div className="habit-card-info">
          <span className="habit-card-icon">{habit?.icone || '📋'}</span>
          <div className="habit-card-text">
            <span className="habit-card-name">{habit?.nome || 'Hábito'}</span>
            <span className="habit-card-time text-xs text-secondary">
              <Clock size={12} />
              {schedule.horarios?.length > 1
                ? `${schedule.horarios[0]} … ${schedule.horarios[schedule.horarios.length - 1]} (${schedule.horarios.length}×)`
                : (schedule.horarios?.[0] || schedule.horario)?.slice(0, 5) || '--:--'}
            </span>
            {isDone && schedule.log?.valor && (
              <span className="habit-card-valor text-xs text-secondary">{schedule.log.valor}</span>
            )}
          </div>
        </div>

        <button
          className={`habit-card-btn ${isDone ? 'btn-done' : 'btn-pending'}`}
          onClick={handleToggle}
          disabled={saving}
          aria-label={isDone ? 'Desmarcar hábito' : 'Marcar como feito'}
          aria-busy={saving}
        >
          {saving ? (
            <Loader2 size={18} className="spin" />
          ) : isDone ? (
            <>
              <Check size={18} />
              <span>Feito</span>
            </>
          ) : (
            <span>Marcar ✓</span>
          )}
        </button>
      </div>

      {/* Mini-modal de valor/nota */}
      {showExtra && (
        <div className="habit-extra-panel glass-card">
          <div className="habit-extra-header">
            <span className="text-sm font-semibold">Adicionar detalhe <span className="text-tertiary">(opcional)</span></span>
            <button className="btn btn-ghost btn-icon" onClick={handleConfirm} aria-label="Pular">
              <X size={16} />
            </button>
          </div>
          <input
            className="input"
            placeholder="Quantidade (ex: 2L, 45min)"
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
