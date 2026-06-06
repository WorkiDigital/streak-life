import { supabase } from '../lib/supabase'

async function invoke(fn, body = {}) {
  const { data, error } = await supabase.functions.invoke(fn, { body })
  if (error) throw error
  return data
}

export const applyGoals = (goals) => invoke('goals-apply', { goals })
export const getDashboard = () => invoke('goals-get-dashboard')
