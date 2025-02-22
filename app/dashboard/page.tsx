import { createClient } from '@/utils/supabase/server'
import DashboardClient from './dashboard-client'
import { redirect } from 'next/navigation'

export default async function DashboardPage () {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', data.user.id)
    .single()

  console.log('profile', profile)

  const { data: designStats } = await supabase
    .from('designs')
    .select('*')
    .eq('creator_id', data.user.id)

  const { count: ordersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact' })
    .eq('buyer_id', data.user.id)

  const initialDatas = {
    total_designs: designStats?.length || 0,
    total_likes:
      designStats?.reduce((acc, curr) => acc + (curr.likes_count || 0), 0) || 0,
    total_views:
      designStats?.reduce((acc, curr) => acc + (curr.views_count || 0), 0) || 0,
    total_orders: ordersCount || 0,
    designs: designStats
  }

  return (
    <DashboardClient
      initialProfile={profile}
      initialDatas={initialDatas}
      user={data.user}
    />
  )
}
