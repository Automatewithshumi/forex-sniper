import { TWELVE_KEY, TWELVE_BASE } from './config'

const delay = ms => new Promise(r => setTimeout(r, ms))

export async function fetchPrice(pair) {
  try {
    const r = await fetch(`${TWELVE_BASE}/price?symbol=${encodeURIComponent(pair)}&apikey=${TWELVE_KEY}`)
    const d = await r.json()
    return d.price ? parseFloat(d.price) : null
  } catch { return null }
}

export async function fetchIndicators(pair) {
  try {
    const p = `symbol=${encodeURIComponent(pair)}&interval=1h&apikey=${TWELVE_KEY}`
    const [rsiR, macdR, e20R, e50R] = await Promise.all([
      fetch(`${TWELVE_BASE}/rsi?${p}&time_period=14`).then(r=>r.json()),
      fetch(`${TWELVE_BASE}/macd?${p}&fast_period=12&slow_period=26&signal_period=9`).then(r=>r.json()),
      fetch(`${TWELVE_BASE}/ema?${p}&time_period=20`).then(r=>r.json()),
      fetch(`${TWELVE_BASE}/ema?${p}&time_period=50`).then(r=>r.json()),
    ])
    const rsi   = rsiR.values?.[0]?.rsi          ? parseFloat(rsiR.values[0].rsi)          : null
    const macd  = macdR.values?.[0]?.macd         ? parseFloat(macdR.values[0].macd)        : null
    const macdS = macdR.values?.[0]?.macd_signal  ? parseFloat(macdR.values[0].macd_signal) : null
    const macdH = macdR.values?.[0]?.macd_hist    ? parseFloat(macdR.values[0].macd_hist)   : null
    const ema20 = e20R.values?.[0]?.ema           ? parseFloat(e20R.values[0].ema)          : null
    const ema50 = e50R.values?.[0]?.ema           ? parseFloat(e50R.values[0].ema)          : null
    if (!rsi || !macd || !ema20 || !ema50) return null
    return { rsi, macd, macdS, macdH, ema20, ema50 }
  } catch { return null }
}
