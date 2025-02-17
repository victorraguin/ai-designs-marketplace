import { NextResponse } from 'next/server'
import { gelato } from '@/lib/gelato'

export async function GET (request: Request) {
  const { searchParams } = new URL(request.url)
  const userCountry = searchParams.get('country') || 'FR'

  try {
    const products = await gelato.getProducts(userCountry)
    return NextResponse.json(products)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des produits' },
      { status: 500 }
    )
  }
}
