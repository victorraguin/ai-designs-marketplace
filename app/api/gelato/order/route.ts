// app/api/gelato/order/route.ts

import { NextResponse } from 'next/server'
import { gelato } from '@/lib/gelato'

export async function POST (request: Request) {
  try {
    const body = await request.json()
    const orderReferenceId = body.orderReferenceId || `order-${Date.now()}`
    const customerReferenceId = body.customerReferenceId || `user-${Date.now()}`
    const gelatoOrder = {
      orderType: body.orderType || 'order',
      orderReferenceId,
      customerReferenceId,
      currency: body.currency || 'EUR',
      items: (body.items || []).map((item: any, idx: number) => ({
        itemReferenceId: item.itemReferenceId || `item-${idx}`,
        productUid: item.productUid,
        quantity: item.quantity || 1,
        files: (item.files || []).map((f: any) => ({
          url: f.url,
          type: 'default'
        }))
      })),
      shippingAddress: {
        firstName: body.shippingAddress.firstName,
        lastName: body.shippingAddress.lastName,
        email: body.shippingAddress.email,
        phone: body.shippingAddress.phone || '',
        addressLine1: body.shippingAddress.street,
        addressLine2: body.shippingAddress.streetAdditional || '',
        city: body.shippingAddress.city,
        state: body.shippingAddress.state || '',
        postCode: body.shippingAddress.postCode,
        country: body.shippingAddress.country
      }
    }
    const createdOrder = await gelato.createOrder(gelatoOrder)
    return NextResponse.json(createdOrder, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
