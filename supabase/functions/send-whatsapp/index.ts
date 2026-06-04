// supabase/functions/send-whatsapp/index.ts
// Envia mensagem WhatsApp via Evolution API

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL') ?? ''
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY') ?? ''
const EVOLUTION_INSTANCE = Deno.env.get('EVOLUTION_INSTANCE') ?? ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { number, text } = await req.json()

    if (!number || !text) {
      return new Response(
        JSON.stringify({ error: 'number e text são obrigatórios' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Normaliza o número (remove +, espaços, traços)
    const normalizedNumber = number.replace(/[\s\-\+]/g, '')

    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: normalizedNumber,
          text,
        }),
      }
    )

    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.status} — ${JSON.stringify(responseData)}`)
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[send-whatsapp] Erro:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
