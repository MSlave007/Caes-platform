import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { negado, soloAgencia } from '@/lib/auth/guard'

/**
 * Creare e revocare il link per caricare documenti.
 *
 * ── SOLO L'AGENZIA ────────────────────────────────────────────────────
 *
 * Perché genera un indirizzo pubblico su cui si può scrivere. Non è una
 * cosa che si dà in mano a chi apre l'espediente: è chi rivede che sa
 * cosa manca e a chi lo sta chiedendo.
 *
 * ── PERCHÉ SCADE, E PERCHÉ COSÌ PRESTO ────────────────────────────────
 *
 * Quattordici giorni. Non è una regola di sicurezza inventata: è il
 * tempo in cui un installatore o manda le carte o non le manda più. Un
 * indirizzo di scrittura aperto per sempre resta aperto anche quando
 * nessuno se lo ricorda, e quello è il problema.
 *
 * Rifarlo costa un clic, quindi la scadenza non blocca nessuno.
 */

const DIAS = 14

export async function POST(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const body = (await request.json().catch(() => null)) as {
        id?: string
        nota?: string
    } | null

    const id = String(body?.id ?? '').trim()
    if (!id) return NextResponse.json({ error: 'Falta el expediente' }, { status: 400 })

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'No configurado' }, { status: 503 })

    const caduca = new Date(Date.now() + DIAS * 86_400_000).toISOString()

    // Un token nuovo a ogni volta, anche se ce n'era già uno. È la cosa
    // giusta: rigenerare vuol dire quasi sempre «il vecchio è andato in
    // un posto in cui non doveva stare», e in quel caso deve morire.
    const { data, error } = await admin
        .from('projects')
        .update({
            subida_token: crypto.randomUUID(),
            subida_caduca: caduca,
            subida_nota: String(body?.nota ?? '').slice(0, 300) || null,
        })
        .eq('id', id)
        .select('subida_token, subida_caduca, subida_nota')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ data })
}

/** Ucciderlo. Mettere la scadenza nel passato non basta: si toglie. */
export async function DELETE(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const id = new URL(request.url).searchParams.get('id') ?? ''
    if (!id) return NextResponse.json({ error: 'Falta el expediente' }, { status: 400 })

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'No configurado' }, { status: 503 })

    const { error } = await admin
        .from('projects')
        .update({ subida_token: null, subida_caduca: null, subida_nota: null })
        .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    return NextResponse.json({ ok: true })
}
