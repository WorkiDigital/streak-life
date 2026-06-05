import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  CORS_HEADERS,
  getAdminClient,
  getAuthUser,
  jsonResponse,
  todayInTimezone,
} from '../_shared/agent.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const { user, error: userError } = await getAuthUser(authHeader)
    if (userError || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const habitId = body.habitId ?? body.habit_id
    if (!habitId) return jsonResponse({ error: 'habitId e obrigatorio' }, { status: 400 })

    const admin = getAdminClient()

    const [{ data: profile }, { data: habit, error: habitError }] = await Promise.all([
      admin.from('profiles').select('timezone').eq('id', user.id).single(),
      admin
        .from('habits')
        .select('id, user_id, ativo')
        .eq('id', habitId)
        .eq('user_id', user.id)
        .eq('ativo', true)
        .single(),
    ])

    if (habitError || !habit) {
      return jsonResponse({ error: 'Habito nao encontrado' }, { status: 404 })
    }

    const date = body.data ?? body.date ?? todayInTimezone(profile?.timezone)
    const totalHorarios = Math.max(1, Number(body.totalHorarios ?? body.total_horarios ?? 1) || 1)
    const isMulti = totalHorarios > 1

    const { data: existingLog } = await admin
      .from('habit_logs')
      .select('id, valor, nota')
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('data', date)
      .maybeSingle()

    const currentCount = isMulti ? (Number.parseInt(existingLog?.valor ?? '0', 10) || 0) : 0
    const nextCount = Math.min(totalHorarios, currentCount + 1)
    const allDone = !isMulti || nextCount >= totalHorarios

    const payload = {
      habit_id: habitId,
      user_id: user.id,
      data: date,
      status: allDone ? 'feito' : 'pendente',
      valor: isMulti ? String(nextCount) : (body.valor ? String(body.valor) : null),
      nota: body.nota ? String(body.nota) : existingLog?.nota ?? null,
      marcado_em: new Date().toISOString(),
    }

    const { data, error } = await admin
      .from('habit_logs')
      .upsert(payload, { onConflict: 'habit_id,user_id,data' })
      .select()
      .single()

    if (error) throw error

    return jsonResponse({ ok: true, data })
  } catch (err: any) {
    console.error('[habit-mark-done] Erro:', err)
    return jsonResponse({ error: err?.message ?? 'Erro interno' }, { status: 500 })
  }
})
