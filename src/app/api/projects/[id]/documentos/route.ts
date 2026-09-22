import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { mockDb, type ProjectDoc } from '@/lib/mockDb'
import { quienLlama, negado, prohibido } from '@/lib/auth/guard'
import { DOCUMENTS, type Role } from '@/lib/documents'

/**
 * Aggiungere un documento a un espediente, dal proprio pannello.
 *
 * ── PERCHÉ MANCAVA ────────────────────────────────────────────────────
 *
 * L'installatore la lista dei documenti la vedeva già — «Enviado»,
 * «Falta» — ma la sezione si chiamava «Lo que enviaste» ed era di sola
 * lettura. Cioè: gli si diceva cosa manca e non gli si dava modo di
 * darcelo.
 *
 * L'unica strada era il link pubblico, che deve mandargli qualcuno. Per
 * chi un account ce l'ha è un giro assurdo: entra, vede che manca il
 * RITE, e deve chiamare perché gli mandino un link.
 *
 * ── PERCHÉ QUI LA CASELLA NON LA SCEGLIE UN MODELLO ───────────────────
 *
 * Perché la sceglie lui, ed è nel posto giusto per farlo: ha davanti la
 * riga «Certificado de la instalación (RITE) · Falta» e preme lì. Far
 * indovinare a un modello una cosa che una persona ha appena indicato
 * col dito sarebbe aggiungere un errore possibile a un'operazione che
 * non ne aveva.
 *
 * Dal link pubblico invece il modello serve: lì chi carica molla tutto
 * insieme e non sceglie niente.
 */

export const maxDuration = 60

/** Come sulla porta pubblica: è un telefono in un pianerottolo. */
const MAX_BYTES = 12 * 1024 * 1024
const TIPOS = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
])

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const { id } = await params

    const admin = createAdminClient()
    const demo = mockDb.getProjectById(id)

    /**
     * Di chi è l'espediente.
     *
     * L'agenzia può scrivere su tutti — è il suo lavoro. Un installatore
     * solo sui propri: senza questo controllo, chiunque abbia un account
     * potrebbe infilare un file nel fascicolo di un altro.
     */
    let dueño: string | null = null
    let source: Role = 'installer'

    if (demo) {
        dueño = demo.installer_id ?? null
        source = (demo.source as Role) ?? 'installer'
    } else if (admin) {
        const { data } = await admin
            .from('projects')
            .select('installer_id, source')
            .eq('id', id)
            .maybeSingle()
        if (!data) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
        dueño = data.installer_id ?? null
        source = (data.source as Role) ?? 'installer'
    } else {
        return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const esAgencia = quien.rol === 'admin' || quien.demo
    if (!esAgencia && dueño !== quien.userId) return prohibido()

    const form = await request.formData().catch(() => null)
    const archivo = form?.get('archivo')
    const casilla = String(form?.get('casilla') ?? '').trim()

    if (!(archivo instanceof File)) {
        return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })
    }
    if (archivo.size > MAX_BYTES) {
        return NextResponse.json(
            { error: 'El archivo pesa demasiado. Máximo 12 MB.' },
            { status: 413 }
        )
    }
    if (!TIPOS.has(archivo.type)) {
        return NextResponse.json({ error: 'Solo PDF o fotos.' }, { status: 415 })
    }

    // La casella dev'essere una di quelle che questo espediente prevede:
    // senza, un file può finire in un cassetto che non esiste e non lo
    // vede più nessuno.
    const validas = new Set((DOCUMENTS[source] ?? DOCUMENTS.installer).map((d) => d.id))
    if (!validas.has(casilla)) {
        return NextResponse.json({ error: 'Esa casilla no existe' }, { status: 400 })
    }

    const bytes = Buffer.from(await archivo.arrayBuffer())
    const ext = archivo.name.split('.').pop()?.slice(0, 8) ?? 'bin'
    const ruta = `subidas/${id}/${crypto.randomUUID()}.${ext}`

    if (admin && !demo) {
        const { error } = await admin.storage
            .from('documents')
            .upload(ruta, bytes, { contentType: archivo.type, upsert: false })
        if (error) {
            console.error('POST /api/projects/[id]/documentos:', error)
            return NextResponse.json(
                { error: 'No se ha podido guardar. Vuelve a probar.' },
                { status: 502 }
            )
        }
    }

    const nuevo: ProjectDoc = {
        id: casilla,
        name: archivo.name.slice(0, 180),
        // Mai verificato: lo decide chi rivede, guardandolo.
        verified: false,
        path: ruta,
        // L'ha messo qui una persona, non il lettore. Vedi in testa.
        auto: false,
    }

    // Si rilegge adesso invece di fidarsi di una copia: fra la lettura e
    // questa riga possono essere arrivati altri file, e scrivere la
    // lista vecchia li cancellerebbe.
    if (demo) {
        const docs = [...(mockDb.getProjectById(id)?.docs ?? []), nuevo]
        mockDb.updateProject(id, { docs })
    } else if (admin) {
        const { data } = await admin
            .from('projects')
            .select('docs')
            .eq('id', id)
            .maybeSingle()
        const docs = [...((data?.docs ?? []) as ProjectDoc[]), nuevo]
        await admin.from('projects').update({ docs }).eq('id', id)
    }

    return NextResponse.json({ data: nuevo })
}
