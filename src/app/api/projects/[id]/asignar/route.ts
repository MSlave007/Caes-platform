import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { negado, soloAgencia } from '@/lib/auth/guard'
import { mockDb } from '@/lib/mockDb'
import { avisarAsignado } from '@/lib/notify/email'

/**
 * Dare un espediente a un installatore.
 *
 * ── PERCHÉ UNA ROTTA SUA E NON UN CAMPO DELLA PATCH ───────────────────
 *
 * Perché assegnare non è modificare un campo: è un **fatto** che cambia
 * di chi è il lavoro. Da quel momento quella pratica compare nella
 * dashboard di una persona che prima non sapeva di averla, e quella
 * persona va avvisata.
 *
 * Messo come campo qualsiasi della PATCH, l'avviso si dimentica: si
 * scrive `installer_id` da qualche parte e nessuno sa di doverlo dire a
 * nessuno. Qui l'avviso sta accanto alla scrittura e non si separa.
 *
 * ── PERCHÉ SOLO L'AGENZIA ─────────────────────────────────────────────
 *
 * Perché è la decisione di chi coordina: quale installatore copre quella
 * zona, chi ha tempo, chi ha già lavorato con quel cliente. Un
 * installatore che potesse assegnarsi pratiche si prenderebbe quelle
 * buone.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const { id } = await params
    const body = (await request.json().catch(() => null)) as {
        installerId?: string
        nombre?: string
    } | null

    const installerId = String(body?.installerId ?? '').trim()
    if (!installerId) {
        return NextResponse.json({ error: 'Falta el instalador' }, { status: 400 })
    }

    /* ---------------------------------------------- dimostrazione */
    if (!quien.userId) {
        const actualizado = mockDb.updateProject(id, {
            installer_name: String(body?.nombre ?? '').slice(0, 160) || null,
        })
        if (!actualizado) {
            return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
        }
        return NextResponse.json({ data: actualizado, demo: true })
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'No configurado' }, { status: 503 })

    // Il nome non arriva dal browser: si legge dal profilo. Un nome
    // mandato dal client è un nome che può non corrispondere all'id, e
    // quello finisce stampato sui documenti.
    const { data: perfil } = await admin
        .from('profiles')
        .select('id, name, company_name, email')
        .eq('id', installerId)
        .eq('role', 'installer')
        .maybeSingle()

    if (!perfil) {
        return NextResponse.json(
            { error: 'Ese instalador no existe, o ya no lo es.' },
            { status: 400 }
        )
    }

    const { data, error } = await admin
        .from('projects')
        .update({
            installer_id: perfil.id,
            installer_name: perfil.company_name || perfil.name,
        })
        .eq('id', id)
        .select('id, client_name, address, installer_name')
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })

    // ── e glielo si dice ─────────────────────────────────────────────
    //
    // Un espediente che compare nella lista di qualcuno senza dirglielo
    // è un espediente che nessuno apre. Non aspettata e senza
    // eccezioni: se la email non parte resta nei log, e comunque lo
    // vedrà in dashboard.
    if (perfil.email) {
        void avisarAsignado(
            {
                expedienteId: String(data.id),
                clienteNombre: data.client_name ?? 'un cliente',
                enlace: `/installer/project/${data.id}`,
            },
            {
                email: perfil.email,
                nombre: perfil.company_name || perfil.name || undefined,
                rol: 'installer',
            }
        )
    }

    return NextResponse.json({ data })
}
