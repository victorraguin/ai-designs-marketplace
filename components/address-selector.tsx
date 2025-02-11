'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { MapPin, Plus, Star, Pencil, Trash } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { countries } from '@/lib/countries'

interface ShippingAddress {
  id: string
  is_default: boolean
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

interface AddressSelectorProps {
  selectedAddressId?: string
  onSelect: (address: ShippingAddress) => void
  showActions?: boolean
}

export function AddressSelector ({
  selectedAddressId,
  onSelect,
  showActions = false
}: AddressSelectorProps) {
  const router = useRouter()
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAddresses()
  }, [])

  async function loadAddresses () {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .order('is_default', { ascending: false })

      if (error) throw error
      setAddresses(data || [])

      if (!selectedAddressId && data && data.length > 0) {
        const defaultAddress = data.find(addr => addr.is_default) || data[0]
        onSelect(defaultAddress)
      }
    } catch (error: any) {
      toast.error('Error loading addresses')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete (addressId: string) {
    try {
      const { error } = await supabase
        .from('shipping_addresses')
        .delete()
        .eq('id', addressId)

      if (error) throw error
      toast.success('Address deleted')
      loadAddresses()
    } catch (error: any) {
      toast.error('Error deleting address')
    }
  }

  async function handleSetDefault (addressId: string) {
    try {
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .neq('id', addressId)

      const { error } = await supabase
        .from('shipping_addresses')
        .update({ is_default: true })
        .eq('id', addressId)

      if (error) throw error
      toast.success('Default address updated')
      loadAddresses()
    } catch (error: any) {
      toast.error('Error updating default address')
    }
  }

  if (loading) {
    return (
      <div className='h-[200px] flex items-center justify-center'>
        <div className='animate-pulse'>Loading addresses...</div>
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {addresses.length === 0 ? (
        <Card>
          <CardContent className='py-8'>
            <div className='text-center'>
              <MapPin className='h-8 w-8 mx-auto text-muted-foreground mb-2' />
              <p className='text-lg font-medium'>No shipping addresses</p>
              <p className='text-muted-foreground mb-4'>
                Add a shipping address to continue
              </p>
              <Button onClick={() => router.push('/dashboard/addresses')}>
                <Plus className='h-4 w-4 mr-2' />
                Add New Address
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <RadioGroup
            value={selectedAddressId}
            onValueChange={value => {
              const address = addresses.find(addr => addr.id === value)
              if (address) onSelect(address)
            }}
          >
            <div className='grid grid-cols-1 gap-4'>
              {addresses.map(address => (
                <Card
                  key={address.id}
                  className={`relative ${
                    selectedAddressId === address.id ? 'border-primary' : ''
                  }`}
                >
                  <CardContent className='pt-6'>
                    {!showActions && (
                      <RadioGroupItem
                        value={address.id}
                        id={address.id}
                        className='absolute right-4 top-4'
                      />
                    )}
                    <div className='flex justify-between items-start mb-4'>
                      <div className='flex items-center gap-2'>
                        <MapPin className='h-4 w-4 text-muted-foreground' />
                        <span className='font-medium'>
                          {address.first_name} {address.last_name}
                        </span>
                        {address.is_default && (
                          <Badge variant='secondary'>Default</Badge>
                        )}
                      </div>
                      {showActions && (
                        <div className='flex gap-2'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleSetDefault(address.id)}
                            disabled={address.is_default}
                          >
                            <Star
                              className={`h-4 w-4 ${
                                address.is_default ? 'text-yellow-500' : ''
                              }`}
                            />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() =>
                              router.push(
                                `/dashboard/addresses/edit/${address.id}`
                              )
                            }
                          >
                            <Pencil className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleDelete(address.id)}
                            disabled={address.is_default}
                          >
                            <Trash className='h-4 w-4' />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className='space-y-1 text-sm'>
                      {address.company_name && (
                        <p className='text-muted-foreground'>
                          {address.company_name}
                        </p>
                      )}
                      <p>{address.address_line1}</p>
                      {address.address_line2 && <p>{address.address_line2}</p>}
                      <p>
                        {address.city}
                        {address.state && `, ${address.state}`}{' '}
                        {address.post_code}
                      </p>
                      <p>
                        {countries.find(c => c.code === address.country)?.name}
                      </p>
                      <p className='text-muted-foreground'>{address.email}</p>
                      {address.phone && (
                        <p className='text-muted-foreground'>{address.phone}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </RadioGroup>

          <div className='flex justify-end'>
            <Button
              variant='outline'
              onClick={() => router.push('/dashboard/addresses')}
            >
              <Plus className='h-4 w-4 mr-2' />
              Add New Address
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
