import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Only run middleware if environment variables are set
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("YOUR_PROJECT")) {
    // Cannot perform auth checks without valid config
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')

  // Define protected routes
  const protectedRoutes = ['/admin', '/volunteer', '/requester']
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route))

  if (isAuthRoute) {
    if (user) {
      // User is logged in but trying to access login/signup. 
      // Where to redirect? We need to know their role.
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (profile && profile.role) {
        return NextResponse.redirect(new URL(`/${profile.role}`, request.url))
      }
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  if (isProtectedRoute) {
    if (!user) {
      // Redirect unauthenticated users to login
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // User is logged in, check if they are trying to access a route they shouldn't
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    const role = profile?.role

    if (!role) {
      // Fallback if no profile is found for the user
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Ensure users can only access their specific dashboard
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
    if (pathname.startsWith('/volunteer') && role !== 'volunteer') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
    if (pathname.startsWith('/requester') && role !== 'requester') {
      return NextResponse.redirect(new URL(`/${role}`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - any file with an extension (e.g. .svg, .png)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
