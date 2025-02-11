'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Loader2, Plus, MapPin, Star, StarOff } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
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

export default function AddressesPage () {
  const router = useRouter()
  const { user } = useAuth()
  const [addresses, setAddresses] = useState<ShippingAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Partial<ShippingAddress>>({})

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    loadAddresses()
  }, [user])

  async function loadAddresses () {
    try {
      const { data, error } = await supabase
        .from('shipping_addresses')
        .select('*')
        .order('is_default', { ascending: false })

      if (error) throw error
      setAddresses(data || [])
    } catch (error: any) {
      toast.error('Error loading addresses')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit (e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from('shipping_addresses').insert([
        {
          ...formData,
          user_id: user?.id,
          is_default: addresses.length === 0 ? true : formData.is_default
        }
      ])

      if (error) throw error

      toast.success('Address added successfully')
      setShowForm(false)
      setFormData({})
      loadAddresses()
    } catch (error: any) {
      toast.error('Error adding address')
    } finally {
      setLoading(false)
    }
  }

  async function setDefaultAddress (addressId: string) {
    try {
      // First, remove default from all addresses
      await supabase
        .from('shipping_addresses')
        .update({ is_default: false })
        .eq('user_id', user?.id)

      // Then set the new default
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

  async function deleteAddress (addressId: string) {
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
        <div className='flex justify-between items-center mb-6'>
          <h1 className='text-2xl font-bold'>Shipping Addresses</h1>
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className='h-4 w-4 mr-2' />
            Add New Address
          </Button>
        </div>

        {showForm && (
          <Card className='mb-6'>
            <CardHeader>
              <CardTitle>New Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className='space-y-4'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='first_name'>First Name</Label>
                    <Input
                      id='first_name'
                      value={formData.first_name || ''}
                      onChange={e =>
                        setFormData({ ...formData, first_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='last_name'>Last Name</Label>
                    <Input
                      id='last_name'
                      value={formData.last_name || ''}
                      onChange={e =>
                        setFormData({ ...formData, last_name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='company_name'>
                      Company Name (Optional)
                    </Label>
                    <Input
                      id='company_name'
                      value={formData.company_name || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          company_name: e.target.value
                        })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email</Label>
                    <Input
                      id='email'
                      type='email'
                      value={formData.email || ''}
                      onChange={e =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='phone'>Phone (Optional)</Label>
                    <Input
                      id='phone'
                      value={formData.phone || ''}
                      onChange={e =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='country'>Country</Label>
                    <Select
                      value={formData.country || ''}
                      onValueChange={value =>
                        setFormData({ ...formData, country: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder='Select country' />
                      </SelectTrigger>
                      <SelectContent>
                        {countries.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='space-y-2 md:col-span-2'>
                    <Label htmlFor='address_line1'>Address Line 1</Label>
                    <Input
                      id='address_line1'
                      value={formData.address_line1 || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          address_line1: e.target.value
                        })
                      }
                      required
                    />
                  </div>
                  <div className='space-y-2 md:col-span-2'>
                    <Label htmlFor='address_line2'>
                      Address Line 2 (Optional)
                    </Label>
                    <Input
                      id='address_line2'
                      value={formData.address_line2 || ''}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          address_line2: e.target.value
                        })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='city'>City</Label>
                    <Input
                      id='city'
                      value={formData.city || ''}
                      onChange={e =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='state'>State/Province (Optional)</Label>
                    <Input
                      id='state'
                      value={formData.state || ''}
                      onChange={e =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='post_code'>Postal Code</Label>
                    <Input
                      id='post_code'
                      value={formData.post_code || ''}
                      onChange={e =>
                        setFormData({ ...formData, post_code: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>

                <div className='flex justify-end gap-2'>
                  <Button variant='outline' onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type='submit'>Save Address</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          {addresses.map(address => (
            <Card key={address.id}>
              <CardContent className='pt-6'>
                <div className='flex justify-between items-start mb-4'>
                  <div className='flex items-center gap-2'>
                    <MapPin className='h-4 w-4 text-muted-foreground' />
                    <span className='font-medium'>
                      {address.first_name} {address.last_name}
                    </span>
                  </div>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => setDefaultAddress(address.id)}
                    disabled={address.is_default}
                  >
                    {address.is_default ? (
                      <Star className='h-4 w-4 text-yellow-500' />
                    ) : (
                      <StarOff className='h-4 w-4' />
                    )}
                  </Button>
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
                    {address.city}, {address.state} {address.post_code}
                  </p>
                  <p>{countries.find(c => c.code === address.country)?.name}</p>
                  <p className='text-muted-foreground'>{address.email}</p>
                  {address.phone && (
                    <p className='text-muted-foreground'>{address.phone}</p>
                  )}
                </div>

                <div className='flex justify-end gap-2 mt-4'>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => deleteAddress(address.id)}
                    disabled={address.is_default}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {addresses.length === 0 && !showForm && (
          <Card>
            <CardContent className='py-8'>
              <div className='text-center'>
                <MapPin className='h-8 w-8 mx-auto text-muted-foreground mb-2' />
                <p className='text-lg font-medium'>No addresses yet</p>
                <p className='text-muted-foreground mb-4'>
                  Add a shipping address to get started
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className='h-4 w-4 mr-2' />
                  Add New Address
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
