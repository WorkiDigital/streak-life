import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { CORS_HEADERS, getAdminClient, getUserFromRequest, jsonResponse } from '../_shared/agent.ts'

type TrackingMode = 'manual' | 'linked_habit' | 'habit_with_reminder'

const TRACKING_MODES = new Set(['manual', 'linked_habit', 'habit_with_reminder'])
const GOAL_CATEGORIES = new Set(['hydration', 'nutrition', 'training', 'sleep', 'routine', 'consistency', 'custom'])
const HABIT_CATEGORIES = new Set(['hidratacao', 'treino', 'alimentacao', 'tela', 'sono', 'outro'])
const DAY_MAP: Record<string, number> = {
  sun: 0,
  dom: 0,
  mon: 1,
  seg: 1,
  tue: 2,
  ter: 2,
  wed: 3,
  qua: 3,
  thu: 4,
  qui: 4,
  fri: 5,
  sex: 5,
  sat: 6,
  sab: 6,
}

const CATEGORY_TO_HABIT: Record<string, string> = {
  hydration: 'hidratacao',
  nutrition: 'alimentacao',
  training: 'treino',
  sleep: 'sono',
  routine: 'outro',
  consistency: 'outro',
  custom: 'outro',
}

function cleanText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function cleanNumber(value: unknown, fallback = 1) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function cleanDate(value: unknown) {
  if (typeof value !== 'string') return null
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function cleanTime(value: unknown) {
  if (typeof value !== 'string') return '08:00'
  const trimmed = value.trim()
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : '08:00'
}

function cleanDays(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return [0, 1, 2, 3, 4, 5, 6]
  const days = value
    .map(day => {
      if (typeof day === 'number') return day
      if (typeof day === 'string') {
        const lower = day.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        return DAY_MAP[lower.slice(0, 3)]
      }
      return null
    })
    .filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)

  return [...new Set(days)].sort((a, b) => a - b)
}

function cleanHabitCategory(value: unknown, goalCategory: string) {
  const raw = cleanText(value)
  if (HABIT_CATEGORIES.has(raw)) return raw
  return CATEGORY_TO_HABIT[goalCategory] ?? 'outro'
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const { user, error: authError } = await getUserFromRequest(req)
    if (authError || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const goalInput = body.goal as Record<string, unknown> | undefined
    if (!goalInput || typeof goalInput !== 'object') {
      return jsonResponse({ error: 'goal e obrigatorio' }, { status: 400 })
    }

    const title = cleanText(goalInput.title)
    if (!title) return jsonResponse({ error: 'Titulo da meta e obrigatorio' }, { status: 400 })

    const trackingMode = cleanText(goalInput.tracking_mode, 'manual') as TrackingMode
    if (!TRACKING_MODES.has(trackingMode)) {
      return jsonResponse({ error: 'Modo de acompanhamento invalido' }, { status: 400 })
    }

    const category = GOAL_CATEGORIES.has(cleanText(goalInput.category))
      ? cleanText(goalInput.category)
      : 'custom'

    const admin = getAdminClient()
    const userId = user.id

    let linkedHabitId = cleanText(body.linked_habit_id)
    let remindersEnabled = goalInput.reminders_enabled === true

    if (trackingMode === 'manual') {
      linkedHabitId = ''
      remindersEnabled = false
    }

    if (trackingMode === 'linked_habit') {
      if (!linkedHabitId) return jsonResponse({ error: 'Escolha um habito para conectar' }, { status: 400 })

      const { data: linkedHabit } = await admin
        .from('habits')
        .select('id')
        .eq('id', linkedHabitId)
        .eq('user_id', userId)
        .eq('ativo', true)
        .maybeSingle()

      if (!linkedHabit) return jsonResponse({ error: 'Habito conectado nao encontrado' }, { status: 404 })
      remindersEnabled = false
    }

    if (trackingMode === 'habit_with_reminder') {
      const newHabit = body.new_habit as Record<string, unknown> | undefined
      const habitName = cleanText(newHabit?.nome, title)
      const habitCategory = cleanHabitCategory(newHabit?.categoria ?? goalInput.category, category)
      const habitIcon = cleanText(newHabit?.icone, '*')

      const { data: profile } = await admin
        .from('profiles')
        .select('canais_preferidos')
        .eq('id', userId)
        .maybeSingle()

      const canais = Array.isArray(newHabit?.canais)
        ? newHabit?.canais
        : profile?.canais_preferidos ?? ['push', 'whatsapp']

      const { data: habit, error: habitErr } = await admin
        .from('habits')
        .insert({
          user_id: userId,
          nome: habitName,
          categoria: habitCategory,
          icone: habitIcon,
        })
        .select('id')
        .single()

      if (habitErr || !habit) {
        return jsonResponse({ error: `Erro ao criar habito: ${habitErr?.message ?? 'sem dados'}` }, { status: 500 })
      }

      const { error: scheduleErr } = await admin
        .from('habit_schedules')
        .insert({
          habit_id: habit.id,
          user_id: userId,
          horario: cleanTime(newHabit?.horario),
          dias_semana: cleanDays(newHabit?.dias_semana),
          canais,
        })

      if (scheduleErr) {
        await admin.from('habits').update({ ativo: false }).eq('id', habit.id).eq('user_id', userId)
        return jsonResponse({ error: `Erro ao criar lembrete: ${scheduleErr.message}` }, { status: 500 })
      }

      linkedHabitId = habit.id
      remindersEnabled = true
    }

    const { data: goal, error: goalErr } = await admin
      .from('goals')
      .insert({
        user_id: userId,
        title,
        description: cleanText(goalInput.description) || null,
        category,
        type: cleanText(goalInput.type, 'process'),
        target_value: cleanNumber(goalInput.target_value),
        current_value: cleanNumber(goalInput.current_value, 0),
        unit: cleanText(goalInput.unit, 'vezes'),
        frequency: cleanText(goalInput.frequency, 'weekly'),
        start_date: cleanDate(goalInput.start_date) ?? new Date().toISOString().slice(0, 10),
        end_date: cleanDate(goalInput.end_date),
        status: 'active',
        priority: cleanNumber(goalInput.priority, 1),
        tracking_mode: trackingMode,
        reminders_enabled: remindersEnabled,
      })
      .select('*')
      .single()

    if (goalErr || !goal) {
      return jsonResponse({ error: `Erro ao criar meta: ${goalErr?.message ?? 'sem dados'}` }, { status: 500 })
    }

    if (linkedHabitId) {
      const { error: relationErr } = await admin
        .from('goal_habits')
        .insert({
          goal_id: goal.id,
          habit_id: linkedHabitId,
          user_id: userId,
          impact_weight: 1,
        })

      if (relationErr) {
        return jsonResponse({ error: `Meta criada, mas falhou ao conectar habito: ${relationErr.message}` }, { status: 500 })
      }
    }

    await admin.from('profiles').update({ goals_enabled: true }).eq('id', userId)

    return jsonResponse({ ok: true, goal, linked_habit_id: linkedHabitId || null })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[goals-create]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
