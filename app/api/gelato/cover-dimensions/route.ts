// app/api/gelato/cover-dimensions/route.ts
import { NextResponse } from 'next/server'

export async function GET (req: Request) {
  const { searchParams } = new URL(req.url)
  const productUid = searchParams.get('productUid')
  // pageCount peut être requis pour les produits multi-pages, mets une valeur par défaut par ex. 34
  const pageCount = searchParams.get('pageCount') || '34'

  if (!productUid) {
    return NextResponse.json({ error: 'Missing productUid' }, { status: 400 })
  }

  try {
    const gelatoRes = await fetch(
      `https://product.gelatoapis.com/v3/products/canvas_200x200-mm-8x8-inch_canvas_wood-fsc-slim_4-0_ver`,
      {
        headers: {
          'X-API-KEY': process.env.GELATO_API_KEY || ''
        }
      }
    )

    if (!gelatoRes.ok) {
      throw new Error('Gelato cover-dimensions fetch failed.')
    }

    const data = await gelatoRes.json()
    console.log('data', data)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
