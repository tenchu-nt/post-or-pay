import { useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const GOLD = '#E0A526', RED = '#B42E24', INK = 'rgba(22,20,15,', PAPER = '#F4F1EA'
const clamp = (v) => Math.max(0, Math.min(1, v))
const seg = (p, a, b) => clamp((p - a) / (b - a))
const ease = (t) => 1 - Math.pow(1 - t, 3)

const CAPTIONS = [
  [0, 'Put a coin in the jar.'],
  [0.22, 'Post every day. Each day lights up.'],
  [0.45, 'Miss one and it cracks.'],
  [0.56, 'Streak Insurance patches it for £1.'],
  [0.72, 'Keep the streak: it costs nothing.'],
  [0.87, 'Break it: the stake is gone.'],
]

function draw(ctx, w, h, p) {
  ctx.clearRect(0, 0, w, h)
  const cx = w / 2, s = Math.min(w, h) / 600
  const jw = 170 * s, jh = 220 * s, jy = h * 0.42
  const shatter = seg(p, 0.87, 1)
  const glow = seg(p, 0.72, 0.8) * (1 - seg(p, 0.87, 0.9))

  if (glow > 0) {
    const g = ctx.createRadialGradient(cx, jy, 10, cx, jy, 260 * s)
    g.addColorStop(0, `rgba(224,165,38,${0.28 * glow})`); g.addColorStop(1, 'rgba(224,165,38,0)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h)
  }

  // Jar (glass) or shards
  const left = cx - jw / 2, top = jy - jh / 2
  if (shatter === 0) {
    ctx.strokeStyle = `${INK}${0.85 + glow * 0.15})`; ctx.lineWidth = 2.5 * s
    ctx.fillStyle = `${INK}0.03)`
    ctx.beginPath(); ctx.roundRect(left, top, jw, jh, 28 * s); ctx.fill(); ctx.stroke()
    ctx.fillRect(left + 18 * s, top - 18 * s, jw - 36 * s, 14 * s)
  } else {
    const t = ease(shatter)
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4
      const d = t * 180 * s
      ctx.save()
      ctx.translate(cx + Math.cos(a) * d, jy + Math.sin(a) * d + t * t * 60 * s)
      ctx.rotate(t * (i % 2 ? 2 : -2))
      ctx.globalAlpha = 1 - t * 0.7
      ctx.strokeStyle = `${INK}0.85)`; ctx.fillStyle = `${INK}0.04)`; ctx.lineWidth = 2 * s
      ctx.beginPath(); ctx.moveTo(0, -30 * s); ctx.lineTo(22 * s, 18 * s); ctx.lineTo(-18 * s, 24 * s); ctx.closePath()
      ctx.fill(); ctx.stroke(); ctx.restore()
    }
  }

  // Coin drop
  const drop = ease(seg(p, 0.02, 0.2))
  const coinY = -40 * s + drop * (jy + jh / 2 - 34 * s + 40 * s)
  ctx.globalAlpha = 1 - shatter
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(cx, coinY, 26 * s, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = 2.5 * s; ctx.strokeStyle = '#16140F'; ctx.beginPath(); ctx.arc(cx, coinY, 26 * s, 0, Math.PI * 2); ctx.stroke()
  ctx.strokeStyle = 'rgba(22,20,15,0.45)'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.arc(cx, coinY, 18 * s, 0, Math.PI * 2); ctx.stroke()
  ctx.fillStyle = '#16140F'; ctx.font = `600 ${20 * s}px Geist, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('£', cx, coinY + 1)
  ctx.globalAlpha = 1

  // 7 day cells
  const cw = Math.min(56 * s, (w - 32) / 7.6), gap = cw * 0.18
  const total = 7 * cw + 6 * gap, cy = jy + jh / 2 + 60 * s
  for (let i = 0; i < 7; i++) {
    const x = cx - total / 2 + i * (cw + gap)
    const lit = seg(p, 0.22 + i * 0.06, 0.26 + i * 0.06)
    ctx.lineWidth = 1.5; ctx.strokeStyle = `${INK}0.35)`
    ctx.beginPath(); ctx.roundRect(x, cy, cw, cw, 10 * s); ctx.stroke()
    if (i === 3) {
      const crack = seg(p, 0.45, 0.5), patch = seg(p, 0.56, 0.62)
      if (crack > 0 && patch < 1) {
        ctx.strokeStyle = RED; ctx.lineWidth = 3 * s; ctx.beginPath()
        ctx.moveTo(x + cw * 0.3, cy + 4); ctx.lineTo(x + cw * 0.55, cy + cw * 0.45); ctx.lineTo(x + cw * 0.4, cy + cw * 0.6); ctx.lineTo(x + cw * 0.7, cy + cw - 4)
        ctx.globalAlpha = crack * (1 - patch); ctx.stroke(); ctx.globalAlpha = 1
      }
      if (patch > 0) {
        ctx.globalAlpha = patch; ctx.fillStyle = GOLD; ctx.beginPath(); ctx.roundRect(x, cy, cw, cw, 10 * s); ctx.fill()
        ctx.fillStyle = '#16140F'; ctx.fillRect(x + cw * 0.25, cy + cw * 0.42, cw * 0.5, cw * 0.16); ctx.globalAlpha = 1
      }
      continue
    }
    if (lit > 0) {
      ctx.globalAlpha = lit; ctx.fillStyle = GOLD; ctx.strokeStyle = '#16140F'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(x, cy, cw, cw, 10 * s); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1
    }
  }
}

export default function Scene() {
  const wrap = useRef(null), canvas = useRef(null), caption = useRef(null)

  useGSAP(() => {
    const c = canvas.current, ctx = c.getContext('2d')
    let p = 0, raf = 0
    const render = () => {
      raf = 0
      const dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight
      if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      draw(ctx, w, h, p)
      const cap = CAPTIONS.filter(([at]) => p >= at).pop()
      if (caption.current) caption.current.textContent = cap[1]
    }
    // Frames are only requested on scroll updates, so nothing runs while the section is off screen.
    const queue = () => { if (!raf) raf = requestAnimationFrame(render) }
    const onResize = () => { c.width = 0; queue() }
    addEventListener('resize', onResize)

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      p = 0.8; queue()
    } else {
      ScrollTrigger.create({
        trigger: wrap.current, start: 'top top', end: '+=2400', pin: true, scrub: 0.6,
        onUpdate: (st) => { p = st.progress; queue() },
      })
      queue()
    }
    return () => { removeEventListener('resize', onResize); if (raf) cancelAnimationFrame(raf) }
  }, { scope: wrap })

  return (
    <section ref={wrap} className="relative h-svh w-full overflow-hidden bg-bg" aria-label="How a streak plays out">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-hidden />
      <p ref={caption} aria-hidden className="absolute bottom-[8%] left-0 right-0 px-4 text-center text-2xl sm:text-4xl font-semibold tracking-[-0.03em] text-balance" />
      <p className="sr-only">A coin drops into a jar. Seven day cells light up. One cracks and is patched with insurance. A kept streak glows; a broken one shatters.</p>
    </section>
  )
}
