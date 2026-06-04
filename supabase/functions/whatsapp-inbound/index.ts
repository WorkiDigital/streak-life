import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  CORS_HEADERS,
  SYSTEM_PROMPT,
  applyAgentBlocks,
  buildContextPrompt,
  callGemini,
  getAdminClient,
  jsonResponse,
  loadAgentContext,
  normalizePhone,
  parseAgentBlocks,
  sanitizeAgentContent,
} from '../_shared/agent.ts'

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? ''

function readEvolutionMessage(payload: any) {
  const data = payload?.data ?? payload
  const remoteJid = data?.key?.remoteJid ?? data?.remoteJid ?? data?.from ?? data?.sender
  const number = String(remoteJid || '').replace(/@s\.whatsapp\.net$/, '')
  const text =
    data?.message?.conversation ??
    data?.message?.extendedTextMessage?.text ??
    data?.text ??
    data?.body ??
    payload?.message ??
    ''

  return { number, text: String(text || '').trim() }
}

async function sendWhatsApp(number: string, text: string) {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE) {
    console.warn('[whatsapp-inbound] Evolution API nao configurada')
    return
  }

  await fetch(`${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: normalizePhone(number).digits,
      text,
    }),
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const payload = await req.json()
    const { number, text } = readEvolutionMessage(payload)
    if (!number || !text) return jsonResponse({ ignored: true, reason: 'empty_message' })

    const admin = getAdminClient()
    const phone = normalizePhone(number)
    const { data: profiles, error: profileError } = await admin
      .from('profiles')
      .select('*')
      .in('whatsapp', [phone.plus, phone.digits])
      .limit(1)

    if (profileError) throw profileError
    const profile = profiles?.[0]
    if (!profile) return jsonResponse({ ignored: true, reason: 'profile_not_found' }, { status: 404 })

    await admin.from('chat_messages').insert({
      user_id: profile.id,
      role: 'user',
      content: text,
      source: 'whatsapp',
      metadata: { inbound: payload },
    })

    const context = await loadAgentContext(admin, profile.id)
    const aiInput = [
      { role: 'user', content: buildContextPrompt(context) },
      ...context.messages.map((item: any) => ({ role: item.role, content: item.content })),
    ]

    const raw = await callGemini(SYSTEM_PROMPT, aiInput)
    const blocks = parseAgentBlocks(raw)
    const applied = await applyAgentBlocks(admin, profile.id, blocks)
    const visible = sanitizeAgentContent(raw)

    await admin.from('chat_messages').insert({
      user_id: profile.id,
      role: 'assistant',
      content: visible,
      source: 'whatsapp',
      metadata: { applied },
    })

    await sendWhatsApp(number, visible)
    return jsonResponse({ success: true, message: visible, applied })
  } catch (error) {
    console.error('[whatsapp-inbound] Erro:', error)
    return jsonResponse({ error: error.message ?? 'Erro interno' }, { status: 500 })
  }
})
