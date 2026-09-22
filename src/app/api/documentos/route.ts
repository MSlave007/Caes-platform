import { NextResponse } from 'next/server'
import { quienLlama, negado, prohibido } from '@/lib/auth/guard'
import { componer, plantillaPorId } from '@/lib/caes/pdf'
import { firmado } from '@/lib/caes/firma'
import {
    cargarProyecto,
    datosDelExpediente,
    numeroCorto,
} from '@/lib/caes/servidor'

/**
 * Il Convenio, la ficha e l'Anexo, in PDF.
 *
 * ── PERCHÉ I DATI NON ARRIVANO DAL BROWSER ────────────────────────────
 *
 * Arrivano due cose sole — quale fascicolo e quale documento — e tutto
 * il resto si rilegge qui: l'estrazione confermata, i ritocchi salvati,
 * l'anagrafica dell'installatore, il soggetto delegato scelto. È lo
 * stesso montaggio che usa la firma, e sta in `caes/servidor.ts` apposta
 * perché non possano divergere.
 *
 * ── PERCHÉ L'ESEMPIO ESCE SEMPRE TIMBRATO ─────────────────────────────
 *
 * Perché l'esempio è COMPLETO, e un documento completo esce senza
 * timbro. Un PDF di dieci pagine pieno di dati inventati, senza niente
 * addosso che lo dica, è la cosa più pericolosa che questa rotta
 * potrebbe produrre.
 *
 * ── E QUANDO È FIRMATO ────────────────────────────────────────────────
 *
 * Non si ricompone da zero: si ricompone con l'istante in cui la prima
 * firma l'ha congelato, e quindi esce identico byte per byte a quello
 * che è stato firmato. Vedi `caes/firma.ts`.
 */

export const maxDuration = 60

export async function GET(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.trim()
    const cual = url.searchParams.get('plantilla')?.trim() ?? ''
    const conEjemplo = url.searchParams.get('ejemplo') === '1'
    const descargar = url.searchParams.get('descargar') === '1'

    if (!id) return NextResponse.json({ error: 'Falta el expediente' }, { status: 400 })

    const plantilla = plantillaPorId(cual)
    if (!plantilla) {
        return NextResponse.json({ error: 'Ese documento no existe' }, { status: 404 })
    }

    const esAgencia = quien.rol === 'admin' || quien.demo
    const p = await cargarProyecto(id)
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // Chi non è l'agenzia può tirare giù solo i propri.
    if (!esAgencia && p.installer_id && p.installer_id !== quien.userId) {
        return prohibido()
    }

    const datos = await datosDelExpediente(p, conEjemplo)
    const expediente = numeroCorto(p.id)
    const registro = !conEjemplo ? p.firmas?.[plantilla.id] : undefined

    try {
        const bytes = registro?.firmas?.length
            ? await firmado(plantilla, datos, expediente, registro)
            : (
                  await componer(plantilla, datos, {
                      expediente,
                      borrador: conEjemplo,
                  })
              ).bytes

        const sufijo = registro?.firmas?.length ? '-firmado' : ''
        const nombre = `${plantilla.id}-${expediente}${sufijo}.pdf`

        return new NextResponse(bytes as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${nombre}"`,
                // Un contratto non si mette in cache: fra una lettura e
                // l'altra qualcuno ha corretto un NIF.
                'Cache-Control': 'no-store, max-age=0',
                'X-Robots-Tag': 'noindex, nofollow',
            },
        })
    } catch (error) {
        console.error('GET /api/documentos:', error)
        return NextResponse.json(
            { error: 'No se ha podido generar el documento.' },
            { status: 500 }
        )
    }
}
