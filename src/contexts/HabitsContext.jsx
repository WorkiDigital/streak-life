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
        fetchLogs(subDays(new Date(), 30), new Date()),
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
  async function markDone(habitId, date = new Date(), { valor = null, nota = null } = {}) {
    if (!user) return

    const dateStr = format(date, 'yyyy-MM-dd')

    // Optimistic update
    const tempLog = {
      id: `temp-${habitId}-${dateStr}`,
      habit_id: habitId,
      user_id: user.id,
      data: dateStr,
      status: 'feito',
      valor,
      nota,
      marcado_em: new Date().toISOString(),
    }

    setLogs(prev => {
      const filtered = prev.filter(
        l => !(l.habit_id === habitId && l.data === dateStr)
      )
      return [...filtered, tempLog]
    })

    // Upsert in database
    const { data, error } = await supabase
      .from('habit_logs')
      .upsert(
        {
          habit_id: habitId,
          user_id: user.id,
          data: dateStr,
          status: 'feito',
          valor,
          nota,
          marcado_em: new Date().toISOString(),
        },
        { onConflict: 'habit_id,user_id,data' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error marking habit done:', error)
      setLogs(prev => prev.filter(l => l.id !== tempLog.id))
      throw error
    }

    return data
  }

  // Undo: mark back to pending
  async function undoMark(habitId, date = new Date()) {
    if (!user) return

    const dateStr = format(date, 'yyyy-MM-dd')

    const { error } = await supabase
      .from('habit_logs')
      .update({ status: 'pendente', marcado_em: null })
      .eq('habit_id', habitId)
      .eq('user_id', user.id)
      .eq('data', dateStr)

    if (error) {
      console.error('Error undoing mark:', error)
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
      grouped.get(s.habit_id).horarios.push(s.horario)
    }

    return Array.from(grouped.values())
      .map(item => {
        item.horarios.sort()
        const log = logs.find(l => l.habit_id === item.habit_id && l.data === todayStr)
        return {
          ...item,
          log,
          status: log?.status || 'pendente',
          // horario kept as earliest for backward compat (HabitCard display)
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
      const schedule = userSchedules.find(s => s.habit_id === habitId)
      const habit = schedule?.habits

      const cells = dateRange.map(date => {
        const dateStr = format(date, 'yyyy-MM-dd')
        const dayOfWeek = date.getDay()
        const isScheduled = schedule?.dias_semana?.includes(dayOfWeek)
        const log = logs.find(
          l => l.habit_id === habitId && l.data === dateStr
        )

        let cellStatus = 'future' // default: gray
        if (isScheduled) {
          if (log?.status === 'feito') {
            cellStatus = 'done'
          } else if (isBefore(startOfDay(date), startOfDay(today)) && !isToday(date)) {
            cellStatus = log?.status === 'nao_feito' ? 'missed' : 'missed'
          } else if (isToday(date)) {
            cellStatus = log?.status === 'feito' ? 'done' : 'pending'
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

  // Calculate stats
  function getStats(days = 30) {
    const todayStr = todayInTz(timezone)
    // Use noon to avoid DST boundary issues — date arithmetic only, never time
    const today = startOfDay(new Date(todayStr + 'T12:00:00'))
    const startDate = subDays(today, days - 1)
    const startStr = format(startDate, 'yyyy-MM-dd')

    const relevantLogs = logs.filter(
      l => l.data >= startStr && l.data <= todayStr
    )

    const doneLogs = relevantLogs.filter(l => l.status === 'feito')
    const totalScheduled = relevantLogs.filter(
      l => l.status === 'feito' || l.status === 'nao_feito'
    )

    const adherenceRate = totalScheduled.length > 0
      ? Math.round((doneLogs.length / totalScheduled.length) * 100)
      : 0

    // Streak: walk backwards from today; skip today if no logs yet
    // Use all logs (not just relevantLogs) so streak survives period changes
    let streak = 0
    let checkDate = today
    // Look up to 365 days back to find streak start
    for (let i = 0; i < 365; i++) {
      const dateStr = format(checkDate, 'yyyy-MM-dd')
      const dayLogs = logs.filter(l => l.data === dateStr)
      const scheduledThatDay = schedules.some(s =>
        s.dias_semana?.includes(startOfDay(new Date(dateStr + 'T12:00:00')).getDay())
      )

      // Skip today if user hasn't logged anything yet (streak still running)
      if (i === 0 && dayLogs.length === 0) {
        checkDate = subDays(checkDate, 1)
        continue
      }

      // Day is counted if all scheduled habits were done, or no habits were scheduled
      const allDone = !scheduledThatDay || (dayLogs.length > 0 && dayLogs.every(l => l.status === 'feito'))
      if (!allDone) break
      streak++
      checkDate = subDays(checkDate, 1)
    }

    return {
      adherenceRate,
      streak,
      totalDone: doneLogs.length,
      totalScheduled: totalScheduled.length,
    }
  }

  // Weekly adherence for the last N weeks (for the line chart)
  function getWeeklyStats(weeks = 8) {
    const today = new Date()
    const result = []
    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = subDays(today, w * 7 + 6)
      const weekEnd = subDays(today, w * 7)
      const startStr = format(weekStart, 'yyyy-MM-dd')
      const endStr = format(weekEnd, 'yyyy-MM-dd')
      const weekLogs = logs.filter(l => l.data >= startStr && l.data <= endStr)
      const done = weekLogs.filter(l => l.status === 'feito').length
      const total = weekLogs.filter(l => l.status === 'feito' || l.status === 'nao_feito').length
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

    const times = horarios?.length ? horarios : [horario || '08:00']
    const rows = times.map(h => ({
      habit_id: habit.id,
      user_id: user.id,
      horario: h,
      dias_semana: diasSemana || [0, 1, 2, 3, 4, 5, 6],
      canais: canais || ['push', 'whatsapp'],
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

    const { error } = await supabase
      .from('habits')
      .update({ ativo: false })
      .eq('id', habitId)
      .eq('user_id', user.id)

    if (error) throw error

    await Promise.all([fetchHabits(), fetchSchedules()])
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
      fetchLogs(subDays(new Date(), 30), new Date()),
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
