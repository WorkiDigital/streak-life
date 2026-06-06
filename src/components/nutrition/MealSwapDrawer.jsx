import { useState } from 'react'
import { logMeal } from '../../services/nutritionService'
import './nutrition.css'

const REASONS = [
  { id: 'no_ingredient', label: 'Não tenho esse alimento' },
  { id: 'faster', label: 'Quero algo mais rápido' },
  { id: 'cheaper', label: 'Quero algo mais barato' },
  { id: 'lighter', label: 'Quero algo mais leve' },
  { id: 'other', label: 'Outro motivo' },
]

export default function MealSwapDrawer({ meal, onClose, onLogged }) {
  const [reason, setReason] = useState(null)
  const [extra, setExtra] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      const obs = [reason ? REASONS.find(r => r.id === reason)?.label : '', extra].filter(Boolean).join(' — ')
      await logMeal({ meal_id: meal.id, status: 'adaptado', observacao: obs })
      onLogged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="swap-overlay" onClick={onClose}>
      <div className="swap-drawer" onClick={e => e.stopPropagation()}>
        <div className="swap-handle" />
        <h3 className="swap-title">Trocar {meal.nome}</h3>

        <div className="swap-reasons">
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: 0 }}>
            Por que deseja trocar?
          </p>
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

        <textarea
          className="swap-input"
          rows={1}
          placeholder="O que você tem disponível? (opcional)"
          value={extra}
          onChange={e => setExtra(e.target.value)}
        />

        <div className="swap-actions">
          <button
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            style={{ flex: 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando…' : 'Registrar adaptação'}
          </button>
        </div>
      </div>
    </div>
  )
}
