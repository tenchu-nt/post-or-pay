import { Check, ShieldCheck, Zap } from 'lucide-react'

const LABEL = { posted: 'Posted', insured: 'Insured', missed: 'Missed', pending: 'Pending' }

export default function Streak({ pledge, size = 'md' }) {
  const big = size === 'lg'
  return (
    <ol className="grid grid-cols-7 gap-1.5 sm:gap-2" aria-label="Streak">
      {pledge.days.map((d, i) => {
        const today = i === pledge.dayIndex && pledge.status === 'active'
        const cls = d.status === 'posted' || d.status === 'insured' ? 'bg-gold text-bg border-gold'
          : d.status === 'missed' ? 'border-danger text-danger bg-danger/10' : 'border-divider text-muted'
        return (
          <li key={d.date} title={d.verdict || LABEL[d.status]}
            className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center ${cls} ${today ? 'ring-2 ring-ink ring-offset-2 ring-offset-bg' : ''}`}>
            <span className="sr-only">Day {i + 1}, {d.date}: {LABEL[d.status]}{today ? ' (today)' : ''}</span>
            <span aria-hidden className={`font-semibold ${big ? 'text-lg' : 'text-xs'}`}>{i + 1}</span>
            {d.status === 'posted' && <Check aria-hidden size={big ? 22 : 14} />}
            {d.status === 'insured' && <ShieldCheck aria-hidden size={big ? 22 : 14} />}
            {d.status === 'missed' && <Zap aria-hidden size={big ? 22 : 14} />}
          </li>
        )
      })}
    </ol>
  )
}
