import { useState, useEffect, useRef, useCallback } from 'react'

const API = 'http://localhost:5002'

const ROLE_LABEL = {
  infrastructure: 'INFRASTRUCTURE',
  storage:        'STORAGE',
  generation:     'GENERATION',
  flex_load:      'FLEX LOAD',
  unclassified:   'UNCLASSIFIED',
}

const EVENT_COLOR = {
  TELEMETRY: 'var(--c-blue)',
  DISPATCH:  'var(--c-teal)',
  ALERT:     'var(--c-amber)',
  MARKET:    'var(--c-text)',
  FAIL:      'var(--c-red)',
}

const ICONS = {
  gateways:  <IconGateway />,
  batteries: <IconBattery />,
  inverters: <IconSolar />,
  heatpumps: <IconHeat />,
  wallboxes: <IconEV />,
  unknown:   <IconUnknown />,
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function IconGateway() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="8" width="20" height="8" rx="2" />
      <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <line x1="15" y1="12" x2="20" y2="12" />
    </svg>
  )
}

function IconBattery() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="7" width="18" height="10" rx="2" />
      <path d="M20 10.5v3" strokeWidth="2.5" />
      <rect x="4.5" y="9.5" width="9" height="5" rx="1" fill="currentColor" stroke="none" opacity="0.8" />
    </svg>
  )
}

function IconSolar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="6.34" y2="6.34" />
      <line x1="17.66" y1="17.66" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="6.34" y2="17.66" />
      <line x1="17.66" y1="6.34" x2="19.78" y2="4.22" />
    </svg>
  )
}

function IconHeat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 2 C12 2 8 6 8 10 C8 14 12 14 12 18 C12 22 8 22 8 22" />
      <path d="M17 5 C17 5 14 8 14 11 C14 14 17 14 17 17 C17 20 14 20 14 20" />
      <path d="M7 5 C7 5 4 8 4 11 C4 14 7 14 7 17 C7 20 4 20 4 20" />
    </svg>
  )
}

function IconEV() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="8" width="16" height="10" rx="2" />
      <path d="M18 12h2a2 2 0 010 4h-2" />
      <circle cx="6" cy="21" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="13" cy="21" r="1.5" fill="currentColor" stroke="none" />
      <path d="M8 8V5l4-3" strokeWidth="1.5" />
      <path d="M12 5h3" />
    </svg>
  )
}

function IconUnknown() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" strokeDasharray="3 2" />
      <path d="M9 9a3 3 0 115.9.9C14.5 11.4 12 12 12 13.5" />
      <circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  )
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function Sparkline({ history, id, color = 'var(--c-teal)', width = 240, height = 46 }) {
  if (!history || history.length < 2) return null

  const vals = history.map(d => d.mw ?? d.online)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || 1
  const W = width, H = height

  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 6) - 3
    return [x.toFixed(1), y.toFixed(1)]
  })

  const linePath  = 'M' + pts.map(p => p.join(',')).join(' L')
  const areaPath  = linePath + ` L${W},${H} L0,${H} Z`
  const gradId    = `sg-${id}-${W}`
  const last      = pts[pts.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  )
}

// ─── Confidence bar ───────────────────────────────────────────────────────────

