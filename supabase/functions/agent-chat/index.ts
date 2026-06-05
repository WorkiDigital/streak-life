import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  CORS_HEADERS,
  SYSTEM_PROMPT,
  applyAgentBlocks,
  buildContextPrompt,
  callGemini,
  getAdminClient,
  getAuthUser,
  jsonResponse,
  loadAgentContext,
  parseAgentBlocks,
  sanitizeAgentContent,
} from '../_shared/agent.ts'

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function firstMatchNumber(text: string, regex: RegExp) {
  const match = text.match(regex)
  return match ? Number(match[1].replace(',', '.')) : null
}

function cleanClock(value: string | null) {
  if (!value) return null
  const match = value.match(/(\d{1,2})(?::|h)?(\d{2})?/)
  if (!match) return null
  const hour = Math.min(23, Math.max(0, Number(match[1])))
  const minute = Math.min(59, Math.max(0, Number(match[2] ?? '00')))
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function addMinutes(time: string, minutes: number) {
  const [hour, minute] = time.split(':').map(Number)
  const total = (hour * 60 + minute + minutes + 24 * 60) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function timesEveryTwoHours(start = '08:00', end = '18:00') {
  const [startHour] = start.split(':').map(Number)
  const [endHour] = end.split(':').map(Number)
  const times = []
  for (let hour = Math.max(6, startHour); hour <= Math.min(22, endHour); hour += 2) {
    times.push(`${String(hour).padStart(2, '0')}:00`)
  }
  return times.length ? times : ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00']
}

function inferGoal(text: string) {
  if (/emagrec|perder peso|perder gordura|baixar peso|secar/.test(text)) return 'emagrecer'
  if (/ganhar massa|hipertrof|massa muscular|ganhar peso/.test(text)) return 'ganhar_massa'
  if (/manter peso|manutencao|manter/.test(text)) return 'manter'
  if (/performance|rendimento|desempenho/.test(text)) return 'performance'
  if (/saude|habito|qualidade de vida|disposicao/.test(text)) return 'saude'
  return 'saude'
}

function inferGoalDescription(text: string, pesoKg: number | null, pesoMetaKg: number | null) {
  const objetivo = inferGoal(text)
  if (objetivo === 'emagrecer' && pesoKg && pesoMetaKg) {
    return `Reduzir de ${pesoKg} kg para ${pesoMetaKg} kg com saude e consistencia`
  }
  if (objetivo === 'ganhar_massa') return 'Ganhar massa muscular com rotina sustentavel'
  if (objetivo === 'performance') return 'Melhorar desempenho mantendo rotina de saude'
  if (objetivo === 'manter') return 'Manter peso e consolidar bons habitos'
  return 'Melhorar saude e consistencia nos habitos'
}

function inferStressLevel(text: string) {
  if (/estresse alto|muito estress|ansios|exaust/.test(text)) return 'alto'
  if (/estresse baixo|pouco estress|tranquil/.test(text)) return 'baixo'
  if (/estress/.test(text)) return 'medio'
  return null
}

function hasAffirmedRisk(text: string) {
  const risks = ['compuls', 'purga', 'laxante', 'diuretic', 'jejum extremo', 'culpa intensa', 'vomit', 'restricao severa']
  return risks.some((risk) => {
    const index = text.indexOf(risk)
    if (index < 0) return false
    const sentenceStart = Math.max(
      text.lastIndexOf('.', index),
      text.lastIndexOf('\n', index),
      text.lastIndexOf(';', index)
    )
    const prefix = text.slice(Math.max(0, sentenceStart + 1), index)
    return !/\b(sem|nao|nunca)\b/.test(prefix)
  })
}

function prescribeHydration(pesoKg: number, nivelAtividade: string, wake: string, end: string) {
  const fator = nivelAtividade === 'moderado' ? 0.040 : nivelAtividade === 'alto' ? 0.045 : 0.035
  const litros = Math.round(pesoKg * fator * 10) / 10
  const horarios = timesEveryTwoHours(wake, end)
  return { litros, horarios }
}

function prescribeRefeicoes(wake: string, cafeHora: string | null, almocoHora: string | null, lancheHora: string | null, jantarHora: string) {
  return {
    cafe: cafeHora ?? addMinutes(wake, 30),
    almoco: almocoHora ?? '12:00',
    lanche: lancheHora ?? '15:30',
    jantar: jantarHora,
  }
}

function prescribeExtras(opts: {
  nivel_estresse: string | null
  dias_treino: number | null
  tipo_treino: string | null
  objetivo: string
  treinoHora: string
  treinoDias: number[]
  canais: string[]
}) {
  const extras: any[] = []
  const { nivel_estresse, dias_treino, tipo_treino, objetivo, treinoHora, treinoDias, canais } = opts

  if (nivel_estresse === 'alto') {
    extras.push({ habito: 'Meditacao', categoria: 'meditacao', horarios: ['07:00'], dias_semana: [0,1,2,3,4,5,6], canais: ['push'] })
  }
  if (dias_treino && dias_treino >= 4) {
    extras.push({ habito: 'Alongamento pos-treino', categoria: 'alongamento', horarios: [addMinutes(treinoHora, 60)], dias_semana: treinoDias, canais: ['push'] })
  }
  if (objetivo === 'ganhar_massa') {
    extras.push({ habito: 'Suplementacao proteica', categoria: 'medicamento', horarios: ['08:00', addMinutes(treinoHora, 30)], dias_semana: [0,1,2,3,4,5,6], canais: ['push'] })
  }
  if (objetivo === 'performance') {
    extras.push({ habito: 'Leitura e foco', categoria: 'leitura', horarios: ['21:00'], dias_semana: [0,1,2,3,4,5,6], canais: ['push'] })
  }
  if (tipo_treino === 'corrida') {
    extras.push({ habito: 'Ar livre / Caminhada', categoria: 'ar_livre', horarios: [treinoHora], dias_semana: treinoDias, canais })
  }
  return extras
}

function buildFallbackSetup(context: any) {
  const allText = normalizeText(
    (context.messages ?? [])
      .map((item: any) => item.content)
      .join('\n')
  )

  if (hasAffirmedRisk(allText)) return null

  const idade = firstMatchNumber(allText, /(\d{2})\s*anos/)
  const altura_cm = firstMatchNumber(allText, /(\d{3})\s*cm/)
  const peso_kg = firstMatchNumber(allText, /(?:peso|peso atual|estou com|tenho)\D{0,20}(\d{2,3}(?:[,.]\d+)?)\s*kg/)
    ?? firstMatchNumber(allText, /(\d{2,3}(?:[,.]\d+)?)\s*kg/)
  const peso_meta_kg = firstMatchNumber(allText, /meta\D{0,30}(\d{2,3}(?:[,.]\d+)?)\s*kg/)
  const dias_treino = firstMatchNumber(allText, /(\d)\s*(?:dias|x)\s*(?:por\s*)?semana/)

  // Exige todos os dados essenciais antes de gerar o plano
  const temRotina = /acord\w*\D{0,12}\d{1,2}(?::|h)/.test(allText) && /(?:durmo|dormir|sono)\D{0,18}\d{1,2}(?::|h)/.test(allText)
  const temEstresse = inferStressLevel(allText) !== null || /sem estress|pouco estress|nao tenho estress/.test(allText)
  const temRefeicoes = /jant\w*\D{0,18}\d{1,2}(?::|h)/.test(allText)
  const temPreferencias = /prefer|aliment|vegetar|vegano|simples|restri|alergi|intoler|nenhuma/.test(allText)
  const temSaude = /saude|condicao|medicament|nenhuma|sem condicao|saudavel/.test(allText)
  if (!idade || !altura_cm || !peso_kg || !peso_meta_kg || !temRotina || !temEstresse || !temRefeicoes || !temPreferencias || !temSaude) return null

  const wake = cleanClock(allText.match(/acord\w*\D{0,12}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null) ?? '06:00'
  const treinoHora = cleanClock(allText.match(/trein\w*\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null) ?? '18:30'
  const jantarHora = cleanClock(allText.match(/jant\w*\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null) ?? '20:00'
  const cafeHora = cleanClock(allText.match(/caf[eé]\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null)
  const almocoHora = cleanClock(allText.match(/almo[cç]\w*\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null)
  const lancheHora = cleanClock(allText.match(/lanch\w*\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null)
  const sleep = cleanClock(allText.match(/(?:durmo|dormir|sono)\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null) ?? '23:00'

  const nivel_atividade = /sedentari/.test(allText) ? 'sedentario' : /moderad/.test(allText) ? 'moderado' : 'leve'
  const nivel_estresse = inferStressLevel(allText)
  const objetivo = inferGoal(allText)

  const sexo = /\b(homem|masculino|sexo m|sou m)\b/.test(allText)
    ? 'M'
    : /\b(mulher|feminino|sexo f|sou f)\b/.test(allText) ? 'F' : null

  const tipo_treino = /musculacao|forca|academia/.test(allText)
    ? 'forca'
    : /corrida|correr/.test(allText) ? 'corrida' : /trein/.test(allText) ? 'geral' : null

  const canais = context.profile?.whatsapp ? ['push', 'whatsapp'] : ['push']
  const treinoDias = dias_treino && dias_treino >= 5
    ? [1, 2, 3, 4, 5]
    : dias_treino === 4 ? [1, 2, 4, 5] : dias_treino === 3 ? [1, 3, 5] : [1, 3, 5]

  const hydrationStart = addMinutes(wake, 120)
  const hydrationEnd = addMinutes(jantarHora, -120)
  const { litros, horarios: aguaHorarios } = prescribeHydration(peso_kg, nivel_atividade, hydrationStart, hydrationEnd)
  const refeicoes = prescribeRefeicoes(wake, cafeHora, almocoHora, lancheHora, jantarHora)

  return {
    perfil: {
      nome: context.profile?.nome,
      idade,
      sexo,
      altura_cm,
      peso_kg,
      peso_meta_kg,
      nivel_atividade,
      treina: /trein|musculacao|academia|corrida/.test(allText),
      dias_treino: dias_treino ?? null,
      tipo_treino,
      objetivo,
      objetivo_descricao: inferGoalDescription(allText, peso_kg, peso_meta_kg),
      prazo_meta: allText.match(/(\d+\s*(?:semanas?|meses?|anos?))/)?.[1] ?? null,
      horario_acordar: wake,
      horario_dormir: sleep,
      horario_treino_preferido: treinoHora,
      preferencias_alimentares: /simples|pratic/.test(allText) ? 'comidas simples e praticas' : null,
      restricoes_alimentares: /sem restri|nenhuma restri/.test(allText) ? 'nenhuma informada' : null,
      observacoes_saude: 'Triagem inicial sem sinais de risco informados',
      nivel_estresse,
      horarios_refeicoes: refeicoes,
      agua_litros_diaria: litros,
      timezone: context.profile?.timezone ?? 'America/Fortaleza',
      tom_preferido: context.profile?.tom_preferido ?? 'amigavel',
    },
    lembretes: [
      { habito: `Beber agua (meta: ${litros}L/dia)`, categoria: 'hidratacao', horarios: aguaHorarios, dias_semana: [0,1,2,3,4,5,6], canais },
      { habito: 'Cafe da manha', categoria: 'alimentacao', horarios: [refeicoes.cafe], dias_semana: [0,1,2,3,4,5,6], canais: ['push'] },
      { habito: 'Almoco', categoria: 'alimentacao', horarios: [refeicoes.almoco], dias_semana: [1,2,3,4,5], canais: ['push'] },
      { habito: 'Lanche da tarde', categoria: 'alimentacao', horarios: [refeicoes.lanche], dias_semana: [0,1,2,3,4,5,6], canais: ['push'] },
      { habito: 'Jantar no horario', categoria: 'alimentacao', horarios: [jantarHora], dias_semana: [0,1,2,3,4,5,6], canais },
      { habito: 'Treino', categoria: 'treino', horarios: [treinoHora], dias_semana: treinoDias, canais },
      { habito: 'Reduzir telas', categoria: 'tela', horarios: [addMinutes(sleep, -60)], dias_semana: [0,1,2,3,4,5,6], canais: ['push'] },
      { habito: 'Dormir cedo', categoria: 'sono', horarios: [sleep], dias_semana: [0,1,2,3,4,5,6], canais },
      ...prescribeExtras({ nivel_estresse, dias_treino, tipo_treino, objetivo, treinoHora, treinoDias, canais }),
    ],
  }
}

function buildSetupCompletionMessage() {
  return [
    'Pronto, montei seu plano inicial e configurei seus lembretes.',
    '',
    'Eu deixei os horarios distribuidos de um jeito pratico para sua rotina. Voce pode me pedir para mudar qualquer coisa, tipo "muda treino para 18h" ou "adiar agua por 30 minutos".',
  ].join('\n')
}

function buildEmptyVisibleFallback(blocks: Array<{ type: string; payload: any }>) {
  if (blocks.some((block) => block.type === 'SETUP')) {
    return buildSetupCompletionMessage()
  }

  if (blocks.some((block) => block.type === 'SETUP_UPDATE')) {
    return 'Feito, atualizei seu plano.'
  }

  const action = blocks.find((block) => block.type === 'ACTION')?.payload
  if (action?.tipo === 'marcar_feito') return 'Feito, registrei aqui.'
  if (action?.tipo === 'adiar') return 'Combinado, adiei esse lembrete.'

  return 'Certo, continue me contando.'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const { user, error: userError } = await getAuthUser(authHeader)
    if (userError || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })

    const { message = '', source = 'app', mode = 'chat' } = await req.json().catch(() => ({}))
    const cleanUserMessage = String(message || '').trim()
    const admin = getAdminClient()

    if (cleanUserMessage) {
      const { error } = await admin.from('chat_messages').insert({
        user_id: user.id,
        role: 'user',
        content: cleanUserMessage,
        source,
      })
      if (error) throw error
    }

    const context = await loadAgentContext(admin, user.id)
    const history = context.messages.map((item: any) => ({
      role: item.role,
      content: item.content,
    }))

    const syntheticPrompt = mode === 'onboarding'
      ? `Voce esta no onboarding. Avalie a conversa e a ultima resposta do usuario.

Dados OBRIGATORIOS antes de emitir SETUP (todos precisam estar presentes):
- idade, sexo, altura_cm, peso_kg, peso_meta_kg
- horario_acordar, horario_dormir
- nivel_atividade (sedentario, leve, moderado, alto)
- treina (sim/nao), e se sim: dias_treino, tipo_treino, horario_treino
- horarios das refeicoes: cafe_da_manha, almoco, lanche_da_tarde, jantar
- nivel_estresse
- preferencias_alimentares (ex: comida simples, vegetariano, sem gluten, etc)
- restricoes_alimentares (alergias, intolerâncias ou "nenhuma")
- observacoes_saude (condicoes de saude relevantes, medicamentos em uso, ou "nenhuma")
- tom_preferido (amigavel, direto ou motivacional)
- triagem de seguranca concluida (sem sinais de risco alimentar)

Se QUALQUER desses ainda nao foi informado, faca SOMENTE a proxima pergunta pendente. Nao emita SETUP.
Se TODOS estiverem presentes e nao houver sinal de risco, entregue o plano e emita o bloco SETUP.`
      : 'Continue a conversa de forma util. Se a mensagem do usuario indicar conclusao, ajuste ou adiamento, emita o bloco invisivel adequado.'

    const aiInput = [
      { role: 'user', content: buildContextPrompt(context) },
      { role: 'user', content: syntheticPrompt },
      ...history,
    ]

    const raw = await callGemini(SYSTEM_PROMPT, aiInput)
    let blocks = parseAgentBlocks(raw)
    let setupGeneratedInternally = false

    if (
      mode === 'onboarding' &&
      !blocks.some((block) => block.type === 'SETUP' || block.type === 'SETUP_UPDATE')
    ) {
      const setupOnlyPrompt = `
Tarefa interna de configuracao. Analise o historico do onboarding.

So responda com SETUP se TODOS estes dados estiverem presentes na conversa:
- idade, sexo, altura_cm, peso_kg, peso_meta_kg
- horario_acordar, horario_dormir
- nivel_atividade
- treina (sim/nao), e se sim: dias_treino, tipo_treino, horario_treino_preferido
- horarios das refeicoes: cafe_da_manha, almoco, lanche_da_tarde, jantar
- nivel_estresse
- preferencias_alimentares
- restricoes_alimentares
- observacoes_saude
- tom_preferido
- triagem de seguranca concluida (sem sinais de risco alimentar)

Se faltar qualquer um desses, responda somente: NEED_MORE
Se houver sinal de risco alimentar, responda somente: NEED_MORE

Se todos estiverem presentes, responda SOMENTE com o bloco SETUP (sem texto fora dele):
- perfil com todos os campos disponiveis
- lembretes personalizados: hidratacao com meta em L/dia baseada no peso, cafe da manha, almoco, lanche, jantar, treino, reduzir telas, dormir cedo, e extras conforme perfil
- Use horarios HH:mm, dias_semana 0-6, canais ["push"] se sem WhatsApp
`.trim()

      const setupRaw = await callGemini(SYSTEM_PROMPT, [
        { role: 'user', content: buildContextPrompt(context) },
        ...history,
        { role: 'user', content: setupOnlyPrompt },
      ])
      const setupBlocks = parseAgentBlocks(setupRaw).filter((block) => block.type === 'SETUP')
      if (setupBlocks.length > 0) {
        blocks = [...blocks, ...setupBlocks]
        setupGeneratedInternally = true
      }
    }

    if (
      mode === 'onboarding' &&
      !blocks.some((block) => block.type === 'SETUP' || block.type === 'SETUP_UPDATE')
    ) {
      const fallbackSetup = buildFallbackSetup(context)
      if (fallbackSetup) {
        blocks = [...blocks, { type: 'SETUP', payload: fallbackSetup }]
        setupGeneratedInternally = true
      }
    }

    const applied = await applyAgentBlocks(admin, user.id, blocks)
    let visible = sanitizeAgentContent(raw)
    const completedSetup = applied.some((item: any) => item.type === 'SETUP')
    if ((setupGeneratedInternally && completedSetup) || !visible) {
      visible = buildEmptyVisibleFallback(blocks)
    }

    const { data: assistantMessage, error: insertError } = await admin
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'assistant',
        content: visible,
        source,
        metadata: { applied },
      })
      .select()
      .single()

    if (insertError) throw insertError

    return jsonResponse({
      message: visible,
      assistantMessage,
      applied,
    })
  } catch (error) {
    console.error('[agent-chat] Erro:', error)
    return jsonResponse({ error: error.message ?? 'Erro interno' }, { status: 500 })
  }
})
