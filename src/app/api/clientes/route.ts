import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { quienLlama, negado } from '@/lib/auth/guard'
import { dentroDelLimite, quienCuenta, demasiadas } from '@/lib/auth/ritmo'
import { mockClientes } from '@/lib/mockClientes'

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

/** Quello che serve alla riga dell'elenco: quanti, quanti aperti, quanto. */
function resumen(exp: { status?: string | null; savings_eur?: number | null }[]) {
    return {
        expedientes: exp.length,
        abiertos: exp.filter(
            (e) => !['paid', 'rejected'].includes(String(e.status ?? ''))
        ).length,
        ahorro: exp.reduce((a, e) => a + (e.savings_eur ?? 0), 0),
    }
}

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
    const q = new URL(request.url).searchParams.get('q')?.trim() ?? ''

    // In dimostrazione i clienti si ricavano dagli espedienti finti: cosi
    // la scheda mostra pratiche vere e i due elenchi non si contraddicono.
    if (!quien.userId) {
        const lista = mockClientes.all(q).map((c) => {
            const exp = mockClientes.expedientes(c.id)
            return { ...c, ...resumen(exp) }
        })
        return NextResponse.json({ data: lista, demo: true })
    }

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

    /**
     * Il conto degli espedienti, per l'elenco.
     *
     * Senza, la lista e' una rubrica: nomi uguali uno sotto l'altro. Con,
     * si vede subito chi ha qualcosa in ballo — che e' l'unico motivo per
     * aprire quella pagina.
     *
     * Si prendono tutti gli espedienti in una volta e si contano qui: le
     * regole di riga danno solo i suoi, sono pochi, e una query per
     * cliente sarebbe N chiamate per una colonna.
     */
    const { data: proyectos } = await supabase
        .from('projects')
        .select('cliente_id, status, savings_eur')

    const porCliente = new Map<string, typeof proyectos>()
    for (const p of proyectos ?? []) {
        if (!p.cliente_id) continue
        porCliente.set(p.cliente_id, [...(porCliente.get(p.cliente_id) ?? []), p])
    }

    return NextResponse.json({
        data: (data ?? []).map((c) => ({
            ...c,
            ...resumen(porCliente.get(c.id) ?? []),
        })),
    })
}

export async function POST(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()
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

    // In dimostrazione si scrive sul file: un pulsante che non fa niente
    // e peggio di un pulsante che non c'e'.
    if (!quien.userId) {
        return NextResponse.json({
            data: mockClientes.crear({ ...limpio, nombre: limpio.nombre }),
            demo: true,
        })
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
