import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { api, getUser, clearToken } from '../lib/api'

function AdminSidebar({ active, setActive, onLogout }) {
  const links = [
    { id: 'dashboard', icon: '📊', label: 'Dashboard' },
    { id: 'users', icon: '👥', label: 'Users' },
    { id: 'draws', icon: '🎰', label: 'Draw Engine' },
    { id: 'charities', icon: '💚', label: 'Charities' },
    { id: 'winners', icon: '🏆', label: 'Winners' },
    { id: 'reports', icon: '📈', label: 'Reports' },
  ]
  return (
    <div className="sidebar">
      <div style={{ padding: '0 20px 16px', borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '0.9rem', color: 'var(--accent)' }}>ADMIN PANEL</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>Digital Heroes</div>
      </div>
      <nav className="sidebar-nav">
        {links.map(l => (
          <button key={l.id} className={`sidebar-link ${active === l.id ? 'active' : ''}`} onClick={() => setActive(l.id)}>
            <span>{l.icon}</span> {l.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: '20px 12px', position: 'absolute', bottom: 0, left: 0, right: 0, borderTop: '1px solid var(--border)' }}>
        <Link href="/dashboard" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, color: 'var(--muted)', fontSize: '0.9rem', fontWeight: 500 }}>🔄 User View</Link>
        <button className="sidebar-link" style={{ color: 'var(--accent2)' }} onClick={onLogout}>🚪 Sign Out</button>
      </div>
    </div>
  )
}

