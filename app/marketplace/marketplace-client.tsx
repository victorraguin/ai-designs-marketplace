'use client'

import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Heart, Search, SlidersHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Design } from '@/types/design'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'

const supabase = createClient()

interface MarketplaceClientProps {
  initialDesigns: Design[]
  totalCount: number
  initialSession: Session | null
}

export default function MarketplaceClient ({
  initialDesigns,
  totalCount,
  initialSession
}: MarketplaceClientProps) {
  const router = useRouter()
  const ITEMS_PER_PAGE = 12

  const [designs, setDesigns] = useState<Design[]>(initialDesigns)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('newest')

  useEffect(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const loadMoreDesigns = async () => {
    if (loading) return

    setLoading(true)
    try {
      let query = supabase
        .from('designs')
        .select('*')
        .eq('status', 'marketplace')

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory)
      }

      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'most_liked':
          query = query.order('likes_count', { ascending: false })
          break
        case 'newest':
        default:
          query = query.order('created_at', { ascending: false })
      }

      query = query.range(
        page * ITEMS_PER_PAGE,
        (page + 1) * ITEMS_PER_PAGE - 1
      )

      const { data: newDesigns } = await query

      if (newDesigns && newDesigns.length > 0) {
        setDesigns([...designs, ...newDesigns])
        setPage(page + 1)
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des designs')
    } finally {
      setLoading(false)
    }
  }

  const handleLike = async (designId: string) => {
    if (!session?.user) {
      toast.error('Veuillez vous connecter pour aimer les designs')
      return
    }

    try {
      const { error } = await supabase
        .from('likes')
        .insert([{ design_id: designId, user_id: session.user.id }])

      if (error) throw error

      setDesigns(
        designs.map(design =>
          design.id === designId
            ? { ...design, likes_count: (design.likes_count || 0) + 1 }
            : design
        )
      )

      toast.success('Design aimé !')
    } catch (error) {
      toast.error('Erreur lors du like')
    }
  }

  const filteredDesigns = designs.filter(
    design =>
      design.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      design.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading && designs.length === 0) {
    return (
      <div className='flex h-[calc(100vh-3.5rem)] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] py-8'>
      <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-col space-y-8'>
          <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
            <h1 className='text-3xl font-bold'>Marketplace</h1>
            <div className='flex flex-col md:flex-row w-full md:w-auto gap-4'>
              <div className='relative flex-1 md:w-80'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Rechercher des designs...'
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className='pl-9'
                />
              </div>
              <div className='flex gap-2'>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className='w-[140px]'>
                    <SlidersHorizontal className='h-4 w-4 mr-2' />
                    <SelectValue placeholder='Catégorie' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>Toutes les catégories</SelectItem>
                    <SelectItem value='abstract'>Abstrait</SelectItem>
                    <SelectItem value='landscape'>Paysage</SelectItem>
                    <SelectItem value='portrait'>Portrait</SelectItem>
                    <SelectItem value='pattern'>Motif</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className='w-[140px]'>
                    <SelectValue placeholder='Trier par' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='newest'>Plus récent</SelectItem>
                    <SelectItem value='oldest'>Plus ancien</SelectItem>
                    <SelectItem value='most_liked'>Plus aimés</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'>
            {filteredDesigns.map(design => (
              <Card key={design.id} className='overflow-hidden group'>
                <CardHeader className='p-0'>
                  <div
                    className='cursor-pointer relative aspect-square'
                    onClick={() => router.push(`/marketplace/${design.id}`)}
                  >
                    <Image
                      src={design.image_url}
                      alt={design.prompt}
                      fill
                      className='inset-0 w-full h-full object-cover transition-transform group-hover:scale-105'
                    />
                    <div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                      <span className='text-white text-sm font-medium'>
                        Voir les détails
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className='p-4'>
                  <p className='text-sm line-clamp-2'>{design.prompt}</p>
                  <p className='text-xs text-muted-foreground mt-2'>
                    Catégorie: {design.category}
                  </p>
                </CardContent>
                <CardFooter className='p-4 pt-0 flex justify-between'>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleLike(design.id)}
                  >
                    <Heart className='h-4 w-4 mr-1' />
                    {design.likes_count || 0}
                  </Button>
                  <Button size='sm'>Acheter</Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          {page * ITEMS_PER_PAGE < totalCount && (
            <div className='mt-8 text-center'>
              <Button
                onClick={loadMoreDesigns}
                disabled={loading}
                className='bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50'
              >
                {loading ? 'Chargement...' : 'Charger plus'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
