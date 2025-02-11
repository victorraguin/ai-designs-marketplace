// app/api/gelato/order/route.ts

import { NextResponse } from 'next/server'
import { gelato } from '@/lib/gelato'

export async function POST (request: Request) {
  try {
    const body = await request.json()
    const order = await gelato.createOrder(body)
    return NextResponse.json(order)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création de la commande' },
      { status: 500 }
    )
  }
}
