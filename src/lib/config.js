export const TWELVE_KEY    = process.env.NEXT_PUBLIC_TWELVE_KEY || '4306cdf5c57e49479290e6db405b34e2'
export const TWELVE_BASE   = 'https://api.twelvedata.com'

export const PAIRS = ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','USD/CAD']

export const SESSIONS = [
  { label:'Tokyo',    open:0,  close:9  },
  { label:'London',   open:7,  close:16 },
  { label:'New York', open:12, close:21 },
  { label:'Sydney',   open:21, close:6  },
]

// Signal engine
export const MIN_CONFIDENCE = 75
export const SL_PIPS        = 30
export const TP1_PIPS       = 40
export const TP2_PIPS       = 70
export const RSI_OS         = 35   // oversold
export const RSI_OB         = 65   // overbought

export const PRICE_REFRESH_MS = 30_000
