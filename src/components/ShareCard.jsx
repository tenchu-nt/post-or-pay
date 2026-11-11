import { useState } from 'react'
import { Copy, Share2 } from 'lucide-react'
import Streak from './Streak.jsx'

export const pounds = (p) => `£${(p / 100).toFixed(p % 100 ? 2 : 0)}`

export function verdictLine(pledge) {
  if (pledge.status === 'won') return 'Streak kept. Paid nothing.'
  if (pledge.status === 'lost') return `Streak broken. ${pounds(pledge.stake)} forfeited.`
  const done = pledge.days.filter((d) => d.status === 'posted' || d.status === 'insured').length
  return `${done} of ${pledge.length} days so far`
}

export default function ShareCard({ pledge, actions = true }) {
  const [copied, setCopied] = useState('')
  const url = `${location.origin}/#/w/${pledge.witnessId}`

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied('Witness link copied.') }
    catch { setCopied(`Copy this link: ${url}`) }
  }
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Post or Pay', text: `Watch my streak: ${pounds(pledge.stake)} on the line`, url }); return }
      catch (e) { if (e.name === 'AbortError') return }
    }
    copy()
  }

  return (
    <div>
      <div className="relative mx-auto w-full max-w-sm aspect-[1080/1350] rounded-3xl overflow-hidden border border-divider bg-surface p-6 flex flex-col justify-between shadow-[0_1px_2px_rgb(22_20_15/0.04),0_12px_32px_-12px_rgb(22_20_15/0.12)]">
        <div className="relative">
          <p className="eyebrow">Post or Pay</p>
          <p className="mt-4 text-2xl font-semibold tracking-tight break-all">{pledge.handle}</p>
          <p className="text-sm text-muted capitalize">{pledge.platform} · {pledge.length}-day streak</p>
        </div>
        <div className="relative"><Streak pledge={pledge} /></div>
        <div className="relative">
          <p className="headline text-4xl tabular-nums">{pounds(pledge.stake)} <span className="text-muted">on the line</span></p>
          <p className="text-lg mt-2 text-muted">{verdictLine(pledge)}</p>
        </div>
      </div>
      {actions && (
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          <button onClick={copy} className="btn btn-ghost">
            <Copy size={16} aria-hidden /> Copy witness link
          </button>
          <button onClick={share} className="btn btn-ghost">
            <Share2 size={16} aria-hidden /> Share
          </button>
          <p aria-live="polite" className="w-full text-center text-sm text-muted break-all min-h-5">{copied}</p>
        </div>
      )}
    </div>
  )
}
