'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Package,
  Truck,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface GelatoOrder {
  id: string
  order_id: string
  order_type: string
  fulfillment_status: string
  financial_status: string
  currency: string
  created_at: string
  ordered_at: string
  shipping_address: {
    first_name: string
    last_name: string
    address_line1: string
    city: string
    country: string
  }
  total_amount: number
  products_price: number
  shipping_price: number
  packaging_price: number
  items: Array<{
    id: string
    product_uid: string
    quantity: number
    price: number
    preview_url: string
  }>
  shipment_method_name: string
  min_delivery_days: number
  max_delivery_days: number
}

export default function OrdersPage () {
  const router = useRouter()
  const { user } = useAuth()
  const [orders, setOrders] = useState<GelatoOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    loadOrders()
  }, [user])

  async function loadOrders () {
    try {
      const { data, error } = await supabase
        .from('gelato_orders')
        .select(
          `
          *,
          shipping_address:shipping_addresses(*),
          items:gelato_order_items(*)
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (error: any) {
      toast.error('Error loading orders')
    } finally {
      setLoading(false)
    }
  }

  async function cancelOrder (orderId: string) {
    try {
      const response = await fetch(`/api/gelato/orders/${orderId}/cancel`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to cancel order')
      }

      toast.success('Order cancelled successfully')
      loadOrders()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  function getStatusBadgeVariant (status: string) {
    switch (status) {
      case 'printed':
      case 'delivered':
      case 'paid':
        return 'default'
      case 'processing':
      case 'pending':
        return 'secondary'
      case 'cancelled':
      case 'refused':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  function getStatusIcon (status: string) {
    switch (status) {
      case 'printed':
      case 'delivered':
      case 'paid':
        return <CheckCircle2 className='h-4 w-4' />
      case 'processing':
      case 'pending':
        return <Clock className='h-4 w-4' />
      case 'cancelled':
      case 'refused':
        return <Ban className='h-4 w-4' />
      default:
        return <AlertCircle className='h-4 w-4' />
    }
  }

  if (loading) {
    return (
      <div className='flex h-[calc(100vh-3.5rem)] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] py-8'>
      <div className='container mx-auto max-w-4xl px-4'>
        <h1 className='text-2xl font-bold mb-6'>My Orders</h1>

        <div className='space-y-4'>
          {orders.length === 0 ? (
            <Card>
              <CardContent className='py-8'>
                <div className='text-center'>
                  <Package className='h-8 w-8 mx-auto text-muted-foreground mb-2' />
                  <p className='text-lg font-medium'>No orders yet</p>
                  <p className='text-muted-foreground mb-4'>
                    Your order history will appear here
                  </p>
                  <Button onClick={() => router.push('/marketplace')}>
                    Browse Marketplace
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            orders.map(order => (
              <Card key={order.id}>
                <CardHeader>
                  <div className='flex justify-between items-start'>
                    <div>
                      <CardTitle className='text-lg'>
                        Order #{order.order_id}
                      </CardTitle>
                      <p className='text-sm text-muted-foreground'>
                        {format(new Date(order.created_at), 'PPP')}
                      </p>
                    </div>
                    <div className='flex gap-2'>
                      <Badge
                        variant={getStatusBadgeVariant(
                          order.fulfillment_status
                        )}
                      >
                        {getStatusIcon(order.fulfillment_status)}
                        <span className='ml-1'>{order.fulfillment_status}</span>
                      </Badge>
                      <Badge
                        variant={getStatusBadgeVariant(order.financial_status)}
                      >
                        {getStatusIcon(order.financial_status)}
                        <span className='ml-1'>{order.financial_status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Accordion type='single' collapsible>
                    <AccordionItem value='details'>
                      <AccordionTrigger>Order Details</AccordionTrigger>
                      <AccordionContent>
                        <div className='space-y-4'>
                          {/* Shipping Information */}
                          <div>
                            <h3 className='font-medium flex items-center gap-2 mb-2'>
                              <Truck className='h-4 w-4' />
                              Shipping Information
                            </h3>
                            <div className='text-sm text-muted-foreground'>
                              <p>
                                {order.shipping_address.first_name}{' '}
                                {order.shipping_address.last_name}
                              </p>
                              <p>{order.shipping_address.address_line1}</p>
                              <p>
                                {order.shipping_address.city},{' '}
                                {order.shipping_address.country}
                              </p>
                              <p className='mt-2'>
                                Method: {order.shipment_method_name}
                              </p>
                              <p>
                                Estimated delivery: {order.min_delivery_days}-
                                {order.max_delivery_days} days
                              </p>
                            </div>
                          </div>

                          <Separator />

                          {/* Order Items */}
                          <div>
                            <h3 className='font-medium flex items-center gap-2 mb-2'>
                              <Package className='h-4 w-4' />
                              Items
                            </h3>
                            <div className='space-y-4'>
                              {order.items.map(item => (
                                <div
                                  key={item.id}
                                  className='flex items-center gap-4'
                                >
                                  {item.preview_url && (
                                    <img
                                      src={item.preview_url}
                                      alt='Product preview'
                                      className='w-20 h-20 object-cover rounded'
                                    />
                                  )}
                                  <div className='flex-1'>
                                    <p className='font-medium'>
                                      {item.product_uid}
                                    </p>
                                    <p className='text-sm text-muted-foreground'>
                                      Quantity: {item.quantity}
                                    </p>
                                    <p className='text-sm'>
                                      {item.price} {order.currency}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <Separator />

                          {/* Order Summary */}
                          <div>
                            <h3 className='font-medium flex items-center gap-2 mb-2'>
                              <Receipt className='h-4 w-4' />
                              Order Summary
                            </h3>
                            <div className='space-y-2 text-sm'>
                              <div className='flex justify-between'>
                                <span>Products</span>
                                <span>
                                  {order.products_price} {order.currency}
                                </span>
                              </div>
                              <div className='flex justify-between'>
                                <span>Shipping</span>
                                <span>
                                  {order.shipping_price} {order.currency}
                                </span>
                              </div>
                              <div className='flex justify-between'>
                                <span>Packaging</span>
                                <span>
                                  {order.packaging_price} {order.currency}
                                </span>
                              </div>
                              <Separator />
                              <div className='flex justify-between font-medium'>
                                <span>Total</span>
                                <span>
                                  {order.total_amount} {order.currency}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Cancel Button */}
                          {['pending', 'processing'].includes(
                            order.fulfillment_status
                          ) && (
                            <div className='flex justify-end mt-4'>
                              <Button
                                variant='destructive'
                                onClick={() => cancelOrder(order.order_id)}
                              >
                                Cancel Order
                              </Button>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
