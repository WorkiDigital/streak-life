import { useState } from 'react'
import { X, Loader2, Check } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../contexts/ToastContext'
import { generateNutritionPlan, applyNutritionPlan } from '../../services/nutritionService'
import NutritionPlanPreview from './NutritionPlanPreview'
import './nutrition.css'

const MODES = [
  { v: 'simples', label: '🟢 Simples', desc: 'Sugestões por refeição sem gramas.' },
  { v: 'detalhado', label: '🔵 Detalhado', desc: 'Quantidades aproximadas em faixas. Ex: "Frango: 130g a 160g."' },
  { v: 'profissional', label: '⚡ Profissional', desc: 'Macros, gramas e observações técnicas por refeição.' },
]

// step: 'mode' | 'loading' | 'preview' | 'done'
export default function NutritionSetupModal({ onClose, onApplied }) {
  const [step, setStep] = useState('mode')
  const [mode, setMode] = useState('detalhado')
  const [plan, setPlan] = useState(null)
  const [applying, setApplying] = useState(false)
  const { profile, updateProfile } = useAuth()
  const toast = useToast()

  async function handleGenerate() {
    setStep('loading')
    try {
      // Monta perfil a partir do profile salvo
      const perfil = {
        nome: profile?.nome ?? 'Usuário',
        idade: profile?.idade ?? 25,
        sexo: profile?.sexo ?? 'M',
        altura_cm: profile?.altura_cm ?? 170,
        peso_kg: profile?.peso_kg ?? 70,
        peso_meta_kg: profile?.peso_meta_kg ?? 65,
        objetivo: profile?.objetivo ?? 'manter',
        nivel_atividade: profile?.nivel_atividade ?? 'moderado',
        nivel_estresse: profile?.nivel_estresse ?? 'medio',
        treina: profile?.treina ?? false,
        dias_treino: profile?.dias_treino ?? null,
        tipo_treino: profile?.tipo_treino ?? null,
        horario_treino_preferido: profile?.horario_treino_preferido ?? null,
        horario_acordar: profile?.horario_acordar ?? '07:00',
        horario_dormir: profile?.horario_dormir ?? '23:00',
        horario_cafe: profile?.horarios_refeicoes?.cafe ?? '07:00',
        horario_almoco: profile?.horarios_refeicoes?.almoco ?? '12:00',
        horario_lanche: profile?.horarios_refeicoes?.lanche ?? '15:30',
        horario_jantar: profile?.horarios_refeicoes?.jantar ?? '20:00',
        preferencias_alimentares: profile?.preferencias_alimentares ?? 'nenhuma',
        restricoes_alimentares: profile?.restricoes_alimentares ?? 'nenhuma',
        observacoes_saude: profile?.observacoes_saude ?? 'nenhuma',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Fortaleza',
      }

      const result = await generateNutritionPlan(perfil, mode)

      if (result?.risk) {
        setStep('risk')
        return
      }
      if (!result?.plan) throw new Error('Plano não gerado. Tente novamente.')

      setPlan(result.plan)
      setStep('preview')
    } catch (err) {
      toast.error(err.message || 'Erro ao gerar plano')
      setStep('mode')
    }
  }

  async function handleApply() {
    if (applying) return
    setApplying(true)
    try {
      await applyNutritionPlan(plan, mode)
      await updateProfile({ nutrition_enabled: true, nutrition_mode: mode })
      toast.success('Plano alimentar ativado! 🥗')
      onApplied?.()
      onClose()
    } catch (err) {
      toast.error(err.message || 'Erro ao ativar plano')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="nsetup-overlay" onClick={onClose}>
      <div className="nsetup-modal glass-card" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="nsetup-header">
          <span className="nsetup-title">
            {step === 'mode' && '🥗 Criar plano alimentar'}
            {step === 'loading' && 'Gerando seu plano...'}
            {step === 'preview' && 'Seu plano está pronto!'}
            {step === 'risk' && 'Atenção'}
          </span>
          {step !== 'loading' && (
            <button className="nsetup-close" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        {/* Step: escolha de modo */}
        {step === 'mode' && (
          <div className="nsetup-body">
            <p className="nsetup-desc">
              A IA vai montar sugestões de refeições com base no seu perfil e horários já cadastrados.
            </p>
            <div className="nsetup-modes">
              {MODES.map(m => (
                <button
                  key={m.v}
                  className={`nsetup-mode-btn ${mode === m.v ? 'active' : ''}`}
                  onClick={() => setMode(m.v)}
                >
                  <span className="nsetup-mode-label">{m.label}</span>
                  <span className="nsetup-mode-desc">{m.desc}</span>
                </button>
              ))}
            </div>
            <p className="nsetup-safety">
              Sugestão estimada para organização da rotina. Não substitui nutricionista ou médico.
            </p>
            <button className="btn btn-primary btn-full" onClick={handleGenerate}>
              Gerar meu plano ✨
            </button>
          </div>
        )}

        {/* Step: loading */}
        {step === 'loading' && (
          <div className="nsetup-body nsetup-loading">
            <Loader2 size={36} className="spin" />
            <p>A IA está montando suas refeições...</p>
          </div>
        )}

        {/* Step: risco */}
        {step === 'risk' && (
          <div className="nsetup-body nsetup-loading">
            <span style={{ fontSize: 36 }}>💙</span>
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
              Pelo que você informou no perfil, esse caso pede acompanhamento individualizado com nutricionista ou médico. Para sua segurança, não vou montar um plano com quantidades específicas.
            </p>
            <button className="btn btn-secondary" onClick={onClose}>Entendido</button>
          </div>
        )}

        {/* Step: preview */}
        {step === 'preview' && plan && (
          <div className="nsetup-body">
            <div className="nsetup-preview-scroll">
              <NutritionPlanPreview plan={plan} mode={mode} />
            </div>
            <div className="nsetup-actions">
              <button className="btn btn-secondary" onClick={() => setStep('mode')} disabled={applying}>
                Refazer
              </button>
              <button className="btn btn-primary" onClick={handleApply} disabled={applying}>
                {applying ? <><Loader2 size={16} className="spin" /> Ativando...</> : <><Check size={16} /> Ativar plano</>}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
