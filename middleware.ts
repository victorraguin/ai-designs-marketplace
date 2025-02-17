import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware (req: NextRequest) {
  const res = NextResponse.next()

  // Vérifier que le cookie de session est présent
  const token = req.cookies.get('supabase-auth-token')
  if (!token) {
    return res
  }

  const supabase = createMiddlewareClient({ req, res })

  // Récupérer la session
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  // Si la session n'est pas disponible, on ne redirige pas
  if (typeof session === 'undefined' || error) {
    console.warn('Middleware: Session non disponible, on ne redirige pas')
    return res
  }

  // Si l'utilisateur est connecté et se trouve sur une page d'authentification, rediriger
  if (session && req.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
}
