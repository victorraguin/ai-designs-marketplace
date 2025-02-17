'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Heart,
  Eye,
  Tag,
  Paintbrush,
  ShoppingBag,
  Settings,
  User
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { AddressSelector } from '@/components/address-selector'

interface Profile {
  id: string
  email: string
  full_name: string | null
  subscription_id: string | null
  generations_used: number
  last_generation_reset: string
  is_admin: boolean
}

interface Design {
  id: string
  image_url: string
  prompt: string
  likes_count: number
  views_count: number
  status: string
  category: string
  created_at: string
}

interface Order {
  id: string
  design_id: string
  product_type: string
  total_amount: number
  order_status: string
  created_at: string
  design?: Design
}

interface Stats {
  total_designs: number
  total_likes: number
  total_views: number
  total_orders: number
}

export default function DashboardPage () {
  const router = useRouter()
  const [designs, setDesigns] = useState<Design[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats>({
    total_designs: 0,
    total_likes: 0,
    total_views: 0,
    total_orders: 0
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState('newest')
  const [filterStatus, setFilterStatus] = useState('all')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    email: ''
  })
  const itemsPerPage = 8
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    loadData()
  }, [user, page, sortBy, filterStatus])

  async function loadData () {
    if (!user) return
    setLoading(true)

    try {
      // Préparer les requêtes
      const designStatsQuery = supabase
        .from('designs')
        .select('likes_count, views_count', { count: 'exact' })
        .eq('creator_id', user.id)

      const ordersQuery = supabase
        .from('orders')
        .select('*', { count: 'exact' })
        .eq('buyer_id', user.id)

      let designsQuery = supabase
        .from('designs')
        .select('*', { count: 'exact' })
        .eq('creator_id', user.id)

      if (filterStatus !== 'all') {
        designsQuery = designsQuery.eq('status', filterStatus)
      }
      // Appliquer le tri
      switch (sortBy) {
        case 'oldest':
          designsQuery = designsQuery.order('created_at', { ascending: true })
          break
        case 'most_liked':
          designsQuery = designsQuery.order('likes_count', { ascending: false })
          break
        case 'most_viewed':
          designsQuery = designsQuery.order('views_count', { ascending: false })
          break
        default:
          designsQuery = designsQuery.order('created_at', { ascending: false })
      }
      designsQuery = designsQuery.range(
        (page - 1) * itemsPerPage,
        page * itemsPerPage - 1
      )

      // Exécuter toutes les requêtes en parallèle
      const [
        { data: designStats },
        { count: ordersCount, data: ordersData },
        { count: designsCount, data: designsData }
      ] = await Promise.all([designStatsQuery, ordersQuery, designsQuery])

      if (designStats) {
        setStats({
          total_designs: designStats.length,
          total_likes: designStats.reduce(
            (acc, curr) => acc + (curr.likes_count || 0),
            0
          ),
          total_views: designStats.reduce(
            (acc, curr) => acc + (curr.views_count || 0),
            0
          ),
          total_orders: ordersCount || 0
        })
      }
      setDesigns(designsData || [])
      setOrders(ordersData || [])
      if (designsCount) {
        setTotalPages(Math.ceil(designsCount / itemsPerPage))
      }
    } catch (error: any) {
      toast.error('Error loading dashboard data')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  async function loadProfile () {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      setProfile(data)
      setProfileForm({
        full_name: data.full_name || '',
        email: data.email
      })
    } catch (error: any) {
      toast.error('Error loading profile')
    }
  }

  async function handleProfileUpdate (e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profileForm.full_name,
          email: profileForm.email
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Profile updated successfully')
      setIsEditingProfile(false)
      loadProfile()
    } catch (error: any) {
      toast.error('Error updating profile')
    }
  }

  const handleStatusChange = async (designId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('designs')
        .update({ status: newStatus })
        .eq('id', designId)

      if (error) throw error

      setDesigns(
        designs.map(design =>
          design.id === designId ? { ...design, status: newStatus } : design
        )
      )

      toast.success(
        `Design ${
          newStatus === 'marketplace' ? 'published to marketplace' : 'updated'
        }`
      )
    } catch (error: any) {
      toast.error('Error updating design status')
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
      <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <h1 className='text-3xl font-bold mb-8'>Dashboard</h1>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Designs
              </CardTitle>
              <Paintbrush className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.total_designs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Likes</CardTitle>
              <Heart className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.total_likes}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Views</CardTitle>
              <Eye className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.total_views}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Total Orders
              </CardTitle>
              <ShoppingBag className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stats.total_orders}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue='designs' className='space-y-4'>
          <TabsList>
            <TabsTrigger value='designs'>My Designs</TabsTrigger>
            <TabsTrigger value='orders'>My Orders</TabsTrigger>
            <TabsTrigger value='profile'>Profile</TabsTrigger>
          </TabsList>

          <TabsContent value='designs' className='space-y-4'>
            <div className='flex flex-col md:flex-row justify-between gap-4'>
              <div className='flex gap-2'>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className='w-[140px]'>
                    <SelectValue placeholder='Filter by status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Status</SelectItem>
                    <SelectItem value='draft'>Draft</SelectItem>
                    <SelectItem value='marketplace'>Published</SelectItem>
                    <SelectItem value='private'>Private</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className='w-[140px]'>
                    <SelectValue placeholder='Sort by' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='newest'>Newest First</SelectItem>
                    <SelectItem value='oldest'>Oldest First</SelectItem>
                    <SelectItem value='most_liked'>Most Liked</SelectItem>
                    <SelectItem value='most_viewed'>Most Viewed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              {designs.map(design => (
                <Card key={design.id} className='overflow-hidden'>
                  <div className='relative aspect-square'>
                    <img
                      src={design.image_url}
                      alt={design.prompt}
                      className='absolute inset-0 w-full h-full object-cover'
                    />
                    <div className='absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center'>
                      <div className='flex gap-2'>
                        <Button
                          size='sm'
                          onClick={() =>
                            router.push(`/marketplace/${design.id}`)
                          }
                        >
                          View
                        </Button>
                        <Button
                          size='sm'
                          variant='secondary'
                          onClick={() =>
                            handleStatusChange(
                              design.id,
                              design.status === 'marketplace'
                                ? 'private'
                                : 'marketplace'
                            )
                          }
                        >
                          {design.status === 'marketplace'
                            ? 'Unpublish'
                            : 'Publish'}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <CardContent className='p-4'>
                    <div className='flex justify-between items-center mb-2'>
                      <Badge
                        variant={
                          design.status === 'marketplace'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {design.status}
                      </Badge>
                      <div className='flex gap-2 text-sm text-muted-foreground'>
                        <span className='flex items-center'>
                          <Heart className='h-4 w-4 mr-1' />
                          {design.likes_count || 0}
                        </span>
                        <span className='flex items-center'>
                          <Eye className='h-4 w-4 mr-1' />
                          {design.views_count || 0}
                        </span>
                      </div>
                    </div>
                    <p className='text-sm line-clamp-2'>{design.prompt}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalPages > 1 && (
              <div className='flex justify-center gap-2 mt-4'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value='orders'>
            <div className='space-y-4'>
              {orders.map(order => (
                <Card key={order.id}>
                  <CardContent className='p-6'>
                    <div className='flex flex-col md:flex-row gap-6'>
                      {order.design && (
                        <div className='w-full md:w-48'>
                          <img
                            src={order.design.image_url}
                            alt={order.design.prompt}
                            className='w-full aspect-square object-cover rounded-md'
                          />
                        </div>
                      )}
                      <div className='flex-1 space-y-4'>
                        <div className='flex flex-col md:flex-row justify-between gap-4'>
                          <div>
                            <h3 className='font-medium'>
                              Order #{order.id.slice(0, 8)}
                            </h3>
                            <p className='text-sm text-muted-foreground'>
                              {format(new Date(order.created_at), 'PPP')}
                            </p>
                          </div>
                          <Badge
                            variant={
                              order.order_status === 'delivered'
                                ? 'default'
                                : order.order_status === 'processing'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {order.order_status}
                          </Badge>
                        </div>
                        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                          <div>
                            <p className='text-sm font-medium'>Product Type</p>
                            <p className='text-sm text-muted-foreground'>
                              {order.product_type}
                            </p>
                          </div>
                          <div>
                            <p className='text-sm font-medium'>Total Amount</p>
                            <p className='text-sm text-muted-foreground'>
                              ${order.total_amount}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {orders.length === 0 && (
                <div className='text-center py-12'>
                  <ShoppingBag className='h-12 w-12 mx-auto text-muted-foreground' />
                  <p className='mt-4 text-lg font-medium'>No orders yet</p>
                  <p className='text-muted-foreground'>
                    Your order history will appear here
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value='profile'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
              <Card>
                <CardHeader>
                  <div className='flex justify-between items-center'>
                    <CardTitle className='text-xl'>
                      Profile Information
                    </CardTitle>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => setIsEditingProfile(!isEditingProfile)}
                    >
                      {isEditingProfile ? 'Cancel' : 'Edit'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingProfile ? (
                    <form onSubmit={handleProfileUpdate} className='space-y-4'>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium'>Full Name</label>
                        <Input
                          value={profileForm.full_name}
                          onChange={e =>
                            setProfileForm({
                              ...profileForm,
                              full_name: e.target.value
                            })
                          }
                        />
                      </div>
                      <div className='space-y-2'>
                        <label className='text-sm font-medium'>Email</label>
                        <Input
                          value={profileForm.email}
                          onChange={e =>
                            setProfileForm({
                              ...profileForm,
                              email: e.target.value
                            })
                          }
                        />
                      </div>
                      <Button type='submit'>Save Changes</Button>
                    </form>
                  ) : (
                    <div className='space-y-4'>
                      <div>
                        <p className='text-sm font-medium'>Full Name</p>
                        <p className='text-sm text-muted-foreground'>
                          {profile?.full_name || 'Not set'}
                        </p>
                      </div>
                      <div>
                        <p className='text-sm font-medium'>Email</p>
                        <p className='text-sm text-muted-foreground'>
                          {profile?.email}
                        </p>
                      </div>
                      <div>
                        <p className='text-sm font-medium'>Subscription</p>
                        <p className='text-sm text-muted-foreground'>
                          {profile?.subscription_id || 'Free'}
                        </p>
                      </div>
                      <div>
                        <p className='text-sm font-medium'>Generations Used</p>
                        <p className='text-sm text-muted-foreground'>
                          {profile?.generations_used || 0} generations
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className='text-xl'>Shipping Addresses</CardTitle>
                </CardHeader>
                <CardContent>
                  <AddressSelector onSelect={() => {}} showActions={true} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
