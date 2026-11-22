import { useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { useSettings } from '../../context/SettingsContext.jsx'
import Logo from '../../components/Logo.jsx'

export default function Login() {
  const { session, isAdmin, loading, signIn, signOut } = useAuth()
  const { settings } = useSettings()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (!loading && session && isAdmin) return <Navigate to="/admin" replace />

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) setErr('E-mail ou senha incorretos.')
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-sm rounded-2xl bg-brand-900 p-6 shadow-xl">
        <div className="mb-6 flex justify-center">
          <Logo className="h-16" />
        </div>
        <h1 className="mb-4 text-center text-3xl">Painel administrativo</h1>

        {session && !loading && !isAdmin ? (
          <div className="space-y-3 text-center">
            <p className="rounded-lg bg-red-950 p-3 text-sm text-red-200">Este usuário não tem permissão de administrador.</p>
            <button onClick={signOut} className="btn btn-outline w-full">
              Sair
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input className="input" type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
            <input className="input" type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
            {err && <p className="text-sm text-red-300">{err}</p>}
            <button className="btn btn-primary w-full" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        )}

        <Link to="/" className="mt-5 block text-center text-sm text-cream/60 underline">
          Voltar ao site de {settings.name}
        </Link>
      </div>
    </main>
  )
}
