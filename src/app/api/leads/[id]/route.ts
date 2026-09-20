import { NextResponse } from 'next/server'
import { quienLlama, soloAgencia, negado, prohibido } from '@/lib/auth/guard'
import { createClient } from '@/utils/supabase/server'
import { mockLeads } from '@/lib/mockLeads'

/** Assegnazione del lead a un installatore, o cambio di stato. */
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    // Non c'era NIENTE qui: chiunque conoscesse l'indirizzo poteva
    // riassegnare un contatto a un altro installatore o chiuderlo come
    // gia lavorato. Assegnare e cambiare stato sono decisioni
    // dell'agenzia.
    // Due risposte diverse apposta: 401 significa «fai login», 403 «sei
    // dentro ma non e roba tua». Rispondere 401 a un installatore
    // autenticato lo manderebbe a rifare un login che non cambia niente.
    if (!(await quienLlama())) return negado()
    if (!(await soloAgencia())) return prohibido()

    const { id } = await params
    const body = await request.json()

    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('leads')
            .update(body)
            .eq('id', id)
            .select()
            .single()
        if (error) throw error
        return NextResponse.json({ data })
    } catch {
        const updated = mockLeads.update(id, body)
        if (!updated) return NextResponse.json({ error: 'No existe' }, { status: 404 })
        return NextResponse.json({ data: updated, stored: 'memory' })
    }
}
