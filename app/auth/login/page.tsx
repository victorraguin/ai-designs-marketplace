'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage () {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data: authData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password
      })

    if (signInError) {
      toast.error(signInError.message)
      setIsLoading(false)
      return
    }

    if (authData.user) {
      const userId = authData.user.id

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert([
            {
              user_id: userId,
              full_name: authData.user.user_metadata?.full_name || null
            }
          ])

        if (insertError) {
          toast.error('Error creating profile')
          setIsLoading(false)
          return
        }
      } else if (profileError) {
        toast.error('Error loading profile')
        setIsLoading(false)
        return
      }
    }

    toast.success('Logged in successfully!')
    const redirectTo = searchParams.get('redirectTo') || '/dashboard'
    router.push(redirectTo)
    router.refresh()
    setIsLoading(false)
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-8'>
      <div className='container mx-auto max-w-[350px] px-4'>
        <div className='flex flex-col space-y-6'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Welcome back
            </h1>
            <p className='text-sm text-muted-foreground'>
              Enter your email to sign in to your account
            </p>
          </div>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                id='email'
                name='email'
                placeholder='name@example.com'
                type='email'
                autoCapitalize='none'
                autoComplete='email'
                autoCorrect='off'
                disabled={isLoading}
                required
              />
            </div>
            <div className='space-y-2 relative'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                name='password'
                type={showPassword ? 'text' : 'password'}
                disabled={isLoading}
                required
              />
              <div className='absolute inset-y-0 right-0 top-6 pr-3 flex items-center'>
                {showPassword ? (
                  <EyeOff
                    className='h-5 w-5 cursor-pointer'
                    onClick={() => setShowPassword(!showPassword)}
                  />
                ) : (
                  <Eye
                    className='h-5 w-5 cursor-pointer'
                    onClick={() => setShowPassword(!showPassword)}
                  />
                )}
              </div>
            </div>
            <Button className='w-full' type='submit' disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            <Link
              href='/auth/register'
              className='hover:text-brand underline underline-offset-4'
            >
              Don't have an account? Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
