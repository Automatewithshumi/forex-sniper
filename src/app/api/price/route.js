import { NextResponse } from 'next/server'

const TWELVE_KEY = process.env.NEXT_PUBLIC_TWELVE_KEY || '4306cdf5c57e49479290e6db405b34e2'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const pair = searchParams.get('pair')

  if (!pair) return NextResponse.json({ error: 'pair required' }, { status: 400 })

  try {
    const res = await fetch(
      `https://api.twelvedata.com/price?symbol=${encodeURIComponent(pair)}&apikey=${TWELVE_KEY}`,
      { next: { revalidate: 0 } }
    )
    const data = await res.json()

    if (data.price) {
      return NextResponse.json({ price: parseFloat(data.price) })
    }
    return NextResponse.json({ error: data.message || 'no price' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