function ConfBar({ mwLow, mwHigh, maxMw = 6 }) {
  if (mwLow == null) return null
  const solidPct     = Math.min((mwLow  / maxMw) * 100, 100)
  const uncertainPct = Math.min(((mwHigh - mwLow) / maxMw) * 100, 100 - solidPct)

  return (
    <div className="conf-track">
      <div className="conf-solid"     style={{ width: `${solidPct}%` }} />
      <div className="conf-uncertain" style={{ left: `${solidPct}%`, width: `${uncertainPct}%` }} />
    </div>
  )
}

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(targetHour = 15, targetMin = 0) {
  const [secs, setSecs] = useState(0)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const tgt = new Date()
      tgt.setHours(targetHour, targetMin, 0, 0)
      if (now >= tgt) tgt.setDate(tgt.getDate() + 1)
      setSecs(Math.max(0, Math.floor((tgt - now) / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetHour, targetMin])

  const m = String(Math.floor(secs / 60)).padStart(2, '0')
  const s = String(secs % 60).padStart(2, '0')
  const urgent = secs < 300
  return { label: `${m}:${s}`, urgent }
}

// ─── Command bar ──────────────────────────────────────────────────────────────

function CommandBar({ meta }) {
  const { label, urgent } = useCountdown(15, 0)
  const [now, setNow] = useState('')

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  if (!meta) return <div className="cmd-bar cmd-bar--loading">Connecting to fleet...</div>

  const maxMw    = 6
  const solidPct = (meta.mw_low  / maxMw) * 100
  const uncPct   = ((meta.mw_high - meta.mw_low) / maxMw) * 100

  // alerts pill: always rendered, muted at 0
  const alertCount = meta.alerts ?? 0
  const alertClass = alertCount > 0 ? 'cmd-alerts cmd-alerts--active' : 'cmd-alerts cmd-alerts--zero'
  const alertLabel = alertCount > 0
    ? `${alertCount} alert${alertCount > 1 ? 's' : ''}`
    : '0 alerts'

  return (
    <header className="cmd-bar">
      <div className="cmd-left">
        <span className="cmd-cluster">{meta.cluster}</span>
        <span className="cmd-sep" />
        <span className="cmd-time">{now} CET</span>
      </div>

      <div className="cmd-center">
        <div className="cmd-mw">
          <span className="cmd-mw-val">{meta.mw_low.toFixed(1)} — {meta.mw_high.toFixed(1)} MW</span>
          <div className="cmd-mw-bar">
            <div className="cmd-bar-solid"     style={{ width: `${solidPct}%` }} />
            <div className="cmd-bar-uncertain" style={{ left: `${solidPct}%`, width: `${uncPct}%` }} />
          </div>
          <span className="cmd-conf">{meta.conf}% conf</span>
        </div>
      </div>

      <div className="cmd-right">
        <div className="cmd-markets">
          {meta.markets.map(m => (
            <span key={m} className="market-pill">{m}</span>
          ))}
        </div>
        <div className={`cmd-countdown ${urgent ? 'cmd-countdown--urgent' : ''}`}>
          <span className="countdown-label">FCR BID CLOSES</span>
          <span className="countdown-val">{label}</span>
        </div>
        {/* Always rendered — muted at 0, active when > 0 */}
        <div className={alertClass}>{alertLabel}</div>
      </div>
    </header>
  )
}

// ─── Bid Modal ────────────────────────────────────────────────────────────────

const BID_STEPS = ['review', 'confirm', 'submitted']

function BidModal({ asset, onClose }) {
  const [step, setStep] = useState('review')

  // Close on ESC
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isMw   = asset.mw_low != null
  const health = asset.role === 'unclassified' ? 'unknown'
    : asset.role === 'infrastructure'
      ? (asset.online / asset.total >= 0.94 ? 'good' : asset.online / asset.total >= 0.87 ? 'warn' : 'bad')
      : ((asset.conf ?? 80) >= 78 ? 'good' : (asset.conf ?? 80) >= 62 ? 'warn' : 'bad')

  const healthLabel = { good: 'NOMINAL', warn: 'DEGRADED', bad: 'FAULT', unknown: 'UNCLASSIFIED' }
  const healthColor = { good: 'var(--c-teal)', warn: 'var(--c-amber)', bad: 'var(--c-red)', unknown: 'var(--c-text-dim)' }

  const canBid = asset.role !== 'unclassified' && asset.role !== 'infrastructure' && isMw

  return (
    <div className="modal-scrim" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">

        {/* Header */}
        <div className="modal-header">
          <div className="modal-icon">{ICONS[asset.id] ?? ICONS.unknown}</div>
          <div className="modal-title-block">
            <span className="modal-name">{asset.name}</span>
            <span className="modal-role">{ROLE_LABEL[asset.role]}</span>
          </div>
          <div className="modal-health-pill" style={{ color: healthColor[health], borderColor: healthColor[health] }}>
            {healthLabel[health]}
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Counts row */}
        <div className="modal-counts">
          <div className="modal-count">
            <span className="modal-count-val">{asset.online.toLocaleString()}</span>
            <span className="modal-count-label">online</span>
          </div>
          <div className="modal-count">
            <span className="modal-count-val modal-count-val--warn">{asset.degraded}</span>
            <span className="modal-count-label">degraded</span>
          </div>
          <div className="modal-count">
            <span className="modal-count-val modal-count-val--bad">{asset.offline}</span>
            <span className="modal-count-label">offline</span>
          </div>
          {isMw && (
            <div className="modal-count">
              <span className="modal-count-val">{asset.conf}%</span>
              <span className="modal-count-label">confidence</span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {asset.history && asset.history.length >= 2 && (
          <div className="modal-chart">
            <div className="modal-chart-label">24h history</div>
            <Sparkline history={asset.history} id={`${asset.id}-modal`} width={480} height={72} />
          </div>
        )}

        {/* MW bar */}
        {isMw && (
          <div className="modal-mw-section">
            <div className="modal-section-label">AVAILABLE CAPACITY</div>
            <ConfBar mwLow={asset.mw_low} mwHigh={asset.mw_high} />
            <div className="modal-mw-range">
              <span>{asset.mw_low.toFixed(2)} MW guaranteed</span>
              <span className="modal-mw-upper">{asset.mw_high.toFixed(2)} MW potential</span>
            </div>
          </div>
        )}

        {/* Unclassified notice */}
        {asset.role === 'unclassified' && (
          <div className="modal-notice modal-notice--warn">
            Asset is pending classification and excluded from FCR bid calculations.
          </div>
        )}

        {/* Infrastructure notice */}
        {asset.role === 'infrastructure' && (
          <div className="modal-notice modal-notice--info">
            Infrastructure asset — {((asset.online / asset.total) * 100).toFixed(1)}% availability.
            Not eligible for direct bid submission.
          </div>
        )}

        {/* Bid flow */}
        {canBid && (
          <div className="modal-bid-section">
            {step === 'review' && (
              <>
                <div className="modal-section-label">FCR BID</div>
                <div className="modal-bid-summary">
                  Submitting this asset at <b>{asset.mw_low.toFixed(2)} MW</b> guaranteed
                  with <b>{asset.conf}%</b> confidence into the next FCR window.
                </div>
                <div className="modal-actions">
                  <button className="modal-btn modal-btn--ghost" onClick={onClose}>Dismiss</button>
                  <button className="modal-btn modal-btn--primary" onClick={() => setStep('confirm')}>
                    Review bid →
                  </button>
                </div>
              </>
            )}

            {step === 'confirm' && (
              <>
                <div className="modal-section-label">CONFIRM SUBMISSION</div>
                <div className="modal-confirm-grid">
                  <div className="modal-confirm-row">
                    <span>Asset</span><span>{asset.name}</span>
                  </div>
                  <div className="modal-confirm-row">
                    <span>Guaranteed MW</span><span>{asset.mw_low.toFixed(2)} MW</span>
                  </div>
                  <div className="modal-confirm-row">
                    <span>Upper bound</span><span>{asset.mw_high.toFixed(2)} MW</span>
                  </div>
                  <div className="modal-confirm-row">
                    <span>Confidence</span><span>{asset.conf}%</span>
                  </div>
                  <div className="modal-confirm-row">
                    <span>Market</span><span>FCR-N</span>
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="modal-btn modal-btn--ghost" onClick={() => setStep('review')}>← Back</button>
                  <button className="modal-btn modal-btn--confirm" onClick={() => setStep('submitted')}>
                    Submit bid
                  </button>
                </div>
              </>
            )}

            {step === 'submitted' && (
              <div className="modal-submitted">
                <div className="modal-submitted-icon">✓</div>
                <div className="modal-submitted-title">Bid submitted</div>
                <div className="modal-submitted-sub">
                  {asset.name} queued for FCR-N at {asset.mw_low.toFixed(2)} MW
                </div>
                <button className="modal-btn modal-btn--ghost" style={{ marginTop: '1.5rem' }} onClick={onClose}>
                  Close
                </button>
              </div>
            )}
          </div>
        )}

        {/* Non-biddable dismiss */}
        {!canBid && (
          <div className="modal-actions modal-actions--end">
            <button className="modal-btn modal-btn--ghost" onClick={onClose}>Close</button>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Asset card ───────────────────────────────────────────────────────────────

function health(asset) {
  if (asset.role === 'unclassified') return 'unknown'
  if (asset.role === 'infrastructure') {
    const pct = asset.online / asset.total
    if (pct >= 0.94) return 'good'
    if (pct >= 0.87) return 'warn'
    return 'bad'
  }
  const c = asset.conf ?? 80
  if (c >= 78) return 'good'
  if (c >= 62) return 'warn'
  return 'bad'
}

function statRow(history, mw) {
  if (!history || !history.length) return null
  const vals = history.map(d => mw ? (d.mw ?? 0) : d.online).filter(Boolean)
  if (!vals.length) return null
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  return { avg, min, max }
}

function AssetCard({ asset, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const h = health(asset)
  const isMw = asset.mw_low != null
  const stats = statRow(asset.history, isMw)
  const unit  = isMw ? 'MW' : 'devices'

  return (
    <>
      <div
        className={`card card--${h} ${asset.role === 'unclassified' ? 'card--unknown' : ''} ${hovered ? 'card--hovered' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => onSelect(asset)}
        style={{ cursor: 'pointer' }}
      >
        <div className="card-top">
          <div className="card-icon">{ICONS[asset.id]}</div>
          <div className="card-meta">
            <span className="card-name">{asset.name}</span>
            <span className="card-role">{ROLE_LABEL[asset.role]}</span>
          </div>
          <div className={`card-dot card-dot--${h}`} />
        </div>

        <div className="card-counts">
          <div className="count count--on">
            <span className="count-val">{asset.online.toLocaleString()}</span>
            <span className="count-label">online</span>
          </div>
          <div className="count count--deg">
            <span className="count-val">{asset.degraded}</span>
            <span className="count-label">degraded</span>
          </div>
          <div className="count count--off">
            <span className="count-val">{asset.offline}</span>
            <span className="count-label">offline</span>
          </div>
        </div>

        {isMw ? (
          <div className="card-mw">
            <ConfBar mwLow={asset.mw_low} mwHigh={asset.mw_high} />
            <div className="card-mw-label">
              <span>{asset.mw_low.toFixed(2)} — {asset.mw_high.toFixed(2)} MW</span>
              <span className="card-conf">{asset.conf}%</span>
            </div>
          </div>
        ) : asset.role === 'unclassified' ? (
          <div className="card-unknown-label">excluded from bid / awaiting classification</div>
        ) : (
          <div className="card-infra-label">
            {((asset.online / asset.total) * 100).toFixed(1)}% availability
          </div>
        )}

        {/* Hover overlay — peek detail, no layout shift */}
        {hovered && (
          <div className="card-hover-detail">
            {asset.history && asset.history.length >= 2 && (
              <div className="detail-chart">
                <Sparkline history={asset.history} id={asset.id} />
              </div>
            )}
            {stats && (
              <div className="detail-stats">
                <span>avg <b>{isMw ? stats.avg.toFixed(2) : Math.round(stats.avg)}</b> {unit}</span>
                <span>min <b>{isMw ? stats.min.toFixed(2) : stats.min}</b></span>
                <span>max <b>{isMw ? stats.max.toFixed(2) : stats.max}</b></span>
              </div>
            )}
            <div className="card-hover-cta">click to manage</div>
          </div>
        )}
      </div>
    </>
  )
}

// ─── Asset grid ───────────────────────────────────────────────────────────────

function AssetGrid({ assets, onSelect }) {
  if (!assets) return <div className="loading">Fetching asset data...</div>

  const ORDER = ['gateways', 'batteries', 'inverters', 'heatpumps', 'wallboxes', 'unknown']
  const sorted = ORDER.map(id => assets.find(a => a.id === id)).filter(Boolean)

  return (
    <div className="grid">
      {sorted.map(a => <AssetCard key={a.id} asset={a} onSelect={onSelect} />)}
    </div>
  )
}

// ─── Live feed ────────────────────────────────────────────────────────────────

function LiveFeed({ events }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [events.length])

  return (
    <div className="feed" ref={ref}>
      {events.map((e, i) => (
        <div key={i} className="feed-row">
          <span className="feed-ts">{e.ts}</span>
          <span className="feed-type" style={{ color: EVENT_COLOR[e.type] ?? 'var(--c-text)' }}>
            {e.type}
          </span>
          <span className="feed-asset">{e.asset}</span>
          <span className="feed-msg">{e.msg}</span>
          {e.lat_ms && <span className="feed-lat">{e.lat_ms}ms</span>}
        </div>
      ))}
      {events.length === 0 && <div className="loading">Waiting for events...</div>}
    </div>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [fleet,       setFleet]       = useState(null)
  const [feed,        setFeed]        = useState([])
  const [view,        setView]        = useState('fleet')
  const [error,       setError]       = useState(false)
  const [selectedAsset, setSelectedAsset] = useState(null)

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/fleet`)
        if (!r.ok) throw new Error()
        const d = await r.json()
        if (alive) { setFleet(d); setError(false) }
      } catch {
        if (alive) setError(true)
      }
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  useEffect(() => {
    let alive = true
    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/feed`)
        if (!r.ok) return
        const d = await r.json()
        if (alive) setFeed(d)
      } catch {}
    }
    poll()
    const id = setInterval(poll, 2500)
    return () => { alive = false; clearInterval(id) }
  }, [])

  const handleSelect   = useCallback(asset => setSelectedAsset(asset), [])
  const handleModalClose = useCallback(() => setSelectedAsset(null), [])

  return (
    <div className="app">
      <CommandBar meta={fleet?.meta} />

      <div className="view-bar">
        <div className="view-tabs">
          <button className={`view-tab ${view === 'fleet' ? 'active' : ''}`} onClick={() => setView('fleet')}>
            Fleet Grid
          </button>
          <button className={`view-tab ${view === 'feed' ? 'active' : ''}`} onClick={() => setView('feed')}>
            Live Feed
            {feed.length > 0 && <span className="feed-badge" />}
          </button>
        </div>
        {error && <span className="error-pill">backend unreachable</span>}
      </div>

      <main className="main">
        {view === 'fleet'
          ? <AssetGrid assets={fleet?.assets} onSelect={handleSelect} />
          : <LiveFeed events={feed} />
        }
      </main>

      {/* Bid modal — rendered at app root so it sits above everything */}
      {selectedAsset && (
        <BidModal asset={selectedAsset} onClose={handleModalClose} />
      )}
    </div>
  )
}