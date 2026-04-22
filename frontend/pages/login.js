import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { api, saveToken, saveUser } from '../lib/api'

export default function Login() {
  const router = useRouter()
  const [tab, setTab] = useState('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '', full_name: '' })

  useEffect(() => {
    if (router.query.tab === 'signup') setTab('signup')
  }, [router.query.tab])

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); setError('') }

  async function submit(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      let res
      if (tab === 'login') {
        res = await api.login({ email: form.email, password: form.password })
      } else {
        if (!form.full_name.trim()) { setError('Full name required'); setLoading(false); return }
        res = await api.register({ email: form.email, password: form.password, full_name: form.full_name })
      }
      saveToken(res.access_token)
      saveUser(res.user)
      router.push(res.user.is_admin ? '/admin' : '/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>{tab === 'login' ? 'Sign In' : 'Get Started'} — Digital Heroes</title></Head>
      <nav className="nav">
        <Link href="/" className="nav-logo">⚡ Digital <span>Heroes</span></Link>
      </nav>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 24px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: '2.5rem' }}>⚡</span>
            <h1 style={{ fontSize: '1.8rem', marginTop: 8 }}>
              {tab === 'login' ? 'Welcome back' : 'Become a Hero'}
            </h1>
            <p style={{ color: 'var(--muted)', marginTop: 6 }}>
              {tab === 'login' ? 'Sign in to your account' : 'Create your free account'}
            </p>
          </div>

          <div className="card">
            <div className="tabs" style={{ marginBottom: 24 }}>
              <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError('') }}>Sign In</button>
              <button className={`tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => { setTab('signup'); setError('') }}>Register</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={submit}>
              {tab === 'signup' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" type="text" placeholder="John Smith" value={form.full_name} onChange={e => set('full_name', e.target.value)} required />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set('password', e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading} style={{ marginTop: 8 }}>
                {loading ? <span className="spinner" /> : tab === 'login' ? 'Sign In →' : 'Create Account →'}
              </button>
            </form>

            {tab === 'login' && (
              <div style={{ marginTop: 20, padding: 16, background: 'var(--surface2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Test credentials:</strong><br />
                User: test@digitalheroes.co.in / Test@123<br />
                Admin: admin@digitalheroes.co.in / Admin@123
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
