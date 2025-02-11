// app/api/gelato/products/route.ts

import { NextResponse } from 'next/server'
import { gelato } from '@/lib/gelato'

export async function GET () {
  try {
    const products = await gelato.getProducts()
    return NextResponse.json(products)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la récupération des produits' },
      { status: 500 }
    )
  }
}
