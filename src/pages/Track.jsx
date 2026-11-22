import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { MODE, PAYMENT, STATUS, brl, canCancel, waLink } from '../lib/format.js'
import { WhatsIcon, StarIcon } from '../components/icons.jsx'

const STEPS = ['Recebido', 'Preparando', 'Finalizado']
const stepIndex = (s) => (s === 'preparando' ? 1 : s === 'finalizado' ? 2 : 0)

export default function Track() {
  const { id } = useParams()
  const { settings } = useSettings()
  const [o, setO] = useState(null)
  const [err, setErr] = useState('')
  const [pixErr, setPixErr] = useState('')
  const [copied, setCopied] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [sendingReview, setSendingReview] = useState(false)
  const [reviewErr, setReviewErr] = useState('')
  const pixAsked = useRef(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_order_status', { p_id: id })
    if (error || !data) setErr('Pedido não encontrado.')
    else {
      setErr('')
      setO(data)
    }
  }, [id])

  useEffect(() => {
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [load])

  const requestPix = useCallback(async () => {
    setPixErr('')
    const { error } = await supabase.functions.invoke('create-pix', { body: { order_id: id } })
    if (error) setPixErr('Não foi possível gerar o Pix agora.')
    else load()
  }, [id, load])

  async function sendReview() {
    if (!rating) return setReviewErr('Escolha de 1 a 5 estrelas.')
    setSendingReview(true)
    setReviewErr('')
    const { error } = await supabase.rpc('submit_review', {
      p_order_id: id,
      p_rating: rating,
      p_comment: comment,
    })
    setSendingReview(false)
    if (error) return setReviewErr(error.message)
    load()
  }

  useEffect(() => {
    if (!o || pixAsked.current) return
    if (o.payment_method === 'pix' && o.payment_status === 'pendente' && o.status !== 'cancelado' && !o.pix_qr_code) {
      pixAsked.current = true
      requestPix()
    }
  }, [o, requestPix])

  if (err) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-cream/80">{err}</p>
        <Link to="/pedido" className="btn btn-primary mt-6">
          Voltar ao cardápio
        </Link>
      </main>
    )
  }
  if (!o) return <p className="p-8 text-center text-cream/70">Carregando pedido…</p>

  const phoneOk = !!settings.phone
  const cancelled = o.status === 'cancelado'
  const showPix = o.payment_method === 'pix' && o.payment_status === 'pendente' && !cancelled

  const talkMsg = `Olá! Quero acompanhar meu pedido #${o.number} em nome de ${o.customer_name}.`
  const cancelMsg = `Olá! Gostaria de CANCELAR o pedido #${o.number} em nome de ${o.customer_name}.`

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <p className="text-sm text-cream/60">Pedido</p>
      <h1 className="text-5xl text-accent">#{o.number}</h1>

      <div className="mt-4 rounded-2xl bg-brand-900/70 p-4">
        {cancelled ? (
          <p className="font-bold text-red-300">Pedido cancelado</p>
        ) : (
          <>
            <p className="text-sm text-cream/60">Situação atual</p>
            <p className="text-xl font-bold">{STATUS[o.status]}</p>
            <div className="mt-4 flex items-center">
              {STEPS.map((s, i) => (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= stepIndex(o.status) ? 'bg-accent text-brand-950' : 'bg-white/15'}`}>
                      {i + 1}
                    </span>
                    <span className="text-[11px] text-cream/70">{s}</span>
                  </div>
                  {i < STEPS.length - 1 && <span className={`mx-1 mb-4 h-0.5 flex-1 ${i < stepIndex(o.status) ? 'bg-accent' : 'bg-white/15'}`} />}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pix */}
      {showPix && (
        <div className="mt-4 rounded-2xl bg-cream p-4 text-neutral-900">
          <h2 className="text-2xl text-brand-800">Pague com Pix</h2>
          {o.pix_qr_code ? (
            <>
              {o.pix_qr_base64 && <img src={`data:image/png;base64,${o.pix_qr_base64}`} alt="QR Code Pix" className="mx-auto mt-2 h-52 w-52" />}
              <p className="mt-2 text-sm">Copie o código e cole no app do seu banco (Pix Copia e Cola):</p>
              <textarea readOnly value={o.pix_qr_code} rows={3} className="input mt-2 text-xs" onFocus={(e) => e.target.select()} />
              <button
                className="btn btn-primary mt-2 w-full"
                onClick={async () => {
                  await navigator.clipboard.writeText(o.pix_qr_code)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? 'Código copiado ✓' : 'Copiar código Pix'}
              </button>
              <p className="mt-3 text-center text-sm text-neutral-600">Aguardando confirmação do pagamento… esta tela atualiza sozinha.</p>
            </>
          ) : pixErr ? (
            <>
              <p className="mt-2 text-sm text-red-700">{pixErr}</p>
              <button className="btn btn-primary mt-2" onClick={requestPix}>
                Tentar novamente
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm">Gerando seu código Pix…</p>
          )}
        </div>
      )}
      {o.payment_method === 'pix' && o.payment_status === 'aprovado' && (
        <p className="mt-4 rounded-xl bg-emerald-900/60 p-3 text-center font-bold text-emerald-200">Pagamento Pix confirmado ✓</p>
      )}

      {/* Itens */}
      <ul className="mt-4 divide-y divide-white/10 rounded-2xl bg-brand-900/70 px-4">
        {(o.items || []).map((i, idx) => (
          <li key={idx} className="flex justify-between py-2.5 text-sm">
            <span>
              {i.qty}× {i.name}
            </span>
            <span className="text-cream/80">{brl(i.price * i.qty)}</span>
          </li>
        ))}
        <li className="flex justify-between py-3 font-bold">
          <span>
            Total · {PAYMENT[o.payment_method]} · {MODE[o.mode]}
          </span>
          <span className="font-display text-xl text-accent">{brl(o.total)}</span>
        </li>
      </ul>

      {/* Avaliação (aparece quando o pedido é finalizado) */}
      {o.status === 'finalizado' && (
        <div className="mt-4 rounded-2xl bg-brand-900/70 p-4">
          {o.reviewed ? (
            <div className="text-center">
              <p className="font-display text-2xl text-accent">Obrigado pela avaliação!</p>
              <div className="mt-2 flex justify-center text-accent">
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} filled={n <= o.review_rating} className="h-6 w-6" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl">Como foi o seu pedido?</h2>
              <p className="text-sm text-cream/70">Sua avaliação ajuda a Sem Frescura a melhorar.</p>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                    className={n <= rating ? 'text-accent' : 'text-cream/30'}
                  >
                    <StarIcon className="h-10 w-10" />
                  </button>
                ))}
              </div>
              <textarea
                className="input mt-3"
                rows={3}
                maxLength={500}
                placeholder="Conte como foi (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              {reviewErr && <p className="mt-2 text-sm text-red-300">{reviewErr}</p>}
              <button onClick={sendReview} disabled={sendingReview} className="btn btn-primary mt-3 w-full">
                {sendingReview ? 'Enviando…' : 'Enviar avaliação'}
              </button>
            </>
          )}
        </div>
      )}

      {/* WhatsApp */}
      <div className="mt-6 grid gap-3">
        {phoneOk ? (
          <a href={waLink(settings.phone, talkMsg)} target="_blank" rel="noreferrer" className="btn btn-primary">
            <WhatsIcon /> Acompanhar pelo WhatsApp
          </a>
        ) : (
          <p className="rounded-lg bg-black/30 p-3 text-center text-sm text-cream/70">O WhatsApp da lanchonete ainda não foi configurado.</p>
        )}
        {phoneOk && canCancel(o.status) && (
          <a href={waLink(settings.phone, cancelMsg)} target="_blank" rel="noreferrer" className="btn btn-outline">
            Cancelar pedido
          </a>
        )}
      </div>

      {canCancel(o.status) && (
        <p className="mt-3 text-center text-xs text-cream/60">
          O cancelamento é solicitado pelo WhatsApp e só é possível antes do preparo começar.
          {o.payment_method === 'pix' && o.payment_status === 'aprovado' && ' Pix já pago não é reembolsado automaticamente: o estorno é combinado com a lanchonete.'}
        </p>
      )}

      <Link to="/pedido" className="mt-8 block text-center text-sm text-cream/70 underline">
        Fazer novo pedido
      </Link>
    </main>
  )
}