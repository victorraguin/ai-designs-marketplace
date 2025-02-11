// app/api/gelato/catalogs/route.ts

import { NextResponse } from 'next/server'
import { gelato } from '@/lib/gelato'

export async function GET () {
  try {
    const catalogs = await gelato.getCatalogs()
    return NextResponse.json(catalogs)
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Erreur lors de la récupération des catalogues'
      },
      { status: 500 }
    )
  }
}
