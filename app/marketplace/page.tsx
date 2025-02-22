import { Metadata } from 'next'
import MarketplaceClient from './marketplace-client'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const metadata: Metadata = {
  title: 'Marketplace - Votre App',
  description: 'Découvrez et achetez des designs uniques dans notre marketplace'
}

export default async function MarketplacePage () {
  const supabase = createServerComponentClient({ cookies })

  // Récupérer les designs côté serveur
  const { data: initialDesigns, count } = await supabase
    .from('designs')
    .select('*', { count: 'exact' })
    .eq('status', 'marketplace')
    .order('created_at', { ascending: false })
    .range(0, 11) // Pour les 12 premiers items

  // Récupérer la session utilisateur
  const {
    data: { session }
  } = await supabase.auth.getSession()

  return (
    <MarketplaceClient
      initialDesigns={initialDesigns || []}
      totalCount={count || 0}
      initialSession={session}
    />
  )
}
