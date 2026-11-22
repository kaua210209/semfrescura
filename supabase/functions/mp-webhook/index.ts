// Recebe as notificações do Mercado Pago e confirma o pagamento Pix.
// Deploy SEM verificação de JWT (o Mercado Pago não envia token do Supabase):
//   supabase functions deploy mp-webhook --no-verify-jwt
// Secrets: MP_ACCESS_TOKEN e (opcional, recomendado) MP_WEBHOOK_SECRET
//
// Segurança: nunca confiamos no corpo da notificação. Sempre consultamos o pagamento
// direto na API do Mercado Pago e só aprovamos se status == "approved" e o valor bate.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function validSignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get('MP_WEBHOOK_SECRET')
  if (!secret) return true // validação opcional
  const sig = req.headers.get('x-signature') ?? ''
  const requestId = req.headers.get('x-request-id') ?? ''
  const ts = /ts=([^,]+)/.exec(sig)?.[1]
  const v1 = /v1=([^,]+)/.exec(sig)?.[1]
  if (!ts || !v1) return false
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest))
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return hex === v1
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url)
    let dataId = url.searchParams.get('data.id') ?? url.searchParams.get('id') ?? ''
    let type = url.searchParams.get('type') ?? url.searchParams.get('topic') ?? ''

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      dataId = String(body?.data?.id ?? dataId)
      type = String(body?.type ?? body?.topic ?? type)
    }

    if (type !== 'payment' || !dataId) return new Response('ignored', { status: 200 })
    if (!(await validSignature(req, dataId))) return new Response('invalid signature', { status: 401 })

    const token = Deno.env.get('MP_ACCESS_TOKEN')!
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!mpRes.ok) return new Response('payment lookup failed', { status: 502 })
    const payment = await mpRes.json()

    const orderId = payment.external_reference
    if (!orderId) return new Response('no reference', { status: 200 })

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: order } = await sb.from('orders').select('*').eq('id', orderId).single()
    if (!order) return new Response('order not found', { status: 200 })

    if (payment.status === 'approved' && Number(payment.transaction_amount) === Number(order.total)) {
      const patch: Record<string, unknown> = {
        payment_status: 'aprovado',
        mp_payment_id: String(payment.id),
        updated_at: new Date().toISOString(),
      }
      // pedido pago sai de "aguardando pagamento" e espera a confirmação do estabelecimento
      if (order.status === 'aguardando_pagamento') patch.status = 'aguardando_confirmacao'
      await sb.from('orders').update(patch).eq('id', order.id)
    }

    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})
