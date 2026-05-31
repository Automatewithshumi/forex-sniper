# Forex Sniper Bot 🎯

Real-time forex signal dashboard built with **Next.js 14**, wired to **Twelve Data** live API.

## Stack
- **Framework:** Next.js 14 (App Router)
- **Price data:** Twelve Data API (live prices, RSI, MACD, EMA)
- **AI analysis:** Claude (Anthropic)
- **Hosting:** Vercel

## Signal Strategy
- EMA 20 vs EMA 50 trend direction
- RSI-14 oversold / overbought zones
- MACD bullish / bearish crossover
- Minimum **75% confluence score** to fire a signal

---

## Deploy to Vercel (step by step)

### 1. Install Node.js
Download from https://nodejs.org (LTS version)

### 2. Clone / download this folder
```bash
cd forex-sniper
npm install
npm run dev
```
Open http://localhost:3000 — you should see the live dashboard.

### 3. Push to GitHub
```bash
git init
git add .
git commit -m "forex sniper bot"
```
Go to https://github.com → New repository → name it `forex-sniper`  
Copy the remote URL shown, then:
```bash
git remote add origin YOUR_GITHUB_URL
git push -u origin main
```

### 4. Deploy on Vercel
1. Go to https://vercel.com → sign up free (use GitHub login)
2. Click **Add New Project**
3. Import your `forex-sniper` repo
4. Framework will auto-detect as **Next.js**
5. Add environment variable:
   - Key: `NEXT_PUBLIC_TWELVE_KEY`
   - Value: `4306cdf5c57e49479290e6db405b34e2`
6. Click **Deploy**

Your live URL will be ready in ~60 seconds.

---

## Environment Variables
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_TWELVE_KEY` | Your Twelve Data API key |

## Folder Structure
```
forex-sniper/
├── src/
│   ├── app/
│   │   ├── layout.js       # Root HTML layout
│   │   ├── page.js         # Entry page
│   │   └── globals.css     # Global styles + keyframes
│   ├── components/
│   │   └── Dashboard.js    # Full dashboard UI
│   └── lib/
│       ├── config.js       # All constants & thresholds
│       ├── twelvedata.js   # Twelve Data API calls
│       └── engine.js       # Signal analysis logic
├── .env.local              # Local API key (not committed)
├── next.config.js
└── package.json
```
