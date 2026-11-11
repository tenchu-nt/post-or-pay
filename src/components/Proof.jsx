import { CreditCard, Check } from 'lucide-react'
import { pounds, fmtDay } from './ShareCard.jsx'

const WHAT = { insurance: 'Streak Insurance', stake: 'Stake forfeited' }
const PILL = { succeeded: 'bg-ink text-bg', processing: 'bg-gold/30 text-ink', requires_payment_method: 'bg-danger/15 text-danger', canceled: 'bg-ink/10 text-muted' }
// Simulated charges carry a plain date, or none (an example stake).
const time = (iso) => !iso ? 'Simulated' : iso.length <= 10 ? fmtDay(iso) : new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function step(p) {
  if (p.status === 'pending') return 0
  if (p.status === 'won' || p.status === 'lost' || p.dayIndex >= 6) return 3
  return p.days.some((d) => d.status === 'missed' || d.status === 'insured') ? 2 : 1
}

export default function Proof({ pledge, receipts, error }) {
  const now = step(pledge)
  const steps = [
    ['Card saved', 'Stripe stores it. Nothing charged.'],
    ['Daily check', 'The agent looks for today’s post.'],
    ['Miss a day', `Insure it for ${pounds(pledge.insurancePrice || 100)}.`],
    ['Day 7', `Streak kept: £0. Broken: ${pounds(pledge.stake)} charged.`],
  ]
  const card = receipts?.card
  return (
    <section aria-labelledby="proof-h" className="mt-8 rounded-3xl border border-divider bg-white p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="proof-h" className="text-lg font-semibold tracking-tight">Proof</h2>
        <span className="eyebrow">{receipts?.source === 'simulated' ? 'Example data' : 'Live from Stripe'}</span>
      </div>

      {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p>
        : !receipts ? <div aria-busy="true" aria-label="Loading receipts" className="mt-4 space-y-2"><div className="skeleton h-5 w-3/4" /><div className="skeleton h-12" /></div>
        : <>
          <p className="mt-4 flex items-center gap-2 text-sm">
            <CreditCard size={16} aria-hidden className="shrink-0" />
            {card ? <span>Card saved: <span className="capitalize">{card.brand}</span> •••• {card.last4} · Stripe test mode</span> : <span className="text-muted">No card saved yet · Stripe test mode</span>}
          </p>
          {receipts.payments?.length ? (
            <ul className="mt-4 divide-y divide-divider border-y border-divider">
              {receipts.payments.map((x, i) => (
                <li key={x.id + i} className="py-3 grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-1">
                  <span className="font-semibold tabular-nums">{pounds(x.amount)}</span>
                  <span className="text-sm">{WHAT[x.description] || x.description}</span>
                  <span className={`text-xs rounded-full px-2 py-0.5 ${PILL[x.status] || 'bg-ink/10 text-ink'}`}>{x.status.replace(/_/g, ' ')}</span>
                  <span className="col-span-3 flex flex-wrap justify-between gap-2 text-xs text-muted">
                    <time dateTime={x.created}>{time(x.created)}</time>
                    <code className="font-mono break-all">{x.id}</code>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-4 text-sm text-muted">No charges yet.</p>}
        </>}

      <h3 className="mt-6 text-sm font-semibold">What happens now</h3>
      <ol className="mt-3 space-y-3">
        {steps.map(([t, d], i) => (
          <li key={t} aria-current={i === now ? 'step' : undefined} className="flex gap-3">
            <span aria-hidden className={`mt-0.5 h-6 w-6 shrink-0 rounded-full border-2 grid place-items-center text-xs font-semibold transition-colors duration-200 ${
              i < now ? 'bg-ink border-ink text-bg' : i === now ? 'bg-gold border-ink text-ink' : 'border-divider text-muted'}`}>
              {i < now ? <Check size={12} /> : i + 1}
            </span>
            <span className={i === now ? '' : 'text-muted'}>
              <span className="block text-sm font-medium">{t}{i === now && <span className="sr-only"> (current step)</span>}</span>
              <span className="block text-sm">{d}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
