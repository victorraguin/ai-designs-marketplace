'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'
import { useRouter } from 'next/navigation'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {}
})

export function AuthProvider ({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchProfile = async (user: User) => {
    // Vérifier si l'utilisateur existe déjà dans user_profiles
    const { data: existingProfile, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error)
      return
    }

    if (!existingProfile) {
      // Insérer l'utilisateur dans user_profiles si non existant
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert([
          {
            user_id: user.id,
            email: user.email,
            full_name: user.user_metadata.full_name || ''
          }
        ])

      if (insertError) {
        console.error('Error inserting user profile:', insertError)
      }
    } else {
      setProfile(existingProfile)
    }
  }

  // ✅ Ajout de la fonction `signOut` qui met `user` à null immédiatement
  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null) // Met à jour immédiatement pour éviter un état obsolète
      setProfile(null)
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user)
        setLoading(false)
      } else {
        setLoading(false)
      }
    }

    loadSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        await fetchProfile(session.user)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
