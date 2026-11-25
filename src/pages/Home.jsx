import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useSettings } from '../context/SettingsContext.jsx'
import { brl } from '../lib/format.js'
import Carousel from '../components/Carousel.jsx'
import ProductImage from '../components/ProductImage.jsx'
import { PinIcon, StarIcon } from '../components/icons.jsx'

export default function Home() {
  const { settings } = useSettings()
  const [slides, setSlides] = useState([])
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    ;(async () => {
      const [c, p, r] = await Promise.all([
        supabase.from('carousel_images').select('*').order('sort').order('created_at'),
        supabase.from('products').select('*').order('sort').order('name'),
        supabase.from('reviews').select('*').eq('visible', true).order('created_at', { ascending: false }),
      ])
      setSlides(c.data || [])
      setProducts(p.data || [])
      setReviews(r.data || [])
    })()
  }, [])

  const featured = products.filter((p) => p.featured && p.category === 'lanches').slice(0, 3)
  const mousses = products.filter((p) => p.category === 'mousses')
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <main>
      <Carousel slides={slides} />

      {/* Lanches em destaque */}
      <section className="mx-auto max-w-5xl px-4 pt-10">
        <h2 className="section-title">Lanches em destaque</h2>
        {featured.length === 0 ? (
          <p className="mt-4 text-cream/70">Em breve, nossos destaques por aqui.</p>
        ) : (
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {featured.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-2xl bg-brand-900/70">
                <ProductImage src={p.image_url} name={p.name} className="h-48 w-full !rounded-none" />
                <div className="p-4">
                  <h3 className="text-2xl text-cream">{p.name}</h3>
                  {p.description && <p className="mt-1 line-clamp-3 text-sm text-cream/70">{p.description}</p>}
                  <p className="mt-3 font-display text-2xl text-accent">{brl(p.price)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-6 text-center">
          <Link to="/pedido" className="btn btn-primary">
            Ver cardápio completo
          </Link>
        </div>
      </section>

      {/* Mousses (logo abaixo dos destaques) */}
      {mousses.length > 0 && (
        <section className="mx-auto max-w-5xl px-4 pt-12">
          <h2 className="section-title">Mousses</h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {mousses.map((p) => (
              <li key={p.id} className="overflow-hidden rounded-2xl bg-brand-900/70">
                <div className="relative">
                  <ProductImage src={p.image_url} name={p.name} className={`aspect-square h-auto w-full !rounded-none ${p.available ? '' : 'grayscale'}`} />
                  {!p.available && (
                    <span className="absolute top-2 left-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-bold uppercase">Indisponível</span>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-lg leading-tight text-cream">{p.name}</h3>
                  <p className="mt-1 font-display text-lg text-accent">{brl(p.price)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-5 text-center">
            <Link to="/pedido#mousses" className="btn btn-outline">
              Pedir mousses
            </Link>
          </div>
        </section>
      )}

      {/* Localização */}
      <section className="mx-auto max-w-5xl px-4 pt-12">
        <h2 className="section-title">Onde estamos</h2>
        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-brand-900/70 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <PinIcon className="mt-0.5 shrink-0 text-accent" />
              <div>
                <p className="font-semibold">{settings.address || 'Endereço em breve'}</p>
                {settings.opening_hours && <p className="mt-1 whitespace-pre-line text-sm text-cream/70">{settings.opening_hours}</p>}
              </div>
            </div>
            {settings.map_url ? (
              <a href={settings.map_url} target="_blank" rel="noreferrer" className="btn btn-primary shrink-0">
                Ver no mapa
              </a>
            ) : settings.address ? (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary shrink-0"
              >
                Ver no mapa
              </a>
            ) : null}
          </div>

          {settings.storefront_url && (
            <img
              src={settings.storefront_url}
              alt={`Foto da ${settings.name}`}
              loading="lazy"
              className="aspect-[16/9] w-full rounded-xl object-cover"
            />
          )}
        </div>
      </section>

      {/* Avaliações */}
      <section className="mx-auto max-w-5xl px-4 pt-12">
        <div className="flex items-end justify-between gap-3">
          <h2 className="section-title">Avaliações</h2>
          {reviews.length > 0 && (
            <p className="flex items-center gap-1 text-sm text-cream/80">
              <StarIcon className="h-5 w-5 text-accent" /> <b className="text-cream">{avg.toFixed(1)}</b> ({reviews.length})
            </p>
          )}
        </div>
        {reviews.length === 0 ? (
          <p className="mt-4 text-cream/70">As avaliações dos nossos clientes aparecerão aqui.</p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl bg-brand-900/70 p-4">
                <div className="flex text-accent">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <StarIcon key={n} filled={n <= r.rating} className="h-4 w-4" />
                  ))}
                </div>
                {r.comment && <p className="mt-2 text-sm text-cream/90">{r.comment}</p>}
                <p className="mt-3 text-sm font-bold text-cream/70">{r.author}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}