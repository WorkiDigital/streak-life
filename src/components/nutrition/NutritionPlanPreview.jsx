import './nutrition.css'

export default function NutritionPlanPreview({ plan, mode = 'simples' }) {
  if (!plan) return null

  const metas = plan.metas ?? {}
  const refeicoes = plan.refeicoes ?? []
  const showMacros = mode !== 'simples'

  return (
    <div className="np-preview">
      <div className="np-header">
        <div className="np-title">🥗 Plano alimentar gerado</div>
        {plan.observacoes_gerais && (
          <div className="np-obs">{plan.observacoes_gerais}</div>
        )}
      </div>

      {/* Metas */}
      {showMacros && (metas.proteina_g || metas.carboidrato_g || metas.agua_litros) && (
        <div className="np-targets">
          {metas.agua_litros && (
            <div className="np-target-item">
              <span className="np-target-val">{metas.agua_litros}L</span>
              <span className="np-target-label">Água</span>
            </div>
          )}
          {metas.proteina_g && (
            <div className="np-target-item">
              <span className="np-target-val">{metas.proteina_g}g</span>
              <span className="np-target-label">Proteína</span>
            </div>
          )}
          {metas.carboidrato_g && (
            <div className="np-target-item">
              <span className="np-target-val">{metas.carboidrato_g}g</span>
              <span className="np-target-label">Carb.</span>
            </div>
          )}
          {metas.calorias_estimadas && (
            <div className="np-target-item">
              <span className="np-target-val">{metas.calorias_estimadas}</span>
              <span className="np-target-label">kcal</span>
            </div>
          )}
        </div>
      )}

      {/* Refeições */}
      <div className="np-meals">
        {refeicoes.map((r, i) => (
          <div key={i} className="np-meal-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="np-meal-name">{r.nome}</span>
              {r.horario && <span className="np-meal-time">{r.horario}</span>}
            </div>
            {r.descricao_simples && (
              <div className="np-meal-desc">{r.descricao_simples}</div>
            )}
            {mode !== 'simples' && r.itens?.length > 0 && (
              <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {r.itens.slice(0, 3).map((item, j) => {
                  const qty = item.quantidade_min
                    ? ` — ${item.quantidade_min}${item.quantidade_max && item.quantidade_max !== item.quantidade_min ? ` a ${item.quantidade_max}` : ''}${item.unidade ?? 'g'}`
                    : ''
                  return (
                    <span key={j} style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      • {item.alimento}{qty}
                    </span>
                  )
                })}
                {r.itens.length > 3 && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                    + {r.itens.length - 3} item(s)
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="np-safety">
        Este plano é uma sugestão estimada para organização da rotina. Não substitui nutricionista, médico ou outro profissional de saúde.
      </p>
    </div>
  )
}
