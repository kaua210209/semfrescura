import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSettings } from '../context/SettingsContext.jsx'

export default function Carousel({ slides }) {
  const { settings } = useSettings()
  const [i, setI] = useState(0)
  const touchX = useRef(null)
  const n = slides.length

  useEffect(() => {
    if (n < 2) return
    const t = setInterval(() => setI((x) => (x + 1) % n), 5000)
    return () => clearInterval(t)
  }, [n, i])

  if (!n) {
    return (
      <section className="bg-gradient-to-br from-brand-700 to-brand-950 px-4 py-14 text-center">
        <h1 className="text-6xl text-cream sm:text-7xl">{settings.name}</h1>
        <p className="mx-auto mt-3 max-w-md text-cream/80">Lanche bom é lanche sem frescura. Peça agora pelo app!</p>
        <Link to="/pedido" className="btn btn-primary mt-6">
          Fazer pedido
        </Link>
      </section>
    )
  }

  const go = (d) => setI((x) => (x + d + n) % n)

  return (
    <section
      className="relative overflow-hidden bg-brand-950"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s) => (
          <img key={s.id} src={s.image_url} alt="" className="aspect-[16/9] max-h-[550px] w-full shrink-0 object-cover" />
        ))}
      </div>
      {n > 1 && (
        <>
          <button onClick={() => go(-1)} aria-label="Anterior" className="absolute top-1/2 left-2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-black/50 text-xl sm:block">
            ‹
          </button>
          <button onClick={() => go(1)} aria-label="Próxima" className="absolute top-1/2 right-2 hidden h-10 w-10 -translate-y-1/2 rounded-full bg-black/50 text-xl sm:block">
            ›
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2">
            {slides.map((s, idx) => (
              <button key={s.id} onClick={() => setI(idx)} aria-label={`Slide ${idx + 1}`} className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-accent' : 'w-2 bg-white/60'}`} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
