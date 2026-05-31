import { MIN_CONFIDENCE, SL_PIPS, TP1_PIPS, TP2_PIPS, RSI_OS, RSI_OB } from './config'

export const pip  = pair => pair.includes('JPY') ? 0.01   : 0.0001
export const dec  = pair => pair.includes('JPY') ? 3      : 5
export const fmt  = (v, pair) => v != null ? +v.toFixed(dec(pair)) : null

export function analyseSignal(pair, price, ind) {
  if (!ind || !price) return null
  const { rsi, macd, macdS, macdH, ema20, ema50 } = ind
  if (!rsi || !macd || !ema20 || !ema50) return null

  const p   = pip(pair)
  const d   = dec(pair)
  let score = 0
  const reasons = []

  // EMA trend  — 25 pts
  const emaTrend = ema20 > ema50 ? 'BUY' : 'SELL'
  score += 25
  reasons.push(`EMA20 ${emaTrend === 'BUY' ? '>' : '<'} EMA50`)

  // RSI  — 25 pts
  let rsiDir = null
  if (rsi < RSI_OS)      { rsiDir = 'BUY';  score += 25; reasons.push(`RSI oversold (${rsi.toFixed(0)})`) }
  else if (rsi > RSI_OB) { rsiDir = 'SELL'; score += 25; reasons.push(`RSI overbought (${rsi.toFixed(0)})`) }
  else                   { score += 12;  reasons.push(`RSI neutral (${rsi.toFixed(0)})`) }

  // MACD  — 25 pts
  let macdDir = null
  if (macd > macdS && macdH > 0)      { macdDir = 'BUY';  score += 25; reasons.push('MACD bullish cross') }
  else if (macd < macdS && macdH < 0) { macdDir = 'SELL'; score += 25; reasons.push('MACD bearish cross') }
  else                                  { score += 10;  reasons.push('MACD mixed') }

  // Price vs EMA20  — 15 pts
  if (price > ema20) { score += 15; reasons.push('Price > EMA20') }
  else               { score += 8;  reasons.push('Price < EMA20') }

  // Confluence vote
  const votes = [emaTrend, rsiDir, macdDir].filter(Boolean)
  const buys  = votes.filter(v => v === 'BUY').length
  const sells = votes.filter(v => v === 'SELL').length
  if (buys === sells) return null
  const dir = buys > sells ? 'BUY' : 'SELL'

  if (rsiDir  && rsiDir  !== dir) score -= 15
  if (macdDir && macdDir !== dir) score -= 15

  const confidence = Math.min(100, Math.max(0, score))
  if (confidence < MIN_CONFIDENCE) return null

  const m = dir === 'BUY' ? 1 : -1
  return {
    id:         `${pair.replace('/','')}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
    pair, direction: dir,
    entry:  +price.toFixed(d),
    sl:     +(price - m * SL_PIPS  * p).toFixed(d),
    tp1:    +(price + m * TP1_PIPS * p).toFixed(d),
    tp2:    +(price + m * TP2_PIPS * p).toFixed(d),
    rsi:    +rsi.toFixed(2),
    macd:   +macd.toFixed(5),
    macdS:  macdS ? +macdS.toFixed(5) : null,
    macdH:  macdH ? +macdH.toFixed(5) : null,
    ema20:  +ema20.toFixed(d),
    ema50:  +ema50.toFixed(d),
    confidence, reasons,
    outcome: 'PENDING',
    ts:      Date.now(),
    timeLabel: new Date().toLocaleTimeString('en-ZA',{ hour:'2-digit', minute:'2-digit' }),
  }
}

export function evalOutcome(sig, currentPrice) {
  if (!currentPrice) return sig.outcome
  const m     = sig.direction === 'BUY' ? 1 : -1
  const moved = (currentPrice - sig.entry) * m
  const tp1d  = (sig.tp1 - sig.entry) * m
  const sld   = (sig.sl  - sig.entry) * m
  if (moved >= tp1d) return 'WIN'
  if (moved <= sld)  return 'LOSS'
  return 'PENDING'
}
