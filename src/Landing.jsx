import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, Loader2 } from 'lucide-react'
import { createPledge } from './api.js'
import Scene from './components/Scene.jsx'

gsap.registerPlugin(ScrollTrigger)

const PLATFORMS = [
  { id: 'bluesky', label: 'Bluesky', ph: 'maya.bsky.social', hint: 'Checked automatically from your public feed.' },
  { id: 'tiktok', label: 'TikTok', ph: '@maya', hint: 'Paste each day’s post link and the agent verifies it.' },
  { id: 'youtube', label: 'YouTube', ph: 'UCxxxxxxxxxxxxxxxxxxxxxx', hint: 'Your channel ID (starts with UC, 24 characters). Checked via RSS.' },
  { id: 'instagram', label: 'IG', soon: true },
  { id: 'x', label: 'X', soon: true },
]

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export default function Landing({ params }) {
  useEffect(() => {
    if (reduced()) return
    const lenis = new Lenis()
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (t) => lenis.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => { gsap.ticker.remove(tick); lenis.destroy() }
  }, [])

  return (
    <main>
      <Hero cancelled={params.get('cancelled') === '1'} />
      <Scene />
      <Chapters />
      <Footer />
    </main>
  )
}

function Hero({ cancelled }) {
  return (
    <section className="relative min-h-svh px-4 sm:px-8 pt-10 pb-20 max-w-6xl mx-auto grid lg:grid-cols-[1.3fr_1fr] gap-12 items-center">
      <div aria-hidden className="pointer-events-none absolute -top-40 right-0 h-[480px] w-[480px] rounded-full bg-gold/10 blur-3xl" />
      <div className="relative">
        <p className="eyebrow mb-6">Post or Pay</p>
        <h1 className="headline text-[2.5rem] sm:text-6xl xl:text-7xl">
          Post every day.<br />Or it costs you.<br /><span className="serif text-gold">literally.</span>
        </h1>
        <p className="mt-8 text-lg text-muted max-w-md">
          Put £5 to £20 on a 7-day posting streak. An agent checks your public posts each day. Keep the streak and you pay nothing.
        </p>
        <a href="#/p/demo" className="mt-6 inline-flex min-h-11 items-center gap-2 text-ink underline-offset-4 hover:underline">
          See a live example <ArrowRight size={16} aria-hidden />
        </a>
      </div>
      <StartForm cancelled={cancelled} />
    </section>
  )
}

function StartForm({ cancelled }) {
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('bluesky')
  const [handle, setHandle] = useState('')
  const [stake, setStake] = useState(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(cancelled ? 'Checkout was cancelled. Your card was not saved.' : '')
  const p = PLATFORMS.find((x) => x.id === platform)

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const { checkoutUrl } = await createPledge({ name: name.trim(), platform, handle: handle.trim(), stake: stake * 100 })
      location.href = checkoutUrl
    } catch (err) {
      setError(err.message); setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="relative rounded-3xl border border-divider bg-surface/80 backdrop-blur p-6 sm:p-8 space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm text-muted mb-2">Your name</label>
        <input id="name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya"
          className="w-full min-h-12 rounded-xl bg-bg border border-divider px-4 text-ink placeholder:text-muted/60" />
      </div>
      <fieldset>
        <legend className="block text-sm text-muted mb-2">Platform</legend>
        <div className="grid grid-cols-5 gap-1 rounded-xl bg-bg border border-divider p-1">
          {PLATFORMS.map((x) => (
            <button key={x.id} type="button" disabled={x.soon} aria-pressed={platform === x.id}
              onClick={() => { setPlatform(x.id); setHandle('') }}
              className={`min-h-11 rounded-lg text-xs sm:text-sm font-medium flex flex-col items-center justify-center leading-tight ${
                platform === x.id ? 'bg-gold text-bg' : x.soon ? 'text-muted/50 cursor-not-allowed' : 'text-ink hover:bg-white/5'}`}>
              {x.label}{x.soon && <span className="text-[10px] font-normal">soon</span>}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="handle" className="block text-sm text-muted mb-2">{platform === 'youtube' ? 'Channel ID' : 'Handle'}</label>
        <input id="handle" required value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={p.ph} aria-describedby="handle-hint"
          autoCapitalize="none" autoCorrect="off" spellCheck={false}
          className="w-full min-h-12 rounded-xl bg-bg border border-divider px-4 text-ink placeholder:text-muted/60" />
        <p id="handle-hint" className="mt-2 text-xs text-muted">{p.hint}</p>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="stake" className="text-sm text-muted">Stake</label>
          <output htmlFor="stake" className="text-2xl font-semibold tracking-tight"><span className="text-gold">£{stake}</span> on the line</output>
        </div>
        <input id="stake" type="range" min={5} max={20} step={1} value={stake} onChange={(e) => setStake(+e.target.value)} />
      </div>
      <button type="submit" disabled={busy}
        className="w-full min-h-13 rounded-full bg-gold text-bg font-semibold text-lg inline-flex items-center justify-center gap-2 hover:bg-gold-light disabled:opacity-60">
        {busy ? <><Loader2 className="animate-spin" size={18} aria-hidden /> Opening checkout…</> : <>Start my streak <ArrowRight size={18} aria-hidden /></>}
      </button>
      <p className="text-xs text-muted text-center">Card saved via Stripe test mode. Nothing is charged unless you break the streak.</p>
      <p role="alert" aria-live="assertive" className="text-sm text-danger min-h-5">{error}</p>
    </form>
  )
}

const CHAPTERS = [
  ['01', 'Commit', 'Pick a platform, a handle and a stake. Stripe saves your card. Nothing is charged yet.'],
  ['02', 'Agent checks', 'Each day an agent reads your public posts: Bluesky automatically, YouTube by RSS, TikTok by the link you paste.'],
  ['03', 'Insure or pay', 'Miss a day and the streak cracks. Patch it with Streak Insurance for £1, or lose the stake at the end of the week.'],
]

function Chapters() {
  return (
    <section className="px-4 sm:px-8 py-32 max-w-6xl mx-auto">
      <p className="eyebrow mb-4">How it works</p>
      <h2 className="headline text-4xl sm:text-6xl mb-16">Seven days. <span className="serif text-gold">No excuses.</span></h2>
      <ol className="grid md:grid-cols-3 gap-10">
        {CHAPTERS.map(([n, t, d]) => (
          <li key={n} className="border-t border-divider pt-6">
            <span className="text-gold text-sm font-mono">{n}</span>
            <h3 className="text-2xl font-semibold tracking-tight mt-3">{t}</h3>
            <p className="text-muted mt-3 leading-relaxed">{d}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-divider px-4 py-10 text-center text-sm text-muted">
      Hackathon demo · Stripe test mode · no real money
    </footer>
  )
}
