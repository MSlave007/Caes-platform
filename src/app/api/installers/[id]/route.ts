import { NextResponse } from 'next/server'
import { soloAgencia, negado } from '@/lib/auth/guard'
import { createAdminClient } from '@/lib/supabaseAdmin'

/**
 * L'anagrafica di un installatore, per i documenti del fascicolo.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * Cinque campi del Convenio e della Ficha vengono dal profilo di chi ha
 * fatto l'installazione — ragione sociale, NIF, indirizzo, responsabile,
 * telefono. Finora arrivavano vuoti e si riscrivevano a mano nel Word a
 * ogni pratica: dati che non cambiano mai, copiati ogni volta, e ogni
 * copia è un'occasione di sbagliare una cifra del NIF.
 *
 * ── PERCHÉ SOLO L'AGENZIA ─────────────────────────────────────────────
 *
 * È il profilo di qualcun altro. L'unico motivo legittimo per leggerlo è
 * compilare i documenti di un fascicolo, e quello lo fa l'agenzia. Un
 * installatore che chiedesse il profilo di un collega non avrebbe nessun
 * motivo per farlo.
 *
 * Si legge con la chiave di servizio perché le regole di riga su
 * `profiles` dicono «solo il proprio», che qui sarebbe il contrario di
 * quello che serve. È legittimo solo perché il ruolo è già stato
 * verificato una riga sopra.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const { id } = await params

    const supabase = createAdminClient()
    if (!supabase) {
        // Senza chiave non si inventa un profilo: i cinque campi restano
        // da scrivere a mano, e il documento lo segnala come mancante.
        return NextResponse.json({ data: null, sinDeposito: true })
    }

    const { data, error } = await supabase
        .from('profiles')
        // Solo quello che serve ai documenti. Non tutto il profilo: la
        // commissione predefinita e il resto non c'entrano niente con
        // quello che si stampa su un Convenio.
        .select('full_name, company_id, address, phone')
        .eq('id', id)
        .single()

    if (error) return NextResponse.json({ data: null })
    return NextResponse.json({ data })
}
