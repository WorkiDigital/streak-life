import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0'
import { CORS_HEADERS, getAdminClient, jsonResponse } from '../_shared/agent.ts'

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
    const planData = body.plan as Record<string, unknown>
    const mode = (body.mode as string) ?? 'simples'

    if (!planData || !planData.refeicoes) {
      return jsonResponse({ error: 'Plano inválido' }, { status: 400 })
    }

    const admin = getAdminClient()
    const userId = user.id

    // 1. Arquivar plano ativo anterior + desativar hábitos de alimentação antigos
    await admin
      .from('nutrition_plans')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .eq('status', 'active')

    // Desativar hábitos alimentação sem nutrition_meal_id (criados antes do plano)
    await admin
      .from('habits')
      .update({ ativo: false })
      .eq('user_id', userId)
      .eq('categoria', 'alimentacao')
      .is('nutrition_meal_id', null)

    // 2. Criar nutrition_plan
    const { data: plan, error: planErr } = await admin
      .from('nutrition_plans')
      .insert({
        user_id: userId,
        status: 'active',
        mode,
        objetivo: planData.objetivo ?? null,
        observacoes_gerais: planData.observacoes_gerais ?? null,
        safety_status: 'ok',
      })
      .select('id')
      .single()

    if (planErr || !plan) {
      return jsonResponse({ error: 'Erro ao criar plano: ' + planErr?.message }, { status: 500 })
    }
    const planId = plan.id

    // 3. Criar nutrition_targets
    const metas = planData.metas as Record<string, number> ?? {}
    await admin.from('nutrition_targets').insert({
      plan_id: planId,
      user_id: userId,
      calorias_estimadas: metas.calorias_estimadas ?? null,
      proteina_g: metas.proteina_g ?? null,
      carboidrato_g: metas.carboidrato_g ?? null,
      gordura_g: metas.gordura_g ?? null,
      agua_litros: metas.agua_litros ?? null,
    })

    // 4. Criar refeições + itens + substituições + hábitos
    const refeicoes = planData.refeicoes as Array<Record<string, unknown>>
    const habitIds: string[] = []

    for (const ref of refeicoes) {
      // 4a. Criar nutrition_meal
      const { data: meal, error: mealErr } = await admin
        .from('nutrition_meals')
        .insert({
          plan_id: planId,
          user_id: userId,
          nome: ref.nome,
          horario: ref.horario ?? null,
          ordem: ref.ordem ?? 0,
          descricao_simples: ref.descricao_simples ?? null,
          objetivo_refeicao: ref.objetivo_refeicao ?? null,
          proteina_g: ref.proteina_g ?? null,
          carboidrato_g: ref.carboidrato_g ?? null,
          gordura_g: ref.gordura_g ?? null,
          calorias_estimadas: ref.calorias_estimadas ?? null,
        })
        .select('id')
        .single()

      if (mealErr || !meal) {
        console.error('[nutrition-apply-plan] meal insert error:', mealErr?.message, 'refeicao:', ref.nome)
        continue
      }
      const mealId = meal.id

      // 4b. Criar itens da refeição
      const itens = ref.itens as Array<Record<string, unknown>> ?? []
      if (itens.length > 0) {
        await admin.from('nutrition_meal_items').insert(
          itens.map((item, idx) => ({
            meal_id: mealId,
            user_id: userId,
            alimento: item.alimento,
            quantidade_min: item.quantidade_min ?? null,
            quantidade_max: item.quantidade_max ?? null,
            unidade: item.unidade ?? 'g',
            grupo: item.grupo ?? null,
            observacao: item.observacao ?? null,
            ordem: idx,
          }))
        )
      }

      // 4c. Criar substituições
      const subs = ref.substituicoes as Array<Record<string, unknown>> ?? []
      if (subs.length > 0) {
        await admin.from('nutrition_substitutions').insert(
          subs.map(s => ({
            meal_id: mealId,
            user_id: userId,
            alimento_original: s.alimento_original ?? null,
            substituto: s.substituto,
          }))
        )
      }

      // 4d. Criar hábito de alimentação vinculado à refeição
      const nomeHabito = String(ref.nome)
      const icone = '🍽️'

      const { data: habit, error: habitErr } = await admin
        .from('habits')
        .insert({
          user_id: userId,
          nome: nomeHabito,
          categoria: 'alimentacao',
          icone,
          ativo: true,
          nutrition_meal_id: mealId,
        })
        .select('id')
        .single()

      if (habitErr || !habit) {
        console.error('[nutrition-apply-plan] habit insert error:', habitErr?.message, 'meal:', nomeHabito)
        continue
      }
      habitIds.push(habit.id)

      // 4e. Criar habit_schedule no horário da refeição
      const diasSemana = [0, 1, 2, 3, 4, 5, 6]
      await admin.from('habit_schedules').insert({
        habit_id: habit.id,
        user_id: userId,
        horario: ref.horario ?? '12:00',
        dias_semana: diasSemana,
        ativo: true,
        canais: ['push', 'whatsapp'],
      })
    }

    // 5. Atualizar profile
    await admin
      .from('profiles')
      .update({
        nutrition_enabled: true,
        nutrition_mode: mode,
        nutrition_safety_status: 'ok',
      })
      .eq('id', userId)

    return jsonResponse({ ok: true, plan_id: planId, habit_ids: habitIds })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[nutrition-apply-plan]', message)
    return jsonResponse({ error: message }, { status: 500 })
  }
})
