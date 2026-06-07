import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { CORS_HEADERS, getAdminClient, getUserFromRequest, jsonResponse, todayInTimezone } from '../_shared/agent.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { user, error: authError } = await getUserFromRequest(req)
    if (authError || !user) return jsonResponse({ error: 'Não autenticado' }, { status: 401 })

    const admin = getAdminClient()
    const userId = user.id

    const { data: profile } = await admin
      .from('profiles')
      .select('timezone, goals_enabled, consistency_threshold')
      .eq('id', userId)
      .single()

    if (profile?.goals_enabled === false) {
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
      .select('id, title, description, category, type, target_value, current_value, unit, frequency, status, priority, tracking_mode, reminders_enabled')
      .eq('user_id', userId)
      .in('status', ['active', 'completed'])
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

    const { data: goalHabits } = await admin
      .from('goal_habits')
      .select('goal_id, habit_id, habits(id, nome, categoria)')
      .eq('user_id', userId)
      .in('goal_id', goalIds)

    const habitsByGoal = new Map<string, unknown[]>()
    for (const relation of goalHabits ?? []) {
      const list = habitsByGoal.get(relation.goal_id) ?? []
      list.push(relation.habits)
      habitsByGoal.set(relation.goal_id, list)
    }

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
        linked_habits: habitsByGoal.get(goal.id) ?? [],
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
