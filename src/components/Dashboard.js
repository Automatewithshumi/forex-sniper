'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { PAIRS, SESSIONS, PRICE_REFRESH_MS } from '@/lib/config'
import { fetchPrice, fetchIndicators } from '@/lib/twelvedata'
import { analyseSignal, evalOutcome, pip } from '@/lib/engine'
import '@/app/globals.css'

// ─── helpers ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

function sastNow() {
  return new Date().toLocaleTimeString('en-ZA', {
    timeZone:'Africa/Johannesburg', hour:'2-digit', minute:'2-digit', second:'2-digit'
  })
}

// ─── tiny UI atoms ────────────────────────────────────────────────────────────
function Badge({ outcome }) {
  const map = {
    WIN:     ['#00ff9d15','#00ff9d60','#00ff9d','WIN ✓'],
    LOSS:    ['#ff4d6d15','#ff4d6d60','#ff4d6d','LOSS ✗'],
    PENDING: ['#fbbf2415','#fbbf2460','#fbbf24','LIVE ◉'],
  }
  const [bg,border,col,label] = map[outcome] || map.PENDING
  return (
    <span style={{background:bg,border:`1px solid ${border}`,color:col,
      padding:'2px 10px',borderRadius:20,fontSize:10,fontWeight:800,
      letterSpacing:1.5,fontFamily:'monospace'}}>
      {label}
    </span>
  )
}

function DirTag({ dir }) {
  const buy = dir==='BUY'
  return (
    <span style={{
      background:buy?'#00ff9d12':'#ff4d6d12',
      border:`1px solid ${buy?'#00ff9d50':'#ff4d6d50'}`,
      color:buy?'#00ff9d':'#ff4d6d',
      padding:'3px 12px',borderRadius:4,fontSize:11,fontWeight:900,
      letterSpacing:2,fontFamily:"'IBM Plex Mono',monospace"}}>
      {buy?'▲ BUY':'▼ SELL'}
    </span>
  )
}

function ConfBar({ val }) {
  const c = val>=90?'#00ff9d':val>=80?'#34d399':val>=75?'#fbbf24':'#f87171'
  return (
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      <div style={{flex:1,height:3,background:'#1a2235',borderRadius:2}}>
        <div style={{width:`${val}%`,height:'100%',borderRadius:2,
          background:`linear-gradient(90deg,${c}66,${c})`,
          boxShadow:`0 0 6px ${c}44`,transition:'width 1s ease'}}/>
      </div>
      <span style={{color:c,fontSize:11,fontWeight:800,fontFamily:'monospace',minWidth:40}}>{val}%</span>
    </div>
  )
}

