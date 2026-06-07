import { useState } from 'react'
import { logMeal } from '../../services/nutritionService'
import { useToast } from '../../contexts/ToastContext'
import './nutrition.css'

const REASONS = [
  { id: 'no_ingredient', label: 'Nao tenho esse alimento' },
  { id: 'faster', label: 'Quero algo mais rapido' },
  { id: 'cheaper', label: 'Quero algo mais barato' },
  { id: 'lighter', label: 'Quero algo mais leve' },
  { id: 'other', label: 'Outro motivo' },
]

export default function MealSwapDrawer({ meal, onClose, onLogged }) {
  const [reason, setReason] = useState(null)
  const [extra, setExtra] = useState('')
  const [selectedSwapIndex, setSelectedSwapIndex] = useState(null)
  const [saving, setSaving] = useState(false)
  const toast = useToast()
  const selectedSwap = selectedSwapIndex !== null ? meal.substituicoes?.[selectedSwapIndex] : null

  async function handleSave() {
    if (saving) return
    setSaving(true)

    try {
      const reasonLabel = reason ? REASONS.find(r => r.id === reason)?.label : ''
      const swapLabel = selectedSwap
        ? `${selectedSwap.alimento_original} -> ${selectedSwap.substituto}`
        : ''
      const obs = [reasonLabel, swapLabel, extra].filter(Boolean).join(' - ')

      await logMeal({ meal_id: meal.id, status: 'adaptado', observacao: obs })
      await onLogged?.()
      toast.success(selectedSwap ? 'Troca sugerida registrada' : 'Troca registrada como adaptacao')
    } catch (err) {
      toast.error(`Erro ao registrar troca: ${err.message}`)
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="swap-overlay" onClick={onClose}>
      <div className="swap-drawer" onClick={e => e.stopPropagation()}>
        <div className="swap-handle" />
        <h3 className="swap-title">Trocar {meal.nome}</h3>

        <div className="swap-content">
          {meal.substituicoes?.length > 0 && (
            <section className="swap-section">
              <p className="swap-label">Sugestoes da IA para esta refeicao</p>
              <div className="swap-suggestions">
                {meal.substituicoes.map((swap, index) => (
                  <button
                    key={`${swap.alimento_original}-${swap.substituto}-${index}`}
                    className={`swap-suggestion-btn ${selectedSwapIndex === index ? 'selected' : ''}`}
                    onClick={() => setSelectedSwapIndex(selectedSwapIndex === index ? null : index)}
                    aria-pressed={selectedSwapIndex === index}
                  >
                    <span className="swap-suggestion-from">{swap.alimento_original}</span>
                    <span className="swap-suggestion-main">
                      <strong>{swap.substituto}</strong>
                      {selectedSwapIndex === index && <span className="swap-selected-mark">✓</span>}
                    </span>
                  </button>
                ))}
              </div>
              {selectedSwap && (
                <p className="swap-selected-text">Selecionado: {selectedSwap.substituto}</p>
              )}
            </section>
          )}

          <section className="swap-section">
            <p className="swap-label">Por que deseja trocar?</p>
            <div className="swap-reasons">
              {REASONS.map(r => (
                <button
                  key={r.id}
                  className={`swap-reason-btn ${reason === r.id ? 'selected' : ''}`}
                  onClick={() => setReason(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </section>

          <textarea
            className="swap-input"
            rows={2}
            placeholder="Diga o que voce tem disponivel ou o que quer comer"
            value={extra}
            onChange={e => setExtra(e.target.value)}
          />
        </div>

        <div className="swap-actions">
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : selectedSwap ? 'Usar sugestao' : 'Registrar troca'}
          </button>
        </div>
      </div>
    </div>
  )
}
