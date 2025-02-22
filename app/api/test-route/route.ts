import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET () {
  const supabase = await createClient()

  const { data: user, error } = await supabase.auth.getUser()

  console.log('User:', user)

  if (!user) {
    return NextResponse.json(
      { error: 'User not authenticated' },
      { status: 401 }
    )
  }

  return NextResponse.json({ user })
}
