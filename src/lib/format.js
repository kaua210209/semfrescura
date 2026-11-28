export const brl = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export const onlyDigits = (s) => (s || '').replace(/\D/g, '')

// Monta link do WhatsApp. Se o número não tiver DDI, assume Brasil (55).
export function waLink(phone, text) {
  let d = onlyDigits(phone)
  if (d && d.length <= 11) d = '55' + d
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`
}

// Ordem do cardápio: Lanches, Porções, Bebidas e Mousses
export const CATEGORIES = [
  { id: 'lanches', label: 'Lanches' },
  { id: 'porcoes', label: 'Combos' },
  { id: 'bebidas', label: 'Bebidas' },
  { id: 'mousses', label: 'Mousses' },
]
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id

export const STATUS = {
  aguardando_confirmacao: 'Aguardando confirmação',
  aguardando_pagamento: 'Aguardando pagamento',
  preparando: 'Preparando',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}
export const STATUS_COLOR = {
  aguardando_confirmacao: 'bg-amber-100 text-amber-800',
  aguardando_pagamento: 'bg-sky-100 text-sky-800',
  preparando: 'bg-orange-100 text-orange-800',
  finalizado: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-red-100 text-red-800',
}
export const PAYMENT = { dinheiro: 'Dinheiro', cartao: 'Cartão', pix: 'Pix' }
export const MODE = { entrega: 'Entrega', retirada: 'Retirada no local' }

// Cancelamento só é permitido antes de o estabelecimento começar a preparar
export const canCancel = (status) =>
  status === 'aguardando_confirmacao' || status === 'aguardando_pagamento'

export const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export const dayKey = (iso) => new Date(iso).toLocaleDateString('sv-SE') // yyyy-mm-dd local
