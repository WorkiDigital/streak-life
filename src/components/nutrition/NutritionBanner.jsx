import { X } from 'lucide-react'
import './nutrition.css'

export default function NutritionBanner({ onClick, onDismiss }) {
  return (
    <div
      className="nutrition-banner"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick?.()}
    >
      <span className="nutrition-banner-icon">🥗</span>
      <div className="nutrition-banner-text">
        <div className="nutrition-banner-title">Organizar alimentação</div>
        <div className="nutrition-banner-sub">A IA monta sugestões de refeições para sua rotina</div>
      </div>
      <button
        className="nutrition-banner-dismiss"
        onClick={e => { e.stopPropagation(); onDismiss?.() }}
        aria-label="Dispensar"
      >
        <X size={14} />
      </button>
    </div>
  )
}
