import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0'
import { CORS_HEADERS, getAdminClient, jsonResponse } from '../_shared/agent.ts'

const GOALS_PROMPT = `Voce e uma IA de metas de rotina saudavel. Gere metas praticas baseadas no perfil.

REGRAS:
- Retorne APENAS JSON valido, sem texto antes ou depois, sem markdown.
- Metas de consistencia: sempre inclua 1 meta tipo "consistency" (dias bons na semana).
- Conecte cada meta a habitos pelo category match: hidratacao->hydration, treino->training, alimentacao->nutrition, sono->sleep, outro->routine.
- target_value deve ser realista para o perfil.
- frequency: "daily" para metas diarias, "weekly" para semanais.
- Maximo 6 metas. Minimo 3.

FORMATO (retorne exatamente este JSON):
{
  "goals": [
    {
      "title": "Beber agua todos os dias",
      "description": "Meta de hidratacao diaria",
      "category": "hydration",
      "type": "process",
      "target_value": 3,
      "unit": "L/dia",
      "frequency": "daily",
      "priority": 2,
      "habit_categories": ["hidratacao"]
    },
    {
      "title": "5 dias consistentes na semana",
      "description": "Cumprir pelo menos 70% dos habitos do dia",
      "category": "consistency",
      "type": "consistency",
      "target_value": 5,
      "unit": "dias/semana",
      "frequency": "weekly",
      "priority": 1,
      "habit_categories": []
    }
  ]
}`

type HabitRow = { id: string; nome: string; categoria: string | null }

function buildFallbackGoals(profile: Record<string, unknown>, habits: HabitRow[]) {
  const categories = new Set((habits ?? []).map(h => h.categoria).filter(Boolean))
  const goals: Array<Record<string, unknown>> = [
    {
      title: '5 dias consistentes na semana',
      description: 'Cumprir pelo menos 70% dos habitos do dia.',
      category: 'consistency',
      type: 'consistency',
      target_value: 5,
      unit: 'dias/semana',
      frequency: 'weekly',
      priority: 1,
      habit_categories: [],
    },
  ]

  if (categories.has('hidratacao')) {
    goals.push({
      title: 'Hidratacao diaria',
      description: 'Manter o habito de beber agua todos os dias.',
      category: 'hydration',
      type: 'process',
      target_value: 1,
      unit: 'check/dia',
      frequency: 'daily',
      priority: 2,
      habit_categories: ['hidratacao'],
    })
  }

  if (categories.has('alimentacao') || profile.nutrition_enabled === true) {
    goals.push({
      title: 'Rotina alimentar consistente',
      description: 'Cumprir as refeicoes planejadas com consistencia.',
      category: 'nutrition',
      type: 'process',
      target_value: 1,
      unit: 'check/dia',
      frequency: 'daily',
      priority: 2,
      habit_categories: ['alimentacao'],
    })
  }

  if (categories.has('treino') || profile.treina === true) {
    goals.push({
      title: 'Treinos da semana',
      description: 'Executar os treinos planejados para a semana.',
      category: 'training',
      type: 'process',
      target_value: Number(profile.dias_treino ?? 3) || 3,
      unit: 'treinos/semana',
      frequency: 'weekly',
      priority: 2,
      habit_categories: ['treino'],
    })
  }

  if (categories.has('sono')) {
    goals.push({
      title: 'Sono mais regular',
      description: 'Manter horarios de sono mais consistentes.',
      category: 'sleep',
      type: 'process',
      target_value: 1,
      unit: 'check/dia',
      frequency: 'daily',
      priority: 1,
      habit_categories: ['sono'],
    })
  }

  if (goals.length < 3) {
    goals.push({
      title: 'Rotina organizada',
      description: 'Concluir os principais habitos diarios.',
      category: 'routine',
      type: 'process',
      target_value: 1,
      unit: 'check/dia',
      frequency: 'daily',
      priority: 1,
      habit_categories: ['outro'],
    })
  }

  return goals.slice(0, 6)
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })

    const admin = getAdminClient()
    const userId = user.id

    const [{ data: profile }, { data: habits }] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).single(),
      admin.from('habits').select('id, nome, categoria').eq('user_id', userId).eq('ativo', true),
    ])

    if (!profile) return jsonResponse({ error: 'Perfil nao encontrado' }, { status: 404 })

    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? ''
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
    const userPrompt = `Perfil: ${profile.nome ?? 'usuario'}, ${profile.idade ?? '?'}a, objetivo=${profile.objetivo ?? 'rotina'}, atividade=${profile.nivel_atividade ?? 'moderado'}, treino=${profile.treina ? `${profile.tipo_treino} ${profile.dias_treino}x/sem` : 'nao'}, peso=${profile.peso_kg}kg->${profile.peso_meta_kg}kg, sono=${profile.horario_acordar?.slice(0, 5)}-${profile.horario_dormir?.slice(0, 5)}.
Habitos ativos: ${(habits ?? []).map((h: HabitRow) => `${h.nome}(${h.categoria})`).join(', ') || 'nenhum ainda'}.
Gere as metas. APENAS JSON.`

    let parsed: { goals: unknown[] } | null = null
    let source = 'ai'

    if (geminiKey) {
      const geminiRes = await fetch(`${geminiUrl}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: GOALS_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.4 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      })

      const geminiData = await geminiRes.json()
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

      try {
        parsed = JSON.parse(rawText)
      } catch {
        const match = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (match) {
          try { parsed = JSON.parse(match[1].trim()) } catch { /* noop */ }
        }
      }

      if (!parsed) {
        const start = rawText.indexOf('{')
        const end = rawText.lastIndexOf('}')
        if (start !== -1 && end !== -1) {
          try { parsed = JSON.parse(rawText.slice(start, end + 1)) } catch { /* noop */ }
        }
      }

      if (!parsed?.goals?.length) {
        console.error('[goals-generate] AI fallback, status:', geminiRes.status, 'raw:', rawText.slice(0, 200))
      }
    }

    if (!parsed?.goals?.length) {
      parsed = { goals: buildFallbackGoals(profile, habits ?? []) }
      source = 'fallback'
    }

    const habitsByCategory: Record<string, string[]> = {}
    for (const h of habits ?? []) {
      if (!h.categoria) continue
      if (!habitsByCategory[h.categoria]) habitsByCategory[h.categoria] = []
      habitsByCategory[h.categoria].push(h.id)
    }

    const goalsWithHabitIds = (parsed.goals as Array<Record<string, unknown>>).map(g => {
      const cats = (g.habit_categories as string[] ?? [])
      const habitIds = cats.flatMap(cat => habitsByCategory[cat] ?? [])
      const { habit_categories: _, ...rest } = g
      return { ...rest, habit_ids: habitIds }
    })

    return jsonResponse({
      ok: true,
      source,
      goals: goalsWithHabitIds,
      profile_summary: {
        objetivo: profile.objetivo,
        nivel_atividade: profile.nivel_atividade,
        treina: profile.treina,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[goals-generate]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
