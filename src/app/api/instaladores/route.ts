import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { negado, soloAgencia } from '@/lib/auth/guard'
import { mockDb } from '@/lib/mockDb'

/**
 * Gli installatori a cui si può assegnare un espediente.
 *
 * ── PERCHÉ NON BASTAVA QUELLO CHE C'ERA ───────────────────────────────
 *
 * La cartera l'elenco degli installatori se lo ricava dagli espedienti:
 * chi ha mandato qualcosa compare, chi non ha mai mandato niente no.
 * Per guardare chi lavora va bene; per **assegnare** no — l'installatore
 * nuovo, quello che non ha ancora mandato la sua prima pratica, è
 * esattamente quello a cui serve che gliene diamo una.
 *
 * Qui si leggono gli account veri: `profiles` con ruolo `installer`.
 *
 * ── SOLO L'AGENZIA ────────────────────────────────────────────────────
 *
 * È l'elenco di chi lavora con noi, coi loro contatti. Un installatore
 * non ha nessun motivo di sapere chi sono gli altri.
 */
export async function GET() {
    const quien = await soloAgencia()
    if (!quien) return negado()

    if (!quien.userId) {
        // In dimostrazione: i nomi che compaiono negli espedienti, che è
        // quanto basta per far vedere il giro.
        const nombres = [
            ...new Set(
                mockDb
                    .getProjects()
                    .map((p) => p.installer_name)
                    .filter(Boolean) as string[]
            ),
        ].sort()
        return NextResponse.json({
            data: nombres.map((n) => ({ id: `demo-${n}`, nombre: n, email: null })),
            demo: true,
        })
    }

    const admin = createAdminClient()
    if (!admin) return NextResponse.json({ error: 'No configurado' }, { status: 503 })

    const { data, error } = await admin
        .from('profiles')
        .select('id, name, company_name, email')
        .eq('role', 'installer')
        .order('company_name', { nullsFirst: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 502 })

    return NextResponse.json({
        data: (data ?? []).map((p) => ({
            id: p.id,
            // La ragione sociale quando c'è: è come si chiamano fra loro
            // e come compare sui documenti. Il nome della persona è il
            // ripiego.
            nombre: p.company_name || p.name || p.email,
            email: p.email,
        })),
    })
}
