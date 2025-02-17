'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import {
  Heart,
  Calendar,
  Eye,
  Tag,
  Paintbrush,
  Loader2,
  ArrowRight
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface Design {
  id: string
  image_url: string
  prompt: string
  likes_count: number
  views_count: number
  creator_id: string
  category: string
  created_at: string
  style_id: string
  creator?: {
    full_name: string
    email: string
  }
  style?: {
    name: string
    description: string
  }
}

export default function DesignDetailPage () {
  const params = useParams()
  const router = useRouter()
  const [design, setDesign] = useState<Design | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    loadDesign()
  }, [])

  async function loadDesign () {
    try {
      const { data, error } = await supabase
        .from('designs')
        .select(
          `
          *,
          creator:user_profiles(full_name),
          style:styles(name, description)
        `
        )
        .eq('id', params.id)
        .single()
      if (error) throw error
      setDesign(data)

      // Increment views
      if (data) {
        await supabase
          .from('designs')
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq('id', data.id)
      }
    } catch (error: any) {
      toast.error('Error loading design')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async () => {
    if (!user || !design) {
      toast.error('Please log in to like designs')
      return
    }
    try {
      const { error } = await supabase
        .from('likes')
        .insert([{ design_id: design.id, user_id: user.id }])
      if (error) throw error
      setDesign({ ...design, likes_count: (design.likes_count || 0) + 1 })
      toast.success('Design liked!')
    } catch (error: any) {
      toast.error('Error liking design')
    }
  }

  const handleOrderClick = () => {
    if (!user) {
      toast.error('Please log in to order designs')
      router.push('/auth/login')
      return
    }
    router.push(`/customize-product/${design?.id}`)
  }

  if (loading) {
    return (
      <div className='flex h-[calc(100vh-3.5rem)] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  if (!design) {
    return (
      <div className='min-h-[calc(100vh-3.5rem)] py-8'>
        <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='text-center py-12'>
            <p className='text-muted-foreground'>Design not found.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] py-8'>
      <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='space-y-8'>
          {/* Design Info Section */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
            <div className='space-y-4'>
              <Card className='overflow-hidden'>
                <img
                  src={design.image_url}
                  alt={design.prompt}
                  className='w-full aspect-square object-cover'
                />
              </Card>
              <div className='flex justify-between items-center'>
                <Button variant='ghost' size='sm' onClick={handleLike}>
                  <Heart className='h-4 w-4 mr-1' />
                  {design.likes_count || 0} likes
                </Button>
              </div>
            </div>
            <div className='space-y-6'>
              <Card>
                <CardHeader>
                  <CardTitle>Design Details</CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='space-y-2'>
                    <h3 className='font-medium'>Prompt</h3>
                    <p className='text-muted-foreground'>{design.prompt}</p>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Badge variant='secondary'>
                      <Tag className='h-3 w-3 mr-1' />
                      {design.category}
                    </Badge>
                    {design.style && (
                      <Badge variant='secondary'>
                        <Paintbrush className='h-3 w-3 mr-1' />
                        {design.style.name}
                      </Badge>
                    )}
                  </div>
                  <div className='flex gap-4 text-sm text-muted-foreground'>
                    <span className='flex items-center'>
                      <Calendar className='h-4 w-4 mr-1' />
                      {format(new Date(design.created_at), 'MMM d, yyyy')}
                    </span>
                    <span className='flex items-center'>
                      <Eye className='h-4 w-4 mr-1' />
                      {design.views_count || 0} views
                    </span>
                  </div>
                  <Separator />
                  <div className='space-y-4'>
                    <h3 className='font-medium'>Creator</h3>
                    <div className='flex items-center space-x-4'>
                      <Avatar>
                        <AvatarImage
                          src={`https://avatar.vercel.sh/${design.creator?.email}`}
                        />
                        <AvatarFallback>
                          {design.creator?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className='font-medium'>
                          {design.creator?.full_name}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          {design.creator?.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  {design.style?.description && (
                    <>
                      <Separator />
                      <div className='space-y-2'>
                        <h3 className='font-medium'>Style Description</h3>
                        <p className='text-sm text-muted-foreground'>
                          {design.style.description}
                        </p>
                      </div>
                    </>
                  )}
                  <Button className='w-full mt-4' onClick={handleOrderClick}>
                    Order Now
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
