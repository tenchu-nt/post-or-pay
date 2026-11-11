import { useEffect, useState } from 'react'
import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, Loader2, Rss, Mail, Mic } from 'lucide-react'
import { LinkedInLogo, InstagramLogo, TikTokLogo, XLogo, YouTubeLogo } from './components/BrandIcons.jsx'
import { createPledge } from './api.js'
import Scene from './components/Scene.jsx'

gsap.registerPlugin(ScrollTrigger)

export const PLATFORMS = [
  { id: 'linkedin', label: 'LinkedIn', Icon: LinkedInLogo, ph: '@maya or Maya Patel', hint: 'You paste each post link. Logged as link proof: LinkedIn can’t be checked automatically.' },
  { id: 'instagram', label: 'Instagram', Icon: InstagramLogo, ph: '@maya', hint: 'You paste each post link. Logged as link proof: Instagram can’t be checked automatically.' },
  { id: 'tiktok', label: 'TikTok', Icon: TikTokLogo, ph: '@maya', hint: 'Paste each day’s post link. The agent verifies it.' },
  { id: 'x', label: 'X', Icon: XLogo, ph: '@maya', hint: 'Paste each day’s post link. Verified through X’s public embed.' },
  { id: 'youtube', label: 'YouTube', Icon: YouTubeLogo, ph: 'UCxxxxxxxxxxxxxxxxxxxxxx', hint: 'Channel ID: starts with UC, 24 characters. Checked by RSS.' },
  { id: 'blog', label: 'Blog', Icon: Rss, ph: 'https://maya.blog/feed.xml', hint: 'RSS or Atom feed URL. Checked automatically.' },
  { id: 'newsletter', label: 'Newsletter', Icon: Mail, ph: 'https://maya.substack.com/feed', hint: 'RSS or Atom feed URL. Checked automatically.' },
  { id: 'podcast', label: 'Podcast', Icon: Mic, ph: 'https://feeds.example.com/maya', hint: 'RSS feed URL. Checked automatically.' },
]
const FEED = ['blog', 'newsletter', 'podcast']
export const platformLabel = (id) => PLATFORMS.find((x) => x.id === id)?.label || id

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
      <div className="relative">
        <p className="eyebrow mb-6 inline-flex items-center gap-2"><span aria-hidden className="h-2 w-2 rounded-full bg-gold" />Post or Pay · Stripe test mode</p>
        <h1 className="headline text-[2.5rem] sm:text-6xl xl:text-7xl">
          Post every day for 7&nbsp;days.<br /><span className="text-muted">Miss one and it costs you.</span>
        </h1>
        <p className="mt-8 text-lg text-muted max-w-md leading-relaxed">
          Stake £5 to £20 on a 7-day streak. An agent checks your posts each day. Keep the streak and you pay nothing.
        </p>
        <a href="#/p/demo" className="link-draw mt-6 inline-flex min-h-11 items-center gap-2 font-medium text-ink">
          See a live example <ArrowRight size={16} aria-hidden />
        </a>
      </div>
      <StartForm cancelled={cancelled} />
    </section>
  )
}

function StartForm({ cancelled }) {
  const [name, setName] = useState('')
  const [platform, setPlatform] = useState('linkedin')
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
    <form onSubmit={submit} className="relative rounded-3xl border border-divider bg-surface p-6 sm:p-8 space-y-6 shadow-[0_1px_2px_rgb(22_20_15/0.04),0_12px_32px_-12px_rgb(22_20_15/0.12)]">
      <div>
        <label htmlFor="name" className="block text-sm text-muted mb-2">Your name</label>
        <input id="name" required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="Maya"
          className="field" />
      </div>
      <fieldset>
        <legend className="block text-sm text-muted mb-2">Platform</legend>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-bg border border-divider p-1">
          {PLATFORMS.map((x) => (
            <button key={x.id} type="button" aria-pressed={platform === x.id}
              onClick={() => { setPlatform(x.id); setHandle('') }}
              className={`min-h-14 rounded-lg text-[11px] sm:text-xs font-medium flex flex-col items-center justify-center gap-1 leading-tight ${
                platform === x.id ? 'bg-ink text-bg' : 'text-ink hover:bg-ink/5 active:scale-[0.97]'} transition-[background-color,color,transform] duration-150`}>
              <x.Icon size={16} aria-hidden />{x.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="handle" className="block text-sm text-muted mb-2">{platform === 'youtube' ? 'Channel ID' : FEED.includes(platform) ? 'Feed URL' : 'Handle'}</label>
        <input id="handle" required value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={p.ph} aria-describedby="handle-hint"
          autoCapitalize="none" autoCorrect="off" spellCheck={false} inputMode={FEED.includes(platform) ? 'url' : undefined}
          className="field" />
        <p id="handle-hint" className="mt-2 text-xs text-muted">{p.hint}</p>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="stake" className="text-sm text-muted">Stake</label>
          <output htmlFor="stake" className="text-2xl font-semibold tracking-tight tabular-nums">£{stake} <span className="text-base font-normal text-muted">on the line</span></output>
        </div>
        <input id="stake" type="range" min={5} max={20} step={1} value={stake} onChange={(e) => setStake(+e.target.value)} />
      </div>
      <button type="submit" disabled={busy}
        className="btn btn-primary w-full min-h-13 text-lg font-semibold">
        {busy ? <><Loader2 className="animate-spin" size={18} aria-hidden /> Opening checkout…</> : <>Start my streak <ArrowRight size={18} aria-hidden /></>}
      </button>
      <p className="text-xs text-muted text-center">Stripe test mode: use card 4242 4242 4242 4242. No real money moves. Nothing is charged unless you break the streak.</p>
      <p role="alert" aria-live="assertive" className="text-sm text-danger min-h-5">{error}</p>
    </form>
  )
}

const CHAPTERS = [
  ['01', 'Commit', 'Pick a platform and a stake from £5 to £20. Stripe saves your card. Nothing is charged.'],
  ['02', 'Agent checks', 'Each day an agent checks for a new post. YouTube and feeds are read automatically. For TikTok and X you paste the link and it is verified.'],
  ['03', 'Insure or pay', 'Miss a day and it cracks. Patch it with Streak Insurance for £1, or lose the stake when the week ends.'],
]

function Chapters() {
  return (
    <section className="px-4 sm:px-8 py-32 max-w-6xl mx-auto">
      <p className="eyebrow mb-4">How it works</p>
      <h2 className="headline text-4xl sm:text-6xl mb-16 max-w-3xl">Three steps from stake to settled week.</h2>
      <ol className="grid md:grid-cols-3 gap-10">
        {CHAPTERS.map(([n, t, d]) => (
          <li key={n} className="border-t-2 border-ink pt-6">
            <span className="text-muted text-sm font-mono">{n}</span>
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
      Hackathon demo · Stripe test mode · no real money moves
    </footer>
  )
}
