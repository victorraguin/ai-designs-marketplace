'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import ReactFlagsSelect from 'react-flags-select'

export default function RegisterPage () {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string>('FR') // Par défaut, France

  async function handleSubmit (event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    const formData = new FormData(event.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const fullName = formData.get('fullName') as string

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      setError('Les mots de passe ne correspondent pas')
      setIsLoading(false)
      return
    }

    // Création de l'utilisateur dans auth.users
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          country: selectedCountry
        }
      }
    })

    if (signUpError) {
      toast.error(signUpError.message)
      setIsLoading(false)
      return
    }

    if (!authData.user) {
      toast.error("La création de l'utilisateur a échoué. Veuillez réessayer.")
      setIsLoading(false)
      return
    }

    // Redirection (demander de vérifier l'e-mail si nécessaire)
    toast.info(
      'Merci pour votre inscription ! Veuillez vérifier votre e-mail pour confirmer votre compte.'
    )
    router.push('/auth/login')
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-8'>
      <div className='container mx-auto max-w-lg px-4'>
        <div className=' shadow-lg rounded-lg p-6 space-y-6'>
          <div className='text-center'>
            <h1 className='text-2xl font-semibold'>Créer un compte</h1>
            <p className='text-sm text-gray-500'>
              Entrez vos informations pour créer votre compte
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className='grid grid-cols-1 md:grid-cols-2 gap-4'
          >
            <div className='space-y-2'>
              <Label htmlFor='fullName'>Nom complet</Label>
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
              <Label htmlFor='password'>Mot de passe</Label>
              <Input
                id='password'
                name='password'
                type='password'
                disabled={isLoading}
                required
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor='confirmPassword'>Confirmer le mot de passe</Label>
              <Input
                id='confirmPassword'
                name='confirmPassword'
                type='password'
                disabled={isLoading}
                required
              />
            </div>
            <div className='md:col-span-2 space-y-2'>
              <Label htmlFor='country'>Pays</Label>
              <ReactFlagsSelect
                selected={selectedCountry}
                onSelect={code => setSelectedCountry(code)}
                countries={[
                  'US',
                  'GB',
                  'FR',
                  'DE',
                  'IT',
                  'ES',
                  'CA',
                  'AU',
                  'JP',
                  'CN',
                  'BR',
                  'IN',
                  'RU',
                  'KR',
                  'MX'
                ]}
                searchable
                className='menu-flags'
                selectButtonClassName='menu-flags-button'
                searchPlaceholder='Rechercher un pays'
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className='text-sm text-red-500 md:col-span-2'>{error}</p>
            )}

            <div className='md:col-span-2'>
              <Button className='w-full' type='submit' disabled={isLoading}>
                {isLoading ? 'Création du compte...' : 'Créer un compte'}
              </Button>
            </div>
          </form>

          <p className='text-center text-sm text-muted-foreground'>
            <Link
              href='/auth/login'
              className='hover:text-brand underline underline-offset-4'
            >
              Vous avez déjà un compte ? Connectez-vous
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
