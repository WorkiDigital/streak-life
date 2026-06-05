import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Loader2, Check, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useHabits } from '../contexts/HabitsContext'
import { useToast } from '../contexts/ToastContext'
import './OnboardingPage.css'

const DAYS_LABEL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const CATEGORY_ICONS = {
  hidratacao: '💧', treino: '🏋️', alimentacao: '🍽️', tela: '👀',
  sono: '🌙', meditacao: '🧘', leitura: '📚', medicamento: '💊',
  ar_livre: '☀️', autocuidado: '✨', alongamento: '🤸', outro: '📋',
}

function StepIndicator({ current, total }) {
  return (
    <div className="ob-step-indicator">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`ob-step-dot ${i < current ? 'done' : i === current ? 'active' : ''}`} />
      ))}
    </div>
  )
}

function ToggleChip({ label, active, onClick }) {
  return (
    <button type="button" className={`ob-chip ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}

function TimeField({ label, value, onChange, required }) {
  return (
    <div className="ob-field">
      <label className="ob-label">{label}{required && <span className="ob-required">*</span>}</label>
      <input type="time" className="ob-input" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ── Step 1: Dados físicos ──────────────────────────────────────────────────
function Step1({ data, onChange }) {
  return (
    <div className="ob-step-body">
      <h2 className="ob-step-title">Dados físicos</h2>
      <p className="ob-step-subtitle">Para calcular sua meta de hidratação e plano personalizado.</p>

      <div className="ob-field">
        <label className="ob-label">Como podemos te chamar?<span className="ob-required">*</span></label>
        <input className="ob-input" placeholder="Seu nome" value={data.nome} onChange={e => onChange('nome', e.target.value)} />
      </div>

      <div className="ob-row">
        <div className="ob-field">
          <label className="ob-label">Idade<span className="ob-required">*</span></label>
          <input className="ob-input" type="number" min="10" max="100" placeholder="31" value={data.idade} onChange={e => onChange('idade', e.target.value)} />
        </div>
        <div className="ob-field">
          <label className="ob-label">Sexo<span className="ob-required">*</span></label>
          <div className="ob-toggle-group">
            <ToggleChip label="Masculino" active={data.sexo === 'M'} onClick={() => onChange('sexo', 'M')} />
            <ToggleChip label="Feminino" active={data.sexo === 'F'} onClick={() => onChange('sexo', 'F')} />
          </div>
        </div>
      </div>

      <div className="ob-row">
        <div className="ob-field">
          <label className="ob-label">Altura (cm)<span className="ob-required">*</span></label>
          <input className="ob-input" type="number" min="100" max="250" placeholder="175" value={data.altura_cm} onChange={e => onChange('altura_cm', e.target.value)} />
        </div>
        <div className="ob-field">
          <label className="ob-label">Peso atual (kg)<span className="ob-required">*</span></label>
          <input className="ob-input" type="number" min="30" max="300" step="0.1" placeholder="80" value={data.peso_kg} onChange={e => onChange('peso_kg', e.target.value)} />
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label">Peso meta (kg)<span className="ob-required">*</span></label>
        <input className="ob-input" type="number" min="30" max="300" step="0.1" placeholder="70" value={data.peso_meta_kg} onChange={e => onChange('peso_meta_kg', e.target.value)} />
      </div>
    </div>
  )
}

// ── Step 2: Rotina ─────────────────────────────────────────────────────────
function Step2({ data, onChange }) {
  return (
    <div className="ob-step-body">
      <h2 className="ob-step-title">Sua rotina</h2>
      <p className="ob-step-subtitle">Usaremos esses horários para distribuir seus lembretes.</p>

      <div className="ob-row">
        <TimeField label="Acorda às" value={data.horario_acordar} onChange={v => onChange('horario_acordar', v)} required />
        <TimeField label="Dorme às" value={data.horario_dormir} onChange={v => onChange('horario_dormir', v)} required />
      </div>

      <div className="ob-field">
        <label className="ob-label">Horários das refeições</label>
        <div className="ob-refeicoes-grid">
          {[
            { key: 'cafe', label: '☕ Café' },
            { key: 'almoco', label: '🍽️ Almoço' },
            { key: 'lanche', label: '🥪 Lanche' },
            { key: 'jantar', label: '🌙 Jantar' },
          ].map(r => (
            <div key={r.key} className="ob-refeicao-item">
              <span className="ob-refeicao-label">{r.label}</span>
              <input
                type="time"
                className="ob-input ob-input-sm"
                value={data.refeicoes[r.key]}
                onChange={e => onChange('refeicoes', { ...data.refeicoes, [r.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Step 3: Treino ─────────────────────────────────────────────────────────
function Step3({ data, onChange }) {
  return (
    <div className="ob-step-body">
      <h2 className="ob-step-title">Atividade física</h2>
      <p className="ob-step-subtitle">Para personalizar seus lembretes de treino e recuperação.</p>

      <div className="ob-field">
        <label className="ob-label">Você treina?</label>
        <div className="ob-toggle-group">
          <ToggleChip label="✅ Sim" active={data.treina === true} onClick={() => onChange('treina', true)} />
          <ToggleChip label="❌ Não por enquanto" active={data.treina === false} onClick={() => onChange('treina', false)} />
        </div>
      </div>

      {data.treina && (
        <>
          <div className="ob-field">
            <label className="ob-label">Tipo de treino</label>
            <div className="ob-chips-wrap">
              {['Musculação', 'Funcional', 'Corrida', 'Misto'].map(t => (
                <ToggleChip key={t} label={t} active={data.tipo_treino === t.toLowerCase().replace('ç', 'c').replace('ã', 'a')} onClick={() => onChange('tipo_treino', t.toLowerCase().replace('ç', 'c').replace('ã', 'a'))} />
              ))}
            </div>
          </div>

          <div className="ob-row">
            <div className="ob-field">
              <label className="ob-label">Dias por semana</label>
              <div className="ob-chips-wrap">
                {[1,2,3,4,5,6,7].map(d => (
                  <ToggleChip key={d} label={String(d)} active={data.dias_treino === d} onClick={() => onChange('dias_treino', d)} />
                ))}
              </div>
            </div>
          </div>

          <TimeField label="Horário do treino" value={data.horario_treino} onChange={v => onChange('horario_treino', v)} />
        </>
      )}
    </div>
  )
}

// ── Step 4: Saúde e objetivo ───────────────────────────────────────────────
function Step4({ data, onChange }) {
  const objetivos = [
    { value: 'emagrecer', label: '⚡ Emagrecer', desc: 'Reduzir gordura corporal' },
    { value: 'ganhar_massa', label: '💪 Ganhar massa', desc: 'Aumentar massa muscular' },
    { value: 'manter', label: '⚖️ Manter peso', desc: 'Consolidar hábitos saudáveis' },
    { value: 'performance', label: '🏆 Performance', desc: 'Melhorar rendimento' },
  ]
  const prefChips = ['Simples', 'Vegetariano', 'Vegano', 'Sem glúten', 'Sem lactose']

  function togglePref(pref) {
    const current = data.preferencias_chips || []
    const next = current.includes(pref) ? current.filter(p => p !== pref) : [...current, pref]
    onChange('preferencias_chips', next)
  }

  return (
    <div className="ob-step-body">
      <h2 className="ob-step-title">Saúde e objetivo</h2>
      <p className="ob-step-subtitle">Últimos detalhes para personalizar seu plano.</p>

      <div className="ob-field">
        <label className="ob-label">Qual seu objetivo principal?<span className="ob-required">*</span></label>
        <div className="ob-objetivo-grid">
          {objetivos.map(o => (
            <button
              key={o.value}
              type="button"
              className={`ob-objetivo-card ${data.objetivo === o.value ? 'active' : ''}`}
              onClick={() => onChange('objetivo', o.value)}
            >
              <span className="ob-objetivo-label">{o.label}</span>
              <span className="ob-objetivo-desc">{o.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ob-row">
        <div className="ob-field">
          <label className="ob-label">Nível de atividade</label>
          <div className="ob-chips-wrap">
            {[
              { v: 'sedentario', l: 'Sedentário' },
              { v: 'leve', l: 'Leve' },
              { v: 'moderado', l: 'Moderado' },
              { v: 'alto', l: 'Alto' },
            ].map(o => (
              <ToggleChip key={o.v} label={o.l} active={data.nivel_atividade === o.v} onClick={() => onChange('nivel_atividade', o.v)} />
            ))}
          </div>
        </div>
        <div className="ob-field">
          <label className="ob-label">Nível de estresse</label>
          <div className="ob-chips-wrap">
            {[
              { v: 'baixo', l: '😌 Baixo' },
              { v: 'medio', l: '😤 Médio' },
              { v: 'alto', l: '😰 Alto' },
            ].map(o => (
              <ToggleChip key={o.v} label={o.l} active={data.nivel_estresse === o.v} onClick={() => onChange('nivel_estresse', o.v)} />
            ))}
          </div>
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label">Preferências alimentares</label>
        <div className="ob-chips-wrap">
          {prefChips.map(p => (
            <ToggleChip key={p} label={p} active={(data.preferencias_chips || []).includes(p)} onClick={() => togglePref(p)} />
          ))}
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label">Tom preferido de comunicação</label>
        <div className="ob-toggle-group">
          {[
            { v: 'amigavel', l: '😊 Amigável' },
            { v: 'direto', l: '🎯 Direto' },
            { v: 'motivacional', l: '🔥 Motivacional' },
          ].map(o => (
            <ToggleChip key={o.v} label={o.l} active={data.tom_preferido === o.v} onClick={() => onChange('tom_preferido', o.v)} />
          ))}
        </div>
      </div>

      <div className="ob-field">
        <label className="ob-label">Restrições alimentares</label>
        <input className="ob-input" placeholder="Ex: intolerância à lactose, celíaco... (ou deixe em branco)" value={data.restricoes_alimentares} onChange={e => onChange('restricoes_alimentares', e.target.value)} />
      </div>

      <div className="ob-field">
        <label className="ob-label">Condições de saúde ou medicamentos</label>
        <input className="ob-input" placeholder="Ex: hipertensão, diabetes, uso de metformina... (ou deixe em branco)" value={data.observacoes_saude} onChange={e => onChange('observacoes_saude', e.target.value)} />
      </div>
    </div>
  )
}

// ── Step 5: Loading ────────────────────────────────────────────────────────
function Step5() {
  return (
    <div className="ob-step-body ob-loading-body">
      <div className="ob-loading-icon">🧬</div>
      <h2 className="ob-step-title">Montando seu plano...</h2>
      <p className="ob-step-subtitle">A IA está analisando seu perfil e criando um plano personalizado para você.</p>
      <Loader2 size={32} className="spin ob-spinner" />
    </div>
  )
}

// ── Step 6: Revisão ────────────────────────────────────────────────────────
function HabitReviewCard({ lembrete, index, onChange, onRemove }) {
  const icon = CATEGORY_ICONS[lembrete.categoria] || '📋'

  function toggleDay(day) {
    const days = lembrete.dias_semana.includes(day)
      ? lembrete.dias_semana.filter(d => d !== day)
      : [...lembrete.dias_semana, day].sort((a, b) => a - b)
    if (days.length > 0) onChange(index, { ...lembrete, dias_semana: days })
  }

  function changeHorario(i, val) {
    const horarios = [...lembrete.horarios]
    horarios[i] = val
    onChange(index, { ...lembrete, horarios })
  }

  return (
    <div className={`ob-habit-card glass-card ${lembrete.ativo === false ? 'ob-habit-disabled' : ''}`}>
      <div className="ob-habit-header">
        <div className="ob-habit-info">
          <span className="ob-habit-icon">{icon}</span>
          <span className="ob-habit-name">{lembrete.habito}</span>
        </div>
        <div className="ob-habit-actions">
          <button
            type="button"
            className={`ob-toggle-btn ${lembrete.ativo !== false ? 'on' : 'off'}`}
            onClick={() => onChange(index, { ...lembrete, ativo: lembrete.ativo === false ? true : false })}
          >
            {lembrete.ativo !== false ? 'Ativo' : 'Pausado'}
          </button>
          <button type="button" className="ob-remove-btn" onClick={() => onRemove(index)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {lembrete.ativo !== false && (
        <div className="ob-habit-details">
          <div className="ob-habit-times">
            {lembrete.horarios.map((h, i) => (
              <input
                key={i}
                type="time"
                className="ob-input ob-input-sm"
                value={h}
                onChange={e => changeHorario(i, e.target.value)}
              />
            ))}
          </div>
          <div className="ob-habit-days">
            {DAYS_LABEL.map((day, i) => (
              <button
                key={i}
                type="button"
                className={`ob-day-chip ${lembrete.dias_semana.includes(i) ? 'active' : ''}`}
                onClick={() => toggleDay(i)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Step6({ perfil, lembretes, onChange, onRemove }) {
  const alimentacao = lembretes.filter(l => l.categoria === 'alimentacao')
  const outros = lembretes.filter(l => l.categoria !== 'alimentacao')

  const litros = perfil?.agua_litros_diaria
  const objetivo = { emagrecer: 'Emagrecer', ganhar_massa: 'Ganhar massa', manter: 'Manter peso', performance: 'Performance', saude: 'Saúde' }[perfil?.objetivo] || perfil?.objetivo

  return (
    <div className="ob-step-body">
      <h2 className="ob-step-title">Seu plano está pronto! 🎉</h2>
      <p className="ob-step-subtitle">Revise e ajuste antes de ativar. Você pode editar horários e desativar o que não quiser.</p>

      <div className="ob-perfil-resumo glass-card">
        <div className="ob-resumo-item">
          <span className="ob-resumo-label">Objetivo</span>
          <span className="ob-resumo-value">{objetivo}</span>
        </div>
        <div className="ob-resumo-item">
          <span className="ob-resumo-label">Peso → Meta</span>
          <span className="ob-resumo-value">{perfil?.peso_kg}kg → {perfil?.peso_meta_kg}kg</span>
        </div>
        {litros && (
          <div className="ob-resumo-item">
            <span className="ob-resumo-label">💧 Hidratação</span>
            <span className="ob-resumo-value">{litros}L/dia</span>
          </div>
        )}
      </div>

      {alimentacao.length > 0 && (
        <div className="ob-section">
          <h3 className="ob-section-title">🍽️ Plano alimentar</h3>
          {alimentacao.map((l) => {
            const realIndex = lembretes.indexOf(l)
            return <HabitReviewCard key={realIndex} lembrete={l} index={realIndex} onChange={onChange} onRemove={onRemove} />
          })}
        </div>
      )}

      <div className="ob-section">
        <h3 className="ob-section-title">🌱 Outros hábitos</h3>
        {outros.map((l) => {
          const realIndex = lembretes.indexOf(l)
          return <HabitReviewCard key={realIndex} lembrete={l} index={realIndex} onChange={onChange} onRemove={onRemove} />
        })}
      </div>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 6

const defaultForm = {
  nome: '', idade: '', sexo: '', altura_cm: '', peso_kg: '', peso_meta_kg: '',
  horario_acordar: '06:00', horario_dormir: '23:00',
  refeicoes: { cafe: '07:00', almoco: '12:00', lanche: '15:30', jantar: '20:00' },
  treina: null, tipo_treino: '', dias_treino: 3, horario_treino: '06:00',
  objetivo: '', nivel_atividade: '', nivel_estresse: '',
  preferencias_chips: [], restricoes_alimentares: '', observacoes_saude: '',
  tom_preferido: 'amigavel',
}

function canAdvance(step, form) {
  if (step === 0) return form.nome.trim() && form.idade && form.sexo && form.altura_cm && form.peso_kg && form.peso_meta_kg
  if (step === 1) return form.horario_acordar && form.horario_dormir
  if (step === 2) return form.treina !== null
  if (step === 3) return form.objetivo && form.nivel_atividade && form.nivel_estresse
  return true
}

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(defaultForm)
  const [lembretes, setLembretes] = useState([])
  const [planPerfil, setPlanPerfil] = useState(null)
  const [riskFlag, setRiskFlag] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const { refreshProfile } = useAuth()
  const { refreshData } = useHabits()
  const toast = useToast()
  const navigate = useNavigate()

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function generatePlan() {
    setStep(4) // loading screen
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Sessão expirada')

      const prefArray = form.preferencias_chips || []
      const preferencias = prefArray.length > 0 ? prefArray.join(', ') : 'sem preferências específicas'

      const perfilPayload = {
        nome: form.nome.trim(),
        idade: Number(form.idade),
        sexo: form.sexo,
        altura_cm: Number(form.altura_cm),
        peso_kg: Number(form.peso_kg),
        peso_meta_kg: Number(form.peso_meta_kg),
        horario_acordar: form.horario_acordar,
        horario_dormir: form.horario_dormir,
        horarios_refeicoes: form.refeicoes,
        treina: form.treina === true,
        dias_treino: form.treina ? Number(form.dias_treino) : null,
        tipo_treino: form.treina ? form.tipo_treino || 'geral' : null,
        horario_treino_preferido: form.treina ? form.horario_treino : null,
        objetivo: form.objetivo,
        nivel_atividade: form.nivel_atividade,
        nivel_estresse: form.nivel_estresse,
        preferencias_alimentares: preferencias,
        restricoes_alimentares: form.restricoes_alimentares.trim() || 'nenhuma',
        observacoes_saude: form.observacoes_saude.trim() || 'nenhuma',
        tom_preferido: form.tom_preferido,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Fortaleza',
      }

      const { data, error } = await supabase.functions.invoke('agent-chat', {
        headers: { Authorization: `Bearer ${token}` },
        body: { mode: 'setup_only', perfil: perfilPayload },
      })

      if (error) throw error
      if (data?.risk) {
        setRiskFlag(true)
        setStep(4)
        return
      }

      const setup = data?.setup
      if (!setup?.lembretes?.length) throw new Error('Plano não gerado. Tente novamente.')

      setPlanPerfil(setup.perfil ?? perfilPayload)
      setLembretes(setup.lembretes.map(l => ({ ...l, ativo: l.ativo !== false })))
      setStep(5) // revisão
    } catch (err) {
      toast.error(err.message || 'Erro ao gerar plano')
      setStep(3)
    }
  }

  async function confirmPlan() {
    if (confirming) return
    setConfirming(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) throw new Error('Sessão expirada')

      const { error } = await supabase.functions.invoke('agent-apply', {
        headers: { Authorization: `Bearer ${token}` },
        body: { perfil: planPerfil, lembretes },
      })
      if (error) throw error

      await Promise.allSettled([refreshProfile(), refreshData()])
      toast.success('Plano ativado! Seus lembretes estão prontos. 🌱')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Erro ao ativar plano')
    } finally {
      setConfirming(false)
    }
  }

  function handleLembreteChange(index, updated) {
    setLembretes(prev => prev.map((l, i) => i === index ? updated : l))
  }

  function handleLembreteRemove(index) {
    setLembretes(prev => prev.filter((_, i) => i !== index))
  }

  function handleNext() {
    if (step === 3) { generatePlan(); return }
    setStep(s => s + 1)
  }

  const steps = [
    <Step1 data={form} onChange={updateForm} />,
    <Step2 data={form} onChange={updateForm} />,
    <Step3 data={form} onChange={updateForm} />,
    <Step4 data={form} onChange={updateForm} />,
    riskFlag
      ? (
        <div className="ob-step-body ob-loading-body">
          <div className="ob-loading-icon">💙</div>
          <h2 className="ob-step-title">Obrigado por compartilhar</h2>
          <p className="ob-step-subtitle">Percebemos que você mencionou algumas situações que merecem atenção especial. O Streak Life não substitui acompanhamento profissional — te encorajamos a buscar apoio de um nutricionista ou psicólogo.</p>
          <button className="btn btn-primary" onClick={() => { setRiskFlag(false); setStep(3) }}>Voltar e revisar</button>
        </div>
      )
      : <Step5 />,
    <Step6 perfil={planPerfil} lembretes={lembretes} onChange={handleLembreteChange} onRemove={handleLembreteRemove} />,
  ]

  const isLoading = step === 4 && !riskFlag
  const isReview = step === 5

  return (
    <div className="ob-shell">
      <div className="ob-card glass-card">
        <div className="ob-header">
          <span className="ob-brand">🌱 Streak Life</span>
          <StepIndicator current={step} total={TOTAL_STEPS} />
        </div>

        <div className="ob-content">
          {steps[step]}
        </div>

        {!isLoading && !riskFlag && (
          <div className="ob-footer">
            {step > 0 && step < 5 && (
              <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>
                <ChevronLeft size={18} /> Voltar
              </button>
            )}

            {isReview ? (
              <button
                className="btn btn-primary ob-confirm-btn"
                onClick={confirmPlan}
                disabled={confirming || lembretes.filter(l => l.ativo !== false).length === 0}
              >
                {confirming
                  ? <><Loader2 size={18} className="spin" /> Ativando...</>
                  : <><Check size={18} /> Confirmar e ativar plano</>
                }
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!canAdvance(step, form)}
              >
                {step === 3 ? 'Gerar meu plano ✨' : 'Continuar'} <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
