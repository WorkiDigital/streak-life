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

  if (!idade || !altura_cm || !peso_kg || !peso_meta_kg) return null

  const wake = cleanClock(allText.match(/acord\w*\D{0,12}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null) ?? '06:00'
  const treinoHora = cleanClock(allText.match(/trein\w*\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null) ?? '18:30'
  const jantarHora = cleanClock(allText.match(/jant\w*\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null) ?? '20:00'
  const sleep = cleanClock(allText.match(/(?:durmo|dormir|sono)\D{0,18}(\d{1,2}(?::|h)?\d{0,2})/)?.[1] ?? null) ?? '23:00'
  const hydrationStart = addMinutes(wake, 120)
  const hydrationEnd = addMinutes(jantarHora, -120)

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

  return {
    perfil: {
      nome: context.profile?.nome,
      idade,
      sexo,
      altura_cm,
      peso_kg,
      peso_meta_kg,
      nivel_atividade: /sedentari/.test(allText) ? 'sedentario' : /leve/.test(allText) ? 'leve' : /moderad/.test(allText) ? 'moderado' : 'leve',
      treina: /trein|musculacao|academia|corrida/.test(allText),
      dias_treino: dias_treino ?? null,
      tipo_treino,
      objetivo: inferGoal(allText),
      objetivo_descricao: inferGoalDescription(allText, peso_kg, peso_meta_kg),
      prazo_meta: allText.match(/(\d+\s*(?:semanas?|meses?|anos?))/)?.[1] ?? null,
      horario_acordar: wake,
      horario_dormir: sleep,
      horario_treino_preferido: treinoHora,
      preferencias_alimentares: /simples|pratic/.test(allText) ? 'comidas simples e praticas' : null,
      restricoes_alimentares: /sem restri|nenhuma restri/.test(allText) ? 'nenhuma informada' : null,
      observacoes_saude: 'Triagem inicial sem sinais de risco informados',
      nivel_estresse: inferStressLevel(allText),
      horarios_refeicoes: { jantar: jantarHora },
      timezone: context.profile?.timezone ?? 'America/Fortaleza',
      tom_preferido: context.profile?.tom_preferido ?? 'amigavel',
    },
    lembretes: [
      {
        habito: 'Beber agua',
        categoria: 'hidratacao',
        horarios: timesEveryTwoHours(hydrationStart, hydrationEnd),
        dias_semana: [0, 1, 2, 3, 4, 5, 6],
        canais,
      },
      {
        habito: 'Treino',
        categoria: 'treino',
        horarios: [treinoHora],
        dias_semana: treinoDias,
        canais,
      },
      {
        habito: 'Jantar no horario',
        categoria: 'alimentacao',
        horarios: [jantarHora],
        dias_semana: [0, 1, 2, 3, 4, 5, 6],
        canais,
      },
      {
        habito: 'Reduzir telas',
        categoria: 'tela',
        horarios: [addMinutes(sleep, -60)],
        dias_semana: [0, 1, 2, 3, 4, 5, 6],
        canais: ['push'],
      },
      {
        habito: 'Dormir cedo',
        categoria: 'sono',
        horarios: [sleep],
        dias_semana: [0, 1, 2, 3, 4, 5, 6],
        canais,
      },
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
Se ainda faltar dado essencial de seguranca ou rotina, faca somente a proxima pergunta.
Se ja houver dados suficientes de triagem, anamnese, rotina, objetivo e ausencia de sinais de risco, voce DEVE entregar o plano e emitir um bloco SETUP completo com perfil e lembretes.
Nao faca perguntas extras quando ja for possivel configurar horarios seguros e praticos.`
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
Se houver dados suficientes de perfil, objetivo, rotina, horarios, treino e triagem sem sinais de risco, responda SOMENTE com um bloco HTML SETUP JSON estrito.
Se faltar alguma informacao essencial ou houver sinal de risco, responda somente NEED_MORE.

Regras do SETUP:
- Inclua perfil com idade, sexo, altura_cm, peso_kg, peso_meta_kg, nivel_atividade, treina, dias_treino, tipo_treino, objetivo, objetivo_descricao, prazo_meta, horario_acordar, horario_dormir, horario_treino_preferido, preferencias_alimentares, restricoes_alimentares, observacoes_saude, nivel_estresse, horarios_refeicoes, timezone e tom_preferido quando disponiveis.
- Inclua lembretes praticos para hidratacao, treino, alimentacao/jantar, tela e sono quando fizerem sentido.
- Use horarios no formato HH:mm.
- Use dias_semana 0 a 6.
- Use canais ["push"] quando o usuario nao informou WhatsApp.
- Nao escreva explicacoes fora do bloco.
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