function Spark({ data, color }) {
  if (!data || data.length < 2) return null
  const W=80, H=28, pts=data.slice(-20)
  const mn=Math.min(...pts), mx=Math.max(...pts), rng=mx-mn||0.0001
  const d=pts.map((v,i)=>`${(i/(pts.length-1))*W},${H-((v-mn)/rng)*H}`).join(' ')
  return <svg width={W} height={H} style={{display:'block'}}><polyline points={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round"/></svg>
}

function StatBox({ icon, label, value, sub, accent }) {
  return (
    <div style={{background:'linear-gradient(160deg,#0c1220,#0f1729)',
      border:`1px solid ${accent}22`,borderTop:`2px solid ${accent}`,
      borderRadius:10,padding:'16px 18px',flex:1,minWidth:130}}>
      <div style={{color:'#334155',fontSize:9,letterSpacing:2,marginBottom:8,textTransform:'uppercase'}}>{icon} {label}</div>
      <div style={{color:accent,fontSize:26,fontWeight:900,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1}}>{value}</div>
      {sub && <div style={{color:'#475569',fontSize:11,marginTop:5}}>{sub}</div>}
    </div>
  )
}

// ─── Signal card ──────────────────────────────────────────────────────────────
function SigCard({ sig, livePrice, idx }) {
  const [open,setOpen]=useState(false)
  const p=pip(sig.pair), m=sig.direction==='BUY'?1:-1
  const cur=livePrice||sig.entry
  const pnl=+((cur-sig.entry)*m/p).toFixed(1)
  const pnlC=pnl>0?'#00ff9d':pnl<0?'#ff4d6d':'#64748b'
  const outcome=evalOutcome(sig,livePrice)
  const buy=sig.direction==='BUY'
  return (
    <div onClick={()=>setOpen(o=>!o)} style={{
      background:'linear-gradient(160deg,#0c1220,#0f1729)',
      border:`1px solid ${buy?'#00ff9d20':'#ff4d6d20'}`,
      borderLeft:`3px solid ${buy?'#00ff9d':'#ff4d6d'}`,
      borderRadius:10,padding:'14px 16px',cursor:'pointer',marginBottom:8,
      animation:`fadeUp .35s ease ${idx*.06}s both`,transition:'border-color .2s'}}
      onMouseEnter={e=>e.currentTarget.style.borderColor=buy?'#00ff9d50':'#ff4d6d50'}
      onMouseLeave={e=>e.currentTarget.style.borderColor=buy?'#00ff9d20':'#ff4d6d20'}>

      {/* header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,fontSize:16,color:'#f1f5f9',letterSpacing:1}}>{sig.pair}</span>
          <DirTag dir={sig.direction}/>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{color:'#334155',fontSize:10,fontFamily:'monospace'}}>{sig.timeLabel}</span>
          <Badge outcome={outcome}/>
        </div>
      </div>

      {/* levels */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginBottom:10}}>
        {[['ENTRY',sig.entry,'#94a3b8'],['SL',sig.sl,'#ff4d6d'],['TP1',sig.tp1,'#34d399'],['TP2',sig.tp2,'#38bdf8']].map(([l,v,c])=>(
          <div key={l} style={{background:'#080d18',borderRadius:6,padding:'7px 8px'}}>
            <div style={{color:'#334155',fontSize:9,letterSpacing:1.5,marginBottom:2}}>{l}</div>
            <div style={{color:c,fontFamily:'monospace',fontSize:12,fontWeight:700}}>{v}</div>
          </div>
        ))}
      </div>

      {/* live + pnl */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <div style={{display:'flex',gap:16}}>
          <span style={{color:'#334155',fontSize:9}}>LIVE </span>
          <span style={{color:'#f1f5f9',fontFamily:'monospace',fontSize:13,fontWeight:700}}>{cur}</span>
          <span style={{color:'#334155',fontSize:9,marginLeft:8}}>P&L </span>
          <span style={{color:pnlC,fontFamily:'monospace',fontSize:13,fontWeight:700}}>{pnl>0?'+':''}{pnl} pips</span>
        </div>
        <span style={{color:'#1e293b',fontSize:11}}>{open?'▲':'▼'}</span>
      </div>

      <ConfBar val={sig.confidence}/>

      {/* expanded */}
      {open&&(
        <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid #1a2235'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
            {[['RSI',sig.rsi],['MACD',sig.macd],['MACD Sig',sig.macdS],['MACD His',sig.macdH],['EMA 20',sig.ema20],['EMA 50',sig.ema50]].map(([l,v])=>(
              <div key={l} style={{background:'#080d18',borderRadius:6,padding:'6px 8px'}}>
                <div style={{color:'#334155',fontSize:9,letterSpacing:1}}>{l}</div>
                <div style={{color:'#94a3b8',fontFamily:'monospace',fontSize:11,fontWeight:600}}>{v??'—'}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#080d18',borderRadius:6,padding:'8px 10px'}}>
            <div style={{color:'#334155',fontSize:9,letterSpacing:1,marginBottom:4}}>CONFLUENCE</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
              {sig.reasons.map(r=>(
                <span key={r} style={{background:'#0f1729',border:'1px solid #1e293b',color:'#64748b',fontSize:10,padding:'2px 8px',borderRadius:20,fontFamily:'monospace'}}>{r}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [signals,   setSignals]   = useState([])
  const [prices,    setPrices]    = useState({})
  const [hist,      setHist]      = useState({})
  const [scanning,  setScanning]  = useState(false)
  const [pLoad,     setPLoad]     = useState(false)
  const [aiText,    setAiText]    = useState('')
  const [aiLoad,    setAiLoad]    = useState(false)
  const [tab,       setTab]       = useState('signals')
  const [filter,    setFilter]    = useState('ALL')
  const [sast,      setSast]      = useState('')
  const [lastScan,  setLastScan]  = useState(null)
  const [toast,     setToast]     = useState(null)
  const [log,       setLog]       = useState([])
  const [utcH,      setUtcH]      = useState(0)
  const priceTimer = useRef(null)

  const notify = (msg, type='ok') => { setToast({msg,type}); setTimeout(()=>setToast(null),3500) }

  // clock
  useEffect(()=>{
    const t=setInterval(()=>{ setSast(sastNow()); setUtcH(new Date().getUTCHours()) },1000)
    setSast(sastNow())
    return ()=>clearInterval(t)
  },[])

  // refresh prices
  const refreshPrices = useCallback(async ()=>{
    setPLoad(true)
    const next={}
    for (const pair of PAIRS) {
      const p=await fetchPrice(pair)
      if (p) next[pair]=p
      await sleep(500)
    }
    setPrices(next)
    setHist(prev=>{
      const n={...prev}
      for (const [pair,p] of Object.entries(next)) n[pair]=[...(prev[pair]||[]),p].slice(-30)
      return n
    })
    setPLoad(false)
  },[])

  // full scan
  const runScan = useCallback(async ()=>{
    if (scanning) return
    setScanning(true)
    const lines=[]
    const push=l=>{ lines.push(l); setLog([...lines]) }
    const found=[]

    for (const pair of PAIRS) {
      push(`Fetching price for ${pair}... (rate limit: 8s gap)`)
      const price=await fetchPrice(pair)
      if (!price){ push(`⚠ ${pair}: price unavailable`); continue }

      push(`Fetching indicators for ${pair}...`)
      const ind=await fetchIndicators(pair)
      if (!ind){ push(`⚠ ${pair}: indicators unavailable`); continue }

      const sig=analyseSignal(pair,price,ind)
      if (sig){ found.push(sig); push(`✓ ${pair}: ${sig.direction} @ ${sig.confidence}% confidence`) }
      else push(`○ ${pair}: no signal (below 75% threshold)`)

      await sleep(8000)
    }

    push(`─── Scan complete: ${found.length} signal(s) found ───`)
    setSignals(prev=>[...found,...prev].slice(0,50))
    setPrices(prev=>{ const n={...prev}; found.forEach(s=>{n[s.pair]=s.entry}); return n })
    setLastScan(new Date())
    setScanning(false)
    notify(`Scan complete — ${found.length} signal${found.length!==1?'s':''} found`)
  },[scanning])

  // AI analysis
  const getAI = async ()=>{
    if (!signals.length){ notify('Run a scan first','warn'); return }
    setAiLoad(true)
    const prompt=`You are an elite institutional forex analyst. Based on real live Twelve Data feed:

Signals:
${signals.slice(0,8).map(s=>`${s.pair} ${s.direction} @${s.entry} RSI:${s.rsi} MACD:${s.macd} EMA20:${s.ema20} EMA50:${s.ema50} Conf:${s.confidence}% ${s.outcome}`).join('\n')}

Prices: ${Object.entries(prices).map(([p,v])=>`${p}:${v}`).join(' | ')}

Give exactly:
1. BIAS: one word + one sentence
2. BEST TRADE: cleanest setup and why (be specific)
3. RISK: warning signs
4. OUTLOOK: next 4 hours

Institutional tone. Max 120 words.`

    try {
      const r=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})
      })
      const d=await r.json()
      setAiText(d.content?.[0]?.text||'Analysis unavailable.')
    } catch { setAiText('AI offline. Check connection.') }
    setAiLoad(false)
  }

  // mount
  useEffect(()=>{
    runScan(); refreshPrices()
    priceTimer.current=setInterval(refreshPrices,PRICE_REFRESH_MS)
    return ()=>clearInterval(priceTimer.current)
  // eslint-disable-next-line
  },[])

  // stats
  const wins    = signals.filter(s=>evalOutcome(s,prices[s.pair])==='WIN').length
  const losses  = signals.filter(s=>evalOutcome(s,prices[s.pair])==='LOSS').length
  const pending = signals.filter(s=>evalOutcome(s,prices[s.pair])==='PENDING').length
  const wr      = signals.length ? Math.round(wins/signals.length*100) : 0
  const avgConf = signals.length ? Math.round(signals.reduce((a,s)=>a+s.confidence,0)/signals.length) : 0
  const filtered= filter==='ALL' ? signals : signals.filter(s=>evalOutcome(s,prices[s.pair])===filter)

  const session = SESSIONS.find(s=>{
    if (s.open<s.close) return utcH>=s.open && utcH<s.close
    return utcH>=s.open || utcH<s.close
  })

  return (
    <div style={{minHeight:'100vh',background:'#060c18',color:'#e2e8f0',position:'relative',overflow:'hidden'}}>

      {/* ambient */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',
        background:'radial-gradient(ellipse 80% 40% at 50% -10%,#00ff9d06,transparent 60%)'}}/>

      {/* scan bar */}
      {scanning&&<div style={{position:'fixed',top:0,left:0,right:0,height:2,zIndex:999,overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,height:'100%',width:'40%',
          background:'linear-gradient(90deg,transparent,#00ff9d,transparent)',
          animation:'scanbar 1.4s linear infinite'}}/>
      </div>}

      {/* toast */}
      {toast&&<div style={{position:'fixed',top:20,right:20,zIndex:1000,
        background:toast.type==='warn'?'#1a1400':'#001612',
        border:`1px solid ${toast.type==='warn'?'#fbbf24':'#00ff9d'}`,
        color:toast.type==='warn'?'#fbbf24':'#00ff9d',
        padding:'10px 18px',borderRadius:8,fontSize:12,fontWeight:700,
        boxShadow:'0 8px 32px #00000080',letterSpacing:.5,
        animation:'fadeUp .25s ease'}}>{toast.msg}</div>}

      <div style={{maxWidth:980,margin:'0 auto',padding:'0 16px 60px',position:'relative',zIndex:1}}>

        {/* ── HEADER ── */}
        <div style={{padding:'22px 0 18px',borderBottom:'1px solid #111827',marginBottom:22}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:'#00ff9d',animation:'pulse 2s infinite,glow 2s infinite'}}/>
                <span style={{color:'#00ff9d',fontSize:9,letterSpacing:4,fontWeight:800,fontFamily:'monospace'}}>LIVE · REAL-TIME</span>
                {pLoad&&<span style={{color:'#334155',fontSize:9,letterSpacing:2,marginLeft:4}}>UPDATING...</span>}
              </div>
              <h1 style={{margin:0,fontSize:24,fontWeight:900,letterSpacing:-.5,color:'#f8fafc',lineHeight:1}}>
                FOREX SNIPER
                <span style={{background:'linear-gradient(90deg,#00ff9d,#38bdf8)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginLeft:8}}>BOT</span>
              </h1>
              <p style={{margin:'5px 0 0',color:'#1e293b',fontSize:11,letterSpacing:1.5}}>EMA20/50 · RSI-14 · MACD · 75%+ CONFLUENCE · TWELVE DATA</p>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:700,color:'#f1f5f9',letterSpacing:1}}>
                {sast} <span style={{color:'#1e293b',fontSize:10}}>SAST</span>
              </div>
              {session&&<div style={{marginTop:4,display:'inline-flex',alignItems:'center',gap:6,background:'#0c1220',border:'1px solid #1e293b',borderRadius:20,padding:'3px 12px'}}>
                <div style={{width:5,height:5,borderRadius:'50%',background:'#fbbf24',animation:'pulse 1.5s infinite'}}/>
                <span style={{color:'#fbbf24',fontSize:10,fontWeight:700,letterSpacing:1}}>{session.label.toUpperCase()} SESSION</span>
              </div>}
              {lastScan&&<div style={{color:'#1e293b',fontSize:10,marginTop:4}}>Last scan: {lastScan.toLocaleTimeString('en-ZA',{hour:'2-digit',minute:'2-digit'})}</div>}
            </div>
          </div>
        </div>

        {/* ── TICKER ── */}
        <div style={{display:'flex',gap:0,marginBottom:22,background:'#080d18',border:'1px solid #111827',borderRadius:10,overflow:'hidden'}}>
          {PAIRS.map((pair,i)=>{
            const price=prices[pair], h=hist[pair]||[]
            const prev=h.length>1?h[h.length-2]:price
            const up=price&&prev?price>=prev:true
            const col=up?'#00ff9d':'#ff4d6d'
            return (
              <div key={pair} style={{flex:1,padding:'10px 12px',borderLeft:i>0?'1px solid #111827':'none',textAlign:'center'}}>
                <div style={{color:'#334155',fontSize:9,letterSpacing:1.5,marginBottom:3,fontFamily:'monospace'}}>{pair}</div>
                <div style={{color:col,fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,marginBottom:4}}>
                  {price||<span style={{color:'#1e293b',animation:'pulse 1s infinite'}}>···</span>}
                </div>
                <Spark data={h} color={col}/>
              </div>
            )
          })}
        </div>

        {/* ── STATS ── */}
        <div style={{display:'flex',gap:10,marginBottom:22,flexWrap:'wrap'}}>
          <StatBox icon="📡" label="Signals"  value={signals.length}  sub="this session"            accent="#38bdf8"/>
          <StatBox icon="🎯" label="Win Rate" value={`${wr}%`}        sub={`${wins}W · ${losses}L`} accent="#00ff9d"/>
          <StatBox icon="⚡" label="Live"     value={pending}         sub="open positions"           accent="#fbbf24"/>
          <StatBox icon="🔬" label="Avg Conf" value={`${avgConf}%`}   sub="confluence score"         accent="#a78bfa"/>
        </div>

        {/* ── TABS ── */}
        <div style={{display:'flex',gap:3,marginBottom:18,background:'#080d18',border:'1px solid #111827',borderRadius:10,padding:4}}>
          {[['signals','📡 Signals'],['log','🔄 Scan Log'],['analysis','🤖 AI Brief'],['pairs','📊 Pairs']].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              flex:1,padding:'8px 4px',border:'none',borderRadius:7,cursor:'pointer',
              background:tab===t?'#111827':'transparent',
              color:tab===t?'#e2e8f0':'#334155',
              fontSize:12,fontWeight:700,transition:'all .15s'}}>
              {l}
            </button>
          ))}
        </div>

        {/* ── SIGNALS ── */}
        {tab==='signals'&&(
          <div>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
              <div style={{display:'flex',gap:5}}>
                {['ALL','WIN','LOSS','PENDING'].map(f=>(
                  <button key={f} onClick={()=>setFilter(f)} style={{
                    padding:'5px 14px',border:'1px solid #111827',borderRadius:20,
                    background:filter===f?'#111827':'transparent',
                    color:filter===f?'#e2e8f0':'#334155',
                    fontSize:10,fontWeight:800,cursor:'pointer',letterSpacing:1.5}}>
                    {f}{f!=='ALL'&&<span style={{opacity:.5,marginLeft:4}}>({f==='WIN'?wins:f==='LOSS'?losses:pending})</span>}
                  </button>
                ))}
              </div>
              <button onClick={runScan} disabled={scanning} style={{
                padding:'9px 22px',
                background:scanning?'#080d18':'linear-gradient(135deg,#00ff9d18,#38bdf818)',
                border:`1px solid ${scanning?'#1e293b':'#00ff9d40'}`,
                borderRadius:8,color:scanning?'#334155':'#00ff9d',
                fontSize:11,fontWeight:800,cursor:scanning?'not-allowed':'pointer',
                letterSpacing:1.5,boxShadow:'0 0 12px #00ff9d18'}}>
                {scanning
                  ? <span style={{display:'flex',alignItems:'center',gap:6}}><span style={{animation:'pulse .8s infinite'}}>●</span>SCANNING...</span>
                  : '⟳  SCAN MARKETS'}
              </button>
            </div>
            {filtered.length===0
              ? <div style={{textAlign:'center',padding:'70px 20px',border:'1px dashed #111827',borderRadius:10}}>
                  <div style={{fontSize:36,marginBottom:10}}>🎯</div>
                  <div style={{fontSize:14,fontWeight:700,color:'#334155'}}>Sniper mode active</div>
                  <div style={{fontSize:12,marginTop:4,color:'#1e293b'}}>Waiting for 75%+ confluence setups</div>
                  <button onClick={runScan} disabled={scanning} style={{marginTop:16,padding:'8px 20px',background:'transparent',border:'1px solid #1e293b',borderRadius:8,color:'#334155',fontSize:11,cursor:'pointer',fontWeight:700,letterSpacing:1}}>RUN SCAN</button>
                </div>
              : filtered.map((s,i)=><SigCard key={s.id} sig={s} livePrice={prices[s.pair]} idx={i}/>)}
          </div>
        )}

        {/* ── SCAN LOG ── */}
        {tab==='log'&&(
          <div style={{background:'#080d18',border:'1px solid #111827',borderRadius:10,padding:16,
            fontFamily:"'IBM Plex Mono',monospace",fontSize:12,minHeight:300,maxHeight:500,overflowY:'auto'}}>
            {log.length===0
              ? <div style={{color:'#1e293b',textAlign:'center',paddingTop:80}}>Run a scan to see the log</div>
              : log.map((line,i)=>(
                <div key={i} style={{
                  color:line.startsWith('✓')?'#00ff9d':line.startsWith('⚠')?'#f87171':line.startsWith('─')?'#334155':'#475569',
                  lineHeight:2,borderBottom:line.startsWith('─')?'1px solid #111827':'none',
                  paddingBottom:line.startsWith('─')?8:0}}>
                  {line}
                </div>
              ))}
            {scanning&&<div style={{color:'#fbbf24',animation:'pulse .8s infinite',marginTop:8}}>● scanning...</div>}
          </div>
        )}

        {/* ── AI BRIEF ── */}
        {tab==='analysis'&&(
          <div>
            <div style={{background:'#080d18',border:'1px solid #111827',borderRadius:10,padding:20,marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <div>
                  <div style={{color:'#a78bfa',fontSize:11,letterSpacing:2,fontWeight:800}}>🤖 AI MARKET ANALYST</div>
                  <div style={{color:'#1e293b',fontSize:11,marginTop:3}}>Powered by Claude · reads your live signal data</div>
                </div>
                <button onClick={getAI} disabled={aiLoad} style={{
                  padding:'8px 18px',background:aiLoad?'#080d18':'#a78bfa18',
                  border:`1px solid ${aiLoad?'#1e293b':'#a78bfa50'}`,borderRadius:8,
                  color:aiLoad?'#334155':'#a78bfa',fontSize:11,fontWeight:800,
                  cursor:aiLoad?'not-allowed':'pointer',letterSpacing:1}}>
                  {aiLoad?'THINKING...':'ANALYSE NOW'}
                </button>
              </div>
              {aiText
                ? <div style={{background:'#060c18',border:'1px solid #111827',borderLeft:'3px solid #a78bfa',borderRadius:8,padding:16}}>
                    <pre style={{margin:0,color:'#94a3b8',fontSize:13,lineHeight:1.8,whiteSpace:'pre-wrap',fontFamily:"'DM Sans',sans-serif"}}>{aiText}</pre>
                  </div>
                : <div style={{textAlign:'center',padding:'40px 0',color:'#1e293b'}}>
                    <div style={{fontSize:28,marginBottom:8}}>🧠</div>
                    <div style={{fontSize:13,color:'#334155'}}>Click "ANALYSE NOW" for institutional-grade market analysis on your live signals</div>
                  </div>}
            </div>

            {/* daily summary */}
            <div style={{background:'#080d18',border:'1px solid #111827',borderRadius:10,padding:20}}>
              <div style={{color:'#fbbf24',fontSize:11,letterSpacing:2,fontWeight:800,marginBottom:14}}>📋 DAILY SUMMARY</div>
              <div style={{background:'#060c18',border:'1px solid #111827',borderRadius:8,padding:16,
                fontFamily:"'IBM Plex Mono',monospace",fontSize:11,lineHeight:2.2}}>
                <div><span style={{color:'#fbbf24'}}>[{sast} SAST]</span> <span style={{color:'#94a3b8'}}>REPORT:</span> <span style={{color:'#38bdf8'}}>{signals.length} signals</span></div>
                <div>WIN:<span style={{color:'#00ff9d'}}>{wins}</span> LOSS:<span style={{color:'#ff4d6d'}}>{losses}</span> PENDING:<span style={{color:'#fbbf24'}}>{pending}</span> | WR:<span style={{color:wr>=60?'#00ff9d':wr>=40?'#fbbf24':'#ff4d6d'}}>{wr}%</span></div>
                {signals.slice(0,6).map(s=>{
                  const oc=evalOutcome(s,prices[s.pair])
                  return <div key={s.id}>
                    <span style={{color:s.direction==='BUY'?'#00ff9d':'#ff4d6d'}}>{s.pair} {s.direction}</span>
                    {' @'}{s.entry} → <span style={{color:oc==='WIN'?'#00ff9d':oc==='LOSS'?'#ff4d6d':'#fbbf24'}}>{oc}</span>
                    <span style={{color:'#1e293b'}}> (Conf:{s.confidence}%)</span>
                  </div>
                })}
                <div style={{marginTop:6,color:wr>=65?'#00ff9d':wr>=45?'#fbbf24':'#ff4d6d',borderTop:'1px solid #111827',paddingTop:8}}>
                  {wr>=65?'Strong session. Keep using SL.':wr>=45?'Decent session. Stay disciplined.':'Choppy. Reduce size. Protect capital.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PAIRS ── */}
        {tab==='pairs'&&(
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))',gap:12}}>
            {PAIRS.map(pair=>{
              const price=prices[pair], h=hist[pair]||[]
              const prev=h.length>1?h[h.length-2]:price
              const up=price&&prev?price>=prev:true
              const col=up?'#00ff9d':'#ff4d6d'
              const pSigs=signals.filter(s=>s.pair===pair)
              const latest=pSigs[0]
              const pWins=pSigs.filter(s=>evalOutcome(s,price)==='WIN').length
              return (
                <div key={pair} style={{background:'linear-gradient(160deg,#0c1220,#0f1729)',border:'1px solid #111827',borderRadius:10,padding:18,animation:'fadeUp .35s ease both'}}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                    <span style={{fontFamily:"'IBM Plex Mono',monospace",fontWeight:700,fontSize:16,color:'#f1f5f9',letterSpacing:1}}>{pair}</span>
                    {latest?<DirTag dir={latest.direction}/>:<span style={{color:'#1e293b',fontSize:10}}>NO SIGNAL</span>}
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:12}}>
                    <div>
                      <div style={{color:'#1e293b',fontSize:9,letterSpacing:1,marginBottom:3}}>LIVE PRICE</div>
                      <div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:20,fontWeight:900,color:col}}>
                        {price||<span style={{color:'#1e293b',animation:'pulse 1s infinite'}}>···</span>}
                      </div>
                    </div>
                    <Spark data={h} color={col}/>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10}}>
                    {[['SIGNALS',pSigs.length,'#38bdf8'],['WINS',pWins,'#00ff9d'],['CONF',latest?`${latest.confidence}%`:'—','#a78bfa']].map(([l,v,c])=>(
                      <div key={l} style={{background:'#080d18',borderRadius:6,padding:'7px 8px',textAlign:'center'}}>
                        <div style={{color:'#1e293b',fontSize:8,letterSpacing:1.5,marginBottom:3}}>{l}</div>
                        <div style={{color:c,fontFamily:'monospace',fontWeight:800,fontSize:15}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {latest&&<ConfBar val={latest.confidence}/>}
                </div>
              )
            })}
          </div>
        )}

        {/* footer */}
        <div style={{marginTop:36,paddingTop:18,borderTop:'1px solid #0f1729',display:'flex',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
          <div style={{color:'#1e293b',fontSize:10,fontFamily:'monospace'}}>DATA: TWELVE DATA · STRATEGY: EMA20/50 + RSI-14 + MACD · MIN CONF: 75%</div>
          <div style={{color:'#1e293b',fontSize:10}}>⚠ For informational purposes only. Always use a stop loss.</div>
        </div>

      </div>
    </div>
  )
}
