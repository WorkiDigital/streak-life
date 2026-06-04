import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? ''
const GEMINI_MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

export const SYSTEM_PROMPT = `
Voce e a IA unica do Streak Life: uma agente de nutricao comportamental em portugues do Brasil, acolhedora, pratica e anticulpa.

Regras de seguranca e escopo:
- Voce nao substitui nutricionista, medico, psicologo ou atendimento de emergencia.
- Antes de montar qualquer plano, faca triagem obrigatoria e anamnese uma pergunta por vez.
- Triagem minima: idade, sexo, altura, peso atual, peso meta, atividade, treino, rotina, preferencias, sono, estresse, historico de saude relevante, medicamentos quando espontaneo, e sinais de relacao dificil com comida/corpo.
- Rastreie sinais de transtorno alimentar: medo intenso de engordar, compulsao, purga, laxantes/diureticos, jejum extremo, restricao severa, culpa intensa, exercicio compensatorio, perda rapida de peso ou baixo peso. Se aparecer risco, nao emita SETUP. Acolha e oriente apoio profissional.
- Nunca prescreva dietas extremas, punicao, terrorismo, vergonha ou metas agressivas.
- Nao recomende pisos caloricos perigosos. Como regra conservadora, nao proponha abaixo de 1200 kcal/dia para mulheres adultas ou 1500 kcal/dia para homens adultos, e evite calorias especificas se nao houver necessidade.
- Fale em linguagem simples, humana, sem bronca. Convide, nao cobre.

Como conduzir:
- No onboarding, faca uma pergunta por vez ate ter dados suficientes.
- Quando tiver dados suficientes e nao houver alerta de seguranca, entregue um plano em linguagem natural e inclua ao final um bloco invisivel SETUP.
- Em ajustes pedidos pelo usuario, responda naturalmente e inclua SETUP_UPDATE quando precisar alterar perfil, habitos ou lembretes.
- Em respostas como "feito", "bebi 2L", "treinei 45 min", inclua ACTION quando for possivel marcar, adiar ou apenas responder.

Blocos invisiveis:
- Eles devem ser comentarios HTML validos e JSON estrito.
- O usuario nunca deve ser avisado sobre esses blocos.
- Use SETUP apenas apos triagem/anamnese suficiente.
- Use SETUP_UPDATE para alteracoes.
- Use ACTION para marcar feito, adiar ou nenhuma acao.

Formato SETUP:
<!--SETUP:{
  "perfil": {
    "idade": 32,
    "sexo": "M",
    "altura_cm": 178,
    "peso_kg": 92,
    "peso_meta_kg": 82,
    "nivel_atividade": "leve",
    "treina": true,
    "dias_treino": 4,
    "tipo_treino": "forca",
    "timezone": "America/Fortaleza",
    "tom_preferido": "amigavel"
  },
  "lembretes": [
    {
      "habito": "Hidratacao",
      "categoria": "hidratacao",
      "horarios": ["08:00","10:00"],
      "dias_semana": [0,1,2,3,4,5,6],
      "canais": ["push","whatsapp"]
    }
  ]
}-->

Formato SETUP_UPDATE:
<!--SETUP_UPDATE:{
  "perfil": { "tom_preferido": "direto" },
  "lembretes": [
    { "habito": "Reduzir telas", "categoria": "tela", "ativo": false },
    { "habito": "Treino", "categoria": "treino", "horarios": ["18:30"], "dias_semana": [1,3,5], "canais": ["push","whatsapp"] }
  ]
}-->

Formato ACTION:
<!--ACTION:{ "tipo": "marcar_feito", "categoria": "treino", "valor": "45 min" }-->
<!--ACTION:{ "tipo": "adiar", "categoria": "hidratacao", "minutos": 30 }-->
<!--ACTION:{ "tipo": "nenhuma" }-->
`.trim()

export function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
}

export function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
  if (!url || !key) throw new Error('SUPABASE_URL e service role key sao obrigatorios')
  return createClient(url, key)
}

export async function getAuthUser(authHeader: string) {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY sao obrigatorios')

  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!jwt) return { user: null, error: new Error('Token ausente') }

  const client = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser(jwt)
  return { user: data?.user ?? null, error }
}

/** @deprecated use getAuthUser */
export function getUserClient(authHeader: string) {
  const url = Deno.env.get('SUPABASE_URL') ?? ''
  const key = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_ANON_KEY sao obrigatorios')
  return createClient(url, key, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function sanitizeAgentContent(content: string) {
  return content.replace(/<!--(?:SETUP|SETUP_UPDATE|ACTION):[\s\S]*?-->/g, '').trim()
}

export function parseAgentBlocks(content: string) {
  const blocks: Array<{ type: 'SETUP' | 'SETUP_UPDATE' | 'ACTION'; payload: any }> = []
  const regex = /<!--(SETUP|SETUP_UPDATE|ACTION):([\s\S]*?)-->/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(content)) !== null) {
    try {
      blocks.push({
        type: match[1] as 'SETUP' | 'SETUP_UPDATE' | 'ACTION',
        payload: JSON.parse(match[2].trim()),
      })
    } catch (error) {
      console.error('[agent] Bloco invalido ignorado:', error)
    }
  }

  return blocks
}

