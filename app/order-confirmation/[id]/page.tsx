'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Loader2,
  Package,
  Truck,
  Receipt,
  MapPin,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban
} from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface OrderDetails {
  id: string
  order_id: string
  design_id: string
  buyer_id: string
  product_type: string
  total_amount: number
  order_status: string
  created_at: string
  gelato_order_id: string
  tracking_code: string | null
  tracking_url: string | null
  shipment_method_name: string
  shipment_method_uid: string
  production_country: string
  production_state_province: string
  production_facility_id: string
  fulfillment_status: string
  financial_status: string
  currency: string
  total_price: number
  total_vat: number
  total_shipping: number
  total_packaging: number
  billing_company_name: string | null
  billing_address: string | null
  billing_country: string | null
  billing_email: string | null
  shipping_addresses: {
    first_name: string
    last_name: string
    company_name: string | null
    address_line1: string
    address_line2: string | null
    city: string
    state: string | null
    post_code: string
    country: string
    email: string
    phone: string | null
  }
  design?: {
    preview_url: string | undefined
    image_url: string
    prompt: string
  }
}

function getStatusBadgeVariant (status: string) {
  switch (status) {
    case 'printed':
    case 'delivered':
    case 'passed':
    case 'shipped':
    case 'in_transit':
      return 'default'
    case 'created':
    case 'uploading':
    case 'in_production':
    case 'pending_approval':
    case 'pending_personalization':
    case 'digitizing':
    case 'on_hold':
      return 'secondary'
    case 'failed':
    case 'canceled':
    case 'not_connected':
    case 'returned':
      return 'destructive'
    default:
      return 'outline'
  }
}

function getStatusIcon (status: string) {
  switch (status) {
    case 'printed':
    case 'delivered':
    case 'passed':
    case 'shipped':
    case 'in_transit':
      return <CheckCircle2 className='h-4 w-4' />
    case 'created':
    case 'uploading':
    case 'in_production':
    case 'pending_approval':
    case 'pending_personalization':
    case 'digitizing':
    case 'on_hold':
      return <Clock className='h-4 w-4' />
    case 'failed':
    case 'canceled':
    case 'not_connected':
    case 'returned':
      return <Ban className='h-4 w-4' />
    default:
      return <AlertCircle className='h-4 w-4' />
  }
}

export default function OrderConfirmationPage () {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOrder()
  }, [user])

  async function loadOrder () {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          *,
          shipping_addresses (*),
          designs (image_url, prompt)
        `
        )
        .eq('id', params.id)
        .single()

      console.log(data)
      if (error) throw error
      setOrder(data)
    } catch (error: any) {
      toast.error('Error loading order')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    // Intégration PayPal à implémenter
    toast.info('PayPal integration coming soon!')
  }

  if (loading) {
    return (
      <div className='flex h-[calc(100vh-3.5rem)] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  if (!order) {
    return (
      <div className='min-h-[calc(100vh-3.5rem)] py-8'>
        <div className='container mx-auto max-w-4xl px-4'>
          <div className='text-center'>
            <p className='text-muted-foreground'>Order not found.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] py-8'>
      <div className='container mx-auto max-w-4xl px-4'>
        <div className='space-y-8'>
          <div className='flex justify-between items-start'>
            <div>
              <h1 className='text-3xl font-bold'>Order Confirmation</h1>
              <p className='text-muted-foreground'>
                Order #{order.gelato_order_id}
              </p>
              <p className='text-sm text-muted-foreground'>
                Placed on {format(new Date(order.created_at), 'PPP')}
              </p>
            </div>
            <div className='flex gap-2'>
              <Badge variant={getStatusBadgeVariant(order.order_status)}>
                {getStatusIcon(order.order_status)}
                <span className='ml-1'>{order.order_status}</span>
              </Badge>
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Package className='h-5 w-5' />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                {order.design && (
                  <div className='aspect-square relative rounded-lg overflow-hidden'>
                    <img
                      src={order.design.preview_url}
                      alt={order.design.prompt}
                      className='object-cover w-full h-full'
                    />
                  </div>
                )}
                <div>
                  <p className='font-medium'>{order.product_type}</p>
                  {order.design && (
                    <p className='text-sm text-muted-foreground line-clamp-2'>
                      {order.design.prompt}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Shipping Details */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Truck className='h-5 w-5' />
                  Shipping Details
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex items-start gap-2'>
                    <MapPin className='h-4 w-4 mt-1 text-muted-foreground' />
                    <div>
                      <p className='font-medium'>
                        {order.shipping_addresses.first_name}{' '}
                        {order.shipping_addresses.last_name}
                      </p>
                      {order.shipping_addresses.company_name && (
                        <p className='text-sm text-muted-foreground'>
                          {order.shipping_addresses.company_name}
                        </p>
                      )}
                      <p className='text-sm'>
                        {order.shipping_addresses.address_line1}
                      </p>
                      {order.shipping_addresses.address_line2 && (
                        <p className='text-sm'>
                          {order.shipping_addresses.address_line2}
                        </p>
                      )}
                      <p className='text-sm'>
                        {order.shipping_addresses.city}
                        {order.shipping_addresses.state &&
                          `, ${order.shipping_addresses.state}`}{' '}
                        {order.shipping_addresses.post_code}
                      </p>
                      <p className='text-sm'>
                        {order.shipping_addresses.country}
                      </p>
                      <p className='text-sm text-muted-foreground mt-1'>
                        {order.shipping_addresses.email}
                        {order.shipping_addresses.phone &&
                          ` • ${order.shipping_addresses.phone}`}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className='space-y-2'>
                  <p className='font-medium'>Shipping Method</p>
                  <p className='text-sm'>{order.shipment_method_name}</p>
                  {order.tracking_code && order.tracking_url && (
                    <p className='text-sm'>
                      Tracking:{' '}
                      <a
                        href={order.tracking_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-blue-600 hover:underline'
                      >
                        {order.tracking_code}
                      </a>
                    </p>
                  )}
                </div>

                <div className='space-y-2'>
                  <p className='font-medium'>Production Details</p>
                  <p className='text-sm'>
                    Produced in: {order.production_country}
                    {order.production_state_province &&
                      `, ${order.production_state_province}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Receipt className='h-5 w-5' />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <div className='flex justify-between text-sm'>
                    <span>Products</span>
                    <span>
                      {order.total_price} {order.currency}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>Shipping</span>
                    <span>
                      {order.total_shipping} {order.currency}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>Packaging</span>
                    <span>
                      {order.total_packaging} {order.currency}
                    </span>
                  </div>
                  <div className='flex justify-between text-sm'>
                    <span>VAT</span>
                    <span>
                      {order.total_vat} {order.currency}
                    </span>
                  </div>
                  <Separator />
                  <div className='flex justify-between font-medium'>
                    <span>Total</span>
                    <span>
                      {order.total_amount.toFixed(2)} {order.currency}
                    </span>
                  </div>
                </div>

                {order.financial_status !== 'paid' && (
                  <Button className='w-full mt-4' onClick={handlePayment}>
                    <CreditCard className='h-4 w-4 mr-2' />
                    Pay with PayPal
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
