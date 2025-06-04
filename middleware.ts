import { type NextRequest, NextResponse } from 'next/server'
import { createMiddlewareSupabaseClient } from '@supabase/auth-helpers-nextjs'

export async function middleware (request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createMiddlewareSupabaseClient({ req: request, res: response })

  // Refresh the session if it exists
  await supabase.auth.getSession()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/create/:path*',
    '/customize-product/:path*',
    '/order-confirmation/:path*'
  ]
}
