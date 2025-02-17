'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/types/supabase'

type UserProfile = Database['public']['Tables']['user_profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: UserProfile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true
})

export function AuthProvider ({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

    const loadSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const sessionUser = sessionData?.session?.user ?? null
      setUser(sessionUser)

      if (sessionUser) {
        await fetchProfile(sessionUser)
      }

      setLoading(false)
    }

    loadSession()

    // Écouter les changements d'authentification
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser)

      if (sessionUser) {
        await fetchProfile(sessionUser)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
