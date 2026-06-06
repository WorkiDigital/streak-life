import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0'
import { CORS_HEADERS, getAdminClient, jsonResponse, todayInTimezone } from '../_shared/agent.ts'

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

    const admin = getAdminClient()
    const userId = user.id

    const { data: profile } = await admin
      .from('profiles')
      .select('timezone, goals_enabled, consistency_threshold')
      .eq('id', userId)
      .single()

    if (!profile?.goals_enabled) {
      return jsonResponse({ goals_enabled: false, goals: [], weekly_goal: null, good_days: 0 })
    }

    const today = todayInTimezone(profile?.timezone)
    const threshold = profile?.consistency_threshold ?? 0.7

    // Início da semana (domingo)
    const todayDate = new Date(today)
    const dayOfWeek = todayDate.getDay()
    const weekStart = new Date(todayDate)
    weekStart.setDate(todayDate.getDate() - dayOfWeek)
    const weekStartStr = weekStart.toISOString().slice(0, 10)

    // Buscar metas ativas
    const { data: goals } = await admin
      .from('goals')
      .select('id, title, description, category, type, target_value, current_value, unit, frequency, status, priority')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('priority', { ascending: false })

    if (!goals?.length) {
      return jsonResponse({ goals_enabled: true, goals: [], weekly_goal: null, good_days: 0 })
    }

    // Buscar logs da semana para cada meta
    const goalIds = goals.map(g => g.id)
    const { data: weekLogs } = await admin
      .from('goal_logs')
      .select('goal_id, date, value, status')
      .eq('user_id', userId)
      .in('goal_id', goalIds)
      .gte('date', weekStartStr)
      .lte('date', today)

    // Contar dias bons da semana
    const goodDays = new Set(
      (weekLogs ?? []).filter(l => l.status === 'good_day').map(l => l.date)
    ).size

    // Montar progresso por meta
    const goalsWithProgress = goals.map(goal => {
      const logs = (weekLogs ?? []).filter(l => l.goal_id === goal.id)

      let weekProgress = 0
      if (goal.frequency === 'daily') {
        weekProgress = logs.reduce((sum, l) => sum + Number(l.value ?? 0), 0)
      } else {
        weekProgress = logs.length
      }

      return {
        ...goal,
        week_progress: weekProgress,
      }
    })

    // Meta de consistência da semana
    const weeklyGoal = goalsWithProgress.find(g => g.type === 'consistency') ?? null

    // Progresso por categoria
    const categoryProgress: Record<string, { current: number; target: number; title: string }> = {}
    for (const g of goalsWithProgress) {
      if (g.category !== 'consistency') {
        categoryProgress[g.category] = {
          current: g.current_value ?? 0,
          target: g.target_value ?? 0,
          title: g.title,
        }
      }
    }

    return jsonResponse({
      goals_enabled: true,
      goals: goalsWithProgress,
      weekly_goal: weeklyGoal,
      good_days: goodDays,
      category_progress: categoryProgress,
      week_start: weekStartStr,
      today,
      threshold,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[goals-get-dashboard]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
