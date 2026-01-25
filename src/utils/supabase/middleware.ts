import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Create a Supabase client to manage the session
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    // Update the response cookies
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value)
                    })

                    supabaseResponse = NextResponse.next({
                        request,
                    })

                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh the session if it exists
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        request.nextUrl.pathname.startsWith('/dashboard')
    ) {
        // Determine where to redirect if trying to access protected route logged out
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Dual Role Logic: Redirect to correct dashboard if trying to access wrong one
    if (user) {
        // Ideally we check profile role here, but for middleware speed we might skip or cache it.
        // For now, let's just allow access and let the Page components handle role authorization.
    }

    return supabaseResponse
}
