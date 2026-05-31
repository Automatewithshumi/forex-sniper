export const metadata = {
  title: 'Forex Sniper Bot',
  description: 'Real-time forex signal dashboard — EMA20/50 · RSI · MACD · 75%+ confluence',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&family=DM+Sans:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#060c18', color: '#e2e8f0' }}>
        {children}
      </body>
    </html>
  )
}
