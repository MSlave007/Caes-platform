import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { quienLlama, negado } from '@/lib/auth/guard'

/**
 * L'utenza di chi sta guardando: la sua, e solo la sua.
 *
 * ── PERCHÉ NON PRENDE UN ID ───────────────────────────────────────────
 *
 * Questa rotta non accetta «di chi»: lavora sempre sull'utente della
 * sessione. Una rotta `/api/cuenta/<id>` sarebbe una rotta da
 * proteggere, e le rotte da proteggere prima o poi restano scoperte —
 * ne abbiamo appena trovate due. Se non c'è un id da passare, non c'è
 * un id da falsificare.
 *
 * ── COSA SI PUÒ CAMBIARE, E COSA NO ───────────────────────────────────
 *
 * Nome, telefono, indirizzo, azienda, foto: sì.
 *
 * Il RUOLO no. Arriva nella stessa tabella e sarebbe comodo lasciarlo
 * passare insieme al resto, ma vorrebbe dire che chiunque può
 * scriversi `admin` con una chiamata sola e aprirsi l'area agenzia. Il
 * ruolo lo cambia solo chi ha accesso al database.
 *
 * L'EMAIL e la PASSWORD nemmeno: non stanno in questa tabella, stanno
 * nell'autenticazione, e si cambiano dal browser con la sessione viva
 * (`supabase.auth.updateUser`). Cambiare l'email di qualcuno da un
 * server è il modo di prendersi il suo account.
 */

/** Gli unici campi che questa rotta scrive. Tutto il resto si ignora. */
const PERMITIDOS = [
    'name',
    'phone',
    'nif',
    'address',
    'avatar_path',
] as const

export async function GET() {
    const quien = await quienLlama()
    if (!quien) return negado()
    if (!quien.userId) return NextResponse.json({ data: null, demo: true })

    const supabase = await createClient()

    /**
     * Due tentativi, e non e' pigrizia.
     *
     * `avatar_path` e `idioma` sono colonne nuove: finche' non si lancia
     * setup.sql non esistono, e chiedere una colonna che non c'e' fa
     * fallire TUTTA la query. Senza questo ripiego la pagina dell'utenza
     * darebbe errore per una foto che nessuno ha ancora caricato.
     */
    const BASE = 'name, phone, nif, address, role'
    const EXTRA = 'avatar_path, idioma, dni_path, dni_nombre, default_commission'

    let { data, error } = await supabase
        .from('profiles')
        .select(`${BASE}, ${EXTRA}`)
        .eq('id', quien.userId)
        .single()

    if (error) {
        ;({ data, error } = await supabase
            .from('profiles')
            .select(BASE)
            .eq('id', quien.userId)
            .single())
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ data: { ...data, email: quien.email } })
}

export async function PATCH(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()
    if (!quien.userId) {
        return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
    }

    const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
    > | null
    if (!body) return NextResponse.json({ error: 'JSON no válido' }, { status: 400 })

    // Lista bianca: quello che non è qui dentro non passa. `role` è il
    // motivo per cui questa è una lista bianca e non una lista nera —
    // una nera si dimentica di un campo nuovo, una bianca no.
    const parche: Record<string, unknown> = {}
    for (const k of PERMITIDOS) {
        if (k in body) {
            const v = body[k]
            parche[k] = typeof v === 'string' ? v.trim().slice(0, 300) : v
        }
    }

    if (Object.keys(parche).length === 0) {
        return NextResponse.json({ error: 'Nada que guardar' }, { status: 400 })
    }

    // Si scrive con la chiave di servizio ma SOLO sulla riga della
    // sessione: l'`eq` non viene dal corpo della richiesta.
    const supabase = createAdminClient() ?? (await createClient())
    const { error } = await supabase
        .from('profiles')
        .update(parche)
        .eq('id', quien.userId)

    if (error) {
        // Il caso tipico: `avatar_path` prima di lanciare setup.sql. Si
        // dice quale campo, invece di un messaggio di Postgres crudo.
        const falta = /column "?(\w+)"? .*does not exist/i.exec(error.message)
        return NextResponse.json(
            {
                error: falta
                    ? `Falta la columna «${falta[1]}» en la base. Lanza src/utils/supabase/setup.sql.`
                    : error.message,
            },
            { status: 502 }
        )
    }
    const data = parche
    return NextResponse.json({ data })
}
