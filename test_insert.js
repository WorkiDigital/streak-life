import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.')
}

const supabase = createClient(supabaseUrl, serviceKey)

async function test() {
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1)
  if (!profiles || profiles.length === 0) {
    console.log('No profiles found')
    return
  }
  const userId = profiles[0].id

  const { data: habit, error: habitError } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      nome: 'Test',
      icone: '📋',
      categoria: 'outro',
    })
    .select()
    .single()

  if (habitError) {
    console.error('Habit Error:', habitError)
    return
  }
  console.log('Habit inserted:', habit)

  const { error: schedError } = await supabase
    .from('habit_schedules')
    .insert([{
      habit_id: habit.id,
      user_id: userId,
      horario: '08:00',
      dias_semana: [0, 1, 2, 3, 4, 5, 6],
      canais: ['push'],
    }])

  if (schedError) console.error('Schedule Error:', schedError)
  else console.log('Schedule inserted successfully')
}

test()