function AdminDashboardPanel() {
  const [stats, setStats] = useState(null)
  useEffect(() => { api.adminDashboard().then(setStats).catch(() => {}) }, [])
  if (!stats) return <div className="loading-center"><span className="spinner" /></div>
  const cards = [
    { label: 'Total Users', value: stats.total_users, color: 'var(--accent)' },
    { label: 'Active Subscribers', value: stats.active_subscribers, color: 'var(--green)' },
    { label: 'Prize Pool Distributed', value: `£${stats.total_prize_pool_distributed}`, color: '#ffc107' },
    { label: 'Charity Contributions', value: `£${stats.total_charity_contributions.toFixed(2)}`, color: '#ff4778' },
    { label: 'Draws Published', value: stats.draws_published, color: 'var(--accent)' },
    { label: 'Pending Verifications', value: stats.winners_pending_verification, color: stats.winners_pending_verification > 0 ? '#ffc107' : 'var(--muted)' },
  ]
  return (
    <div>
      <h2 className="section-title">Admin Dashboard</h2>
      <div className="grid-3">
        {cards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UsersPanel() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editScore, setEditScore] = useState({ id: null, val: '' })
  const [msg, setMsg] = useState('')

  useEffect(() => { api.adminUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false)) })

  useEffect(() => { api.adminUsers().then(setUsers).catch(() => {}).finally(() => setLoading(false)) }, [])

  async function updateSub(userId, status) {
    await api.adminUpdateSubscription(userId, status)
    setMsg('Updated'); setTimeout(() => setMsg(''), 2000)
    api.adminUsers().then(setUsers).catch(() => {})
  }

  async function saveScore() {
    await api.adminUpdateScore(editScore.id, { score: parseInt(editScore.val) })
    setEditScore({ id: null, val: '' })
    api.adminUsers().then(setUsers).catch(() => {})
  }

  if (loading) return <div className="loading-center"><span className="spinner" /></div>

  return (
    <div>
      <h2 className="section-title">Users ({users.length})</h2>
      {msg && <div className="alert alert-success mb-4">{msg}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Plan</th><th>Status</th><th>Scores</th><th>Actions</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.full_name} {u.is_admin && <span className="badge badge-purple">Admin</span>}</td>
                <td style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{u.email}</td>
                <td>{u.subscription_plan}</td>
                <td>
                  <span className={`badge ${u.subscription_status === 'active' ? 'badge-green' : 'badge-gray'}`}>{u.subscription_status}</span>
                </td>
                <td>{u.scores_count}</td>
                <td>
                  <div className="flex-gap">
                    {u.subscription_status !== 'active' ? (
                      <button className="btn btn-success btn-sm" onClick={() => updateSub(u.id, 'active')}>Activate</button>
                    ) : (
                      <button className="btn btn-danger btn-sm" onClick={() => updateSub(u.id, 'inactive')}>Deactivate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DrawsPanel() {
  const [simulation, setSimulation] = useState(null)
  const [draws, setDraws] = useState([])
  const [drawType, setDrawType] = useState('random')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { api.getDraws().then(setDraws).catch(() => {}) }, [])

  async function simulate() {
    setLoading(true); setMsg('')
    try { setSimulation(await api.simulateDraw(drawType)) }
    catch (err) { setMsg(err.message) }
    finally { setLoading(false) }
  }

  async function publish() {
    if (!confirm('Publish this draw? This will determine winners and cannot be undone.')) return
    setLoading(true)
    try {
      const res = await api.publishDraw(drawType)
      setMsg(`Draw published! Winners: 5-match: ${res.winners_count['5match']}, 4-match: ${res.winners_count['4match']}, 3-match: ${res.winners_count['3match']}`)
      setSimulation(null)
      api.getDraws().then(setDraws).catch(() => {})
    } catch (err) { setMsg(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <h2 className="section-title">Draw Engine</h2>
      {msg && <div className={`alert ${msg.includes('published') ? 'alert-success' : 'alert-error'} mb-4`}>{msg}</div>}

      <div className="card mb-8">
        <div style={{ fontWeight: 600, marginBottom: 16 }}>Run Monthly Draw</div>
        <div className="flex-gap" style={{ marginBottom: 16, flexWrap: 'wrap' }}>
          <label style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Draw Type:</label>
          {['random', 'algorithm'].map(t => (
            <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input type="radio" name="drawType" value={t} checked={drawType === t} onChange={() => setDrawType(t)} />
              <span style={{ textTransform: 'capitalize', fontSize: '0.9rem' }}>{t}</span>
            </label>
          ))}
        </div>
        <div className="flex-gap">
          <button className="btn btn-secondary btn-md" onClick={simulate} disabled={loading}>
            {loading ? <span className="spinner" /> : '🔍 Simulate'}
          </button>
          <button className="btn btn-primary btn-md" onClick={publish} disabled={loading}>
            📢 Publish Draw
          </button>
        </div>

        {simulation && (
          <div style={{ marginTop: 20, padding: 16, background: 'var(--surface2)', borderRadius: 8 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 8 }}>SIMULATION PREVIEW</div>
            <div className="draw-balls">
              {simulation.drawn_numbers?.map(n => <div key={n} className="draw-ball">{n}</div>)}
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap', fontSize: '0.85rem' }}>
              <span>Pool: <strong>£{simulation.total_pool?.toFixed(2)}</strong></span>
              <span>5-match: <strong>£{simulation.pool_5match?.toFixed(2)}</strong></span>
              <span>Active subs: <strong>{simulation.active_subscribers}</strong></span>
            </div>
          </div>
        )}
      </div>

      <h3 style={{ marginBottom: 16 }}>Draw History</h3>
      {draws.map(d => (
        <div key={d.id} className="card mb-4 card-sm">
          <div className="flex-between">
            <div style={{ fontFamily: 'Syne', fontWeight: 700 }}>{d.month}</div>
            <span className={`badge ${d.status === 'published' ? 'badge-green' : 'badge-yellow'}`}>{d.status}</span>
          </div>
          {d.drawn_numbers && (
            <div className="draw-balls" style={{ marginTop: 8 }}>
              {JSON.parse(d.drawn_numbers).map(n => <div key={n} className="draw-ball" style={{ width: 38, height: 38, fontSize: '0.9rem' }}>{n}</div>)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function CharitiesPanel() {
  const [charities, setCharities] = useState([])
  const [modal, setModal] = useState(null) // null | 'create' | {id,...}
  const [form, setForm] = useState({ name: '', description: '', image_url: '', website: '', is_featured: false })
  const [msg, setMsg] = useState('')

  useEffect(() => { api.getCharities().then(setCharities).catch(() => {}) }, [])

  function openCreate() { setForm({ name: '', description: '', image_url: '', website: '', is_featured: false }); setModal('create') }
  function openEdit(c) { setForm({ name: c.name, description: c.description, image_url: c.image_url || '', website: c.website || '', is_featured: c.is_featured }); setModal(c) }

  async function save() {
    try {
      if (modal === 'create') { await api.adminCreateCharity(form) }
      else { await api.adminUpdateCharity(modal.id, form) }
      setMsg('Saved!'); setModal(null)
      setTimeout(() => setMsg(''), 2000)
      api.getCharities().then(setCharities).catch(() => {})
    } catch (err) { setMsg(err.message) }
  }

  async function del(id) {
    if (!confirm('Deactivate this charity?')) return
    await api.adminDeleteCharity(id)
    api.getCharities().then(setCharities).catch(() => {})
  }

  return (
    <div>
      <div className="flex-between mb-8">
        <h2 className="section-title" style={{ margin: 0 }}>Charities</h2>
        <button className="btn btn-primary btn-md" onClick={openCreate}>+ Add Charity</button>
      </div>
      {msg && <div className="alert alert-success mb-4">{msg}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Featured</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {charities.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.is_featured ? '⭐ Yes' : '—'}</td>
                <td><span className={`badge ${c.is_active ? 'badge-green' : 'badge-gray'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="flex-gap">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginBottom: 20 }}>{modal === 'create' ? 'Add Charity' : 'Edit Charity'}</h3>
            {['name', 'description', 'image_url', 'website'].map(field => (
              <div key={field} className="form-group">
                <label className="form-label">{field.replace('_', ' ')}</label>
                {field === 'description'
                  ? <textarea className="form-input" rows={3} value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                  : <input className="form-input" value={form[field]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))} />
                }
              </div>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, cursor: 'pointer', fontSize: '0.9rem' }}>
              <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} />
              Featured charity
            </label>
            <div className="flex-gap">
              <button className="btn btn-primary btn-md" onClick={save}>Save</button>
              <button className="btn btn-ghost btn-md" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WinnersPanel() {
  const [winners, setWinners] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => { api.adminAllWinners().then(setWinners).catch(() => {}).finally(() => setLoading(false)) }, [])

  async function verify(id, status) {
    try {
      await api.adminVerifyWinner(id, { status })
      setMsg(`Winner ${status}`)
      setTimeout(() => setMsg(''), 2000)
      api.adminAllWinners().then(setWinners).catch(() => {})
    } catch (err) { setMsg(err.message) }
  }

  if (loading) return <div className="loading-center"><span className="spinner" /></div>

  return (
    <div>
      <h2 className="section-title">Winners Management</h2>
      {msg && <div className="alert alert-success mb-4">{msg}</div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Draw</th><th>User</th><th>Match</th><th>Prize</th><th>Status</th><th>Proof</th><th>Actions</th></tr></thead>
          <tbody>
            {winners.map(w => (
              <tr key={w.id}>
                <td>#{w.draw_id}</td>
                <td>
                  <div style={{ fontSize: '0.9rem' }}>{w.user_name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{w.user_email}</div>
                </td>
                <td><span className="badge badge-purple">{w.match_type}-Match</span></td>
                <td style={{ fontWeight: 600 }}>£{w.prize_amount.toFixed(2)}</td>
                <td>
                  <span className={`badge ${w.status === 'paid' ? 'badge-green' : w.status === 'verified' ? 'badge-purple' : w.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                    {w.status}
                  </span>
                </td>
                <td>
                  {w.proof_url ? <a href={w.proof_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>View</a> : '—'}
                </td>
                <td>
                  <div className="flex-gap">
                    {w.status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => verify(w.id, 'verified')}>Verify</button>}
                    {w.status === 'verified' && <button className="btn btn-primary btn-sm" onClick={() => verify(w.id, 'paid')}>Mark Paid</button>}
                    {(w.status === 'pending' || w.status === 'verified') && <button className="btn btn-danger btn-sm" onClick={() => verify(w.id, 'rejected')}>Reject</button>}
                  </div>
                </td>
              </tr>
            ))}
            {winners.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No winners yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportsPanel() {
  const [reports, setReports] = useState(null)
  useEffect(() => { api.adminReports().then(setReports).catch(() => {}) }, [])
  if (!reports) return <div className="loading-center"><span className="spinner" /></div>
  return (
    <div>
      <h2 className="section-title">Reports & Analytics</h2>
      <div className="grid-2">
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Draw Statistics</div>
          {reports.draw_statistics.length === 0 ? <p className="text-muted">No draws yet.</p> : (
            <table style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead><tr><th style={{ textAlign: 'left', paddingBottom: 8 }}>Month</th><th>Pool</th><th>5M</th><th>4M</th><th>3M</th></tr></thead>
              <tbody>
                {reports.draw_statistics.map(d => (
                  <tr key={d.month}>
                    <td>{d.month}</td>
                    <td>£{d.total_pool.toFixed(2)}</td>
                    <td>{d.winners_5match}</td>
                    <td>{d.winners_4match}</td>
                    <td>{d.winners_3match}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card">
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Charity Support</div>
          {reports.charity_support.length === 0 ? <p className="text-muted">No selections yet.</p> : (
            reports.charity_support.map(c => (
              <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                <span>{c.name}</span>
                <span className="badge badge-green">{c.supporters} supporters</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminPanel() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)

  useEffect(() => {
    const u = typeof window !== 'undefined' ? (() => { try { return JSON.parse(localStorage.getItem('dh_user')) } catch { return null } })() : null
    if (!u) { router.push('/login'); return }
    if (!u.is_admin) { router.push('/dashboard'); return }
    setUser(u)
    setLoading(false)
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
      <Head><title>Admin — Digital Heroes</title></Head>
      <nav className="nav">
        <span className="nav-logo">⚡ Digital <span>Heroes</span> <span style={{ color: 'var(--accent2)', fontSize: '0.7rem', marginLeft: 4 }}>ADMIN</span></span>
        <div className="nav-links">
          <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{user?.email}</span>
        </div>
      </nav>
      <div className="app-layout">
        <AdminSidebar active={activeTab} setActive={setActiveTab} onLogout={logout} />
        <main className="main-content">
          {activeTab === 'dashboard' && <AdminDashboardPanel />}
          {activeTab === 'users' && <UsersPanel />}
          {activeTab === 'draws' && <DrawsPanel />}
          {activeTab === 'charities' && <CharitiesPanel />}
          {activeTab === 'winners' && <WinnersPanel />}
          {activeTab === 'reports' && <ReportsPanel />}
        </main>
      </div>
    </>
  )
}
