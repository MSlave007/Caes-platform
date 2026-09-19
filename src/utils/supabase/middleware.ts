import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { esModoDemo } from '@/lib/auth/demoMode'

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

    // ── AREE RISERVATE ────────────────────────────────────────────────
    //
    // Prima qui c'era `startsWith('/dashboard')`: una rotta che in questo
    // progetto NON ESISTE. Le aree vere sono /admin e /installer, ed erano
    // aperte a chiunque conoscesse l'indirizzo — tutta l'area agenzia,
    // margini compresi, senza mai fare login.
    //
    // In modalità dimostrativa restano aperte: serve a mostrare il giro
    // senza credenziali. In produzione no.
    const path = request.nextUrl.pathname
    const reservada = path.startsWith('/admin') || path.startsWith('/installer')

    if (!user && reservada && !esModoDemo()) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('volver', path)
        return NextResponse.redirect(url)
    }

    // NOTA — separazione dei ruoli ancora da fare.
    // `getUserRole()` esiste in src/lib/auth/roleDetection.ts ma non è
    // chiamata da nessuna parte: oggi un account installatore autenticato
    // può aprire /admin/settings. Il controllo va messo qui, leggendo il
    // ruolo dal profilo, appena la tabella `profiles` è popolata.

    return supabaseResponse
}
