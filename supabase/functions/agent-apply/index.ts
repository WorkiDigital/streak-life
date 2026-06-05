import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  CORS_HEADERS,
  applySetupBlock,
  getAdminClient,
  getAuthUser,
  jsonResponse,
} from '../_shared/agent.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const { user, error: userError } = await getAuthUser(authHeader)
    if (userError || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })

    const { perfil, lembretes } = await req.json().catch(() => ({}))

    if (!perfil || !Array.isArray(lembretes)) {
      return jsonResponse({ error: 'perfil e lembretes sao obrigatorios' }, { status: 400 })
    }

    const admin = getAdminClient()
    const result = await applySetupBlock(admin, user.id, { perfil, lembretes }, true)

    return jsonResponse({ ok: true, result })
  } catch (err: any) {
    console.error('[agent-apply] Erro:', err)
    return jsonResponse({ error: err?.message ?? 'Erro interno' }, { status: 500 })
  }
})
