import { NextResponse } from 'next/server'
import { quienLlama, soloAgencia, negado, prohibido } from '@/lib/auth/guard'
import { dentroDelLimite, quienCuenta, demasiadas } from '@/lib/auth/ritmo'
import { createClient } from '@/utils/supabase/server'
import { mockLeads, type Lead } from '@/lib/mockLeads'

/**
 * Lead dal calcolatore pubblico.
 *
 * Prova a scrivere su Supabase; se la tabella `leads` non esiste ancora,
 * ripiega sull'archivio in memoria, così l'area admin ha comunque qualcosa
 * da mostrare. Lo schema SQL è in docs/SCHEMA_LEADS.sql.
 */
export async function POST(request: Request) {
    // L'unica rotta che accetta scritture senza account: e' il modulo
    // del calcolatore pubblico, quindi il posto naturale per riempire
    // una tabella di spazzatura. Si conta per indirizzo, che si puo'
    // falsificare — va bene per contare, non per decidere chi sei.
    const LIMITE = { cuantas: 5, segundos: 600 }
    if (!dentroDelLimite(quienCuenta(request), LIMITE)) {
        return demasiadas(LIMITE.segundos)
    }

    let body: Record<string, unknown>
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'JSON no válido' }, { status: 400 })
    }

    // Validazione minima: senza questi tre, il lead non serve a nessuno.
    const name = String(body.name ?? '').trim()
    const phone = String(body.phone ?? '').trim()
    const postal = String(body.postal ?? '').trim()
    if (!name || !phone || !postal) {
        return NextResponse.json(
            { error: 'Faltan nombre, teléfono o código postal' },
            { status: 400 }
        )
    }
    if (body.consent !== true) {
        return NextResponse.json(
            { error: 'Falta el consentimiento' },
            { status: 400 }
        )
    }

    const lead: Omit<Lead, 'id' | 'created_at'> = {
        name,
        phone,
        email: String(body.email ?? '').trim(),
        postal,
        when: (String(body.when ?? 'ya') as Lead['when']),
        sistema: String(body.sistema ?? ''),
        factura_mensual: Number(body.factura_mensual ?? 0),
        zona: String(body.zona ?? ''),
        estimacion: (body.estimacion ?? {}) as Lead['estimacion'],
        status: 'new',
        installer_name: null,
    }

    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('leads')
            .insert(lead)
            .select()
            .single()
        if (error) throw error
        return NextResponse.json({ data })
    } catch {
        // Tabella assente o database irraggiungibile: non perdiamo il lead.
        const saved = mockLeads.create(lead)
        return NextResponse.json({ data: saved, stored: 'memory' })
    }
}

export async function GET() {
    // Nomi, telefoni ed email di privati. Prima rispondeva a chiunque
    // conoscesse l'indirizzo; poi a chiunque avesse fatto login, che e
    // meglio ma non basta — un installatore non ha motivo di avere la
    // lista dei contatti di tutti.
    const quien = await quienLlama()
    if (!quien) return negado()
    if (!(await soloAgencia())) return prohibido()

    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false })
        if (error) throw error
        return NextResponse.json({ data })
    } catch {
        return NextResponse.json({ data: mockLeads.all(), stored: 'memory' })
    }
}
