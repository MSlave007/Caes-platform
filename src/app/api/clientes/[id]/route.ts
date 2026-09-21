import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { quienLlama, negado } from '@/lib/auth/guard'
import { mockClientes } from '@/lib/mockClientes'

/**
 * Una scheda cliente, con la sua storia.
 *
 * ── PERCHÉ LA STORIA STA QUI E NON IN DUE CHIAMATE ────────────────────
 *
 * Perché è la scheda. Un cliente senza i suoi espedienti è una rubrica,
 * e una rubrica in una piattaforma di pratiche non serve a niente: il
 * motivo per aprirla è sapere a che punto sta la sua installazione.
 *
 * ── DI CHI È ──────────────────────────────────────────────────────────
 *
 * Le regole di riga fanno il lavoro: `clientes` e `projects` sono
 * filtrate per `installer_id = auth.uid()`, quindi chiedere l'id del
 * cliente di un altro installatore non restituisce niente. Non c'è un
 * controllo in più da scrivere qui — e questo è il motivo per cui le
 * regole di riga valgono la fatica: il controllo non si può dimenticare
 * perché non è in questa riga di codice.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const quien = await quienLlama()
    if (!quien) return negado()
    const { id } = await params

    if (!quien.userId) {
        const c = mockClientes.byId(id)
        if (!c) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
        return NextResponse.json({
            data: { ...c, notas: null, expedientes: mockClientes.expedientes(id) },
            demo: true,
        })
    }
    const supabase = await createClient()

    const { data: cliente, error } = await supabase
        .from('clientes')
        .select('id, nombre, nif, telefono, email, direccion, notas, created_at')
        .eq('id', id)
        .single()

    if (error || !cliente) {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const { data: expedientes } = await supabase
        .from('projects')
        .select('id, client_name, address, status, savings_eur, created_at, updated_at')
        .eq('cliente_id', id)
        .order('created_at', { ascending: false })

    return NextResponse.json({ data: { ...cliente, expedientes: expedientes ?? [] } })
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const quien = await quienLlama()
    if (!quien) return negado()
    if (!quien.userId) {
        return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
    }

    const { id } = await params
    const body = (await request.json().catch(() => null)) as Record<
        string,
        unknown
    > | null
    if (!body) return NextResponse.json({ error: 'JSON no válido' }, { status: 400 })

    const texto = (v: unknown, max = 200) =>
        typeof v === 'string' ? v.trim().slice(0, max) : ''

    // Lista bianca. `installer_id` non c'è: cambiarlo vorrebbe dire
    // regalare — o rubare — una scheda cliente a un altro installatore.
    const parche: Record<string, string> = {}
    for (const k of ['nombre', 'nif', 'telefono', 'email', 'direccion', 'notas'] as const) {
        if (k in body) parche[k] = texto(body[k], k === 'notas' ? 2000 : 200)
    }
    if (Object.keys(parche).length === 0) {
        return NextResponse.json({ error: 'Nada que guardar' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('clientes')
        .update(parche)
        .eq('id', id)
        .select('id, nombre, nif, telefono, email, direccion, notas')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ data })
}
