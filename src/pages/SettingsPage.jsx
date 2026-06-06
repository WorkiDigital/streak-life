import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../lib/push'
import {
  Bell,
  BellOff,
  ChevronDown,
  Clock3,
  Dumbbell,
  HeartPulse,
  Loader2,
  LogOut,
  Moon,
  Save,
  Scale,
  Search,
  Shield,
  Sun,
  Target,
  Utensils,
  User,
} from 'lucide-react'
import './SettingsPage.css'

function parseCanais(val) {
  if (Array.isArray(val)) return val
  if (typeof val === 'string' && val.length > 0) {
    return val.replace(/[{}]/g, '').split(',').map(s => s.trim()).filter(Boolean)
  }
  return ['push', 'whatsapp']
}

const TOM_OPTIONS = [
  { value: 'amigavel', label: 'Amigavel' },
  { value: 'direto', label: 'Direto' },
  { value: 'motivacional', label: 'Motivacional' },
]

const SEX_OPTIONS = [
  { value: '', label: 'Nao informado' },
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
]

const ACTIVITY_OPTIONS = [
  { value: '', label: 'Nao informado' },
  { value: 'sedentario', label: 'Sedentario' },
  { value: 'leve', label: 'Leve' },
  { value: 'moderado', label: 'Moderado' },
  { value: 'alto', label: 'Alto' },
]

const GOAL_OPTIONS = [
  { value: '', label: 'Nao informado' },
  { value: 'emagrecer', label: 'Emagrecer' },
  { value: 'ganhar_massa', label: 'Ganhar massa' },
  { value: 'manter', label: 'Manter peso' },
  { value: 'saude', label: 'Saude' },
  { value: 'performance', label: 'Performance' },
]

const TRAINING_OPTIONS = [
  { value: '', label: 'Nao informado' },
  { value: 'forca', label: 'Forca' },
  { value: 'corrida', label: 'Corrida' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'mobilidade', label: 'Mobilidade' },
  { value: 'geral', label: 'Geral' },
]

const STRESS_OPTIONS = [
  { value: '', label: 'Nao informado' },
  { value: 'baixo', label: 'Baixo' },
  { value: 'medio', label: 'Medio' },
  { value: 'alto', label: 'Alto' },
]

const ROUTINE_FIELDS = [
  { field: 'horario_acordar', label: 'Acordar' },
  { field: 'horario_dormir', label: 'Dormir' },
  { field: 'cafe', label: 'Cafe' },
  { field: 'almoco', label: 'Almoco' },
  { field: 'jantar', label: 'Jantar' },
  { field: 'lanche', label: 'Lanche' },
]

const SECTION_META = {
  personal: {
    title: 'Dados pessoais',
    description: 'Nome, contato, timezone e tom dos lembretes',
    keywords: 'dados pessoais nome whatsapp contato timezone tom lembretes',
  },
  body: {
    title: 'Corpo e objetivo',
    description: 'Peso, altura, meta e nivel de atividade',
    keywords: 'corpo objetivo peso altura meta prazo atividade emagrecer ganhar massa',
  },
  routine: {
    title: 'Rotina diaria',
    description: 'Horarios de sono e refeicoes',
    keywords: 'rotina horario acordar dormir cafe almoco jantar lanche refeicoes',
  },
  training: {
    title: 'Treino',
    description: 'Tipo, frequencia e horario preferido',
    keywords: 'treino academia musculacao corrida dias semana horario',
  },
  health: {
    title: 'Alimentacao e saude',
    description: 'Preferencias, restricoes e observacoes',
    keywords: 'alimentacao saude preferencias restricoes estresse observacoes',
  },
  notifications: {
    title: 'Notificacoes',
    description: 'Push, WhatsApp, canais e modo silencio',
    keywords: 'notificacoes push whatsapp canais lembrete silencio',
  },
  nutrition: {
    title: 'Plano alimentar',
    description: 'Refeicoes no inicio e nivel de detalhe',
    keywords: 'plano alimentar nutricao refeicoes simples detalhado profissional',
  },
  goals: {
    title: 'Sistema de metas',
    description: 'Metas ativas e regra de dia bom',
    keywords: 'metas objetivos dia bom consistencia progresso',
  },
  appearance: {
    title: 'Aparencia',
    description: 'Tema claro ou escuro',
    keywords: 'aparencia tema claro escuro modo',
  },
  about: {
    title: 'Sobre',
    description: 'Versao e aviso de saude',
    keywords: 'sobre versao aviso saude',
  },
}

