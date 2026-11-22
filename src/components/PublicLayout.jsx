import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Logo from './Logo.jsx'
import Footer from './Footer.jsx'
import { HomeIcon, BagIcon } from './icons.jsx'

export default function PublicLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const tab = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-bold uppercase tracking-wide ${
      isActive ? 'text-accent' : 'text-cream/70'
    }`

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="bg-brand-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-6 md:flex">
            <NavLink to="/" end className={({ isActive }) => `font-display text-lg ${isActive ? 'text-accent' : 'text-cream'}`}>
              Página inicial
            </NavLink>
            <Link to="/pedido" className="btn btn-primary">
              Fazer pedido
            </Link>
          </nav>
        </div>
      </header>

      <Outlet />
      <Footer />

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-brand-950 pb-[env(safe-area-inset-bottom)] md:hidden">
        <NavLink to="/" end className={tab}>
          <HomeIcon />
          Página inicial
        </NavLink>
        <NavLink to="/pedido" className={tab}>
          <BagIcon />
          Fazer pedido
        </NavLink>
      </nav>
    </div>
  )
}
