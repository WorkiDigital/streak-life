import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0'
import {
  CORS_HEADERS,
  jsonResponse,
} from '../_shared/agent.ts'

const NUTRITION_SYSTEM_PROMPT = `Você é uma IA de nutrição. Monte sugestões de refeições práticas com base no perfil do usuário.

REGRAS CRÍTICAS:
- Retorne APENAS JSON válido, sem nenhum texto antes ou depois, sem markdown.
- Seja EXTREMAMENTE CONCISO: objetivo em 1 frase, observacoes_gerais em 1 frase.
- Máximo 3 itens por refeição. Máximo 1 substituição por refeição.
- Nomes de alimentos curtos (ex: "Frango grelhado", não "Peito de frango grelhado temperado com ervas").
- Alimentos simples e comuns no Brasil.

FORMATO (retorne exatamente isso):
{"objetivo":"...","observacoes_gerais":"...","metas":{"proteina_g":0,"carboidrato_g":0,"gordura_g":0,"agua_litros":0,"calorias_estimadas":0},"refeicoes":[{"nome":"...","horario":"HH:MM","ordem":1,"descricao_simples":"...","objetivo_refeicao":"...","proteina_g":0,"carboidrato_g":0,"gordura_g":0,"calorias_estimadas":0,"itens":[{"alimento":"...","quantidade_min":0,"quantidade_max":0,"unidade":"g","grupo":"proteina"}],"substituicoes":[{"alimento_original":"...","substituto":"..."}]}]}`

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
      ? 'Inclua macros (proteína/carb/gordura em g) e calorias por refeição. Máximo 3 itens por refeição, 2 substituições.'
      : mode === 'detalhado'
      ? 'Inclua quantidades em faixas (ex: 130g-160g). Máximo 3 itens por refeição, 2 substituições.'
      : 'Sem gramas. Descreva cada item como "uma porção de X". Máximo 3 itens por refeição, 1 substituição. Seja muito conciso.'

    const userPrompt = `Perfil: ${perfil.nome}, ${perfil.idade}a, ${perfil.sexo}, ${perfil.altura_cm}cm, ${perfil.peso_kg}kg→${perfil.peso_meta_kg}kg, objetivo=${perfil.objetivo}, atividade=${perfil.nivel_atividade}, treino=${perfil.treina ? `${perfil.tipo_treino} ${perfil.dias_treino}x/sem` : 'não'}, estresse=${perfil.nivel_estresse}
Horários: café=${perfil.horario_cafe}, almoço=${perfil.horario_almoco}, lanche=${perfil.horario_lanche}, jantar=${perfil.horario_jantar}
Restrições: ${perfil.restricoes_alimentares ?? 'nenhuma'} | Preferências: ${perfil.preferencias_alimentares ?? 'nenhuma'}
Modo: ${mode}. ${modeDesc}
Gere JSON com 4 refeições (café, almoço, lanche, jantar). APENAS JSON, sem texto extra.`

    // Usa callGemini direto com safetySettings mais permissivos para conteúdo de saúde/nutrição
    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    const geminiModel = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash'
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`

    const geminiRes = await fetch(`${geminiUrl}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: NUTRITION_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 8192, temperature: 0.7, topP: 0.9 },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
        ],
      }),
    })

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error('[nutrition-generate-plan] Gemini error:', geminiRes.status, errText.slice(0, 500))
      throw new Error(`Gemini API error: ${geminiRes.status}`)
    }

    const geminiData = await geminiRes.json()
    console.error('[nutrition-generate-plan] finish_reason:', geminiData.candidates?.[0]?.finishReason)
    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    if (!raw) {
      console.error('[nutrition-generate-plan] empty response, full:', JSON.stringify(geminiData).slice(0, 500))
      throw new Error('Resposta vazia da IA')
    }

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
    const stack = err instanceof Error ? err.stack : ''
    console.error('[nutrition-generate-plan] ERRO:', message, stack)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
