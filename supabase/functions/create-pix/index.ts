// Gera a cobrança Pix no Mercado Pago para um pedido.
// Deploy: supabase functions deploy create-pix
// Secrets: supabase secrets set MP_ACCESS_TOKEN=APP_USR-...
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { order_id } = await req.json()
    if (!order_id) return json({ error: 'order_id obrigatório' }, 400)

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data: order, error } = await sb.from('orders').select('*').eq('id', order_id).single()
    if (error || !order) return json({ error: 'Pedido não encontrado' }, 404)
    if (order.payment_method !== 'pix') return json({ error: 'Pedido não é Pix' }, 400)
    if (order.status === 'cancelado') return json({ error: 'Pedido cancelado' }, 400)
    if (order.payment_status === 'aprovado') return json({ paid: true })
    if (order.pix_qr_code) {
      return json({ qr_code: order.pix_qr_code, qr_code_base64: order.pix_qr_base64 })
    }

    const token = Deno.env.get('MP_ACCESS_TOKEN')
    if (!token) return json({ error: 'MP_ACCESS_TOKEN não configurado' }, 500)

    const payerEmail = Deno.env.get('PIX_PAYER_EMAIL') ?? 'pedidos@semfrescura.app'
    const [first, ...rest] = String(order.customer_name).trim().split(/\s+/)

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': order.id,
      },
      body: JSON.stringify({
        transaction_amount: Number(order.total),
        description: `Pedido #${order.number}`,
        payment_method_id: 'pix',
        external_reference: order.id,
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`,
        payer: { email: payerEmail, first_name: first, last_name: rest.join(' ') || '-' },
      }),
    })
    const payment = await mpRes.json()
    if (!mpRes.ok) {
      console.error('Mercado Pago error', payment)
      return json({ error: 'Falha ao gerar Pix' }, 502)
    }

    const tx = payment?.point_of_interaction?.transaction_data
    if (!tx?.qr_code) return json({ error: 'Mercado Pago não retornou o código Pix' }, 502)

    await sb
      .from('orders')
      .update({
        mp_payment_id: String(payment.id),
        pix_qr_code: tx.qr_code,
        pix_qr_base64: tx.qr_code_base64,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    return json({ qr_code: tx.qr_code, qr_code_base64: tx.qr_code_base64 })
  } catch (e) {
    console.error(e)
    return json({ error: 'Erro interno' }, 500)
  }
})
