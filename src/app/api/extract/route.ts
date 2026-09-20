import { NextResponse } from 'next/server'
import { BUCKET, SIN_DEPOSITO, createAdminClient, explicar } from '@/lib/supabaseAdmin'
import { quienLlama, negado } from '@/lib/auth/guard'
import { camposDe } from '@/lib/caes/extraction'
import { hayClave, lectorActivo, leer, modeloActivo } from '@/lib/caes/lectores'

/**
 * Leggere una carta del fascicolo.
 *
 * ── COSA FA E COSA NON FA ─────────────────────────────────────────────
 *
 * Prende un documento già caricato, lo manda al lettore attivo con
 * l'elenco dei campi che quel tipo di carta deve dare, e restituisce
 * valore più confidenza per ciascuno. Non salva niente e non decide
 * niente: i valori arrivano nel pannello di revisione come PROPOSTE, da
 * confermare o correggere con il documento aperto accanto.
 *
 * Questa distinzione non è formale. Un valore che entra nel fascicolo
 * senza che nessuno l'abbia guardato finisce in un documento che qualcuno
 * firma e per cui risponde dieci anni.
 *
 * Quale modello legga lo decide `src/lib/caes/lectores.ts`, non questa
 * rotta: qui c'è solo il prendere il file e il restituire il risultato.
 *
 * ── PERCHÉ IL FILE LO PRENDE IL SERVER ────────────────────────────────
 *
 * Il browser manda solo il percorso. Il file lo scarica il server dal
 * deposito: così la chiave del modello non esce di qui e il documento non
 * fa un giro in più per il telefono di chi rivede.
 */

/** 20 MB: sopra, il documento non entra in una richiesta sola. */
const MAX_BYTES = 20 * 1024 * 1024

/** Il tipo dedotto dall'estensione, quando il deposito non lo dice. */
const POR_EXTENSION: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
}

export async function POST(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const lector = lectorActivo()
    if (!hayClave(lector)) {
        return NextResponse.json(
            {
                error: 'La lectura automática no está configurada',
                details: `Falta ${lector === 'gemini' ? 'GEMINI_API_KEY' : 'ANTHROPIC_API_KEY'} en el entorno del servidor.`,
            },
            { status: 503 }
        )
    }

    let documento: string
    let path: string
    try {
        const body = await request.json()
        documento = String(body.documento ?? '')
        path = String(body.path ?? '')
    } catch {
        return NextResponse.json({ error: 'Petición no válida' }, { status: 400 })
    }

    if (!documento || !path) {
        return NextResponse.json(
            { error: 'Hacen falta el documento y su ruta' },
            { status: 400 }
        )
    }
    // Il percorso arriva dal client, come in /api/documents/url.
    if (path.includes('..') || path.startsWith('/')) {
        return NextResponse.json({ error: 'Ruta no válida' }, { status: 400 })
    }
    if (camposDe(documento).length === 0) {
        return NextResponse.json(
            { error: 'De este documento no se extrae ningún dato' },
            { status: 400 }
        )
    }

    try {
        const supabase = createAdminClient()
        if (!supabase) {
            return NextResponse.json({ error: SIN_DEPOSITO }, { status: 503 })
        }

        const { data: blob, error } = await supabase.storage
            .from(BUCKET)
            .download(path)

        if (error || !blob) {
            return NextResponse.json(
                {
                    error: 'No se ha podido abrir el documento',
                    details: error ? explicar(error.message) : undefined,
                },
                { status: 404 }
            )
        }
        if (blob.size > MAX_BYTES) {
            return NextResponse.json(
                { error: 'El documento es demasiado grande para leerlo de una vez' },
                { status: 413 }
            )
        }

        const ext = path.split('.').pop()?.toLowerCase() ?? ''
        const mime =
            blob.type && blob.type !== 'application/octet-stream'
                ? blob.type
                : (POR_EXTENSION[ext] ?? 'application/pdf')

        const empezado = Date.now()
        const resultado = await leer({
            documento,
            datos: Buffer.from(await blob.arrayBuffer()).toString('base64'),
            mime,
        })

        return NextResponse.json({
            success: true,
            documento,
            datos: resultado.datos,
            // Serve a confrontare i lettori: senza sapere chi ha letto e
            // quanto ci ha messo, «Gemini legge meglio» resta un'opinione.
            lector: resultado.lector,
            modelo: resultado.modelo,
            ms: Date.now() - empezado,
            uso: resultado.uso,
        })
    } catch (e: unknown) {
        console.error('Lectura fallida:', e)
        const msg = e instanceof Error ? e.message : String(e)
        return NextResponse.json(
            { error: 'No se ha podido leer el documento', details: msg },
            { status: 502 }
        )
    }
}

/**
 * Chi sta leggendo, e con che prompt.
 *
 * Serve a due cose: sapere quale modello è attivo senza frugare
 * nell'ambiente, e rileggere il prompt che parte davvero — che è la cosa
 * da guardare per prima quando una lettura viene male.
 */
export async function GET(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const documento = new URL(request.url).searchParams.get('documento')
    const lector = lectorActivo()

    const { instruccionesDe } = await import('@/lib/caes/lectura')

    return NextResponse.json({
        lector,
        modelo: modeloActivo(lector),
        configurado: hayClave(lector),
        prompt: documento && camposDe(documento).length > 0 ? instruccionesDe(documento) : null,
    })
}
