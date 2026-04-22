import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { api, getUser, clearToken } from '../lib/api'

function Sidebar({ active, setActive, user, onLogout }) {
  const links = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'scores', icon: '⛳', label: 'My Scores' },
    { id: 'draws', icon: '🎰', label: 'Draws & Results' },
    { id: 'charity', icon: '💚', label: 'My Charity' },
    { id: 'subscription', icon: '💳', label: 'Subscription' },
    { id: 'winnings', icon: '🏆', label: 'My Winnings' },
  ]
  return (
    <div className="sidebar">
      <div style={{ padding: '0 20px 20px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.9rem' }}>{user?.full_name}</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{user?.email}</div>
      </div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <button key={l.id} className={`sidebar-link ${active === l.id ? 'active' : ''}`} onClick={() => setActive(l.id)}>
            <span>{l.icon}</span> {l.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '20px 12px', marginTop: 'auto', borderTop: '1px solid var(--border)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <button className="sidebar-link" style={{ color: 'var(--accent2)' }} onClick={onLogout}>🚪 Sign Out</button>
      </div>
    </div>
  )
}

function Overview({ scores, subscription, charity, winnings, draws }) {
  const totalWon = winnings.reduce((s, w) => s + w.prize_amount, 0)
  return (
    <div>
      <h2 className="section-title">Dashboard Overview</h2>
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{scores.length}/5</div>
          <div className="stat-label">Scores Logged</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: subscription?.status === 'active' ? 'var(--green)' : 'var(--accent2)' }}>
            {subscription?.status || 'None'}
          </div>
          <div className="stat-label">Subscription</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">£{totalWon.toFixed(2)}</div>
          <div className="stat-label">Total Won</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{draws.length}</div>
          <div className="stat-label">Draws Entered</div>
        </div>
      </div>

      {subscription?.status !== 'active' && (
        <div className="alert alert-error">
          ⚠️ No active subscription. You won't enter draws until you subscribe.
        </div>
      )}

      {charity && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="flex-between">
            <div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 4 }}>Supporting</div>
              <div style={{ fontWeight: 600 }}>💚 {charity.charity.name}</div>
            </div>
            <span className="badge badge-green">{charity.contribution_percentage}% of sub</span>
          </div>
        </div>
      )}

      {scores.length > 0 && (
        <div className="card">
          <div style={{ marginBottom: 12, fontWeight: 600 }}>Recent Scores</div>
          {scores.slice(0, 3).map(s => (
            <div key={s.id} className="score-row">
              <div className="score-num">{s.score}</div>
              <div className="score-date">{s.date}</div>
              <span className="badge badge-purple">Stableford</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScoresPanel({ scores, setScores }) {
  const [form, setForm] = useState({ score: '', date: new Date().toISOString().split('T')[0] })
  const [editId, setEditId] = useState(null)
  const [editScore, setEditScore] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function addScore(e) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await api.addScore({ score: parseInt(form.score), date: form.date })
      const updated = await api.getScores()
      setScores(updated)
      setForm(f => ({ ...f, score: '' }))
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function saveEdit(id) {
    try {
      await api.updateScore(id, { score: parseInt(editScore) })
      const updated = await api.getScores()
      setScores(updated); setEditId(null)
    } catch (err) { setError(err.message) }
  }

  async function del(id) {
    if (!confirm('Delete this score?')) return
    await api.deleteScore(id)
    setScores(s => s.filter(x => x.id !== id))
  }

  return (
    <div>
      <h2 className="section-title">My Scores</h2>
      <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>Track your last 5 Stableford scores (1–45). One score per date. Oldest auto-removed at 6.</p>

      <div className="card mb-8">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Add New Score</div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={addScore} style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 100 }}>
            <input className="form-input" type="number" min={1} max={45} placeholder="Score (1-45)" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} required />
          </div>
          <div style={{ flex: 2, minWidth: 140 }}>
            <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
          </div>
          <button type="submit" className="btn btn-primary btn-md" disabled={loading}>
            {loading ? <span className="spinner" /> : '+ Add Score'}
          </button>
        </form>
      </div>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Score History ({scores.length}/5)</div>
        {scores.length === 0 ? (
          <p className="text-muted" style={{ fontSize: '0.9rem' }}>No scores yet. Add your first score above.</p>
        ) : scores.map(s => (
          <div key={s.id} className="score-row">
            <div className="score-num">{editId === s.id ? <input style={{ width: 60 }} className="form-input" type="number" min={1} max={45} value={editScore} onChange={e => setEditScore(e.target.value)} /> : s.score}</div>
            <div className="score-date">{s.date}</div>
            {editId === s.id ? (
              <div className="flex-gap">
                <button className="btn btn-success btn-sm" onClick={() => saveEdit(s.id)}>Save</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditId(null)}>Cancel</button>
              </div>
            ) : (
              <div className="flex-gap">
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditId(s.id); setEditScore(s.score) }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => del(s.id)}>Delete</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function DrawsPanel({ scores }) {
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getDraws().then(setDraws).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function checkMatch(draw) {
    if (!draw.drawn_numbers) return 0
    const nums = JSON.parse(draw.drawn_numbers)
    const userNums = scores.map(s => s.score)
    return nums.filter(n => userNums.includes(n)).length
  }

  if (loading) return <div className="loading-center"><span className="spinner" /></div>

  return (
    <div>
      <h2 className="section-title">Draws & Results</h2>
      {draws.length === 0 ? (
        <div className="card"><p className="text-muted">No draws published yet.</p></div>
      ) : draws.map(d => {
        const nums = d.drawn_numbers ? JSON.parse(d.drawn_numbers) : []
        const matches = checkMatch(d)
        return (
          <div key={d.id} className="card mb-4">
            <div className="flex-between" style={{ marginBottom: 12 }}>
              <div>
                <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>{d.month}</span>
                {matches >= 3 && <span className="badge badge-green" style={{ marginLeft: 8 }}>🏆 {matches}-match winner!</span>}
              </div>
              <span className={`badge ${d.status === 'published' ? 'badge-green' : 'badge-yellow'}`}>{d.status}</span>
            </div>
            {nums.length > 0 && (
              <div className="draw-balls">
                {nums.map(n => (
                  <div key={n} className="draw-ball" style={scores.map(s=>s.score).includes(n) ? { background: 'linear-gradient(135deg,var(--green),#00bfa5)', boxShadow: '0 4px 20px rgba(0,230,118,0.4)' } : {}}>{n}</div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 24, marginTop: 12, flexWrap: 'wrap' }}>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Total Pool </span><strong>£{d.total_pool.toFixed(2)}</strong></div>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>5-Match </span><strong>£{d.pool_5match.toFixed(2)}</strong></div>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>4-Match </span><strong>£{d.pool_4match.toFixed(2)}</strong></div>
              <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>3-Match </span><strong>£{d.pool_3match.toFixed(2)}</strong></div>
              {d.jackpot_rollover > 0 && <div><span className="text-muted" style={{ fontSize: '0.8rem' }}>Rollover </span><strong className="text-accent">£{d.jackpot_rollover.toFixed(2)}</strong></div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CharityPanel() {
  const [charities, setCharities] = useState([])
  const [selected, setSelected] = useState(null)
  const [currentSelection, setCurrentSelection] = useState(null)
  const [pct, setPct] = useState(10)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    api.getCharities().then(setCharities).catch(() => {})
    api.getMyCharity().then(data => {
      setCurrentSelection(data)
      if (data) { setSelected(data.charity.id); setPct(data.contribution_percentage) }
    }).catch(() => {})
  }, [])

  async function save() {
    if (!selected) return
    try {
      await api.selectCharity({ charity_id: selected, contribution_percentage: pct })
      setMsg('Charity selection saved!')
      setTimeout(() => setMsg(''), 3000)
      const updated = await api.getMyCharity()
      setCurrentSelection(updated)
    } catch (err) { setMsg(err.message) }
  }

  return (
    <div>
      <h2 className="section-title">My Charity</h2>
      {currentSelection && (
        <div className="alert alert-success mb-4">💚 Currently supporting: <strong>{currentSelection.charity.name}</strong> ({currentSelection.contribution_percentage}% of subscription)</div>
      )}
      {msg && <div className={`alert ${msg.includes('saved') ? 'alert-success' : 'alert-error'}`}>{msg}</div>}
      <div style={{ marginBottom: 20 }}>
        <label className="form-label">Contribution Percentage (min 10%)</label>
        <input className="form-input" type="number" min={10} max={100} value={pct} onChange={e => setPct(Number(e.target.value))} style={{ width: 120, marginTop: 6 }} />
      </div>
      <div className="grid-3">
        {charities.map(c => (
          <div key={c.id} className={`charity-card ${selected === c.id ? 'selected' : ''}`} onClick={() => setSelected(c.id)}>
            {c.image_url && <img src={c.image_url} alt={c.name} className="charity-img" />}
            <div className="charity-body">
              {c.is_featured && <span className="badge badge-purple" style={{ marginBottom: 6 }}>⭐ Featured</span>}
              {selected === c.id && <span className="badge badge-green" style={{ marginBottom: 6, marginLeft: 4 }}>✓ Selected</span>}
              <h3 style={{ marginBottom: 6, fontSize: '1rem' }}>{c.name}</h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>{c.description.slice(0, 80)}...</p>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <button className="btn btn-primary btn-md mt-8" onClick={save}>Save Charity Selection</button>
      )}
    </div>
  )
}

function SubscriptionPanel({ subscription, setSubscription, onSessionExpired }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  async function subscribe(plan) {
    setLoading(true); setMsg('')
    try {
      const res = await api.subscribe({ plan })
      setSubscription(res.subscription)
      setMsg(`Subscribed to ${plan} plan!`)
    } catch (err) {
      if (err.status === 401) { onSessionExpired(); return; }
      setMsg(err.message)
    }
    finally { setLoading(false) }
  }

  async function cancel() {
    if (!confirm('Cancel subscription?')) return
    try {
      await api.cancelSubscription()
      const updated = await api.getSubscription()
      setSubscription(updated)
      setMsg('Subscription cancelled.')
    } catch (err) {
      if (err.status === 401) { onSessionExpired(); return; }
      setMsg(err.message)
    }
  }

  return (
    <div>
      <h2 className="section-title">Subscription</h2>
      {msg && <div className={`alert ${msg.includes('Subscribed') ? 'alert-success' : 'alert-error'} mb-4`}>{msg}</div>}

      {subscription && (
        <div className="card mb-8">
          <div className="flex-between">
            <div>
              <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Current Plan</div>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.3rem', marginTop: 4 }}>{subscription.plan || 'None'}</div>
            </div>
            <span className={`badge ${subscription.status === 'active' ? 'badge-green' : 'badge-red'}`}>{subscription.status}</span>
          </div>
          {subscription.renewal_date && (
            <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: '0.85rem' }}>
              Renews: {new Date(subscription.renewal_date).toLocaleDateString()}
            </div>
          )}
          {subscription.status === 'active' && (
            <button className="btn btn-danger btn-sm mt-4" onClick={cancel}>Cancel Subscription</button>
          )}
        </div>
      )}

      <h3 style={{ marginBottom: 20 }}>Plans</h3>
      <div className="grid-2">
        {[
          { plan: 'monthly', label: 'Monthly', price: '₹99', period: '/month', features: ['Full draw access', 'Score tracking', 'Charity support', '10% prize pool contribution'] },
          { plan: 'yearly', label: 'Yearly', price: '₹799', period: '/year', badge: 'Save 33%', features: ['Everything in Monthly', '2 months free', 'Priority support', 'Early draw access'] },
        ].map(p => (
          <div key={p.plan} className={`plan-card ${subscription?.plan === p.plan && subscription?.status === 'active' ? 'selected' : ''}`}>
            {p.badge && <span className="badge badge-green" style={{ marginBottom: 8 }}>{p.badge}</span>}
            <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem' }}>{p.label}</div>
            <div className="plan-price">{p.price}<span>{p.period}</span></div>
            <ul style={{ listStyle: 'none', marginBottom: 20 }}>
              {p.features.map(f => <li key={f} style={{ padding: '4px 0', fontSize: '0.85rem', color: 'var(--muted)' }}>✓ {f}</li>)}
            </ul>
            <button className="btn btn-primary btn-md btn-full" disabled={loading || (subscription?.plan === p.plan && subscription?.status === 'active')} onClick={() => subscribe(p.plan)}>
              {subscription?.plan === p.plan && subscription?.status === 'active' ? '✓ Current Plan' : `Subscribe ${p.label}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function WinningsPanel({ winnings, setWinnings }) {
  const [proofModal, setProofModal] = useState(null)
  const [proofUrl, setProofUrl] = useState('')

  async function submitProof() {
    try {
      await api.submitProof(proofModal, { proof_url: proofUrl })
      setProofModal(null); setProofUrl('')
      const updated = await api.getMyWinnings()
      setWinnings(updated)
    } catch (err) { alert(err.message) }
  }

  const total = winnings.reduce((s, w) => s + w.prize_amount, 0)

  return (
    <div>
      <h2 className="section-title">My Winnings</h2>
      <div className="stat-card mb-8" style={{ display: 'inline-block', minWidth: 200 }}>
        <div className="stat-value text-green">£{total.toFixed(2)}</div>
        <div className="stat-label">Total Won</div>
      </div>
      {winnings.length === 0 ? (
        <div className="card"><p className="text-muted">No winnings yet. Keep entering draws!</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Draw</th><th>Match</th><th>Prize</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {winnings.map(w => (
                <tr key={w.id}>
                  <td>Draw #{w.draw_id}</td>
                  <td><span className="badge badge-purple">{w.match_type}-Match</span></td>
                  <td style={{ fontWeight: 600 }}>£{w.prize_amount.toFixed(2)}</td>
                  <td><span className={`badge ${w.status === 'paid' ? 'badge-green' : w.status === 'verified' ? 'badge-purple' : w.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{w.status}</span></td>
                  <td>
                    {w.status === 'pending' && !w.proof_url && (
                      <button className="btn btn-primary btn-sm" onClick={() => setProofModal(w.id)}>Submit Proof</button>
                    )}
                    {w.proof_url && <span style={{ color: 'var(--green)', fontSize: '0.85rem' }}>✓ Proof submitted</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {proofModal && (
        <div className="modal-overlay" onClick={() => setProofModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 16 }}>Submit Score Proof</h3>
            <p style={{ color: 'var(--muted)', marginBottom: 16, fontSize: '0.9rem' }}>Paste a URL to your score screenshot from your golf platform.</p>
            <input className="form-input" placeholder="https://..." value={proofUrl} onChange={e => setProofUrl(e.target.value)} />
            <div className="flex-gap mt-4">
              <button className="btn btn-primary btn-md" onClick={submitProof}>Submit</button>
              <button className="btn btn-ghost btn-md" onClick={() => setProofModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [scores, setScores] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [charity, setCharity] = useState(null)
  const [winnings, setWinnings] = useState([])
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const u = typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem('dh_user')) } catch { return null } })() : null
    if (!u) { router.push('/login'); return }
    if (u.is_admin) { router.push('/admin'); return }
    setUser(u)
    Promise.all([
      api.getScores().catch(() => []),
      api.getSubscription().catch(() => null),
      api.getMyCharity().catch(() => null),
      api.getMyWinnings().catch(() => []),
      api.getDraws().catch(() => []),
    ]).then(([sc, sub, ch, win, dr]) => {
      setScores(sc); setSubscription(sub); setCharity(ch); setWinnings(win); setDraws(dr)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  function logout() { clearToken(); router.push('/') }

  if (loading) return <div className="loading-center"><span className="spinner" /></div>

  return (
    <>
      {sessionExpired && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999, background: 'var(--accent2)', color: '#fff', textAlign: 'center', padding: '14px', fontWeight: 600, fontSize: '1rem' }}>
          ⚠️ Session expired. Redirecting to login…
        </div>
      )}
      <Head><title>Dashboard — Digital Heroes</title></Head>
      <nav className="nav">
        <Link href="/" className="nav-logo">⚡ Digital <span>Heroes</span></Link>
        <div className="nav-links">
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Welcome, {user?.full_name}</span>
        </div>
      </nav>
      <div className="app-layout">
        <Sidebar active={activeTab} setActive={setActiveTab} user={user} onLogout={logout} />
        <main className="main-content">
          {activeTab === 'overview' && <Overview scores={scores} subscription={subscription} charity={charity} winnings={winnings} draws={draws} />}
          {activeTab === 'scores' && <ScoresPanel scores={scores} setScores={setScores} />}
          {activeTab === 'draws' && <DrawsPanel scores={scores} />}
          {activeTab === 'charity' && <CharityPanel />}
          {activeTab === 'subscription' && <SubscriptionPanel subscription={subscription} setSubscription={setSubscription} onSessionExpired={() => { clearToken(); setSessionExpired(true); setTimeout(() => router.push('/login'), 2500) }} />}
          {activeTab === 'winnings' && <WinningsPanel winnings={winnings} setWinnings={setWinnings} />}
        </main>
      </div>
    </>
  )
}
