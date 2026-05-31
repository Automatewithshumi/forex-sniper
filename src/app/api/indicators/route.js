import { NextResponse } from 'next/server'

const KEY  = process.env.NEXT_PUBLIC_TWELVE_KEY || '7e593c4085544f5180d790bef8b54c9f'
const BASE = 'https://api.twelvedata.com'

// Fetch all 4 indicators for ONE pair using sequential calls with delay
// Free plan: 8 calls/min — we space calls 8s apart across pairs in the scan
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const pair = searchParams.get('pair')
  if (!pair) return NextResponse.json({ error: 'pair required' }, { status: 400 })

  const p = `symbol=${encodeURIComponent(pair)}&interval=1h&apikey=${KEY}`

  try {
    // Fetch sequentially with small gaps to stay under rate limit
    const rsiRes  = await fetch(`${BASE}/rsi?${p}&time_period=14`,                                 { cache: 'no-store' })
    const rsiData = await rsiRes.json()
    await new Promise(r => setTimeout(r, 500))

    const macdRes  = await fetch(`${BASE}/macd?${p}&fast_period=12&slow_period=26&signal_period=9`, { cache: 'no-store' })
    const macdData = await macdRes.json()
    await new Promise(r => setTimeout(r, 500))

    const e20Res  = await fetch(`${BASE}/ema?${p}&time_period=20`, { cache: 'no-store' })
    const e20Data = await e20Res.json()
    await new Promise(r => setTimeout(r, 500))

    const e50Res  = await fetch(`${BASE}/ema?${p}&time_period=50`, { cache: 'no-store' })
    const e50Data = await e50Res.json()

    // Check for API errors in any response
    const errors = [rsiData, macdData, e20Data, e50Data]
      .filter(d => d.status === 'error' || d.code)
      .map(d => d.message || d.error_message || 'unknown error')

    if (errors.length > 0) {
      return NextResponse.json({ error: errors[0] }, { status: 400 })
    }

    const rsi   = rsiData.values?.[0]?.rsi          ? parseFloat(rsiData.values[0].rsi)           : null
    const macd  = macdData.values?.[0]?.macd         ? parseFloat(macdData.values[0].macd)         : null
    const macdS = macdData.values?.[0]?.macd_signal  ? parseFloat(macdData.values[0].macd_signal)  : null
    const macdH = macdData.values?.[0]?.macd_hist    ? parseFloat(macdData.values[0].macd_hist)    : null
    const ema20 = e20Data.values?.[0]?.ema           ? parseFloat(e20Data.values[0].ema)           : null
    const ema50 = e50Data.values?.[0]?.ema           ? parseFloat(e50Data.values[0].ema)           : null

    if (!rsi || !macd || !ema20 || !ema50) {
      return NextResponse.json({
        error: 'incomplete data',
        debug: {
          rsi:   rsiData.values?.[0] ?? rsiData.status ?? 'missing',
          macd:  macdData.values?.[0] ?? macdData.status ?? 'missing',
          ema20: e20Data.values?.[0] ?? e20Data.status ?? 'missing',
          ema50: e50Data.values?.[0] ?? e50Data.status ?? 'missing',
        }
      }, { status: 400 })
    }

    return NextResponse.json({ rsi, macd, macdS, macdH, ema20, ema50 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
