import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { CORS_HEADERS, getAdminClient, getUserFromRequest, jsonResponse, todayInTimezone } from '../_shared/agent.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { user, error: authError } = await getUserFromRequest(req)
    if (authError || !user) return jsonResponse({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const habitId = body.habit_id
    const undo = body.undo === true
    if (!habitId) return jsonResponse({ error: 'habit_id é obrigatório' }, { status: 400 })

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

    // Buscar metas conectadas ao hábito
    const { data: goalHabits } = await admin
      .from('goal_habits')
      .select('goal_id, goals(id, type, frequency, target_value, current_value, category)')
      .eq('habit_id', habitId)
      .eq('user_id', userId)

    if (!goalHabits?.length) return jsonResponse({ ok: true, skipped: true })

    for (const gh of goalHabits) {
      const goal = gh.goals as Record<string, unknown>
      if (!goal) continue

      const goalId = goal.id as string

      // Buscar log existente do dia
      const { data: existingLog } = await admin
        .from('goal_logs')
        .select('id, value')
        .eq('goal_id', goalId)
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle()

      if (undo) {
        // Decrementar — se chegar a 0, remover o log
        const newValue = Math.max(0, Number(existingLog?.value ?? 0) - 1)
        if (newValue === 0 && existingLog) {
          await admin.from('goal_logs').delete().eq('id', existingLog.id)
        } else if (existingLog) {
          await admin.from('goal_logs').update({ value: newValue, status: 'logged' }).eq('id', existingLog.id)
        }
        const targetValue = Number(goal.target_value ?? 0)
        await admin.from('goals').update({
          current_value: Math.max(0, Number(goal.current_value ?? 0) - 1),
          status: targetValue > 0 && newValue >= targetValue ? 'completed' : 'active',
          updated_at: new Date().toISOString(),
        }).eq('id', goalId)
      } else {
        // Incrementar
        const currentValue = Number(existingLog?.value ?? 0) + 1
        await admin.from('goal_logs').upsert({
          goal_id: goalId,
          user_id: userId,
          date,
          value: currentValue,
          status: 'logged',
        }, { onConflict: 'goal_id,user_id,date' })

        const targetValue = Number(goal.target_value ?? 0)
        const newStatus = targetValue > 0 && currentValue >= targetValue ? 'completed' : undefined
        const updatePayload: Record<string, unknown> = {
          current_value: currentValue,
          updated_at: new Date().toISOString(),
        }
        if (newStatus) updatePayload.status = newStatus
        await admin.from('goals').update(updatePayload).eq('id', goalId)
      }
    }

    // Recalcular dia bom (tanto ao marcar quanto ao desmarcar)
    await updateConsistencyGoal(admin, userId, date, threshold)

    return jsonResponse({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[goals-log]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})

async function updateConsistencyGoal(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  date: string,
  threshold: number
) {
  // Hábitos esperados = schedules ativos que disparam no dia da semana do date
  const dateObj = new Date(date + 'T12:00:00Z')
  const dayOfWeek = dateObj.getDay() // 0=dom … 6=sab

  const { data: expectedSchedules } = await admin
    .from('habit_schedules')
    .select('habit_id')
    .eq('user_id', userId)
    .eq('ativo', true)
    .contains('dias_semana', [dayOfWeek])

  const totalEsperado = expectedSchedules?.length ?? 0
  if (totalEsperado === 0) return

  // Hábitos feitos no dia (logs com status feito)
  const { data: todayLogs } = await admin
    .from('habit_logs')
    .select('status')
    .eq('user_id', userId)
    .eq('data', date)

  const feitos = (todayLogs ?? []).filter(l => l.status === 'feito').length
  const isGoodDay = feitos / totalEsperado >= threshold

  if (!isGoodDay) return

  // Buscar meta de consistência ativa
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

  // Upsert log de dia bom
  const { data: existingLog } = await admin
    .from('goal_logs')
    .select('id')
    .eq('goal_id', consistencyGoal.id)
    .eq('user_id', userId)
    .eq('date', date)
    .maybeSingle()

  if (existingLog) return // já registrado

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
