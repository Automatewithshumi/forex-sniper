import { NextResponse } from 'next/server'

const TWELVE_KEY = process.env.NEXT_PUBLIC_TWELVE_KEY || '4306cdf5c57e49479290e6db405b34e2'
const BASE = 'https://api.twelvedata.com'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const pair = searchParams.get('pair')

  if (!pair) return NextResponse.json({ error: 'pair required' }, { status: 400 })

  try {
    const p = `symbol=${encodeURIComponent(pair)}&interval=1h&apikey=${TWELVE_KEY}`

    const [rsiRes, macdRes, e20Res, e50Res] = await Promise.all([
      fetch(`${BASE}/rsi?${p}&time_period=14`,                                    { next: { revalidate: 0 } }).then(r => r.json()),
      fetch(`${BASE}/macd?${p}&fast_period=12&slow_period=26&signal_period=9`,    { next: { revalidate: 0 } }).then(r => r.json()),
      fetch(`${BASE}/ema?${p}&time_period=20`,                                    { next: { revalidate: 0 } }).then(r => r.json()),
      fetch(`${BASE}/ema?${p}&time_period=50`,                                    { next: { revalidate: 0 } }).then(r => r.json()),
    ])

    const rsi   = rsiRes.values?.[0]?.rsi          ? parseFloat(rsiRes.values[0].rsi)          : null
    const macd  = macdRes.values?.[0]?.macd         ? parseFloat(macdRes.values[0].macd)        : null
    const macdS = macdRes.values?.[0]?.macd_signal  ? parseFloat(macdRes.values[0].macd_signal) : null
    const macdH = macdRes.values?.[0]?.macd_hist    ? parseFloat(macdRes.values[0].macd_hist)   : null
    const ema20 = e20Res.values?.[0]?.ema           ? parseFloat(e20Res.values[0].ema)          : null
    const ema50 = e50Res.values?.[0]?.ema           ? parseFloat(e50Res.values[0].ema)          : null

    if (!rsi || !macd || !ema20 || !ema50) {
      return NextResponse.json({
        error: 'incomplete indicators',
        raw: { rsi: rsiRes.status, macd: macdRes.status, ema20: e20Res.status, ema50: e50Res.status }
      }, { status: 400 })
    }

    return NextResponse.json({ rsi, macd, macdS, macdH, ema20, ema50 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
