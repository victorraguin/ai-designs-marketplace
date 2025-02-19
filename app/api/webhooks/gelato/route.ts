import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST (request: NextRequest) {
  try {
    const payload = await request.json()
    const event = payload.event

    switch (event) {
      /**
       * 1) Order Status Updated
       */
      case 'order_status_updated': {
        const orderId = payload.orderId // l'ID Gelato
        const myOrderRef = payload.orderReferenceId // votre ref interne (si vous l’avez mis)
        const newStatus = payload.fulfillmentStatus

        // Mettre à jour la table 'gelato_orders' ou 'orders'
        const { error } = await supabase
          .from('orders')
          .update({ fulfillment_status: newStatus })
          .eq('gelato_order_id', orderId)

        if (error) {
          console.error('DB error on order_status_updated:', error)
          return NextResponse.json({ error: 'DB error' }, { status: 500 })
        }

        // TODO : envoyer un email ou stocker une notification, etc.

        break
      }

      /**
       * 2) Order Item Status Updated
       */
      case 'order_item_status_updated': {
        const itemRef = payload.itemReferenceId
        const status = payload.status
        const comment = payload.comment
        const fc = payload.fulfillmentCountry
        const fsp = payload.fulfillmentStateProvince
        const ffid = payload.fulfillmentFacilityId

        // Mettre à jour la table 'gelato_order_items' ou 'order_items'
        const { error } = await supabase
          .from('orders')
          .update({
            status: status,
            comment: comment,
            fulfillment_country: fc,
            fulfillment_state_province: fsp,
            fulfillment_facility_id: ffid
          })
          .eq('gelato_order_id', itemRef)

        if (error) {
          console.error('DB error on order_item_status_updated:', error)
          return NextResponse.json({ error: 'DB error' }, { status: 500 })
        }

        break
      }

      /**
       * 3) Order Item Tracking Code Updated
       */
      case 'order_item_tracking_code_updated': {
        const itemRef = payload.itemReferenceId
        const code = payload.trackingCode
        const url = payload.trackingUrl
        const smName = payload.shipmentMethodName
        const smUid = payload.shipmentMethodUid
        const pCountry = payload.productionCountry
        const pState = payload.productionStateProvince
        const pFacility = payload.productionFacilityId

        const { error } = await supabase
          .from('orders')
          .update({
            tracking_code: code,
            tracking_url: url,
            shipment_method_name: smName,
            shipment_method_uid: smUid,
            production_country: pCountry,
            production_state_province: pState,
            production_facility_id: pFacility
          })
          .eq('gelato_order_id', itemRef)

        if (error) {
          console.error('DB error on order_item_tracking_code_updated:', error)
          return NextResponse.json({ error: 'DB error' }, { status: 500 })
        }

        break
      }

      default: {
        console.log('Unhandled Gelato event:', event)
        return NextResponse.json(
          { message: 'Unhandled event' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
