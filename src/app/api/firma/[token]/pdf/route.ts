import { NextResponse } from 'next/server'
import { componer, plantillaPorId } from '@/lib/caes/pdf'
import { firmado } from '@/lib/caes/firma'
import { datosDelExpediente, numeroCorto } from '@/lib/caes/servidor'
import { abrir } from '@/lib/caes/firmaEnlace'

/**
 * Il documento da leggere prima di firmarlo.
 *
 * ── PERCHÉ ESISTE UNA ROTTA SOLO PER QUESTO ───────────────────────────
 *
 * Perché firmare senza poter leggere non è firmare, e la pagina pubblica
 * non ha una sessione con cui chiedere `/api/documentos`. Stesso token,
 * stesso documento, sola lettura.
 *
 * ── PERCHÉ IL TOKEN NON SERVE SOLO AD ENTRARE ─────────────────────────
 *
 * Il token dice anche QUALE documento: chi apre non lo sceglie. Senza
 * questo, un link per firmare l'Anexo servirebbe a scaricare il Convenio
 * — e il Convenio è dove stanno le cifre.
 */

export const maxDuration = 60

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params
    const pedido = await abrir(token)
    if (!pedido) return NextResponse.json({ error: 'caducado' }, { status: 404 })

    const plantilla = plantillaPorId(pedido.plantillaId)
    if (!plantilla) return NextResponse.json({ error: 'caducado' }, { status: 404 })

    try {
        const datos = await datosDelExpediente(pedido.p)
        const expediente = numeroCorto(pedido.p.id)
        const registro = pedido.p.firmas?.[pedido.plantillaId]

        // Con una firma già dentro si serve il documento firmato: chi
        // firma per secondo deve vedere quello che ha firmato il primo,
        // non una copia pulita.
        const bytes = registro?.firmas?.length
            ? await firmado(plantilla, datos, expediente, registro)
            : (await componer(plantilla, datos, { expediente })).bytes

        return new NextResponse(bytes as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${plantilla.id}-${expediente}.pdf"`,
                'Cache-Control': 'no-store, max-age=0',
                'X-Robots-Tag': 'noindex, nofollow',
            },
        })
    } catch (error) {
        console.error('GET /api/firma/[token]/pdf:', error)
        return NextResponse.json(
            { error: 'No se ha podido abrir el documento.' },
            { status: 500 }
        )
    }
}
