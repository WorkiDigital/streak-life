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

    const body = await req.json()
    const { meal_id, status, observacao, adaptacao, date } = body as {
      meal_id: string
      status: 'feito' | 'adaptado' | 'pulou' | 'pendente'
      observacao?: string
      adaptacao?: string
      date?: string
    }

    if (!meal_id || !status) {
      return jsonResponse({ error: 'meal_id e status são obrigatórios' }, { status: 400 })
    }

    const today = date ?? new Date().toISOString().slice(0, 10)
    const userId = user.id
    const admin = getAdminClient()

    // Validar que o meal pertence ao usuário
    const { data: meal } = await admin
      .from('nutrition_meals')
      .select('id, user_id')
      .eq('id', meal_id)
      .eq('user_id', userId)
      .single()

    if (!meal) return jsonResponse({ error: 'Refeição não encontrada' }, { status: 404 })

    // Upsert nutrition_meal_log
    const { data: mealLog, error: logErr } = await admin
      .from('nutrition_meal_logs')
      .upsert(
        { meal_id, user_id: userId, data: today, status, observacao, adaptacao },
        { onConflict: 'meal_id,user_id,data' }
      )
      .select('id')
      .single()

    if (logErr) {
      return jsonResponse({ error: 'Erro ao registrar: ' + logErr.message }, { status: 500 })
    }

    const { data: habit } = await admin
      .from('habits')
      .select('id')
      .eq('nutrition_meal_id', meal_id)
      .eq('user_id', userId)
      .single()

    if (habit) {
      const habitStatus =
        status === 'feito' || status === 'adaptado'
          ? 'feito'
          : status === 'pulou'
            ? 'nao_feito'
            : 'pendente'

      const { error: habitLogErr } = await admin
        .from('habit_logs')
        .upsert(
          {
            habit_id: habit.id,
            user_id: userId,
            data: today,
            status: habitStatus,
            nutrition_meal_log_id: mealLog?.id ?? null,
            marcado_em: habitStatus === 'feito' ? new Date().toISOString() : null,
          },
          { onConflict: 'habit_id,user_id,data' }
        )

      if (habitLogErr) {
        return jsonResponse({ error: 'Erro ao atualizar habito: ' + habitLogErr.message }, { status: 500 })
      }
    }

    return jsonResponse({ ok: true, log_id: mealLog?.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[nutrition-log-meal]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
