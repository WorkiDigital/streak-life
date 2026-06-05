import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  CORS_HEADERS,
  SYSTEM_PROMPT,
  buildContextPrompt,
  callGemini,
  getAdminClient,
  jsonResponse,
  loadAgentContext,
  sanitizeAgentContent,
} from '../_shared/agent.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const {
      userId,
      userName,
      habitName,
      category,
      tomPreferido,
      recentAdherence,
      // Campos extras de perfil para personalização
      objetivo,
      agua_litros_diaria,
      tipo_treino,
      dias_treino,
      peso_kg,
      peso_meta_kg,
    } = await req.json()

    if (!habitName) {
      return jsonResponse({ error: 'habitName e obrigatorio' }, { status: 400 })
    }

    let contextPrompt = ''
    if (userId) {
      const admin = getAdminClient()
      const context = await loadAgentContext(admin, userId)
      contextPrompt = buildContextPrompt(context)
    }

    // Contexto extra baseado na categoria do hábito
    let extraContext = ''
    if (category === 'hidratacao' && agua_litros_diaria) {
      extraContext = `Meta de hidratacao do usuario: ${agua_litros_diaria}L por dia. Mencione a meta de forma encorajadora.`
    } else if (category === 'alimentacao') {
      if (objetivo === 'emagrecer' && peso_kg && peso_meta_kg) {
        extraContext = `Usuario quer emagrecer de ${peso_kg}kg para ${peso_meta_kg}kg. Incentive escolhas leves e nutritivas, sem culpa.`
      } else if (objetivo === 'ganhar_massa') {
        extraContext = `Usuario quer ganhar massa muscular. Incentive refeicao rica em proteina.`
      } else if (objetivo === 'performance') {
        extraContext = `Usuario foca em performance. Incentive nutricao para energia e foco.`
      }
    } else if (category === 'treino') {
      if (tipo_treino === 'forca') {
        extraContext = `Usuario treina forca/musculacao ${dias_treino ? `${dias_treino}x por semana` : ''}. Mensagem motivacional para o treino de hoje.`
      } else if (tipo_treino === 'corrida') {
        extraContext = `Usuario corre. Mensagem para animar a corrida de hoje.`
      } else if (dias_treino) {
        extraContext = `Usuario treina ${dias_treino}x por semana. Mensagem motivacional curta.`
      }
    } else if (category === 'medicamento') {
      extraContext = `Habito de suplementacao/medicamento. Seja direto e gentil, sem alarmismo.`
    }

    const userPrompt = `
Gere um lembrete curto, natural e anticulpa para o habito "${habitName}".
Usuario: ${userName || 'usuario'}
Categoria: ${category || 'outro'}
Tom preferido: ${tomPreferido || 'amigavel'}
Aderencia recente: ${recentAdherence ?? 'desconhecida'}
${extraContext ? `\nContexto adicional: ${extraContext}` : ''}

Regras:
- Maximo 2 frases curtas
- Use emoji relevante
- Seja especifico quando tiver a meta (ex: "Mais um copo para chegar nos 2.8L de hoje!")
- Nao emita SETUP nem ACTION
`.trim()

    const raw = await callGemini(SYSTEM_PROMPT, [
      ...(contextPrompt ? [{ role: 'user', content: contextPrompt }] : []),
      { role: 'user', content: userPrompt },
    ])

    return jsonResponse({ message: sanitizeAgentContent(raw) })
  } catch (error) {
    console.error('[generate-reminder] Erro:', error)
    return jsonResponse({ error: error.message ?? 'Erro interno' }, { status: 500 })
  }
})
