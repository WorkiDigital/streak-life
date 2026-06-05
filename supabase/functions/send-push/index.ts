import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
// @deno-types="npm:@types/web-push@3.6.3"
import webpush from 'npm:web-push@3.6.7'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

let vapidConfigured = false

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    if (!vapidConfigured) {
      const pub = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
      const priv = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
      if (!pub || !priv) return jsonResponse({ error: 'VAPID keys nao configuradas' }, 500)
      webpush.setVapidDetails('mailto:contato@evolui.app', pub, priv)
      vapidConfigured = true
    }

    const { subscription, title, body, habitId, userId } = await req.json()

    if (!subscription?.endpoint || !body) {
      return jsonResponse({ error: 'subscription.endpoint e body sao obrigatorios' }, 400)
    }

    const payload = JSON.stringify({
      title: title ?? 'Streak Life 🌱',
      body,
      habitId: habitId ?? null,
      userId: userId ?? null,
    })

    await webpush.sendNotification(subscription, payload)

    return jsonResponse({ success: true })
  } catch (err: any) {
    console.error('[send-push] Erro:', err)
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      return jsonResponse({ error: 'subscription_expired' }, 410)
    }
    return jsonResponse({ error: err?.message ?? String(err) }, 500)
  }
})
