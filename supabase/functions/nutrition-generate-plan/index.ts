import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  CORS_HEADERS,
  callGemini,
  getAdminClient,
  jsonResponse,
} from '../_shared/agent.ts'

const NUTRITION_SYSTEM_PROMPT = `Você é uma IA especializada em nutrição comportamental e organização de rotina saudável.

Sua função é montar um plano alimentar prático, seguro e aplicável com base nos dados fornecidos.

REGRAS OBRIGATÓRIAS:
- Não substitua nutricionista, médico ou psicólogo.
- Não gere plano com gramas para menores de 18 anos.
- Não gere plano com gramas para gestantes, lactantes ou sinais de transtorno alimentar.
- Não recomende dietas extremas, jejum extremo, detox, laxantes ou diuréticos.
- Use quantidades aproximadas em faixas (ex: 130g a 160g).
- Priorize alimentos simples e comuns no Brasil.
- Gere refeições nos horários informados no perfil.
- SEMPRE inclua aviso de que não substitui acompanhamento profissional.

FORMATO OBRIGATÓRIO:
Retorne APENAS o JSON abaixo, sem markdown, sem texto antes ou depois, sem blocos de código:

{
  "objetivo": "string",
  "observacoes_gerais": "string",
  "metas": {
    "proteina_g": number,
    "carboidrato_g": number,
    "gordura_g": number,
    "agua_litros": number,
    "calorias_estimadas": number
  },
  "refeicoes": [
    {
      "nome": "string",
      "horario": "HH:MM",
      "ordem": number,
      "descricao_simples": "string",
      "objetivo_refeicao": "string",
      "proteina_g": number,
      "carboidrato_g": number,
      "gordura_g": number,
      "calorias_estimadas": number,
      "itens": [
        {
          "alimento": "string",
          "quantidade_min": number,
          "quantidade_max": number,
          "unidade": "string",
          "grupo": "proteina|carboidrato|gordura|vegetal|fruta|laticinios|outro"
        }
      ],
      "substituicoes": [
        {
          "alimento_original": "string",
          "substituto": "string"
        }
      ]
    }
  ]
}`

function hasNutritionRisk(perfil: Record<string, unknown>): { risk: boolean; reason: string } {
  const idade = Number(perfil.idade ?? 99)
  if (idade < 18) return { risk: true, reason: 'menor_de_idade' }

  const textos = [
    String(perfil.observacoes_saude ?? ''),
    String(perfil.restricoes_alimentares ?? ''),
    String(perfil.objetivo ?? ''),
  ].join(' ').toLowerCase()

  const riscoWords = [
    'gestante', 'grávida', 'gravida', 'lactante', 'amamentando',
    'bulimia', 'anorexia', 'compulsão', 'compulsao', 'purga',
    'laxante', 'diurético', 'diuretico', 'jejum extremo',
    'transtorno alimentar', 'restricao severa',
  ]
  for (const word of riscoWords) {
    if (textos.includes(word)) return { risk: true, reason: word }
  }

  const pesoAtual = Number(perfil.peso_kg ?? 70)
  const pesoMeta = Number(perfil.peso_meta_kg ?? 70)
  const diffSemanas = Math.abs(pesoAtual - pesoMeta)
  if (diffSemanas > 30) return { risk: true, reason: 'meta_agressiva' }

  return { risk: false, reason: '' }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.107.0')
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const perfil: Record<string, unknown> = body.perfil ?? {}
    const mode: string = body.mode ?? 'simples'

    // Triagem de segurança
    const { risk, reason } = hasNutritionRisk(perfil)
    if (risk) {
      return jsonResponse({
        risk: true,
        reason,
        message: 'Pelo que você informou, esse caso pede acompanhamento individualizado com um nutricionista e/ou médico. Para sua segurança, não vou montar um plano alimentar com quantidades ou metas específicas. Posso te ajudar com hábitos gerais de rotina, como sono, hidratação e organização de horários.',
      })
    }

    const modeDesc = mode === 'profissional'
      ? 'Inclua macros detalhados (proteína, carboidrato, gordura em gramas), calorias estimadas, e observações técnicas em cada refeição.'
      : mode === 'detalhado'
      ? 'Inclua quantidades aproximadas em gramas para cada alimento (use faixas como "130g a 160g").'
      : 'Use linguagem simples, sem gramas. Descreva cada refeição como "uma fonte de proteína, uma fonte de carboidrato, legumes". Não inclua números exatos.'

    const userPrompt = `
Monte um plano alimentar personalizado para este usuário:

Nome: ${perfil.nome ?? 'Usuário'}
Idade: ${perfil.idade} anos
Sexo: ${perfil.sexo}
Altura: ${perfil.altura_cm}cm | Peso: ${perfil.peso_kg}kg | Meta: ${perfil.peso_meta_kg}kg
Objetivo: ${perfil.objetivo}
Nível de atividade: ${perfil.nivel_atividade}
Treino: ${perfil.treina ? `${perfil.tipo_treino}, ${perfil.dias_treino}x/semana, ${perfil.horario_treino}` : 'Não treina'}
Horário acordar: ${perfil.horario_acordar} | Dormir: ${perfil.horario_dormir}
Refeições:
- Café da manhã: ${perfil.horario_cafe}
- Almoço: ${perfil.horario_almoco}
- Lanche: ${perfil.horario_lanche}
- Jantar: ${perfil.horario_jantar}
Preferências alimentares: ${perfil.preferencias_alimentares ?? 'nenhuma'}
Restrições: ${perfil.restricoes_alimentares ?? 'nenhuma'}
Observações de saúde: ${perfil.observacoes_saude ?? 'nenhuma'}
Nível de estresse: ${perfil.nivel_estresse}

Nível de detalhe desejado: ${mode}
${modeDesc}

Gere o plano alimentar no formato EXATO especificado. Inclua todas as 4 refeições principais (café, almoço, lanche, jantar) nos horários informados.
`.trim()

    const raw = await callGemini(NUTRITION_SYSTEM_PROMPT, [
      { role: 'user', content: userPrompt },
    ])

    // Parser robusto: tenta JSON puro → extrai de bloco ```json``` → extrai primeiro { } de nível raiz
    let planData: Record<string, unknown> | null = null

    const candidates: string[] = []

    // 1. JSON puro direto
    candidates.push(raw.trim())

    // 2. Dentro de bloco ```json ... ``` ou ``` ... ```
    const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlock) candidates.push(codeBlock[1].trim())

    // 3. Primeiro objeto JSON de nível raiz no texto
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      candidates.push(raw.slice(firstBrace, lastBrace + 1))
    }

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate)
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.refeicoes)) {
          planData = parsed
          break
        }
      } catch {
        // tenta próximo
      }
    }

    if (!planData) {
      console.error('[nutrition-generate-plan] raw response:', raw.slice(0, 500))
      return jsonResponse({ error: 'IA não retornou plano nutricional válido' }, { status: 500 })
    }

    return jsonResponse({ plan: planData, mode })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[nutrition-generate-plan]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
