import { NextResponse } from 'next/server'
import { gelato } from '@/lib/gelato'

export async function GET (
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const dimensions = await gelato.getProductCoverDimensions(params.id)
    return NextResponse.json(dimensions)
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error fetching cover dimensions' },
      { status: 500 }
    )
  }
}
