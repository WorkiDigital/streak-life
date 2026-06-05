import { supabase } from '../lib/supabase'

export async function generateNutritionPlan(perfil, mode) {
  const { data, error } = await supabase.functions.invoke('nutrition-generate-plan', {
    body: { perfil, mode },
  })
  if (error) throw error
  return data
}

export async function applyNutritionPlan(plan, mode) {
  const { data, error } = await supabase.functions.invoke('nutrition-apply-plan', {
    body: { plan, mode },
  })
  if (error) throw error
  return data
}

export async function getTodayNutrition(date) {
  const { data, error } = await supabase.functions.invoke('nutrition-get-today', {
    body: { date },
  })
  if (error) throw error
  return data
}

export async function logMeal({ meal_id, status, observacao, adaptacao, date }) {
  const { data, error } = await supabase.functions.invoke('nutrition-log-meal', {
    body: { meal_id, status, observacao, adaptacao, date },
  })
  if (error) throw error
  return data
}

export async function pauseNutritionPlan() {
  const { error } = await supabase
    .from('nutrition_plans')
    .update({ status: 'paused' })
    .eq('status', 'active')
  if (error) throw error
}

export async function resumeNutritionPlan() {
  const { error } = await supabase
    .from('nutrition_plans')
    .update({ status: 'active' })
    .eq('status', 'paused')
  if (error) throw error
}
