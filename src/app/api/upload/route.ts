import { NextResponse } from 'next/server'
import { quienLlama, negado } from '@/lib/auth/guard'
import { BUCKET, SIN_DEPOSITO, createAdminClient, explicar } from '@/lib/supabaseAdmin'

/**
 * Caricare e cancellare i documenti del fascicolo.
 *
 * ── NON SI FINGE PIÙ CHE SIA ANDATA ───────────────────────────────────
 *
 * Prima, se il deposito rifiutava il file, qui si rispondeva
 * `{ path, mock: true }` con un percorso inventato. Il fascicolo
 * registrava quel percorso, il pannello mostrava il documento come
 * presente, e la verità saltava fuori solo aprendolo: «Object not
 * found». Nel frattempo si era già spuntata la casella.
 *
 * Adesso un caricamento che non riesce risponde con un errore e con il
 * motivo. Meglio un messaggio brutto subito che un fascicolo che sembra
 * completo e non lo è.
 */

/**
 * Tipi accettati. Un fascicolo CAES contiene fatture e certificati (PDF) e
 * fotografie della caldaia: nient'altro deve poter entrare.
 */
const TIPOS = new Set([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
])

/** 15 MB: una foto da telefono ci sta larga, un video no. */
const MAX_BYTES = 15 * 1024 * 1024

/** Estensione dedotta dal TIPO, mai dal nome del file. */
const EXT: Record<string, string> = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/heic': 'heic',
}

export async function POST(request: Request) {
    try {
        const quien = await quienLlama()
        if (!quien) return negado()

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No se ha recibido ningún archivo' }, { status: 400 })
        }

        // Prima non c'era nessuna validazione: si poteva caricare qualsiasi
        // cosa, di qualsiasi dimensione.
        if (!TIPOS.has(file.type)) {
            return NextResponse.json(
                { error: 'Formato no admitido. Solo PDF o fotografía.' },
                { status: 415 }
            )
        }
        if (file.size > MAX_BYTES) {
            return NextResponse.json(
                { error: 'El archivo supera los 15 MB.' },
                { status: 413 }
            )
        }

        const supabase = createAdminClient()
        if (!supabase) {
            return NextResponse.json({ error: SIN_DEPOSITO }, { status: 503 })
        }

        // Il nome lo scriviamo noi: quello dell'utente puo contenere percorsi
        // (../) o caratteri che cambiano la destinazione.
        const fileExt = EXT[file.type] ?? 'bin'
        const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, file, { contentType: file.type })

        if (error) {
            console.error('Subida rechazada por el almacén:', error.message)
            return NextResponse.json(
                {
                    error: 'El almacén ha rechazado el archivo',
                    details: explicar(error.message),
                },
                { status: 502 }
            )
        }

        // Restituiamo il PERCORSO, non un indirizzo pubblico.
        //
        // Prima qui c'era getPublicUrl(), che produce un indirizzo valido
        // per chiunque e per sempre. Su un bucket che contiene carte
        // d'identita e fatture non va bene: basta che quell'indirizzo
        // finisca in una email o nella cronologia di un browser.
        //
        // Il percorso da solo non apre niente: per guardare un documento si
        // chiede un indirizzo firmato e a scadenza a /api/documents/url,
        // che verifica prima chi sta chiedendo.
        return NextResponse.json({ path: filePath })
    } catch (error: unknown) {
        console.error('Upload Error:', error)
        return NextResponse.json(
            {
                error: 'No se ha podido subir el archivo',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}

/**
 * Togliere un file dal deposito.
 *
 * Serve perché si sbaglia: si carica la fattura nello slot del
 * certificato, si carica due volte lo stesso PDF. Senza questo l'unico
 * rimedio era lasciare il file sbagliato lì e sperare che chi guarda
 * capisse.
 *
 * Cancella il file. Toglierlo dall'elenco del fascicolo lo fa chi chiama,
 * con una PATCH: sono due cose diverse e conviene che restino separate —
 * un file sparito dal deposito ma ancora in elenco si vede, il contrario
 * no.
 */
export async function DELETE(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const path = new URL(request.url).searchParams.get('path')
    if (!path) {
        return NextResponse.json({ error: 'Falta el path' }, { status: 400 })
    }
    if (path.includes('..') || path.startsWith('/')) {
        return NextResponse.json({ error: 'Path no válido' }, { status: 400 })
    }

    const supabase = createAdminClient()
    if (!supabase) {
        return NextResponse.json({ error: SIN_DEPOSITO }, { status: 503 })
    }

    const { error } = await supabase.storage.from(BUCKET).remove([path])

    // Un file che non c'è è il risultato che si voleva. Capita coi
    // percorsi fantasma lasciati dai caricamenti finti di prima: far
    // fallire la cancellazione li renderebbe impossibili da togliere
    // dall'elenco, che è l'unico posto dove danno fastidio.
    if (error && !/object not found|not_found/i.test(error.message)) {
        return NextResponse.json(
            { error: 'No se ha podido borrar el archivo', details: explicar(error.message) },
            { status: 502 }
        )
    }

    return NextResponse.json({ ok: true })
}
