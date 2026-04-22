import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export default function Home() {
  const [latestDraw, setLatestDraw] = useState(null)
  const [charities, setCharities] = useState([])

  useEffect(() => {
    api.getLatestDraw().then(setLatestDraw).catch(() => {})
    api.getCharities().then(setCharities).catch(() => {})
  }, [])

  return (
    <>
      <Head>
        <title>Digital Heroes — Score. Win. Give.</title>
        <meta name="description" content="Track your golf scores, win monthly prizes, support charity." />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>" />
      </Head>

      {/* NAV */}
      <nav className="nav">
        <span className="nav-logo">⚡ Digital <span>Heroes</span></span>
        <div className="nav-links">
          <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
          <Link href="/login?tab=signup" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <div className="container">
        <div className="hero">
          <div className="eyebrow">🏆 Golf Scores + Monthly Draws + Charity Impact</div>
          <h1>
            Play for more than<br />
            <span className="highlight">just the game</span>
          </h1>
          <p>Track your Stableford scores, enter monthly prize draws, and support life-changing charities — all in one platform.</p>
          <div className="flex-center" style={{ gap: 16, flexWrap: 'wrap' }}>
            <Link href="/login?tab=signup" className="btn btn-primary btn-lg">Become a Hero →</Link>
            <Link href="#how" className="btn btn-ghost btn-lg">How it works</Link>
          </div>

          {/* STATS ROW */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
            {[
              { value: '₹99/mo', label: 'Monthly Plan' },
              { value: '40%', label: 'Jackpot Pool' },
              { value: '10%+', label: 'Goes to Charity' },
              { value: '5', label: 'Scores Tracked' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent)' }}>{s.value}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FEATURES */}
        <div id="how" className="features">
          {[
            { icon: '⛳', title: 'Track Your Scores', desc: 'Enter your last 5 Stableford scores (1–45). One per day. System keeps your rolling 5 automatically.' },
            { icon: '🎯', title: 'Enter Monthly Draws', desc: 'Your scores enter you into the monthly draw. Match 3, 4, or 5 numbers to win from the prize pool.' },
            { icon: '💰', title: 'Win Real Prizes', desc: '5-match jackpot rolls over if unclaimed. Prize pools grow with every active subscriber.' },
            { icon: '💚', title: 'Support Charity', desc: 'Pick a charity at signup. 10%+ of your subscription goes directly to your chosen cause.' },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* LATEST DRAW */}
        {latestDraw && (
          <div className="card" style={{ marginTop: 60, textAlign: 'center' }}>
            <div className="eyebrow" style={{ margin: '0 auto 16px' }}>Latest Draw — {latestDraw.month}</div>
            <h2 style={{ marginBottom: 16 }}>Winning Numbers</h2>
            <div className="draw-balls" style={{ justifyContent: 'center' }}>
              {JSON.parse(latestDraw.drawn_numbers || '[]').map(n => (
                <div key={n} className="draw-ball">{n}</div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <div><div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Total Pool</div><div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.4rem' }}>₹{latestDraw.total_pool.toFixed(2)}</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>5-Match Jackpot</div><div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.4rem' }}>₹{latestDraw.pool_5match.toFixed(2)}</div></div>
            </div>
          </div>
        )}

        {/* CHARITIES PREVIEW */}
        {charities.length > 0 && (
          <div style={{ marginTop: 60 }}>
            <h2 style={{ textAlign: 'center', marginBottom: 8 }}>Supported Charities</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted)', marginBottom: 32 }}>Choose where your contribution goes</p>
            <div className="grid-3">
              {charities.slice(0, 3).map(c => (
                <div key={c.id} className="charity-card">
                  {c.image_url && <img src={c.image_url} alt={c.name} className="charity-img" />}
                  <div className="charity-body">
                    {c.is_featured && <span className="badge badge-purple" style={{ marginBottom: 8 }}>⭐ Featured</span>}
                    <h3 style={{ marginBottom: 6 }}>{c.name}</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{c.description.slice(0, 80)}...</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="card" style={{ marginTop: 60, marginBottom: 60, textAlign: 'center', background: 'linear-gradient(135deg, rgba(108,71,255,0.15), rgba(255,71,120,0.1))', border: '1px solid rgba(108,71,255,0.3)' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>Ready to become a Digital Hero?</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>Join hundreds of golfers supporting charities while competing for real prizes.</p>
          <Link href="/login?tab=signup" className="btn btn-primary btn-lg">Start for ₹99/month →</Link>
        </div>
      </div>
    </>
  )
}
