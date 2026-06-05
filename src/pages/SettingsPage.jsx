import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { subscribeToPushNotifications, unsubscribeFromPushNotifications } from '../lib/push'
import {
  Bell,
  BellOff,
  Clock3,
  Dumbbell,
  HeartPulse,
  Loader2,
  LogOut,
  Moon,
  Save,
  Scale,
  Shield,
  Sun,
  User,
} from 'lucide-react'
import './SettingsPage.css'

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

export default function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [profileForm, setProfileForm] = useState(() => buildProfileForm(profile))
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPush, setSavingPush] = useState(false)
  const [silentMode, setSilentMode] = useState(Boolean(profile?.silent_mode))
  const [silentSaving, setSilentSaving] = useState(false)
  const [lightMode, setLightMode] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'light'
  )

  useEffect(() => {
    setProfileForm(buildProfileForm(profile))
    setSilentMode(Boolean(profile?.silent_mode))
  }, [profile])

  const summary = useMemo(() => ([
    { label: 'Peso', value: summaryValue(profileForm.peso_kg, ' kg') },
    { label: 'Meta', value: summaryValue(profileForm.peso_meta_kg, ' kg') },
    { label: 'Altura', value: summaryValue(profileForm.altura_cm, ' cm') },
    { label: 'Objetivo', value: profileForm.objetivo || '-' },
  ]), [profileForm])

  function updateField(field, value) {
    setProfileForm(prev => ({ ...prev, [field]: value }))
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

  const pushStatus = 'Notification' in window ? Notification.permission : 'unsupported'
  const isPushActive = pushStatus === 'granted' && !!profile?.push_token

  return (
    <div className="page">
      <div className="container settings-page">
        <div className="settings-page-header">
          <h1 className="text-2xl font-bold">Configuracoes</h1>
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

        <section className="settings-section">
          <h2 className="settings-section-title">
            <User size={16} />
            Dados pessoais
          </h2>
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
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">
            <Scale size={16} />
            Corpo e objetivo
          </h2>
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
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">
            <Clock3 size={16} />
            Rotina
          </h2>
          <div className="settings-card glass-card">
            <div className="settings-form-grid">
              <div className="input-group">
                <label className="input-label" htmlFor="settings-acordar">Acorda</label>
                <input id="settings-acordar" type="time" className="input" value={profileForm.horario_acordar} onChange={e => updateField('horario_acordar', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="settings-dormir">Dorme</label>
                <input id="settings-dormir" type="time" className="input" value={profileForm.horario_dormir} onChange={e => updateField('horario_dormir', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="settings-cafe">Cafe</label>
                <input id="settings-cafe" type="time" className="input" value={profileForm.cafe} onChange={e => updateField('cafe', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="settings-almoco">Almoco</label>
                <input id="settings-almoco" type="time" className="input" value={profileForm.almoco} onChange={e => updateField('almoco', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="settings-jantar">Jantar</label>
                <input id="settings-jantar" type="time" className="input" value={profileForm.jantar} onChange={e => updateField('jantar', e.target.value)} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="settings-lanche">Lanche</label>
                <input id="settings-lanche" type="time" className="input" value={profileForm.lanche} onChange={e => updateField('lanche', e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">
            <Dumbbell size={16} />
            Treino
          </h2>
          <div className="settings-card glass-card">
            <div className="settings-form-grid">
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
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">
            <HeartPulse size={16} />
            Preferencias e saude
          </h2>
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
            <button type="button" className="btn btn-primary btn-full settings-save-button" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
              Salvar perfil
            </button>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">
            <Bell size={16} />
            Notificacoes
          </h2>
          <div className="settings-card glass-card">
            <div className="settings-row" onClick={togglePushNotifications}>
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
            </div>

            <div className="settings-divider" />

            <div className={`settings-row ${silentSaving ? 'settings-row-disabled' : ''}`} onClick={toggleSilentMode} aria-busy={silentSaving}>
              <div className="settings-row-info">
                <span className="settings-row-label">Modo silencio</span>
                <span className="text-xs text-secondary">Pausa todos os lembretes</span>
              </div>
              <div className={`settings-toggle ${silentMode ? 'on' : 'off'}`}>
                {silentSaving ? <Loader2 size={16} className="spin" /> : silentMode ? <BellOff size={16} /> : <Bell size={16} />}
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">
            {lightMode ? <Sun size={16} /> : <Moon size={16} />}
            Aparencia
          </h2>
          <div className="settings-card glass-card">
            <div className="settings-row" onClick={toggleTheme}>
              <div className="settings-row-info">
                <span className="settings-row-label">Tema claro</span>
                <span className="text-xs text-secondary">{lightMode ? 'Modo claro ativado' : 'Modo escuro ativado'}</span>
              </div>
              <div className={`settings-toggle ${lightMode ? 'on' : 'off'}`}>
                {lightMode ? <Sun size={16} /> : <Moon size={16} />}
              </div>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">
            <Shield size={16} />
            Sobre
          </h2>
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
        </section>

        <button type="button" className="btn-logout" onClick={handleSignOut}>
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </div>
  )
}
