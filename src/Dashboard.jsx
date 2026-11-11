import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Loader2, RotateCcw, ShieldCheck, Search, FastForward, Flag } from 'lucide-react'
import * as api from './api.js'
import Streak from './components/Streak.jsx'
import ShareCard, { pounds, verdictLine } from './components/ShareCard.jsx'
import Proof from './components/Proof.jsx'
import { Footer, platformLabel } from './Landing.jsx'

const STATUS = { pending: 'Awaiting card', active: 'Live', won: 'Won', lost: 'Lost' }
const LINK_PLATFORMS = ['tiktok', 'x', 'instagram', 'linkedin']
const PROOF_ONLY = ['instagram', 'linkedin']
const LINK_PH = { tiktok: 'https://www.tiktok.com/@you/video/…', x: 'https://x.com/you/status/…', instagram: 'https://www.instagram.com/p/…', linkedin: 'https://www.linkedin.com/posts/…' }

export default function Dashboard({ id, witnessId, params }) {
  const readOnly = !!witnessId
  const [pledge, setPledge] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [running, setRunning] = useState('')
  const [actionError, setActionError] = useState(null)
  const [verdict, setVerdict] = useState('')
  const [askLink, setAskLink] = useState(false)
  const [link, setLink] = useState('')
  const started = useRef(false)
  const [receipts, setReceipts] = useState(null)
  const [receiptsError, setReceiptsError] = useState('')
  const pid = id || null
  async function loadReceipts() {
    if (!pid && !witnessId) return
    setReceiptsError('')
    try { setReceipts(await (pid ? api.getReceipts(pid) : api.getWitnessReceipts(witnessId))) } catch (e) { setReceiptsError(e.message) }
  }
  useEffect(() => { if (pledge && !receipts) loadReceipts() }, [pledge])

  async function load() {
    setLoadError('')
    try {
      const sessionId = params?.get('session_id')
      let res
      if (readOnly) res = await api.getWitness(witnessId)
      else if (sessionId) {
        res = await api.confirmPledge(id, sessionId)
        history.replaceState(null, '', `#/p/${id}`)
      } else res = await api.getPledge(id)
      setPledge(res.pledge)
    } catch (e) { setLoadError(e.message) }
  }

  useEffect(() => {
    if (started.current) return // StrictMode runs effects twice; confirm must fire once
    started.current = true
    load()
  }, [])

  async function run(key, fn, describe) {
    if (running) return
    setRunning(key); setActionError(null)
    try {
      const res = await fn()
      if (res.pledge) setPledge(res.pledge)
      setVerdict(describe(res))
    } catch (e) {
      setActionError({ key, msg: e.message, retry: () => run(key, fn, describe) })
    } finally { setRunning('') }
  }

  const check = () => {
    if (needsLink && !askLink) { setAskLink(true); return }
    run('check', () => api.checkToday(pledge.id, needsLink ? link.trim() : undefined), (r) => {
      setAskLink(false); setLink('')
      return `${r.result.posted ? 'Posted.' : 'No post found.'} ${r.result.verdict || ''}`.trim()
    })
  }
  const insure = (date) => run('insure:' + date, () => api.insureDay(pledge.id, date), () => { loadReceipts(); return `Day ${date} insured. ${pounds(pledge.insurancePrice || 100)} charged (test mode).` })
  const settle = () => run('settle', () => api.settleWeek(pledge.id), (r) => (loadReceipts(), r.outcome === 'won') ? 'Week settled. Streak kept: you pay nothing.' : `Week settled. Streak broken: ${pounds(pledge.stake)} charged (test mode).`)
  const advance = () => run('advance', () => api.advanceDay(pledge.id), (r) => `Demo clock moved to day ${r.pledge.dayIndex + 1}.`)

  if (loadError) return (
    <Shell>
      <div className="py-24 text-center">
        <p className="eyebrow mb-4">Not found</p>
        <h1 className="headline text-4xl sm:text-5xl">This streak isn’t here.</h1>
        <p role="alert" className="mt-4 text-muted">{loadError}</p>
        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <Btn onClick={() => { setLoadError(''); load() }}><RotateCcw size={16} aria-hidden /> Retry</Btn>
          <a href="#/" className="btn btn-primary">Start your own <ArrowRight size={16} aria-hidden /></a>
        </div>
      </div>
    </Shell>
  )

  if (!pledge) return (
    <Shell>
      <div aria-busy="true" aria-label="Loading streak" className="py-12 space-y-6">
        <div className="skeleton h-10 w-2/3" />
        <div className="grid grid-cols-7 gap-2">{Array.from({ length: 7 }, (_, i) => <div key={i} className="skeleton aspect-square" />)}</div>
        <div className="skeleton h-32" />
      </div>
    </Shell>
  )

  const active = pledge.status === 'active'
  const needsLink = LINK_PLATFORMS.includes(pledge.platform)
  const missed = pledge.days.filter((d) => d.status === 'missed')

  return (
    <Shell>
      <section className="py-10 grid lg:grid-cols-[1.2fr_1fr] gap-12">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="eyebrow">{readOnly ? 'Witness view' : 'Your streak'}</span>
            {pledge.isDemo && <span className="text-xs rounded-full border border-ink text-ink px-2 py-0.5">Example</span>}
            <span className={`text-xs rounded-full px-2 py-0.5 ${pledge.status === 'lost' ? 'bg-danger/20 text-danger' : 'bg-ink/5'}`}>{STATUS[pledge.status]}</span>
          </div>
          <h1 className="headline text-4xl sm:text-6xl break-words">
            {pledge.name}’s <span className="text-muted">seven days.</span>
          </h1>
          <p className="mt-4 text-muted break-all"><span>{platformLabel(pledge.platform)}</span> · {pledge.handle} · Day {Math.min(pledge.dayIndex + 1, pledge.length)} of {pledge.length} · {pledge.today}</p>
          <p className="mt-6 text-3xl font-semibold tracking-tight tabular-nums">{pounds(pledge.stake)} <span className="text-muted font-normal">on the line</span></p>
          <p className="mt-1 text-muted">{verdictLine(pledge)}</p>

          {pledge.status === 'pending' && !readOnly && (
            <div role="alert" className="mt-6 rounded-2xl border border-danger/50 bg-danger/10 p-4">
              <p className="font-semibold">Card not saved yet</p>
              <p className="text-sm text-muted mt-1">Checkout did not finish, so the streak has not started. <a href="#/" className="font-medium underline underline-offset-4">Try again</a></p>
            </div>
          )}

          <div className="mt-8"><Streak pledge={pledge} size="lg" /></div>

          <ul className="mt-6 space-y-2 text-sm">
            {pledge.days.filter((d) => d.verdict).map((d) => (
              <li key={d.date} className="text-muted break-words"><span className="text-ink">{d.date}</span> · {d.verdict}
                {d.evidenceUrl && <> · <a href={d.evidenceUrl} target="_blank" rel="noreferrer" className="font-medium text-ink underline underline-offset-4">evidence</a></>}</li>
            ))}
          </ul>

          {!readOnly && active && (
            <div className="mt-8 space-y-4">
              {askLink && (
                <div>
                  <label htmlFor="tlink" className="block text-sm text-muted mb-2">Paste today’s post link</label>
                  <input id="tlink" value={link} onChange={(e) => setLink(e.target.value)} placeholder={LINK_PH[pledge.platform]} inputMode="url" aria-describedby="tlink-hint"
                    className="field" />
                  {pledge.platform === 'instagram' && <p id="tlink-hint" className="mt-2 text-xs text-muted">Logged as link proof. {pledge.platform === 'linkedin' ? 'LinkedIn' : 'Instagram'} posts can’t be verified automatically.</p>}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Btn primary onClick={check} busy={running === 'check'} disabled={!!running || (askLink && !link.trim())}>
                  <Search size={16} aria-hidden /> {askLink ? 'Verify post' : 'Check today'}
                </Btn>
                {missed.map((d) => (
                  <Btn key={d.date} onClick={() => insure(d.date)} busy={running === 'insure:' + d.date} disabled={!!running}>
                    <ShieldCheck size={16} aria-hidden /> Insure {d.date.slice(5)} for {pounds(pledge.insurancePrice || 100)}
                  </Btn>
                ))}
                {pledge.dayIndex >= 6 && (
                  <Btn onClick={settle} busy={running === 'settle'} disabled={!!running}><Flag size={16} aria-hidden /> Settle week</Btn>
                )}
              </div>
              <div className="rounded-2xl border border-dashed border-divider bg-white/50 p-4">
                <p className="text-xs text-muted mb-2">Demo control: skips the clock forward one day so you can see a full week in minutes.</p>
                <Btn onClick={advance} busy={running === 'advance'} disabled={!!running}><FastForward size={16} aria-hidden /> Demo: simulate next day</Btn>
              </div>
            </div>
          )}

          <div aria-live="polite" className="mt-6 min-h-6">
            {verdict && <p className="rounded-2xl bg-white border border-divider px-4 py-3">{verdict}</p>}
          </div>
          <div aria-live="assertive">
            {actionError && (
              <div role="alert" className="mt-2 rounded-2xl border border-danger/50 bg-danger/10 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                <p className="text-danger">{actionError.msg}</p>
                <Btn onClick={actionError.retry} disabled={!!running}><RotateCcw size={16} aria-hidden /> Retry</Btn>
              </div>
            )}
          </div>

          {pledge.contract && (
            <details className="mt-10 rounded-2xl border border-divider bg-white p-5" open>
              <summary className="cursor-pointer font-semibold min-h-6">The contract</summary>
              <p className="mt-3 text-muted whitespace-pre-line leading-relaxed">{pledge.contract}</p>
            </details>
          )}

          {readOnly && (
            <a href="#/" className="btn btn-primary mt-10 min-h-12 px-6">
              Start your own <ArrowRight size={18} aria-hidden />
            </a>
          )}
        </div>
        <div><ShareCard pledge={pledge} /><Proof pledge={pledge} receipts={receipts} error={receiptsError} /></div>
      </section>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <>
      <header className="px-4 sm:px-8 max-w-6xl mx-auto flex items-center justify-between min-h-16">
        <a href="#/" className="font-semibold tracking-tight min-h-11 inline-flex items-center"><span aria-hidden className="mr-2 h-2.5 w-2.5 rounded-full bg-gold ring-1 ring-ink" />Post or Pay</a>
      </header>
      <main className="px-4 sm:px-8 max-w-6xl mx-auto">{children}</main>
      <Footer />
    </>
  )
}

function Btn({ children, primary, busy, ...rest }) {
  return (
    <button {...rest} aria-busy={busy || undefined}
      className={`btn ${primary ? 'btn-primary' : 'btn-ghost'}`}>
      {busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}{children}
    </button>
  )
}