const DEFAULT_OPEN_SECTIONS = ['notifications', 'nutrition', 'goals']

const DEFAULT_PROFILE_FORM = {
  nome: '',
  whatsapp: '',
  timezone: 'America/Fortaleza',
  tom_preferido: 'amigavel',
  idade: '',
  sexo: '',
  altura_cm: '',
  peso_kg: '',
  peso_meta_kg: '',
  objetivo: '',
  objetivo_descricao: '',
  prazo_meta: '',
  nivel_atividade: '',
  horario_acordar: '',
  horario_dormir: '',
  cafe: '',
  almoco: '',
  jantar: '',
  lanche: '',
  treina: '',
  dias_treino: '',
  tipo_treino: '',
  horario_treino_preferido: '',
  preferencias_alimentares: '',
  restricoes_alimentares: '',
  observacoes_saude: '',
  nivel_estresse: '',
}

function textValue(value, fallback = '') {
  return value === undefined || value === null ? fallback : String(value)
}

function numberValue(value) {
  return value === undefined || value === null ? '' : String(value)
}

function timeValue(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

function numberOrNull(value) {
  if (value === '' || value === undefined || value === null) return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function emptyToNull(value) {
  const text = String(value ?? '').trim()
  return text ? text : null
}

function buildProfileForm(profile) {
  const meals = profile?.horarios_refeicoes && typeof profile.horarios_refeicoes === 'object'
    ? profile.horarios_refeicoes
    : {}

  return {
    ...DEFAULT_PROFILE_FORM,
    nome: textValue(profile?.nome),
    whatsapp: textValue(profile?.whatsapp),
    timezone: textValue(profile?.timezone, 'America/Fortaleza'),
    tom_preferido: textValue(profile?.tom_preferido, 'amigavel'),
    idade: numberValue(profile?.idade),
    sexo: textValue(profile?.sexo),
    altura_cm: numberValue(profile?.altura_cm),
    peso_kg: numberValue(profile?.peso_kg),
    peso_meta_kg: numberValue(profile?.peso_meta_kg),
    objetivo: textValue(profile?.objetivo),
    objetivo_descricao: textValue(profile?.objetivo_descricao),
    prazo_meta: textValue(profile?.prazo_meta),
    nivel_atividade: textValue(profile?.nivel_atividade),
    horario_acordar: timeValue(profile?.horario_acordar),
    horario_dormir: timeValue(profile?.horario_dormir),
    cafe: timeValue(meals.cafe),
    almoco: timeValue(meals.almoco),
    jantar: timeValue(meals.jantar),
    lanche: timeValue(meals.lanche),
    treina: profile?.treina === true ? 'true' : profile?.treina === false ? 'false' : '',
    dias_treino: numberValue(profile?.dias_treino),
    tipo_treino: textValue(profile?.tipo_treino),
    horario_treino_preferido: timeValue(profile?.horario_treino_preferido),
    preferencias_alimentares: textValue(profile?.preferencias_alimentares),
    restricoes_alimentares: textValue(profile?.restricoes_alimentares),
    observacoes_saude: textValue(profile?.observacoes_saude),
    nivel_estresse: textValue(profile?.nivel_estresse),
  }
}

function summaryValue(value, suffix = '') {
  return value ? `${value}${suffix}` : '-'
}

function SettingsSection({ id, title, description, icon, open, onToggle, children }) {
  const contentId = `settings-section-content-${id}`

  return (
    <section className={`settings-section ${open ? 'open' : ''}`} id={`settings-section-${id}`}>
      <button
        type="button"
        className="settings-section-trigger glass-card"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <span className="settings-section-icon" aria-hidden="true">{icon}</span>
        <span className="settings-section-copy">
          <span className="settings-section-title">{title}</span>
          <span className="settings-section-desc">{description}</span>
        </span>
        <ChevronDown className="settings-section-chevron" size={18} aria-hidden="true" />
      </button>
      {open && (
        <div id={contentId} className="settings-section-content">
          {children}
        </div>
      )}
    </section>
  )
}

export default function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [profileForm, setProfileForm] = useState(() => buildProfileForm(profile))
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPush, setSavingPush] = useState(false)
  const [silentMode, setSilentMode] = useState(Boolean(profile?.silent_mode))
  const [silentSaving, setSilentSaving] = useState(false)
  const [canaisPreferidos, setCanaisPreferidos] = useState(() => parseCanais(profile?.canais_preferidos))
  const [canaisSaving, setCanaisSaving] = useState(false)
  const [lightMode, setLightMode] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'light'
  )
  const [nutritionSaving, setNutritionSaving] = useState(false)
  const [goalsSaving, setGoalsSaving] = useState(false)
  const [settingsQuery, setSettingsQuery] = useState('')
  const [openSections, setOpenSections] = useState(() => new Set(DEFAULT_OPEN_SECTIONS))

  useEffect(() => {
    setProfileForm(buildProfileForm(profile))
    setSilentMode(Boolean(profile?.silent_mode))
    setCanaisPreferidos(parseCanais(profile?.canais_preferidos))
  }, [profile])

  const savedProfileForm = useMemo(() => buildProfileForm(profile), [profile])

  const summary = useMemo(() => ([
    { label: 'Peso', value: summaryValue(profileForm.peso_kg, ' kg') },
    { label: 'Meta', value: summaryValue(profileForm.peso_meta_kg, ' kg') },
    { label: 'Altura', value: summaryValue(profileForm.altura_cm, ' cm') },
    { label: 'Objetivo', value: profileForm.objetivo || '-' },
  ]), [profileForm])

  const hasProfileChanges = useMemo(
    () => JSON.stringify(profileForm) !== JSON.stringify(savedProfileForm),
    [profileForm, savedProfileForm]
  )

  const normalizedQuery = settingsQuery.trim().toLowerCase()
  const visibleSectionIds = useMemo(() => {
    const ids = Object.keys(SECTION_META)
    if (!normalizedQuery) return ids
    return ids.filter(id => {
      const meta = SECTION_META[id]
      return `${meta.title} ${meta.description} ${meta.keywords}`.toLowerCase().includes(normalizedQuery)
    })
  }, [normalizedQuery])

  const pushStatus = 'Notification' in window ? Notification.permission : 'unsupported'
  const isPushActive = pushStatus === 'granted' && !!profile?.push_token

  const shortcuts = useMemo(() => ([
    {
      id: 'notifications',
      label: 'Notificacoes',
      value: isPushActive ? 'Push ativo' : 'Push inativo',
      icon: <Bell size={16} />,
    },
    {
      id: 'nutrition',
      label: 'Plano alimentar',
      value: profile?.nutrition_enabled ? 'Ativo' : 'Desativado',
      icon: <Utensils size={16} />,
    },
    {
      id: 'goals',
      label: 'Metas',
      value: profile?.goals_enabled !== false ? 'Ativas' : 'Pausadas',
      icon: <Target size={16} />,
    },
    {
      id: 'routine',
      label: 'Rotina',
      value: profileForm.horario_acordar || 'Editar',
      icon: <Clock3 size={16} />,
    },
  ]), [isPushActive, profile?.nutrition_enabled, profile?.goals_enabled, profileForm.horario_acordar])

  function updateField(field, value) {
    setProfileForm(prev => ({ ...prev, [field]: value }))
  }

  function isSectionVisible(id) {
    return visibleSectionIds.includes(id)
  }

  function isSectionOpen(id) {
    return Boolean(normalizedQuery) || openSections.has(id)
  }

  function toggleSection(id) {
    if (normalizedQuery) return
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function jumpToSection(id) {
    setOpenSections(prev => new Set(prev).add(id))
    requestAnimationFrame(() => {
      document.getElementById(`settings-section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function discardProfileChanges() {
    setProfileForm(savedProfileForm)
  }

  function toggleTheme() {
    const next = !lightMode
    setLightMode(next)
    document.documentElement.setAttribute('data-theme', next ? 'light' : 'dark')
    localStorage.setItem('evolui-theme', next ? 'light' : 'dark')
  }

  async function toggleSilentMode() {
    if (silentSaving) return
    const newValue = !silentMode
    setSilentSaving(true)
    try {
      await updateProfile({ silent_mode: newValue })
      setSilentMode(newValue)
      toast.success(newValue ? 'Modo silencio ativado' : 'Modo silencio desativado')
    } catch {
      toast.error('Erro ao atualizar modo silencio')
    } finally {
      setSilentSaving(false)
    }
  }

  async function toggleCanalPreferido(canal) {
    if (canaisSaving) return
    const next = canaisPreferidos.includes(canal)
      ? canaisPreferidos.filter(c => c !== canal)
      : [...canaisPreferidos, canal]
    if (next.length === 0) return
    setCanaisPreferidos(next)
    setCanaisSaving(true)
    try {
      await updateProfile({ canais_preferidos: next })
    } catch {
      setCanaisPreferidos(canaisPreferidos)
      toast.error('Erro ao salvar canais')
    } finally {
      setCanaisSaving(false)
    }
  }

  async function handleSaveProfile() {
    const horarios_refeicoes = {
      ...(profileForm.cafe ? { cafe: profileForm.cafe } : {}),
      ...(profileForm.almoco ? { almoco: profileForm.almoco } : {}),
      ...(profileForm.jantar ? { jantar: profileForm.jantar } : {}),
      ...(profileForm.lanche ? { lanche: profileForm.lanche } : {}),
    }

    const payload = {
      nome: profileForm.nome.trim(),
      whatsapp: emptyToNull(profileForm.whatsapp),
      timezone: profileForm.timezone.trim() || 'America/Fortaleza',
      tom_preferido: profileForm.tom_preferido || 'amigavel',
      idade: numberOrNull(profileForm.idade),
      sexo: emptyToNull(profileForm.sexo),
      altura_cm: numberOrNull(profileForm.altura_cm),
      peso_kg: numberOrNull(profileForm.peso_kg),
      peso_meta_kg: numberOrNull(profileForm.peso_meta_kg),
      objetivo: emptyToNull(profileForm.objetivo),
      objetivo_descricao: emptyToNull(profileForm.objetivo_descricao),
      prazo_meta: emptyToNull(profileForm.prazo_meta),
      nivel_atividade: emptyToNull(profileForm.nivel_atividade),
      horario_acordar: emptyToNull(profileForm.horario_acordar),
      horario_dormir: emptyToNull(profileForm.horario_dormir),
      horarios_refeicoes,
      treina: profileForm.treina === '' ? null : profileForm.treina === 'true',
      dias_treino: numberOrNull(profileForm.dias_treino),
      tipo_treino: emptyToNull(profileForm.tipo_treino),
      horario_treino_preferido: emptyToNull(profileForm.horario_treino_preferido),
      preferencias_alimentares: emptyToNull(profileForm.preferencias_alimentares),
      restricoes_alimentares: emptyToNull(profileForm.restricoes_alimentares),
      observacoes_saude: emptyToNull(profileForm.observacoes_saude),
      nivel_estresse: emptyToNull(profileForm.nivel_estresse),
    }

    setSavingProfile(true)
    try {
      await updateProfile(payload)
      toast.success('Perfil salvo')
    } catch (error) {
      toast.error(error.message || 'Erro ao salvar perfil')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleGoalsToggle() {
    if (goalsSaving) return
    setGoalsSaving(true)
    try {
      const next = profile?.goals_enabled === false
      await updateProfile({ goals_enabled: next })
      toast.success(next ? 'Sistema de metas ativado' : 'Sistema de metas pausado')
    } catch {
      toast.error('Erro ao atualizar metas')
    } finally {
      setGoalsSaving(false)
    }
  }

  async function handleThresholdChange(val) {
    if (goalsSaving) return
    setGoalsSaving(true)
    try {
      await updateProfile({ consistency_threshold: val })
      toast.success('Meta de dia bom atualizada')
    } catch {
      toast.error('Erro ao atualizar meta de consistencia')
    } finally {
      setGoalsSaving(false)
    }
  }

  async function handleNutritionToggle() {
    if (nutritionSaving) return
    setNutritionSaving(true)
    try {
      const next = !profile?.nutrition_enabled
      await updateProfile({ nutrition_enabled: next })
      toast.success(next ? 'Plano alimentar ativado' : 'Plano alimentar pausado')
    } catch {
      toast.error('Erro ao atualizar plano alimentar')
    } finally {
      setNutritionSaving(false)
    }
  }

  async function handleNutritionModeChange(mode) {
    if (nutritionSaving) return
    setNutritionSaving(true)
    try {
      await updateProfile({ nutrition_mode: mode })
      toast.success('Modo do plano atualizado')
    } catch {
      toast.error('Erro ao atualizar modo')
    } finally {
      setNutritionSaving(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      navigate('/login')
    } catch {
      toast.error('Erro ao sair')
    }
  }

  async function togglePushNotifications() {
    if (savingPush) return

    try {
      if (!('Notification' in window)) {
        toast.error('Nao suportado neste navegador.')
        return
      }

      let perm = Notification.permission
      if (perm === 'default') {
        perm = await Notification.requestPermission()
      }

      if (perm !== 'granted') {
        toast.error('Gerencie as notificacoes nas configuracoes do navegador.')
        return
      }

      setSavingPush(true)
      if (!profile?.push_token) {
        const sub = await subscribeToPushNotifications()
        await updateProfile({ push_token: JSON.stringify(sub) })
        toast.success('Notificacoes ativadas')
      } else {
        await unsubscribeFromPushNotifications()
        await updateProfile({ push_token: null })
        toast.success('Notificacoes desativadas')
      }
    } catch (err) {
      toast.error('Erro ao configurar push: ' + err.message)
    } finally {
      setSavingPush(false)
    }
  }

  return (
    <div className="page">
      <div className={`container settings-page ${hasProfileChanges ? 'has-save-bar' : ''}`}>
        <div className="settings-page-header">
          <div>
            <h1 className="text-2xl font-bold">Configuracoes</h1>
            <p className="settings-page-subtitle">Ajuste somente o que precisa, sem rolar por tudo.</p>
          </div>
          {profile?.onboarding_completed && <span className="badge badge-done">Plano ativo</span>}
        </div>

        <section className="settings-summary glass-card" aria-label="Resumo do perfil">
          {summary.map(item => (
            <div className="settings-summary-item" key={item.label}>
              <span className="settings-summary-label">{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </section>

        <section className="settings-control-panel glass-card" aria-label="Acesso rapido das configuracoes">
          <label className="settings-search" htmlFor="settings-search">
            <Search size={17} aria-hidden="true" />
            <input
              id="settings-search"
              type="search"
              placeholder="Buscar configuracao"
              value={settingsQuery}
              onChange={e => setSettingsQuery(e.target.value)}
            />
          </label>
          <div className="settings-shortcuts" aria-label="Atalhos">
            {shortcuts.map(item => (
              <button
                key={item.id}
                type="button"
                className="settings-shortcut"
                onClick={() => jumpToSection(item.id)}
              >
                <span className="settings-shortcut-icon" aria-hidden="true">{item.icon}</span>
                <span>
                  <span className="settings-shortcut-label">{item.label}</span>
                  <span className="settings-shortcut-value">{item.value}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {visibleSectionIds.length === 0 && (
          <div className="settings-empty-search glass-card">
            Nenhuma configuracao encontrada para "{settingsQuery}".
          </div>
        )}

        {isSectionVisible('personal') && (
          <SettingsSection
            id="personal"
            title={SECTION_META.personal.title}
            description={SECTION_META.personal.description}
            icon={<User size={18} />}
            open={isSectionOpen('personal')}
            onToggle={() => toggleSection('personal')}
          >
            <div className="settings-card glass-card">
              <div className="settings-form-grid">
                <div className="input-group settings-field-wide">
                  <label className="input-label" htmlFor="settings-nome">Nome</label>
                  <input id="settings-nome" className="input" value={profileForm.nome} onChange={e => updateField('nome', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-whatsapp">WhatsApp</label>
                  <input id="settings-whatsapp" type="tel" className="input" placeholder="+55 85 99999-9999" value={profileForm.whatsapp} onChange={e => updateField('whatsapp', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-idade">Idade</label>
                  <input id="settings-idade" type="number" min="0" className="input" value={profileForm.idade} onChange={e => updateField('idade', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-sexo">Sexo</label>
                  <select id="settings-sexo" className="input" value={profileForm.sexo} onChange={e => updateField('sexo', e.target.value)}>
                    {SEX_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-timezone">Timezone</label>
                  <input id="settings-timezone" className="input" value={profileForm.timezone} onChange={e => updateField('timezone', e.target.value)} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Tom dos lembretes</label>
                <div className="settings-chip-options">
                  {TOM_OPTIONS.map(opt => (
                    <button type="button" key={opt.value} className={`chip ${profileForm.tom_preferido === opt.value ? 'active' : ''}`} onClick={() => updateField('tom_preferido', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('body') && (
          <SettingsSection id="body" title={SECTION_META.body.title} description={SECTION_META.body.description} icon={<Scale size={18} />} open={isSectionOpen('body')} onToggle={() => toggleSection('body')}>
            <div className="settings-card glass-card">
              <div className="settings-form-grid">
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-altura">Altura cm</label>
                  <input id="settings-altura" type="number" min="0" className="input" value={profileForm.altura_cm} onChange={e => updateField('altura_cm', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-peso">Peso atual kg</label>
                  <input id="settings-peso" type="number" min="0" step="0.1" className="input" value={profileForm.peso_kg} onChange={e => updateField('peso_kg', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-meta">Peso meta kg</label>
                  <input id="settings-meta" type="number" min="0" step="0.1" className="input" value={profileForm.peso_meta_kg} onChange={e => updateField('peso_meta_kg', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-atividade">Atividade</label>
                  <select id="settings-atividade" className="input" value={profileForm.nivel_atividade} onChange={e => updateField('nivel_atividade', e.target.value)}>
                    {ACTIVITY_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-objetivo">Objetivo</label>
                  <select id="settings-objetivo" className="input" value={profileForm.objetivo} onChange={e => updateField('objetivo', e.target.value)}>
                    {GOAL_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-prazo">Prazo</label>
                  <input id="settings-prazo" className="input" placeholder="Ex: 6 meses" value={profileForm.prazo_meta} onChange={e => updateField('prazo_meta', e.target.value)} />
                </div>
                <div className="input-group settings-field-wide">
                  <label className="input-label" htmlFor="settings-objetivo-descricao">Descricao do objetivo</label>
                  <textarea id="settings-objetivo-descricao" className="input settings-textarea" value={profileForm.objetivo_descricao} onChange={e => updateField('objetivo_descricao', e.target.value)} />
                </div>
              </div>
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('routine') && (
          <SettingsSection id="routine" title={SECTION_META.routine.title} description={SECTION_META.routine.description} icon={<Clock3 size={18} />} open={isSectionOpen('routine')} onToggle={() => toggleSection('routine')}>
            <div className="settings-card glass-card">
              <div className="settings-routine-grid">
                {ROUTINE_FIELDS.map(item => (
                  <label className="settings-routine-block" key={item.field}>
                    <span className="settings-routine-label">{item.label}</span>
                    <input type="time" className="settings-routine-input" value={profileForm[item.field]} onChange={e => updateField(item.field, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('training') && (
          <SettingsSection id="training" title={SECTION_META.training.title} description={SECTION_META.training.description} icon={<Dumbbell size={18} />} open={isSectionOpen('training')} onToggle={() => toggleSection('training')}>
            <div className="settings-card glass-card">
              <div className="settings-form-grid settings-training-grid">
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-treina">Treina?</label>
                  <select id="settings-treina" className="input" value={profileForm.treina} onChange={e => updateField('treina', e.target.value)}>
                    <option value="">Nao informado</option>
                    <option value="true">Sim</option>
                    <option value="false">Nao</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-tipo-treino">Tipo</label>
                  <select id="settings-tipo-treino" className="input" value={profileForm.tipo_treino} onChange={e => updateField('tipo_treino', e.target.value)}>
                    {TRAINING_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-dias-treino">Dias/semana</label>
                  <input id="settings-dias-treino" type="number" min="0" max="7" className="input" value={profileForm.dias_treino} onChange={e => updateField('dias_treino', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-horario-treino">Horario preferido</label>
                  <input id="settings-horario-treino" type="time" className="input" value={profileForm.horario_treino_preferido} onChange={e => updateField('horario_treino_preferido', e.target.value)} />
                </div>
              </div>
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('health') && (
          <SettingsSection id="health" title={SECTION_META.health.title} description={SECTION_META.health.description} icon={<HeartPulse size={18} />} open={isSectionOpen('health')} onToggle={() => toggleSection('health')}>
            <div className="settings-card glass-card">
              <div className="settings-form-grid">
                <div className="input-group settings-field-wide">
                  <label className="input-label" htmlFor="settings-preferencias">Preferencias alimentares</label>
                  <textarea id="settings-preferencias" className="input settings-textarea" value={profileForm.preferencias_alimentares} onChange={e => updateField('preferencias_alimentares', e.target.value)} />
                </div>
                <div className="input-group settings-field-wide">
                  <label className="input-label" htmlFor="settings-restricoes">Restricoes alimentares</label>
                  <textarea id="settings-restricoes" className="input settings-textarea" value={profileForm.restricoes_alimentares} onChange={e => updateField('restricoes_alimentares', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="settings-estresse">Estresse</label>
                  <select id="settings-estresse" className="input" value={profileForm.nivel_estresse} onChange={e => updateField('nivel_estresse', e.target.value)}>
                    {STRESS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
                <div className="input-group settings-field-wide">
                  <label className="input-label" htmlFor="settings-saude">Observacoes de saude</label>
                  <textarea id="settings-saude" className="input settings-textarea" value={profileForm.observacoes_saude} onChange={e => updateField('observacoes_saude', e.target.value)} />
                </div>
              </div>
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('notifications') && (
          <SettingsSection id="notifications" title={SECTION_META.notifications.title} description={SECTION_META.notifications.description} icon={<Bell size={18} />} open={isSectionOpen('notifications')} onToggle={() => toggleSection('notifications')}>
            <div className="settings-card glass-card">
              <button type="button" className="settings-row" onClick={togglePushNotifications}>
                <div className="settings-row-info">
                  <span className="settings-row-label">Push</span>
                  <span className="text-xs text-secondary">
                    {pushStatus === 'granted' ? 'Ativas' :
                     pushStatus === 'denied' ? 'Bloqueadas' :
                     pushStatus === 'unsupported' ? 'Nao suportado' :
                     'Nao solicitado'}
                  </span>
                </div>
                <div className={`settings-toggle ${isPushActive ? 'on' : 'off'}`}>
                  {savingPush ? <Loader2 size={16} className="spin" /> : isPushActive ? <Bell size={16} /> : <BellOff size={16} />}
                </div>
              </button>

              <div className="settings-divider" />

              <div className="settings-row" style={{ cursor: 'default' }}>
                <div className="settings-row-info">
                  <span className="settings-row-label">Canais de lembrete</span>
                  <span className="text-xs text-secondary">Aplicado a todos os habitos</span>
                </div>
                <div className="settings-channel-list">
                  {[
                    { value: 'push', label: 'Push' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                  ].map(ch => {
                    const isActive = Array.isArray(canaisPreferidos) && canaisPreferidos.includes(ch.value)
                    return (
                      <button
                        key={ch.value}
                        type="button"
                        className={`channel-toggle glass-card${isActive ? ' active' : ''}`}
                        onClick={() => toggleCanalPreferido(ch.value)}
                        disabled={canaisSaving}
                      >
                        {ch.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="settings-divider" />

              <button type="button" className={`settings-row ${silentSaving ? 'settings-row-disabled' : ''}`} onClick={toggleSilentMode} aria-busy={silentSaving} aria-pressed={silentMode}>
                <div className="settings-row-info">
                  <span className="settings-row-label">Modo silencio</span>
                  <span className="text-xs text-secondary">Pausa todos os lembretes</span>
                </div>
                <div className={`settings-toggle ${silentMode ? 'on' : 'off'}`}>
                  {silentSaving ? <Loader2 size={16} className="spin" /> : silentMode ? <BellOff size={16} /> : <Bell size={16} />}
                </div>
              </button>
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('nutrition') && (
          <SettingsSection id="nutrition" title={SECTION_META.nutrition.title} description={SECTION_META.nutrition.description} icon={<Utensils size={18} />} open={isSectionOpen('nutrition')} onToggle={() => toggleSection('nutrition')}>
            <div className="settings-card glass-card">
              <button type="button" className={`settings-row ${nutritionSaving ? 'settings-row-disabled' : ''}`} onClick={handleNutritionToggle} aria-pressed={!!profile?.nutrition_enabled}>
                <div className="settings-row-info">
                  <span className="settings-row-label">Plano alimentar ativo</span>
                  <span className="settings-row-desc">
                    {profile?.nutrition_enabled ? 'Cards de refeicao aparecem no Inicio' : 'Desativado - apenas habitos e lembretes'}
                  </span>
                </div>
                <div className={`toggle-switch ${profile?.nutrition_enabled ? 'on' : ''}`} aria-busy={nutritionSaving} />
              </button>

              {profile?.nutrition_enabled && (
                <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <span className="settings-row-label">Nivel de detalhe</span>
                  <div className="settings-channel-list">
                    {[
                      { v: 'simples', l: 'Simples' },
                      { v: 'detalhado', l: 'Detalhado' },
                      { v: 'profissional', l: 'Profissional' },
                    ].map(m => (
                      <button
                        key={m.v}
                        className={`channel-toggle ${profile?.nutrition_mode === m.v ? 'active' : ''}`}
                        onClick={() => handleNutritionModeChange(m.v)}
                        disabled={nutritionSaving}
                      >
                        {m.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('goals') && (
          <SettingsSection id="goals" title={SECTION_META.goals.title} description={SECTION_META.goals.description} icon={<Target size={18} />} open={isSectionOpen('goals')} onToggle={() => toggleSection('goals')}>
            <div className="settings-card glass-card">
              <button type="button" className={`settings-row ${goalsSaving ? 'settings-row-disabled' : ''}`} onClick={handleGoalsToggle} aria-pressed={profile?.goals_enabled !== false}>
                <div className="settings-row-info">
                  <span className="settings-row-label">Metas ativas</span>
                  <span className="settings-row-desc">
                    {profile?.goals_enabled !== false ? 'Banner de progresso aparece no Inicio' : 'Desativado'}
                  </span>
                </div>
                <div className={`toggle-switch ${profile?.goals_enabled !== false ? 'on' : ''}`} aria-busy={goalsSaving} />
              </button>

              {profile?.goals_enabled !== false && (
                <div className="settings-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <span className="settings-row-label">Meta de dia bom</span>
                  <div className="settings-channel-list">
                    {[
                      { v: 0.5, l: 'Leve (50%)' },
                      { v: 0.7, l: 'Equilibrado (70%)' },
                      { v: 0.85, l: 'Alta performance (85%)' },
                    ].map(m => (
                      <button
                        key={m.v}
                        className={`channel-toggle ${(profile?.consistency_threshold ?? 0.7) === m.v ? 'active' : ''}`}
                        onClick={() => handleThresholdChange(m.v)}
                        disabled={goalsSaving}
                      >
                        {m.l}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('appearance') && (
          <SettingsSection id="appearance" title={SECTION_META.appearance.title} description={SECTION_META.appearance.description} icon={lightMode ? <Sun size={18} /> : <Moon size={18} />} open={isSectionOpen('appearance')} onToggle={() => toggleSection('appearance')}>
            <div className="settings-card glass-card">
              <button type="button" className="settings-row" onClick={toggleTheme} aria-pressed={lightMode}>
                <div className="settings-row-info">
                  <span className="settings-row-label">Tema claro</span>
                  <span className="text-xs text-secondary">{lightMode ? 'Modo claro ativado' : 'Modo escuro ativado'}</span>
                </div>
                <div className={`settings-toggle ${lightMode ? 'on' : 'off'}`}>
                  {lightMode ? <Sun size={16} /> : <Moon size={16} />}
                </div>
              </button>
            </div>
          </SettingsSection>
        )}

        {isSectionVisible('about') && (
          <SettingsSection id="about" title={SECTION_META.about.title} description={SECTION_META.about.description} icon={<Shield size={18} />} open={isSectionOpen('about')} onToggle={() => toggleSection('about')}>
            <div className="settings-card glass-card">
              <div className="settings-row" style={{ cursor: 'default' }}>
                <span className="settings-row-label">Versao</span>
                <span className="text-sm text-secondary">1.0.0 MVP</span>
              </div>
              <div className="settings-divider" />
              <p className="settings-health-note">
                Streak Life nao substitui profissionais de saude. Em caso de relacao dificil com comida ou corpo, procure um nutricionista, medico ou psicologo.
              </p>
            </div>
          </SettingsSection>
        )}

        <button type="button" className="btn-logout" onClick={handleSignOut}>
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>

      {hasProfileChanges && (
        <div className="settings-save-bar" role="status">
          <span>Alteracoes nao salvas</span>
          <div className="settings-save-actions">
            <button type="button" className="btn btn-secondary" onClick={discardProfileChanges} disabled={savingProfile}>
              Cancelar
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
