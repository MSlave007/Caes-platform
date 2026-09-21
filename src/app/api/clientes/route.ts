import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { quienLlama, negado } from '@/lib/auth/guard'
import { dentroDelLimite, quienCuenta, demasiadas } from '@/lib/auth/ritmo'

/**
 * I clienti di un installatore.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * Il cliente non era un'entità: nome, NIF, telefono e indirizzo stavano
 * scritti dentro ogni espediente, ricopiati ogni volta. Lo stesso
 * cliente che fa due installazioni erano due insiemi di dati che
 * nessuno collegava, e una cifra sbagliata nel NIF la seconda volta non
 * la vedeva nessuno.
 *
 * ── IL CLIENTE NON È UN UTENTE ────────────────────────────────────────
 *
 * Non entra, non ha password. È una scheda dell'installatore. Se un
 * giorno dovrà entrare sarà un'altra cosa e si deciderà allora — ma
 * confondere le due cose adesso vorrebbe dire trattare dati personali
 * di gente che non ha mai accettato niente.
 *
 * ── DI CHI SONO ───────────────────────────────────────────────────────
 *
 * Di chi li ha creati. Come per l'utenza, questa rotta non accetta «di
 * chi»: lavora sempre sull'installatore della sessione, e le regole di
 * riga lo ribadiscono lato database. Due installatori possono avere lo
 * stesso cliente e non si vedono fra loro.
 */

const texto = (v: unknown, max = 200) =>
    typeof v === 'string' ? v.trim().slice(0, max) : ''

const CAMPOS = ['nombre', 'nif', 'telefono', 'email', 'direccion', 'notas'] as const

function sanear(body: Record<string, unknown>) {
    const limpio: Record<string, string> = {}
    for (const k of CAMPOS) {
        if (k in body) limpio[k] = texto(body[k], k === 'notas' ? 2000 : 200)
    }
    return limpio
}

export async function GET(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()
    if (!quien.userId) return NextResponse.json({ data: [], demo: true })

    const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''

    const supabase = await createClient()
    let consulta = supabase
        .from('clientes')
        .select('id, nombre, nif, telefono, email, direccion')
        .order('nombre')
        .limit(20)

    // La ricerca serve all'autocompletamento: si cerca per nome e per
    // NIF, perché chi richiama un cliente si ricorda una cosa o l'altra.
    if (q) consulta = consulta.or(`nombre.ilike.%${q}%,nif.ilike.%${q}%`)

    const { data, error } = await consulta
    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ data: data ?? [] })
}

export async function POST(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()
    if (!quien.userId) {
        return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
    }

    const LIMITE = { cuantas: 60, segundos: 300 }
    if (!dentroDelLimite(quienCuenta(request, quien.userId), LIMITE)) {
        return demasiadas(LIMITE.segundos)
    }

    const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
    > | null
    if (!body) return NextResponse.json({ error: 'JSON no válido' }, { status: 400 })

    const limpio = sanear(body)
    if (!limpio.nombre) {
        return NextResponse.json({ error: 'Falta el nombre' }, { status: 400 })
    }

    const supabase = await createClient()

    /**
     * Se il NIF c'è già, si aggiorna invece di creare un doppione.
     *
     * È il caso normale, non quello raro: il secondo espediente dello
     * stesso cliente. Creare una seconda scheda sarebbe esattamente il
     * problema che questa tabella viene a risolvere, quindi
     * l'inserimento semplice non basta — serve `upsert` sulla coppia
     * (installatore, NIF).
     */
    if (limpio.nif) {
        const { data, error } = await supabase
            .from('clientes')
            .upsert(
                { ...limpio, installer_id: quien.userId },
                { onConflict: 'installer_id,nif' }
            )
            .select('id, nombre, nif, telefono, email, direccion')
            .single()
        if (error) return NextResponse.json({ error: error.message }, { status: 502 })
        return NextResponse.json({ data })
    }

    const { data, error } = await supabase
        .from('clientes')
        .insert({ ...limpio, installer_id: quien.userId })
        .select('id, nombre, nif, telefono, email, direccion')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ data })
}
