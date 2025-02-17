'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

export default function RegisterPage () {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const fullName = formData.get('fullName') as string

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    // Création de l'utilisateur dans auth.users
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (signUpError) {
      toast.error(signUpError.message)
      setIsLoading(false)
      return
    }

    if (!authData.user) {
      toast.error('User creation failed. Try again.')
      setIsLoading(false)
      return
    }

    // Redirection (demander de vérifier l'e-mail si nécessaire)
    toast.info(
      'Thanks for signin up! Please check your email to confirm your account.'
    )
    router.push('/auth/login')
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-8'>
      <div className='container mx-auto max-w-[350px] px-4'>
        <div className='flex flex-col space-y-6'>
          <div className='flex flex-col space-y-2 text-center'>
            <h1 className='text-2xl font-semibold tracking-tight'>
              Create an account
            </h1>
            <p className='text-sm text-muted-foreground'>
              Enter your details to create your account
            </p>
          </div>
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='fullName'>Full Name</Label>
              <Input
                id='fullName'
                name='fullName'
                placeholder='John Doe'
                type='text'
                disabled={isLoading}
                required
              />
            </div>
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
            <div className='space-y-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                name='password'
                type='password'
                disabled={isLoading}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirm Password</Label>
              <Input
                id='confirmPassword'
                name='confirmPassword'
                type='password'
                disabled={isLoading}
                required
              />
            </div>
            {error && <p className='text-sm text-red-500'>{error}</p>}
            <Button className='w-full' type='submit' disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className='px-8 text-center text-sm text-muted-foreground'>
            <Link
              href='/auth/login'
              className='hover:text-brand underline underline-offset-4'
            >
              Already have an account? Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
