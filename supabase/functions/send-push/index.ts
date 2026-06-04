import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''

webpush.setVapidDetails(
  'mailto:contato@evolui.app',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { subscription, title, body, habitId, userId } = await req.json()

    if (!subscription || !body) {
      return new Response(
        JSON.stringify({ error: 'subscription e body são obrigatórios' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const payload = {
      title: title ?? 'Streak Life 🌱',
      body,
      habitId: habitId ?? null,
      userId: userId ?? null,
    }

    await webpush.sendNotification(subscription, JSON.stringify(payload))

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[send-push] Erro:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
