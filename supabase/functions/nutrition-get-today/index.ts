import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0'
import { CORS_HEADERS, getAdminClient, jsonResponse } from '../_shared/agent.ts'

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
    if (authError || !user) return jsonResponse({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const today = (body.date as string) ?? new Date().toISOString().slice(0, 10)
    const userId = user.id
    const admin = getAdminClient()

    // Buscar plano ativo
    const { data: plan } = await admin
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!plan) return jsonResponse({ plan: null, meals: [] })

    // Buscar metas
    const { data: targets } = await admin
      .from('nutrition_targets')
      .select('*')
      .eq('plan_id', plan.id)
      .single()

    // Buscar refeições ativas
    const { data: meals } = await admin
      .from('nutrition_meals')
      .select('*')
      .eq('plan_id', plan.id)
      .eq('ativo', true)
      .order('ordem', { ascending: true })

    if (!meals || meals.length === 0) {
      return jsonResponse({ plan, targets: targets ?? null, meals: [] })
    }

    const mealIds = meals.map(m => m.id)

    // Buscar itens e substituições em paralelo
    const [itemsRes, subsRes, logsRes] = await Promise.all([
      admin
        .from('nutrition_meal_items')
        .select('*')
        .in('meal_id', mealIds)
        .order('ordem', { ascending: true }),
      admin
        .from('nutrition_substitutions')
        .select('*')
        .in('meal_id', mealIds),
      admin
        .from('nutrition_meal_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('data', today)
        .in('meal_id', mealIds),
    ])

    // Montar meals enriquecidos
    const enriched = meals.map(meal => ({
      ...meal,
      itens: (itemsRes.data ?? []).filter(i => i.meal_id === meal.id),
      substituicoes: (subsRes.data ?? []).filter(s => s.meal_id === meal.id),
      log: (logsRes.data ?? []).find(l => l.meal_id === meal.id) ?? null,
    }))

    return jsonResponse({ plan, targets: targets ?? null, meals: enriched })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[nutrition-get-today]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
