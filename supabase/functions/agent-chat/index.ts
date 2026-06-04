import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  CORS_HEADERS,
  SYSTEM_PROMPT,
  applyAgentBlocks,
  buildContextPrompt,
  callGemini,
  getAdminClient,
  getUserClient,
  jsonResponse,
  loadAgentContext,
  parseAgentBlocks,
  sanitizeAgentContent,
} from '../_shared/agent.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = getUserClient(authHeader)
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })

    const { message = '', source = 'app', mode = 'chat' } = await req.json().catch(() => ({}))
    const cleanUserMessage = String(message || '').trim()
    const admin = getAdminClient()

    if (cleanUserMessage) {
      const { error } = await admin.from('chat_messages').insert({
        user_id: user.id,
        role: 'user',
        content: cleanUserMessage,
        source,
      })
      if (error) throw error
    }

    const context = await loadAgentContext(admin, user.id)
    const history = context.messages.map((item: any) => ({
      role: item.role,
      content: item.content,
    }))

    const syntheticPrompt = mode === 'onboarding'
      ? 'Inicie ou continue o onboarding. Faca somente a proxima pergunta necessaria. Se ja houver dados suficientes, entregue o plano e emita SETUP.'
      : 'Continue a conversa de forma util. Se a mensagem do usuario indicar conclusao, ajuste ou adiamento, emita o bloco invisivel adequado.'

    const aiInput = [
      { role: 'user', content: buildContextPrompt(context) },
      ...history,
      ...(cleanUserMessage ? [] : [{ role: 'user', content: syntheticPrompt }]),
    ]

    const raw = await callGemini(SYSTEM_PROMPT, aiInput)
    const blocks = parseAgentBlocks(raw)
    const applied = await applyAgentBlocks(admin, user.id, blocks)
    const visible = sanitizeAgentContent(raw)

    const { data: assistantMessage, error: insertError } = await admin
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role: 'assistant',
        content: visible,
        source,
        metadata: { applied },
      })
      .select()
      .single()

    if (insertError) throw insertError

    return jsonResponse({
      message: visible,
      assistantMessage,
      applied,
    })
  } catch (error) {
    console.error('[agent-chat] Erro:', error)
    return jsonResponse({ error: error.message ?? 'Erro interno' }, { status: 500 })
  }
})
