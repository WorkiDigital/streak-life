import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.107.0'
// @deno-types="npm:@types/web-push@3.6.3"
import webpush from 'npm:web-push@3.6.7'
import { CORS_HEADERS, jsonResponse } from '../_shared/agent.ts'

let vapidConfigured = false

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    if (!vapidConfigured) {
      const pub = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
      const priv = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
      if (!pub || !priv) return jsonResponse({ error: 'VAPID keys nao configuradas' }, { status: 500 })
      webpush.setVapidDetails('mailto:contato@evolui.app', pub, priv)
      vapidConfigured = true
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const serviceKeys = [
      Deno.env.get('N8N_SERVICE_ROLE_KEY') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    ]

    const cleanAuthToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    const cleanServiceKeys = serviceKeys.map((key) => key.trim()).filter(Boolean)
    const isServiceRole = cleanServiceKeys.includes(cleanAuthToken)

    // Validate caller: either service role (n8n) or authenticated user
    let callerUserId: string | null = null
    if (isServiceRole) {
      // n8n calling — trust userId from payload
      callerUserId = null
    } else {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
      const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      const client = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user }, error } = await client.auth.getUser()
      if (error || !user) return jsonResponse({ error: 'Nao autenticado' }, { status: 401 })
      callerUserId = user.id
    }

    const reqBody = await req.json()
    const subscription = reqBody.subscription
    const payloadObj = reqBody.payload || {}

    const title = reqBody.title ?? payloadObj.title ?? 'Streak Life 🌱'
    const body = reqBody.body ?? payloadObj.body
    const habitId = reqBody.habitId ?? payloadObj.habitId ?? payloadObj.data?.habitId ?? null
    const userId = reqBody.userId ?? payloadObj.userId ?? payloadObj.data?.userId ?? null
    const data = reqBody.data ?? payloadObj.data ?? {}

    if (!subscription?.endpoint || !body) {
      return jsonResponse({ error: 'subscription.endpoint e body sao obrigatorios' }, { status: 400 })
    }

    // If called by a user (not service role), ensure they can only push to themselves
    if (callerUserId && callerUserId !== userId) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 403 })
    }

    const payload = JSON.stringify({
      title,
      body,
      data: {
        url: '/',
        habitId,
        userId,
        ...data,
      },
    })

    await webpush.sendNotification(subscription, payload)

    return jsonResponse({ success: true })
  } catch (err: any) {
    console.error('[send-push] Erro:', err)
    if (err?.statusCode === 410 || err?.statusCode === 404) {
      return jsonResponse({ success: false, reason: 'subscription_expired' })
    }
    return jsonResponse({ error: err?.message ?? String(err) }, { status: 500 })
  }
})
