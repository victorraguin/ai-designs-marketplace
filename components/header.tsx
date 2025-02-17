'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { usePathname, useRouter } from 'next/navigation'
import { Paintbrush2, ShoppingBag, LogIn, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function Header () {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const handleSignOut = async () => {
    console.log('sign out')
    try {
      await supabase.auth.signOut()
      console.log('sign out')
      toast.success('Signed out successfully')
      router.push('/')
      router.refresh()
    } catch (error) {
      toast.error('Error signing out')
    }
  }

  return (
    <header className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
        <div className='flex h-16 items-center justify-between'>
          <div className='flex items-center gap-8'>
            <Link href='/' className='flex items-center space-x-2'>
              <Paintbrush2 className='h-6 w-6' />
              <span className='font-bold hidden md:inline-block'>
                AI Design Market
              </span>
            </Link>
            <nav className='hidden md:flex items-center space-x-6'>
              <Link
                href='/marketplace'
                className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-foreground/80 ${
                  pathname === '/marketplace'
                    ? 'text-foreground'
                    : 'text-foreground/60'
                }`}
              >
                <ShoppingBag className='h-4 w-4' />
                <span>Marketplace</span>
              </Link>
              {user && (
                <>
                  <Link
                    href='/create'
                    className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-foreground/80 ${
                      pathname === '/create'
                        ? 'text-foreground'
                        : 'text-foreground/60'
                    }`}
                  >
                    <Paintbrush2 className='h-4 w-4' />
                    <span>Create</span>
                  </Link>
                  <Link
                    href='/dashboard'
                    className={`flex items-center space-x-1 text-sm font-medium transition-colors hover:text-foreground/80 ${
                      pathname === '/dashboard'
                        ? 'text-foreground'
                        : 'text-foreground/60'
                    }`}
                  >
                    <LayoutDashboard className='h-4 w-4' />
                    <span>Dashboard</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Mobile navigation */}
          <nav className='flex md:hidden items-center space-x-2'>
            <Link href='/marketplace'>
              <Button
                variant='ghost'
                size='icon'
                className={
                  pathname === '/marketplace'
                    ? 'text-foreground'
                    : 'text-foreground/60'
                }
              >
                <ShoppingBag className='h-5 w-5' />
              </Button>
            </Link>
            {user && (
              <>
                <Link href='/create'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={
                      pathname === '/create'
                        ? 'text-foreground'
                        : 'text-foreground/60'
                    }
                  >
                    <Paintbrush2 className='h-5 w-5' />
                  </Button>
                </Link>
                <Link href='/dashboard'>
                  <Button
                    variant='ghost'
                    size='icon'
                    className={
                      pathname === '/dashboard'
                        ? 'text-foreground'
                        : 'text-foreground/60'
                    }
                  >
                    <LayoutDashboard className='h-5 w-5' />
                  </Button>
                </Link>
              </>
            )}
          </nav>

          <div className='flex items-center gap-4'>
            {!user ? (
              <>
                <Button variant='ghost' asChild className='hidden md:flex'>
                  <Link href='/auth/login'>
                    <LogIn className='h-4 w-4 mr-2' />
                    Login
                  </Link>
                </Button>
                <Button asChild>
                  <Link href='/auth/register'>Sign up</Link>
                </Button>
              </>
            ) : (
              <Button variant='ghost' onClick={handleSignOut}>
                Sign out
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
