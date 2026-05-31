// All calls go through our Next.js API routes (server-side)
// This avoids CORS issues — browser calls /api/price, server calls Twelve Data

export async function fetchPrice(pair) {
  try {
    const res = await fetch(`/api/price?pair=${encodeURIComponent(pair)}`)
    const data = await res.json()
    return data.price ? parseFloat(data.price) : null
  } catch { return null }
}

export async function fetchIndicators(pair) {
  try {
    const res = await fetch(`/api/indicators?pair=${encodeURIComponent(pair)}`)
    const data = await res.json()
    if (data.error) return null
    return data
  } catch { return null }
}
