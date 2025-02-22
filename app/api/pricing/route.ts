import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateFinalPrice } from '@/lib/pricing'

export async function POST (request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const body = await request.json()
    const { basePrice, currency, discountCode } = body

    console.log(basePrice, currency, discountCode)

    // Récupérer les configurations de prix depuis la base de données
    const { data: pricingConfig, error } = await supabase
      .from('pricing_config')
      .select('*')

    console.log('pricing config', pricingConfig)
    console.log('error', error)

    if (error) throw error

    // Calculer le prix final
    const finalPrice = calculateFinalPrice({
      basePrice,
      currency,
      margin: pricingConfig[0].default_margin,
      discount: discountCode ? pricingConfig[0].discount_rates[discountCode] : 0
    })

    return NextResponse.json({ price: finalPrice })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error calculating price' },
      { status: 500 }
    )
  }
}
