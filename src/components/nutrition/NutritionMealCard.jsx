import { useState } from 'react'
import { logMeal } from '../../services/nutritionService'
import MealSwapDrawer from './MealSwapDrawer'
import './nutrition.css'


function formatQty(item) {
  if (!item.quantidade_min && !item.quantidade_max) return null
  const un = item.unidade ?? 'g'
  if (item.quantidade_min && item.quantidade_max && item.quantidade_min !== item.quantidade_max) {
    return `${item.quantidade_min}${un} a ${item.quantidade_max}${un}`
  }
  return `${item.quantidade_min ?? item.quantidade_max}${un}`
}

export default function NutritionMealCard({ meal, mode = 'simples', onLogged }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSwap, setShowSwap] = useState(false)

  const status = meal.log?.status ?? null
  const isDone = status === 'feito' || status === 'adaptado'
  const isPulou = status === 'pulou'
  const showMacros = (mode === 'detalhado' || mode === 'profissional') &&
    (meal.proteina_g || meal.carboidrato_g || meal.gordura_g || meal.calorias_estimadas)

  async function handleMark(newStatus) {
    if (saving) return
    setSaving(true)
    try {
      await logMeal({ meal_id: meal.id, status: newStatus })
      onLogged?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={`nm-card ${isDone ? 'done' : ''} ${isPulou ? 'pulou' : ''}`}>
        {/* Header clicável */}
        <div className="nm-header" onClick={() => setOpen(o => !o)}>
          <div className="nm-info">
            <div className="nm-name">
              {meal.nome}
              {isDone && <span style={{ fontSize: 11, color: 'var(--color-done)' }}>✓</span>}
              {isPulou && <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>pulou</span>}
            </div>
            {meal.horario && (
              <div className="nm-time">{meal.horario?.slice(0, 5)}</div>
            )}
            {meal.descricao_simples && !open && (
              <div className="nm-desc">{meal.descricao_simples}</div>
            )}
          </div>
          <div className="nm-actions" onClick={e => e.stopPropagation()}>
            <button
              className={`nm-check-btn ${isDone ? 'done' : ''} ${isPulou ? 'pulou' : ''}`}
              onClick={() => handleMark(isDone ? 'pendente' : 'feito')}
              disabled={saving}
              title={isDone ? 'Desmarcar' : 'Marcar como feito'}
            >
              {saving ? '…' : isDone ? '✓' : '○'}
            </button>
            <button className={`nm-expand-btn ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)}>
              ▾
            </button>
          </div>
        </div>

        {/* Painel expandido */}
        {open && (
          <div className="nm-body">
            {meal.objetivo_refeicao && (
              <p className="nm-objetivo">{meal.objetivo_refeicao}</p>
            )}

            {/* Itens */}
            {meal.itens?.length > 0 && (
              <div className="nm-section">
                <div className="nm-section-title">
                  {mode === 'simples' ? 'Monte seu prato' : 'Sugestão'}
                </div>
                <div className="nm-items">
                  {meal.itens.map((item, i) => {
                    const qty = formatQty(item)
                    return (
                      <div key={i} className="nm-item">
                        <span className="nm-item-dot" />
                        <span className="nm-item-name">{item.alimento}</span>
                        {qty && mode !== 'simples' && (
                          <span className="nm-item-qty">{qty}</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Substituições */}
            {meal.substituicoes?.length > 0 && (
              <div className="nm-section">
                <div className="nm-section-title">Substituições</div>
                <div className="nm-subs">
                  {meal.substituicoes.map((s, i) => (
                    <div key={i} className="nm-sub">
                      <span className="nm-sub-orig">{s.alimento_original}</span>
                      <span className="nm-sub-arrow">→</span>
                      <span>{s.substituto}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Macros (modo detalhado/profissional) */}
            {showMacros && (
              <div className="nm-section">
                <div className="nm-section-title">Macros aproximados</div>
                <div className="nm-macros">
                  {meal.proteina_g && (
                    <div className="nm-macro">
                      <span className="nm-macro-val">{meal.proteina_g}g</span>
                      <span className="nm-macro-label">Prot.</span>
                    </div>
                  )}
                  {meal.carboidrato_g && (
                    <div className="nm-macro">
                      <span className="nm-macro-val">{meal.carboidrato_g}g</span>
                      <span className="nm-macro-label">Carb.</span>
                    </div>
                  )}
                  {meal.gordura_g && (
                    <div className="nm-macro">
                      <span className="nm-macro-val">{meal.gordura_g}g</span>
                      <span className="nm-macro-label">Gord.</span>
                    </div>
                  )}
                  {meal.calorias_estimadas && (
                    <div className="nm-macro">
                      <span className="nm-macro-val">{meal.calorias_estimadas}</span>
                      <span className="nm-macro-label">kcal</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ações */}
            <div className="nm-footer-actions">
              {!isDone && (
                <button className="nm-action-btn primary" onClick={() => handleMark('feito')} disabled={saving}>
                  ✓ Marcar como feita
                </button>
              )}
              <button className="nm-action-btn" onClick={() => handleMark('adaptado')} disabled={saving}>
                Fiz adaptado
              </button>
              <button className="nm-action-btn" onClick={() => setShowSwap(true)}>
                Trocar refeição
              </button>
              {!isPulou && (
                <button className="nm-action-btn" onClick={() => handleMark('pulou')} disabled={saving}>
                  Pulei esta
                </button>
              )}
            </div>

            <p className="nm-safety-note">
              Sugestão estimada para organização da rotina. Não substitui nutricionista, médico ou outro profissional de saúde.
            </p>
          </div>
        )}
      </div>

      {showSwap && (
        <MealSwapDrawer
          meal={meal}
          onClose={() => setShowSwap(false)}
          onLogged={() => { setShowSwap(false); onLogged?.() }}
        />
      )}
    </>
  )
}
