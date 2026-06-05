import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import {
  format,
  eachDayOfInterval,
  isToday,
  isBefore,
  startOfDay,
  subDays,
} from 'date-fns'

const HabitsContext = createContext(null)

// Return today's date string (yyyy-MM-dd) in the user's timezone
function todayInTz(timezone) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'America/Fortaleza',
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const get = t => parts.find(p => p.type === t)?.value
    return `${get('year')}-${get('month')}-${get('day')}`
  } catch {
    return format(new Date(), 'yyyy-MM-dd')
  }
}

function localDate(dateStr) {
  return startOfDay(new Date(`${dateStr}T12:00:00`))
}

function habitCreatedDay(schedule, fallbackDate) {
  const raw = schedule?.habits?.created_at ?? schedule?.created_at
  return raw ? startOfDay(new Date(raw)) : startOfDay(fallbackDate)
}

function buildExpectedHabitEntries(schedules, startDate, endDate) {
  const dateRange = eachDayOfInterval({ start: startDate, end: endDate })
  const expectedByHabitAndDate = new Map()

  for (const schedule of schedules) {
    const createdAt = habitCreatedDay(schedule, startDate)

    for (const date of dateRange) {
      const day = date.getDay()
      if (!schedule.dias_semana?.includes(day)) continue
      if (isBefore(startOfDay(date), createdAt)) continue

      const dateStr = format(date, 'yyyy-MM-dd')
      const key = `${schedule.habit_id}:${dateStr}`
      if (!expectedByHabitAndDate.has(key)) {
        expectedByHabitAndDate.set(key, {
          habitId: schedule.habit_id,
          date: dateStr,
        })
      }
    }
  }

  return Array.from(expectedByHabitAndDate.values())
}

function countDoneExpected(expectedEntries, logs) {
  const doneLogKeys = new Set(
    logs
      .filter(log => log.status === 'feito')
      .map(log => `${log.habit_id}:${log.data}`)
  )
  return expectedEntries.filter(item => doneLogKeys.has(`${item.habitId}:${item.date}`)).length
}

