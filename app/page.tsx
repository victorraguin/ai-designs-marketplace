'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

export default function Home () {
  const [marketplaceDesigns, setMarketplaceDesigns] = useState<
    { id: string; image_url: string; likes_count: number }[]
  >([])

  useEffect(() => {
    async function fetchDesigns () {
      const { data, error } = await supabase
        .from('designs')
        .select('id, image_url, likes_count')
        .eq('status', 'marketplace')
        .order('likes_count', { ascending: false })
        .limit(4)

      if (error) {
        console.error('Error fetching marketplace designs:', error)
      } else {
        setMarketplaceDesigns(data || [])
      }
    }
    fetchDesigns()
  }, [])

  return (
    <div className='flex min-h-[calc(100vh-3.5rem)] flex-col'>
      <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex-1 items-center md:grid md:grid-cols-2 md:gap-12 md:min-h-[calc(100vh-4rem)]'>
        <div className='flex flex-col justify-center space-y-4 py-8 md:py-12 lg:py-32'>
          <div className='space-y-4'>
            <h1 className='text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500'>
              Transform Your Ideas into Unique Designs
            </h1>
            <p className='max-w-[600px] text-gray-400 md:text-xl'>
              Create stunning artwork with AI and turn them into custom
              products. Join our creative marketplace and start selling your
              designs today.
            </p>
          </div>
          <div className='flex flex-col gap-2 min-[400px]:flex-row'>
            <Button size='lg' asChild>
              <Link href='/create'>
                <Sparkles className='mr-2 h-4 w-4' />
                Create Design
              </Link>
            </Button>
            <Button variant='outline' size='lg' asChild>
              <Link href='/marketplace'>Explore Marketplace</Link>
            </Button>
          </div>
        </div>
        <div className='block'>
          <div className='grid grid-cols-2 gap-4 md:p-8'>
            {marketplaceDesigns.length === 0
              ? // Affichage des placeholders en attendant les images
                [1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className='aspect-square rounded-lg bg-gradient-to-br from-neutral-900 to-neutral-800 p-4 shadow-xl'
                  >
                    <div className='h-full w-full rounded bg-neutral-950/50 animate-pulse' />
                  </div>
                ))
              : // Affichage des images récupérées
                marketplaceDesigns.map(design => (
                  <div
                    key={design.id}
                    className='aspect-square rounded-lg bg-gradient-to-br from-neutral-900 to-neutral-800 p-2 shadow-xl relative overflow-hidden'
                  >
                    <Image
                      src={design.image_url}
                      alt='Design'
                      className='h-full w-full object-cover'
                      fill
                    />
                    {/* Effet overlay identique à celui existant */}
                    {/* <div className='absolute inset-0 bg-neutral-950/50 hover:opacity-100 transition-opacity' /> */}
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  )
}
