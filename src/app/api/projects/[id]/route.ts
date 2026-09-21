import { createClient } from '@/lib/supabaseServer'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { mockDb } from '@/lib/mockDb'
import { quienLlama, soloAgencia, negado, prohibido } from '@/lib/auth/guard'
import { enviar, debeAvisar } from '@/lib/notify/email'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const id = (await params).id
    const supabase = await createClient()

    // Chi legge cosa.
    //
    // Le regole di riga dicono «solo i propri espedienti», che per
    // l'installatore e giusto e per l'agenzia e il contrario del suo
    // lavoro: revisionare vuol dire aprire quelli degli altri. Senza
    // questo, con i ruoli attivi, ogni fascicolo rispondeva «non
    // esiste» — la coda si vedeva e non si apriva niente.
    //
    // La chiave di servizio salta le regole di riga ed e legittima solo
    // perche il ruolo e gia stato verificato sopra.
    const lector = quien.rol === 'admin' ? createAdminClient() ?? supabase : supabase

    // Real DB Fetch
    const { data, error } = await lector
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

    if (error || !data) {
        // Mock Fallback
        const mockProject = mockDb.getProjectById(id)
        if (mockProject) {
            return NextResponse.json({ data: mockProject })
        }
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    // Solo l'agenzia. Prima bastava una sessione qualsiasi, e le regole di
    // riga lasciano all'installatore la modifica dei PROPRI espedienti:
    // messe insieme, le due cose gli permettevano di approvarsi la pratica
    // da solo, azzerare la quota dell'agenzia e riscriversi il risparmio
    // riconosciuto. Chi fa il lavoro non e chi lo verifica.
    const quien = await quienLlama()
    if (!quien) return negado()
    if (!(await soloAgencia())) return prohibido()

    const id = (await params).id
    const body = await request.json()
    const supabase = await createClient()

    // Come sopra, in scrittura: approvare un espediente vuol dire
    // scrivere su una riga che non e tua.
    const escritor = createAdminClient() ?? supabase

    const parche = await firmar(body, id, quien.userId, quien.email, escritor)

    // Real DB Update
    const { data, error } = await escritor
        .from('projects')
        .update(parche)
        .eq('id', id)
        .select()
        .single()

    if (error) {
        // Ripiego sull'archivio in memoria: accetta qualsiasi campo, non solo
        // lo stato, perché in approvazione si fissano anche risparmio e margine.
        const updated = mockDb.updateProject(id, body)
        if (updated) {
            // La notifica non deve mai far fallire il salvataggio: enviar()
            // non solleva eccezioni e restituisce false se non parte.
            if (body.status && debeAvisar(body.status)) {
                void enviar(
                    {
                        expedienteId: updated.id,
                        clienteNombre: updated.client_name,
                        estado: body.status,
                        motivo: body.admin_feedback,
                        enlace: `/installer/project/${updated.id}`,
                    },
                    { email: '', rol: 'installer' } // DA COLLEGARE: email dal profilo
                )
            }
            return NextResponse.json({ data: updated })
        }
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
}


/**
 * Mette la firma su quello che si sta salvando.
 *
 * ── PERCHE' LO FA IL SERVER ──────────────────────────────────────────
 *
 * Chi ha confermato un dato e quando lo decide la sessione, mai il corpo
 * della richiesta. Un'attribuzione che arriva dal browser e'
 * un'attribuzione che si puo' scrivere a mano — e questi valori finiscono
 * in documenti che qualcuno firma e per cui risponde dieci anni.
 *
 * ── PERCHE' RILEGGE PRIMA ────────────────────────────────────────────
 *
 * Il salvataggio automatico manda l'intera estrazione a ogni modifica.
 * Senza confrontare con quello che c'e' gia', ogni salvataggio
 * riscriverebbe la firma di TUTTI i campi con l'ora corrente e con
 * l'ultima persona che ha toccato la pagina: la conferma fatta ieri da un
 * collega diventerebbe tua, di adesso. Quindi si firma solo quello che e'
 * davvero cambiato.
 */
async function firmar(
    body: Record<string, unknown>,
    id: string,
    userId: string | null,
    email: string | null,
    supabase: NonNullable<ReturnType<typeof createAdminClient>> | Awaited<ReturnType<typeof createClient>>
): Promise<Record<string, unknown>> {
    const parche = { ...body }

    // Chi approva, e quando. Le colonne esistono da sempre e non le
    // scriveva nessuno: un fascicolo approvato senza approvante.
    if (body.status === 'approved') {
        if (userId) parche.admin_id = userId
        parche.approved_at = new Date().toISOString()
    }

    if (!body.extraccion || typeof body.extraccion !== 'object') return parche

    type Campo = {
        valor: string | number | null
        estado: string
        confianza?: number
        por?: string
        en?: string
    }
    // Si firma con l'email, che si legge. L'identificatore resta la
    // colonna admin_id sul fascicolo, per quando serve l'identita stabile.
    const firma = email ?? userId

    const nueva = body.extraccion as Record<string, Campo>

    // Senza sessione (modalita' dimostrativa) non si firma niente: meglio
    // nessuna firma che una firma di nessuno.
    if (!userId) return parche

    let anterior: Record<string, Campo> = {}
    try {
        const { data } = await supabase
            .from('projects')
            .select('extraccion')
            .eq('id', id)
            .single()
        anterior = (data?.extraccion ?? {}) as Record<string, Campo>
    } catch {
        // Se non si riesce a rileggere, si firma quello che arriva: meglio
        // una firma in piu' che un dato confermato da nessuno.
    }

    const ahora = new Date().toISOString()
    const firmada: Record<string, Campo> = {}

    for (const [campo, v] of Object.entries(nueva)) {
        const viejo = anterior[campo]
        const confirmado = v.estado === 'confirmado' || v.estado === 'corregido'

        if (!confirmado) {
            // Tornato indietro: si toglie anche la firma, altrimenti resta
            // appesa a un valore che nessuno sostiene piu'.
            firmada[campo] = { ...v, por: undefined, en: undefined }
            continue
        }

        const cambiado =
            !viejo || viejo.valor !== v.valor || viejo.estado !== v.estado

        firmada[campo] = cambiado
            ? { ...v, por: firma ?? undefined, en: ahora }
            : { ...v, por: viejo.por, en: viejo.en }
    }

    parche.extraccion = firmada
    return parche
}
