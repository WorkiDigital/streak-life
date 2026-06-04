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

    const userPrompt = `
Gere um lembrete curto, natural e anticulpa para o habito "${habitName}".
Usuario: ${userName || 'usuario'}
Categoria: ${category || 'outro'}
Tom preferido: ${tomPreferido || 'amigavel'}
Aderencia recente: ${recentAdherence ?? 'desconhecida'}

Responda apenas com o texto visivel do lembrete. Nao emita SETUP nem ACTION aqui.
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
