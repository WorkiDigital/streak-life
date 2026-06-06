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

    const body = await req.json()
    const habitId = body.habit_id
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
      const frequency = goal.frequency as string ?? 'daily'

      // Buscar log existente do dia/semana
      const { data: existingLog } = await admin
        .from('goal_logs')
        .select('id, value')
        .eq('goal_id', goalId)
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle()

      const currentValue = Number(existingLog?.value ?? 0) + 1

      // Upsert goal_log
      await admin.from('goal_logs').upsert({
        goal_id: goalId,
        user_id: userId,
        date,
        value: currentValue,
        status: 'logged',
      }, { onConflict: 'goal_id,user_id,date' })

      // Atualizar current_value na meta
      const targetValue = Number(goal.target_value ?? 0)
      const newStatus = targetValue > 0 && currentValue >= targetValue ? 'completed' : undefined

      const updatePayload: Record<string, unknown> = {
        current_value: currentValue,
        updated_at: new Date().toISOString(),
      }
      if (newStatus) updatePayload.status = newStatus

      await admin.from('goals').update(updatePayload).eq('id', goalId)
    }

    // Calcular se hoje é "dia bom" (meta de consistência)
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
  // Contar hábitos esperados e feitos hoje
  const { data: todayLogs } = await admin
    .from('habit_logs')
    .select('status')
    .eq('user_id', userId)
    .eq('data', date)

  if (!todayLogs?.length) return

  const feitos = todayLogs.filter(l => l.status === 'feito').length
  const total = todayLogs.length
  const isGoodDay = total > 0 && feitos / total >= threshold

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