export async function callGemini(systemPrompt: string, messages: Array<{ role: string; content: string }>) {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY nao configurada')

  const contents = messages.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }],
  }))

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        maxOutputTokens: 1600,
        temperature: 0.75,
        topP: 0.9,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status} - ${await response.text()}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) throw new Error('Resposta vazia da IA')
  return text
}

export function todayInTimezone(timezone = 'America/Fortaleza') {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const get = (type: string) => parts.find((part) => part.type === type)?.value
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

export function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return { digits: '', plus: '' }
  return { digits, plus: `+${digits}` }
}

const CATEGORY_ICONS: Record<string, string> = {
  hidratacao: '💧',
  treino: '🏋️',
  alimentacao: '🍽️',
  tela: '👀',
  sono: '🌙',
  meditacao: '🧘',
  leitura: '📚',
  medicamento: '💊',
  ar_livre: '☀️',
  autocuidado: '✨',
  alongamento: '🤸',
  outro: '📋',
}

const ALLOWED_CATEGORIES = new Set(Object.keys(CATEGORY_ICONS))
const ALLOWED_CHANNELS = new Set(['push', 'whatsapp'])

function cleanTime(time: string) {
  const match = String(time || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  return match ? `${match[1]}:${match[2]}` : null
}

function normalizeReminder(raw: any) {
  const categoria = ALLOWED_CATEGORIES.has(raw?.categoria) ? raw.categoria : 'outro'
  const horarios = Array.isArray(raw?.horarios)
    ? raw.horarios.map(cleanTime).filter(Boolean)
    : [cleanTime(raw?.horario)].filter(Boolean)
  const diasSemana = Array.isArray(raw?.dias_semana)
    ? raw.dias_semana.map(Number).filter((day: number) => day >= 0 && day <= 6)
    : [0, 1, 2, 3, 4, 5, 6]
  const normalizedDays = categoria === 'treino' &&
    diasSemana.length === 5 &&
    diasSemana.includes(0) &&
    !diasSemana.includes(5)
    ? [1, 2, 3, 4, 5]
    : diasSemana

  return {
    habito: String(raw?.habito || raw?.nome || categoria).trim(),
    categoria,
    horarios: horarios.length ? horarios : ['08:00'],
    dias_semana: normalizedDays.length ? normalizedDays : [0, 1, 2, 3, 4, 5, 6],
    canais: Array.isArray(raw?.canais)
      ? raw.canais.filter((canal: string) => ALLOWED_CHANNELS.has(canal))
      : ['push', 'whatsapp'],
    ativo: raw?.ativo !== false,
  }
}

function profilePayload(userId: string, perfil: Record<string, unknown>, completed: boolean) {
  const allowed = [
    'nome',
    'whatsapp',
    'timezone',
    'tom_preferido',
    'idade',
    'sexo',
    'altura_cm',
    'peso_kg',
    'peso_meta_kg',
    'nivel_atividade',
    'treina',
    'dias_treino',
    'tipo_treino',
  ]
  const payload: Record<string, unknown> = { id: userId }
  for (const key of allowed) {
    if (perfil[key] !== undefined && perfil[key] !== null && perfil[key] !== '') {
      payload[key] = perfil[key]
    }
  }
  if (completed) payload.onboarding_completed = true
  payload.onboarding_data = perfil
  return payload
}

export async function loadAgentContext(admin: any, userId: string) {
  const [{ data: profile }, { data: habits }, { data: schedules }, { data: messages }] = await Promise.all([
    admin.from('profiles').select('*').eq('id', userId).single(),
    admin.from('habits').select('*').eq('user_id', userId).eq('ativo', true).order('created_at', { ascending: true }),
    admin.from('habit_schedules').select('*, habits(*)').eq('user_id', userId).eq('ativo', true),
    admin
      .from('chat_messages')
      .select('role, content, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(24),
  ])

  return {
    profile,
    habits: habits ?? [],
    schedules: schedules ?? [],
    messages: (messages ?? []).reverse(),
  }
}

export function buildContextPrompt(context: any) {
  return `
Estado atual do usuario:
${JSON.stringify({
    profile: context.profile,
    habits: context.habits,
    schedules: context.schedules,
  }, null, 2)}

Use esse estado para conversar, configurar lembretes e interpretar respostas curtas.
`.trim()
}

async function findHabit(admin: any, userId: string, categoria?: string, nome?: string) {
  let query = admin.from('habits').select('*').eq('user_id', userId).eq('ativo', true)
  if (categoria) query = query.eq('categoria', categoria)
  const { data } = await query
  const rows = data ?? []
  if (!nome) return rows[0] ?? null
  const target = nome.toLowerCase()
  return rows.find((habit: any) => String(habit.nome).toLowerCase() === target) ?? rows[0] ?? null
}

async function upsertReminder(admin: any, userId: string, raw: any) {
  const reminder = normalizeReminder(raw)
  const existing = await findHabit(admin, userId, reminder.categoria, reminder.habito)

  if (!reminder.ativo) {
    if (existing) {
      await admin.from('habit_schedules').update({ ativo: false }).eq('habit_id', existing.id).eq('user_id', userId)
      await admin.from('habits').update({ ativo: false }).eq('id', existing.id).eq('user_id', userId)
    }
    return { habit_id: existing?.id, disabled: true }
  }

  let habit = existing
  if (habit) {
    const { data, error } = await admin
      .from('habits')
      .update({
        nome: reminder.habito,
        categoria: reminder.categoria,
        icone: CATEGORY_ICONS[reminder.categoria],
        ativo: true,
      })
      .eq('id', habit.id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    habit = data
  } else {
    const { data, error } = await admin
      .from('habits')
      .insert({
        user_id: userId,
        nome: reminder.habito,
        categoria: reminder.categoria,
        icone: CATEGORY_ICONS[reminder.categoria],
      })
      .select()
      .single()
    if (error) throw error
    habit = data
  }

  await admin.from('habit_schedules').update({ ativo: false }).eq('habit_id', habit.id).eq('user_id', userId)

  const rows = reminder.horarios.map((horario: string) => ({
    habit_id: habit.id,
    user_id: userId,
    horario,
    dias_semana: reminder.dias_semana,
    canais: reminder.canais,
  }))

  const { error } = await admin.from('habit_schedules').insert(rows)
  if (error) throw error
  return { habit_id: habit.id, schedules: rows.length }
}

export async function applySetupBlock(admin: any, userId: string, payload: any, completed: boolean) {
  const result: Record<string, unknown> = {}

  if (payload?.perfil && typeof payload.perfil === 'object') {
    const { error } = await admin
      .from('profiles')
      .upsert(profilePayload(userId, payload.perfil, completed), { onConflict: 'id' })
    if (error) throw error
    result.profile = true
  } else if (completed) {
    await admin.from('profiles').update({ onboarding_completed: true }).eq('id', userId)
  }

  if (Array.isArray(payload?.lembretes)) {
    const reminders = []
    for (const reminder of payload.lembretes) {
      reminders.push(await upsertReminder(admin, userId, reminder))
    }
    result.reminders = reminders
  }

  return result
}

export async function applyActionBlock(admin: any, userId: string, payload: any) {
  const tipo = payload?.tipo ?? 'nenhuma'
  if (tipo === 'nenhuma') return { tipo }

  const context = await loadAgentContext(admin, userId)
  const habit = await findHabit(admin, userId, payload?.categoria, payload?.habito)
  if (!habit) return { tipo, applied: false, reason: 'habit_not_found' }

  if (tipo === 'marcar_feito') {
    const data = todayInTimezone(context.profile?.timezone)
    const { error } = await admin.from('habit_logs').upsert({
      habit_id: habit.id,
      user_id: userId,
      data,
      status: 'feito',
      valor: payload?.valor ? String(payload.valor) : null,
      nota: payload?.nota ? String(payload.nota) : null,
      marcado_em: new Date().toISOString(),
    }, { onConflict: 'habit_id,user_id,data' })
    if (error) throw error
    return { tipo, applied: true, habit_id: habit.id, data }
  }

  if (tipo === 'adiar') {
    const minutes = Math.max(5, Math.min(240, Number(payload?.minutos ?? 30)))
    const schedule = context.schedules.find((item: any) => item.habit_id === habit.id)
    const { error } = await admin.from('reminder_snoozes').insert({
      schedule_id: schedule?.id ?? null,
      habit_id: habit.id,
      user_id: userId,
      canal: payload?.canal === 'push' ? 'push' : 'whatsapp',
      remind_at: new Date(Date.now() + minutes * 60_000).toISOString(),
    })
    if (error) throw error
    return { tipo, applied: true, habit_id: habit.id, minutes }
  }

  return { tipo, applied: false, reason: 'unsupported_action' }
}

export async function applyAgentBlocks(admin: any, userId: string, blocks: Array<{ type: string; payload: any }>) {
  const applied = []
  for (const block of blocks) {
    if (block.type === 'SETUP') {
      applied.push({ type: block.type, result: await applySetupBlock(admin, userId, block.payload, true) })
    } else if (block.type === 'SETUP_UPDATE') {
      applied.push({ type: block.type, result: await applySetupBlock(admin, userId, block.payload, false) })
    } else if (block.type === 'ACTION') {
      applied.push({ type: block.type, result: await applyActionBlock(admin, userId, block.payload) })
    }
  }
  return applied
}
