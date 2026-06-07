import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { CORS_HEADERS, getAdminClient, getUserFromRequest, jsonResponse, todayInTimezone } from '../_shared/agent.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { user, error: authError } = await getUserFromRequest(req)
    if (authError || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })

    const body = await req.json()
    const habitId = body.habit_id as string | undefined
    const goalId = body.goal_id as string | undefined
    const undo = body.undo === true

    if (!habitId && !goalId) {
      return jsonResponse({ error: 'goal_id ou habit_id e obrigatorio' }, { status: 400 })
    }

    const admin = getAdminClient()
    const userId = user.id

    const { data: profile } = await admin
      .from('profiles')
      .select('timezone, goals_enabled, consistency_threshold')
      .eq('id', userId)
      .single()

    if (profile?.goals_enabled === false) return jsonResponse({ ok: true, skipped: true })

    const date = body.date ?? todayInTimezone(profile?.timezone)
    const threshold = profile?.consistency_threshold ?? 0.7

    if (goalId) {
      await updateManualGoal(admin, userId, goalId, date, Number(body.value ?? 1), undo)
      return jsonResponse({ ok: true })
    }

    const { data: goalHabits } = await admin
      .from('goal_habits')
      .select('goal_id, goals(id, type, frequency, target_value, current_value, category, tracking_mode)')
      .eq('habit_id', habitId)
      .eq('user_id', userId)

    if (!goalHabits?.length) return jsonResponse({ ok: true, skipped: true })

    for (const gh of goalHabits) {
      const goal = gh.goals as Record<string, unknown>
      if (!goal) continue
      await updateGoalProgress(admin, userId, goal, date, 1, undo, 'logged')
    }

    await updateConsistencyGoal(admin, userId, date, threshold)

    return jsonResponse({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[goals-log]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})

async function updateManualGoal(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  goalId: string,
  date: string,
  value: number,
  undo: boolean
) {
  const { data: goal } = await admin
    .from('goals')
    .select('id, target_value, current_value, tracking_mode')
    .eq('id', goalId)
    .eq('user_id', userId)
    .maybeSingle()

  if (!goal) throw new Error('Meta nao encontrada')
  await updateGoalProgress(admin, userId, goal, date, value, undo, 'manual')
}

async function updateGoalProgress(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  goal: Record<string, unknown>,
  date: string,
  value: number,
  undo: boolean,
  status: string
) {
  const goalId = goal.id as string
  const amount = Number.isFinite(value) && value > 0 ? value : 1

  const { data: existingLog } = await admin
    .from('goal_logs')
    .select('id, value')
    .eq('goal_id', goalId)
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  const currentLogValue = Number(existingLog?.value ?? 0)
  const nextLogValue = undo ? Math.max(0, currentLogValue - amount) : currentLogValue + amount
  const currentGoalValue = Number(goal.current_value ?? 0)
  const nextGoalValue = undo ? Math.max(0, currentGoalValue - amount) : currentGoalValue + amount
  const targetValue = Number(goal.target_value ?? 0)

  if (nextLogValue === 0) {
    if (existingLog) await admin.from('goal_logs').delete().eq('id', existingLog.id)
  } else {
    await admin.from('goal_logs').upsert({
      goal_id: goalId,
      user_id: userId,
      date,
      value: nextLogValue,
      status,
    }, { onConflict: 'goal_id,user_id,date' })
  }

  await admin.from('goals').update({
    current_value: nextGoalValue,
    status: targetValue > 0 && nextGoalValue >= targetValue ? 'completed' : 'active',
    updated_at: new Date().toISOString(),
  }).eq('id', goalId)
}

async function updateConsistencyGoal(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  date: string,
  threshold: number
) {
  const dateObj = new Date(date + 'T12:00:00Z')
  const dayOfWeek = dateObj.getDay()

  const { data: expectedSchedules } = await admin
    .from('habit_schedules')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('ativo', true)
    .contains('dias_semana', [dayOfWeek])

  const totalExpected = expectedSchedules?.length ?? 0
  if (totalExpected === 0) return

  const { data: todayLogs } = await admin
    .from('habit_logs')
    .select('status')
    .eq('user_id', userId)
    .eq('data', date)

  const done = (todayLogs ?? []).filter(l => l.status === 'feito').length
  const isGoodDay = done / totalExpected >= threshold

  const { data: consistencyGoal } = await admin
    .from('goals')
    .select('id, target_value, current_value')
    .eq('user_id', userId)
    .eq('type', 'consistency')
    .in('status', ['active', 'completed'])
    .order('priority', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!consistencyGoal) return

  const { data: existingLog } = await admin
    .from('goal_logs')
    .select('id')
    .eq('goal_id', consistencyGoal.id)
    .eq('user_id', userId)
    .eq('date', date)
    .eq('status', 'good_day')
    .maybeSingle()

  if (isGoodDay && !existingLog) {
    await admin.from('goal_logs').insert({
      goal_id: consistencyGoal.id,
      user_id: userId,
      date,
      value: 1,
      status: 'good_day',
    })

    const newValue = Number(consistencyGoal.current_value ?? 0) + 1
    const targetValue = Number(consistencyGoal.target_value ?? 0)
    await admin.from('goals').update({
      current_value: newValue,
      status: targetValue > 0 && newValue >= targetValue ? 'completed' : 'active',
      updated_at: new Date().toISOString(),
    }).eq('id', consistencyGoal.id)
  }

  if (!isGoodDay && existingLog) {
    await admin.from('goal_logs').delete().eq('id', existingLog.id)
    await admin.from('goals').update({
      current_value: Math.max(0, Number(consistencyGoal.current_value ?? 0) - 1),
      status: 'active',
      updated_at: new Date().toISOString(),
    }).eq('id', consistencyGoal.id)
  }
}
