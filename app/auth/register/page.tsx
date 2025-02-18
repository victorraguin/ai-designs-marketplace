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
import { Eye, EyeOff } from 'lucide-react'

export default function RegisterPage () {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCountry, setSelectedCountry] = useState<string>('FR') // Default: France
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<string>('')

  // Simple password strength check:
  // Must be at least 8 characters and include uppercase, lowercase, number, and special character.
  const checkPasswordStrength = (password: string) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
    if (!password) {
      return ''
    }
    if (regex.test(password)) {
      return 'strong'
    } else {
      return 'weak'
    }
  }

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

    // Check password strength
    const strength = checkPasswordStrength(password)
    setPasswordStrength(strength)
    if (strength === 'weak') {
      toast.error('Password is not strong enough')
      setError(
        'Password is not strong enough. It must be at least 8 characters long and include uppercase, lowercase, a number, and a special character.'
      )
      setIsLoading(false)
      return
    }

    // Create the user in auth.users
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
      toast.error('User creation failed. Please try again.')
      setIsLoading(false)
      return
    }

    // Redirect (and ask to verify email if necessary)
    toast.info(
      'Thank you for registering! Please check your email to confirm your account.'
    )
    router.push('/auth/login')
  }

  return (
    <div className='min-h-[calc(100vh-3.5rem)] flex items-center justify-center py-8'>
      <div className='container mx-auto max-w-lg px-4'>
        <div className='shadow-lg rounded-lg p-6 space-y-6'>
          <div className='text-center'>
            <h1 className='text-2xl font-semibold'>Create an account</h1>
            <p className='text-sm text-gray-500'>
              Enter your information to create an account
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className='grid grid-cols-1 md:grid-cols-2 gap-4'
          >
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
            <div className='space-y-2 relative'>
              <Label htmlFor='password'>Password</Label>
              <Input
                id='password'
                name='password'
                type={showPassword ? 'text' : 'password'}
                disabled={isLoading}
                required
                onChange={e =>
                  setPasswordStrength(checkPasswordStrength(e.target.value))
                }
              />
              <div className='absolute inset-y-0 right-0 pr-3  top-6 flex items-center'>
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
              {passwordStrength && passwordStrength === 'weak' && (
                <p className='text-xs text-red-500 mt-1'>
                  Must be at least 8 characters long and include uppercase,
                  lowercase, number, and special character.
                </p>
              )}
            </div>
            <div className='space-y-2 relative'>
              <Label htmlFor='confirmPassword'>Confirm Password</Label>
              <Input
                id='confirmPassword'
                name='confirmPassword'
                type={showConfirmPassword ? 'text' : 'password'}
                disabled={isLoading}
                required
              />
              <div className='absolute inset-y-0 right-0 pr-3  top-6 flex items-center'>
                {showConfirmPassword ? (
                  <EyeOff
                    className='h-5 w-5 cursor-pointer'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                ) : (
                  <Eye
                    className='h-5 w-5 cursor-pointer'
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                )}
              </div>
            </div>
            <div className='md:col-span-2 space-y-2'>
              <Label htmlFor='country'>Country</Label>
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
                searchPlaceholder='Search a country'
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className='text-sm text-red-500 md:col-span-2'>{error}</p>
            )}

            <div className='md:col-span-2'>
              <Button className='w-full' type='submit' disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </div>
          </form>

          <p className='text-center text-sm text-muted-foreground'>
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
