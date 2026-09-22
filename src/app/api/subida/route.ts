import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { negado, soloAgencia } from '@/lib/auth/guard'
import { mockDb } from '@/lib/mockDb'

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

    const caduca = new Date(Date.now() + DIAS * 86_400_000).toISOString()
    const token = crypto.randomUUID()
    const nota = String(body?.nota ?? '').slice(0, 300) || null

    /**
     * Gli espedienti dimostrativi vivono in un file e hanno id
     * numerici. Chiedere al database una riga con id «2483» dava
     * «invalid input syntax for type uuid», e quel messaggio finiva a
     * schermo: la funzione non c'era dove serviva, e quando falliva lo
     * diceva con le parole di Postgres.
     */
    if (mockDb.getProjectById(id)) {
        const actualizado = mockDb.updateProject(id, {
            subida_token: token,
            subida_caduca: caduca,
            subida_nota: nota,
        })
        if (!actualizado) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
        }
        return NextResponse.json({
            data: {
                subida_token: token,
                subida_caduca: caduca,
                subida_nota: nota,
            },
            demo: true,
        })
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'No configurado' }, { status: 503 })

    // Un token nuovo a ogni volta, anche se ce n'era già uno. È la cosa
    // giusta: rigenerare vuol dire quasi sempre «il vecchio è andato in
    // un posto in cui non doveva stare», e in quel caso deve morire.
    const { data, error } = await admin
        .from('projects')
        .update({
            subida_token: token,
            subida_caduca: caduca,
            subida_nota: nota,
        })
        .eq('id', id)
        .select('subida_token, subida_caduca, subida_nota')
        .single()

    if (error) {
        // Il messaggio di Postgres non si gira a schermo: dice cose come
        // «invalid input syntax for type uuid», che a chi rivede non
        // spiega niente e intanto racconta com'e fatta la tabella.
        console.error('POST /api/subida:', error)
        return NextResponse.json(
            { error: 'No se ha podido crear el enlace.' },
            { status: 502 }
        )
    }
    return NextResponse.json({ data })
}

/** Ucciderlo. Mettere la scadenza nel passato non basta: si toglie. */
export async function DELETE(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const id = new URL(request.url).searchParams.get('id') ?? ''
    if (!id) return NextResponse.json({ error: 'Falta el expediente' }, { status: 400 })

    if (mockDb.getProjectById(id)) {
        mockDb.updateProject(id, {
            subida_token: undefined,
            subida_caduca: undefined,
            subida_nota: undefined,
        })
        return NextResponse.json({ ok: true, demo: true })
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'No configurado' }, { status: 503 })

    const { error } = await admin
        .from('projects')
        .update({ subida_token: null, subida_caduca: null, subida_nota: null })
        .eq('id', id)

    if (error) {
        console.error('DELETE /api/subida:', error)
        return NextResponse.json(
            { error: 'No se ha podido anular el enlace.' },
            { status: 502 }
        )
    }
    return NextResponse.json({ ok: true })
}
