import { NextResponse } from 'next/server'
import { quienLlama, negado, prohibido } from '@/lib/auth/guard'
import { createAdminClient } from '@/lib/supabaseAdmin'
import { mockDb } from '@/lib/mockDb'
import { CAMPOS, type Extraccion } from '@/lib/caes/extraction'
import {
    DATOS_EJEMPLO,
    datosDe,
    extrasDeAgencia,
    extrasDePerfil,
    type PerfilInstalador,
} from '@/lib/caes/expediente'
import type { Datos } from '@/lib/caes/plantillas'
import { componer, plantillaPorId } from '@/lib/caes/pdf'

/**
 * Il Convenio, la ficha e l'Anexo, in PDF.
 *
 * ── PERCHÉ I DATI SI RIMONTANO QUI E NON ARRIVANO DAL BROWSER ─────────
 *
 * Perché il browser li ha già tutti sullo schermo, e sarebbe stato più
 * corto farglieli mandare. Ma questo è il foglio che il cliente firma: i
 * dati di un documento firmato non possono arrivare da chi apre gli
 * strumenti di sviluppo e cambia il NIF del cesionario prima di premere
 * «descargar».
 *
 * Quindi arrivano due cose sole — quale fascicolo e quale documento — e
 * tutto il resto si rilegge da qui: l'estrazione confermata, i ritocchi
 * salvati, l'anagrafica dell'installatore, il soggetto delegato scelto.
 * Sono le stesse funzioni che usa la schermata, quindi quello che si
 * vede è quello che esce.
 *
 * ── I RITOCCHI SÌ, PERÒ ───────────────────────────────────────────────
 *
 * Un ritocco è una correzione scritta a mano da chi rivede, e vince sul
 * dato estratto: è l'ultima parola di una persona. Ma arriva dal
 * fascicolo, dove è stato salvato da una rotta che controlla il ruolo,
 * non dal corpo di questa chiamata.
 *
 * ── PERCHÉ L'ESEMPIO ESCE SEMPRE TIMBRATO ─────────────────────────────
 *
 * Perché l'esempio è COMPLETO, e un documento completo esce senza
 * timbro. Un PDF di dieci pagine pieno di dati inventati, senza niente
 * addosso che lo dica, è la cosa più pericolosa che questa rotta
 * potrebbe produrre. Vedi `componer()`.
 */

export const maxDuration = 60

type Proyecto = {
    id: string
    installer_id?: string | null
    proveedor?: string | null
    tarifa_eur_mwh?: number | null
    extraccion?: Extraccion | null
    documentos?: { retoques?: Datos } | null
}

const VACIA: Extraccion = Object.fromEntries(
    CAMPOS.map((c) => [c.id, { valor: null, estado: 'vacio' as const }])
) as Extraccion

async function cargarProyecto(id: string, esAgencia: boolean): Promise<Proyecto | null> {
    const admin = createAdminClient()
    if (admin) {
        const { data } = await admin
            .from('projects')
            .select('id, installer_id, proveedor, tarifa_eur_mwh, extraccion, documentos')
            .eq('id', id)
            .maybeSingle()
        if (data) return data as Proyecto
    }
    void esAgencia
    return (mockDb.getProjectById(id) as Proyecto | undefined) ?? null
}

/**
 * L'anagrafica di chi ha installato: cinque campi dei documenti.
 *
 * Se non c'è non si ferma niente. I cinque buchi restano vuoti, escono
 * scritti per esteso dentro al testo, e il documento porta il timbro —
 * che è esattamente quello che deve succedere quando manca un dato.
 */
async function cargarPerfil(installerId?: string | null): Promise<PerfilInstalador | null> {
    if (!installerId) return null
    const admin = createAdminClient()
    if (!admin) return null
    const { data } = await admin
        .from('profiles')
        .select('name, nif, address, phone')
        .eq('id', installerId)
        .maybeSingle()
    return (data as PerfilInstalador | null) ?? null
}

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
    const p = await cargarProyecto(id, esAgencia)
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // Chi non è l'agenzia può tirare giù solo i propri.
    if (!esAgencia && p.installer_id && p.installer_id !== quien.userId) {
        return prohibido()
    }

    const datos: Datos = conEjemplo
        ? DATOS_EJEMPLO
        : {
              ...datosDe(p.extraccion ?? VACIA, {
                  ...extrasDePerfil(await cargarPerfil(p.installer_id)),
                  ...extrasDeAgencia({
                      proveedor: p.proveedor,
                      tarifa_eur_mwh: p.tarifa_eur_mwh,
                  }),
              }),
              ...(p.documentos?.retoques ?? {}),
          }

    try {
        const hecho = await componer(plantilla, datos, {
            expediente: String(p.id).slice(0, 8).toUpperCase(),
            // L'esempio è completo, quindi passerebbe per buono. Vedi in
            // testa al file.
            borrador: conEjemplo,
        })

        return new NextResponse(hecho.bytes as unknown as BodyInit, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename="${hecho.nombreArchivo}"`,
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
