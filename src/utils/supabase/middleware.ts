import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { esModoDemoPara } from '@/lib/auth/demoMode'

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
                    // `options` non si prende proprio: qui si copiano i cookie
                    // dentro la richiesta, e le opzioni servono alla
                    // risposta, che le rimette da sola qui sotto.
                    cookiesToSet.forEach(({ name, value }) => {
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
    // La demo di CHI sta chiedendo: un cookie permette a una singola
    // scheda di provare la piattaforma bloccata senza spegnerla per
    // tutti quelli che stanno usando lo stesso server.
    const demo = esModoDemoPara(request.cookies)

    const path = request.nextUrl.pathname
    const reservada =
        path.startsWith('/admin') ||
        path.startsWith('/installer') ||
        // La propria utenza: senza sessione non c'e' nessuna utenza
        // da mostrare, e la pagina chiederebbe dati a nessuno.
        path.startsWith('/cuenta')

    if (!user && reservada && !demo) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('volver', path)
        return NextResponse.redirect(url)
    }

    // ── IL RUOLO ──────────────────────────────────────────────────────
    //
    // Chiuso l'accesso anonimo, restava il buco piu largo: un account
    // installatore autenticato poteva aprire /admin/settings e vedere i
    // margini dell'agenzia e i contatti dei privati. Essere entrati non
    // vuol dire poter entrare ovunque.
    //
    // Il ruolo si legge dal profilo, non dai cookie e non da quello che
    // dice il browser. La query si fa SOLO per /admin: aggiungerne una a
    // ogni pagina del sito per un controllo che riguarda una zona sola
    // sarebbe un pedaggio inutile.
    if (user && path.startsWith('/admin') && !demo) {
        const { data: perfil } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        // Ripiego al ruolo che puo meno. Se il profilo manca o la query
        // fallisce, si resta fuori: un ripiego che concede e un buco che
        // si apre da solo il giorno in cui qualcosa si rompe.
        if (perfil?.role !== 'admin') {
            const url = request.nextUrl.clone()
            url.pathname = '/sin-acceso'
            url.search = ''
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
