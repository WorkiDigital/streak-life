import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { CORS_HEADERS, getAdminClient, getUserFromRequest, jsonResponse } from '../_shared/agent.ts'

function resolveTrackingMode(goal: Record<string, unknown>, habitIds: string[]) {
  if (goal.tracking_mode === 'habit_with_reminder') return 'habit_with_reminder'
  if (goal.tracking_mode === 'linked_habit' || habitIds.length > 0) return 'linked_habit'
  return 'manual'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { user, error: authError } = await getUserFromRequest(req)
    if (authError || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })

    const body = await req.json()
    const goals = body.goals as Array<Record<string, unknown>>

    if (!goals?.length) return jsonResponse({ error: 'Nenhuma meta recebida' }, { status: 400 })

    const admin = getAdminClient()
    const userId = user.id
    const createdGoalIds: string[] = []

    for (const g of goals) {
      const habitIds = g.habit_ids as string[] ?? []
      const trackingMode = resolveTrackingMode(g, habitIds)
      const remindersEnabled = trackingMode === 'habit_with_reminder' && g.reminders_enabled === true

      const { data: goal, error: goalErr } = await admin
        .from('goals')
        .insert({
          user_id: userId,
          title: g.title,
          description: g.description ?? null,
          category: g.category,
          type: g.type,
          target_value: g.target_value ?? null,
          current_value: 0,
          unit: g.unit ?? null,
          frequency: g.frequency ?? null,
          start_date: g.start_date ?? new Date().toISOString().slice(0, 10),
          end_date: g.end_date ?? null,
          status: 'active',
          priority: g.priority ?? 1,
          tracking_mode: trackingMode,
          reminders_enabled: remindersEnabled,
        })
        .select('id')
        .single()

      if (goalErr || !goal) {
        console.error('[goals-apply] goal insert error:', goalErr?.message)
        continue
      }
      createdGoalIds.push(goal.id)

      if (habitIds.length > 0) {
        await admin.from('goal_habits').insert(
          habitIds.map(habitId => ({
            goal_id: goal.id,
            habit_id: habitId,
            user_id: userId,
            impact_weight: 1,
          }))
        )
      }
    }

    await admin
      .from('profiles')
      .update({ goals_enabled: true })
      .eq('id', userId)

    return jsonResponse({ ok: true, goal_ids: createdGoalIds })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[goals-apply]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