export function HabitsProvider({ children }) {
  const { user, profile } = useAuth()
  const timezone = profile?.timezone || 'America/Fortaleza'
  const [habits, setHabits] = useState([])
  const [schedules, setSchedules] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch user habits
  const fetchHabits = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.is.null`)
      .eq('ativo', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching habits:', error)
      return
    }
    setHabits(data || [])
  }, [user])

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('habit_schedules')
      .select('*, habits(*)')
      .eq('user_id', user.id)
      .eq('ativo', true)

    if (error) {
      console.error('Error fetching schedules:', error)
      return
    }
    setSchedules(data || [])
  }, [user])

  // Fetch logs for a date range
  const fetchLogs = useCallback(async (startDate, endDate) => {
    if (!user) return

    const { data, error } = await supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('data', format(startDate, 'yyyy-MM-dd'))
      .lte('data', format(endDate, 'yyyy-MM-dd'))

    if (error) {
      console.error('Error fetching logs:', error)
      return
    }
    setLogs(data || [])
  }, [user])

  // Initial fetch
  useEffect(() => {
    if (!user) {
      setHabits([])
      setSchedules([])
      setLogs([])
      setLoading(false)
      return
    }

    async function loadAll() {
      setLoading(true)
      await Promise.all([
        fetchHabits(),
        fetchSchedules(),
        fetchLogs(subDays(new Date(), 365), new Date()),
      ])
      setLoading(false)
    }

    loadAll()
  }, [user, fetchHabits, fetchSchedules, fetchLogs])

  // Realtime subscription for habit_logs
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel('habit-logs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'habit_logs',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setLogs(prev => [...prev.filter(l => l.id !== payload.new.id), payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setLogs(prev => prev.map(l => l.id === payload.new.id ? payload.new : l))
          } else if (payload.eventType === 'DELETE') {
            setLogs(prev => prev.filter(l => l.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  // Mark a habit as done for a specific date, optionally with valor/nota
  // For multi-schedule habits (totalHorarios > 1): increments a counter instead of marking all done
  async function markDone(habitId, date = new Date(), { valor = null, nota = null, totalHorarios = 1 } = {}) {
    if (!user) return

    const dateStr = format(date, 'yyyy-MM-dd')
    const isMulti = totalHorarios > 1

    // For multi-schedule: compute next count
    const existingLog = logs.find(l => l.habit_id === habitId && l.data === dateStr)
    const currentCount = isMulti ? (parseInt(existingLog?.valor) || 0) : 0
    const nextCount = currentCount + 1
    const allDone = !isMulti || nextCount >= totalHorarios

    const newValor = isMulti ? String(nextCount) : valor
    const newStatus = allDone ? 'feito' : 'pendente'

    // Optimistic update
    const tempLog = {
      id: existingLog?.id ?? `temp-${habitId}-${dateStr}`,
      habit_id: habitId,
      user_id: user.id,
      data: dateStr,
      status: newStatus,
      valor: newValor,
      nota: nota ?? existingLog?.nota ?? null,
      marcado_em: new Date().toISOString(),
    }

    setLogs(prev => {
      const filtered = prev.filter(l => !(l.habit_id === habitId && l.data === dateStr))
      return [...filtered, tempLog]
    })

    const { data, error } = await supabase
      .from('habit_logs')
      .upsert(
        {
          habit_id: habitId,
          user_id: user.id,
          data: dateStr,
          status: newStatus,
          valor: newValor,
          nota: nota ?? existingLog?.nota ?? null,
          marcado_em: new Date().toISOString(),
        },
        { onConflict: 'habit_id,user_id,data' }
      )
      .select()
      .single()

    if (error) {
      setLogs(prev => prev.filter(l => l.id !== tempLog.id))
      throw error
    }

    return data
  }

  // Undo: mark back to pending
  async function undoMark(habitId, date = new Date()) {
    if (!user) return

    const dateStr = format(date, 'yyyy-MM-dd')

    // Optimistic update
    setLogs(prev => prev.map(l =>
      (l.habit_id === habitId && l.data === dateStr)
        ? { ...l, status: 'pendente', marcado_em: null }
        : l
    ))

    const { error } = await supabase
      .from('habit_logs')
      .update({ status: 'pendente', marcado_em: null })
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('data', dateStr)

    if (error) {
      console.error('Error undoing mark:', error)
      fetchLogs() // Revert local state on error
      throw error
    }
  }

  // Get today's habits grouped by habit_id (1 card per habit, even with multiple schedules)
  function getTodayHabits() {
    const todayStr = todayInTz(timezone)
    const dayOfWeek = new Date(todayStr + 'T12:00:00').getDay()

    // Only schedules that fire today
    const todaySchedules = schedules.filter(s => s.dias_semana?.includes(dayOfWeek))

    // Group by habit_id — collect all horarios, use earliest as sort key
    const grouped = new Map()
    for (const s of todaySchedules) {
      if (!grouped.has(s.habit_id)) {
        grouped.set(s.habit_id, { ...s, habit: s.habits, horarios: [] })
      }
      grouped.get(s.habit_id).horarios.push(s.horario?.slice(0, 5) ?? s.horario)
    }

    return Array.from(grouped.values())
      .map(item => {
        item.horarios.sort()
        const log = logs.find(l => l.habit_id === item.habit_id && l.data === todayStr)
        const isMulti = item.horarios.length > 1
        const countVal = parseInt(log?.valor)
        const validCount = isMulti && countVal > 0 && countVal <= item.horarios.length
        const status = log?.status === 'feito'
          ? 'feito'
          : validCount
            ? 'pendente'
            : log?.status || 'pendente'

        return {
          ...item,
          log,
          status,
          horario: item.horarios[0],
        }
      })
      .sort((a, b) => (a.horario || '').localeCompare(b.horario || ''))
  }

  // Get heatmap data: matrix of habits × days
  function getHeatmapData(days = 30) {
    const today = new Date()
    const startDate = subDays(today, days - 1)
    const dateRange = eachDayOfInterval({ start: startDate, end: today })

    // Get unique habits that have schedules
    const userSchedules = schedules.filter(s => s.user_id === user?.id)
    const habitIds = [...new Set(userSchedules.map(s => s.habit_id))]

    const matrix = habitIds.map(habitId => {
      const habitSchedules = userSchedules.filter(s => s.habit_id === habitId)
      const schedule = habitSchedules[0]
      const habit = schedule?.habits
      // Data de criação do hábito — dias anteriores não devem contar como "não registrado"
      // Usa a data mais recente entre created_at do habit e do primeiro schedule
      // para garantir que dias anteriores ao cadastro fiquem cinza
      const habitCreatedRaw = habit?.created_at ?? schedule?.created_at
      const habitCreatedAt = habitCreatedRaw
        ? startOfDay(new Date(habitCreatedRaw))
        : startOfDay(today) // fallback: só hoje é válido

      const cells = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayOfWeek = date.getDay()
        // Verifica em qualquer um dos schedules do hábito (suporte a múltiplos horários)
        const isScheduled = habitSchedules.some(s => s.dias_semana?.includes(dayOfWeek))
        const log = logs.find(
          l => l.habit_id === habitId && l.data === dateStr
        )

        let cellStatus = 'future' // default: gray
        // Dias antes da criação do hábito sempre cinza
        if (isBefore(startOfDay(date), habitCreatedAt)) {
          cellStatus = 'future'
        } else if (isScheduled) {
          if (log?.status === 'feito') {
            cellStatus = 'done'
          } else if (isBefore(startOfDay(date), startOfDay(today)) && !isToday(date)) {
            cellStatus = 'missed'
          } else if (isToday(date)) {
            cellStatus = 'pending'
          }
        }

        return {
          date: dateStr,
          status: cellStatus,
          value: log?.valor,
          nota: log?.nota,
        }
      })

      return {
        habitId,
        habitName: habit?.nome || '',
        habitIcon: habit?.icone || '📋',
        cells,
      }
    })

    return { matrix, dates: dateRange }
  }

  // Calculate stats from expected habits, not only existing logs.
  function getStats(days = 30) {
    const todayStr = todayInTz(timezone)
    const today = localDate(todayStr)
    const startDate = subDays(today, days - 1)
    const expectedEntries = buildExpectedHabitEntries(schedules, startDate, today)

    const totalDone = countDoneExpected(expectedEntries, logs)
    const totalExpected = expectedEntries.length
    const adherenceRate = totalExpected > 0
      ? Math.round((totalDone / totalExpected) * 100)
      : 0

    // Flexible streak: a day counts when at least 70% of expected habits are done.
    let streak = 0
    let checkDate = today
    for (let i = 0; i < 365; i++) {
      const dateStr = format(checkDate, 'yyyy-MM-dd')
      const expectedForDay = buildExpectedHabitEntries(schedules, checkDate, checkDate)

      if (expectedForDay.length === 0) {
        checkDate = subDays(checkDate, 1)
        continue
      }

      const doneForDay = countDoneExpected(expectedForDay, logs)

      // Skip today if the user has not interacted with any habit yet.
      if (i === 0 && doneForDay === 0 && !logs.some(log => log.data === dateStr)) {
        checkDate = subDays(checkDate, 1)
        continue
      }

      const dayRate = doneForDay / expectedForDay.length
      if (dayRate < 0.7) break
      streak++
      checkDate = subDays(checkDate, 1)
    }

    return {
      adherenceRate,
      streak,
      totalDone,
      totalScheduled: totalExpected,
      totalExpected,
    }
  }

  // Weekly adherence for the last N weeks (expected habits based)
  function getWeeklyStats(weeks = 8) {
    const todayStr = todayInTz(timezone)
    const today = localDate(todayStr)
    const result = []
    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = subDays(today, w * 7 + 6)
      const weekEnd = subDays(today, w * 7)
      const expectedEntries = buildExpectedHabitEntries(schedules, weekStart, weekEnd)
      const done = countDoneExpected(expectedEntries, logs)
      const total = expectedEntries.length
      result.push({
        label: format(weekEnd, 'dd/MM'),
        pct: total > 0 ? Math.round((done / total) * 100) : null,
      })
    }
    return result
  }

  // Create a new habit with one or more schedules
  // horarios: string[] — if omitted, falls back to horario (single string) for backwards compat
  async function createHabit({ nome, icone, categoria, horario, horarios, diasSemana, canais }) {
    if (!user) return

    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .insert({
        user_id: user.id,
        nome,
        icone: icone || '📋',
        categoria: categoria || 'outro',
      })
      .select()
      .single()

    if (habitError) throw habitError

    const defaultCanais = profile?.canais_preferidos ?? ['push', 'whatsapp']
    const times = horarios?.length ? horarios : [horario || '08:00']
    const rows = times.map(h => ({
      habit_id: habit.id,
      user_id: user.id,
      horario: h,
      dias_semana: diasSemana || [0, 1, 2, 3, 4, 5, 6],
      canais: canais || defaultCanais,
    }))

    const { error: schedError } = await supabase
      .from('habit_schedules')
      .insert(rows)

    if (schedError) throw schedError

    await Promise.all([fetchHabits(), fetchSchedules()])
    return habit
  }

  // Update habit: replaces all schedules atomically using soft-delete pattern
  // horarios: string[] for multi-schedule; single horario string for backwards compat
  async function updateHabit(habitId, _scheduleId, { nome, icone, categoria, horario, horarios, diasSemana, canais }) {
    if (!user) return

    const { error: habitError } = await supabase
      .from('habits')
      .update({ nome, icone, categoria })
      .eq('id', habitId)
      .eq('user_id', user.id)

    if (habitError) throw habitError

    const times = horarios?.length ? horarios : [horario || '08:00']

    // Soft-delete all active schedules for this habit, then insert fresh rows.
    // Not truly atomic (Supabase JS has no transactions). Rollback path: if insert
    // fails, we restore ativo:true on the old rows. Edge case: HabitForm reads
    // schedules from context to detect existing mode — if the user opens the form
    // while a previous updateHabit fetch is still in-flight, detectExistingMode
    // may see stale rows. Low probability; fetchSchedules() at the end corrects it.
    const { error: delError } = await supabase
      .from('habit_schedules')
      .update({ ativo: false })
      .eq('habit_id', habitId)
      .eq('user_id', user.id)

    if (delError) throw delError

    const rows = times.map(h => ({
      habit_id: habitId,
      user_id: user.id,
      horario: h,
      dias_semana: diasSemana || [0, 1, 2, 3, 4, 5, 6],
      canais: canais || ['push', 'whatsapp'],
    }))

    const { error: schedError } = await supabase
      .from('habit_schedules')
      .insert(rows)

    if (schedError) {
      // Restore previous schedules on insert failure
      await supabase
        .from('habit_schedules')
        .update({ ativo: true })
        .eq('habit_id', habitId)
        .eq('user_id', user.id)
      throw schedError
    }

    await Promise.all([fetchHabits(), fetchSchedules()])
  }

  // Delete a habit
  async function deleteHabit(habitId) {
    if (!user) return

    // Optimistic: remove schedules from state immediately
    const previousSchedules = schedules
    setSchedules(prev => prev.filter(s => s.habit_id !== habitId))

    const { error: habitError } = await supabase
      .from('habits')
      .update({ ativo: false })
      .eq('id', habitId)
      .eq('user_id', user.id)

    if (habitError) {
      setSchedules(previousSchedules)
      throw habitError
    }

    const { error: schedError } = await supabase
      .from('habit_schedules')
      .update({ ativo: false })
      .eq('habit_id', habitId)
      .eq('user_id', user.id)

    if (schedError) {
      setSchedules(previousSchedules)
      throw schedError
    }
  }

  // Add habits from templates during onboarding
  async function addFromTemplates(templateIds, schedulesConfig) {
    if (!user) return

    for (const templateId of templateIds) {
      const template = habits.find(h => h.id === templateId && !h.user_id)
      if (!template) continue

      const config = schedulesConfig[templateId] || {}

      await createHabit({
        nome: template.nome,
        icone: template.icone,
        categoria: template.categoria,
        horarios: config.horarios?.length ? config.horarios : [config.horario || '08:00'],
        diasSemana: config.diasSemana || [0, 1, 2, 3, 4, 5, 6],
        canais: config.canais || ['push', 'whatsapp'],
      })
    }
  }

  const value = {
    habits,
    schedules,
    logs,
    loading,
    getTodayHabits,
    getHeatmapData,
    getStats,
    getWeeklyStats,
    markDone,
    undoMark,
    createHabit,
    updateHabit,
    deleteHabit,
    addFromTemplates,
    refreshData: () => Promise.all([
      fetchHabits(),
      fetchSchedules(),
      fetchLogs(subDays(new Date(), 365), new Date()),
    ]),
  }

  return (
    <HabitsContext.Provider value={value}>
      {children}
    </HabitsContext.Provider>
  )
}

export function useHabits() {
  const context = useContext(HabitsContext)
  if (!context) {
    throw new Error('useHabits must be used within a HabitsProvider')
  }
  return context
}
