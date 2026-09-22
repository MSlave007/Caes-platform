import { NextResponse } from 'next/server'
import { dentroDelLimite, quienCuenta, demasiadas } from '@/lib/auth/ritmo'
import { plantillaPorId } from '@/lib/caes/pdf'
import { abrir } from '@/lib/caes/firmaEnlace'
import { faltanEn } from '@/lib/caes/plantillas'
import {
    agenteCorto,
    enPalabras,
    huella,
    huellaDeDatos,
    presentado,
    sinCabecera,
    trazoValido,
    type Firma,
    type Firmas,
    type Metodo,
    type RegistroFirma,
} from '@/lib/caes/firma'
import {
    datosDelExpediente,
    guardarEnProyecto,
    numeroCorto,
} from '@/lib/caes/servidor'

/**
 * La porta per firmare senza entrare.
 *
 * ── È UNA PORTA DI SCRITTURA SENZA PASSWORD ───────────────────────────
 *
 * Come quella per caricare i documenti, e vale la pena elencare cosa
 * NON può fare, perché è la parte che conta:
 *
 *   · vale per UN documento di UN fascicolo, e per UN ruolo — tutti e
 *     tre decisi da chi manda il link, non da chi lo apre
 *   · non cambia un dato, non ne legge altri, non ne cancella nessuno
 *   · non si può firmare due volte: se quel ruolo ha già firmato, la
 *     porta lo dice e non aggiunge niente
 *   · scade, e si uccide mettendo la scadenza nel passato
 *
 * ── PERCHÉ IL DOCUMENTO SI PUÒ LEGGERE DA QUI ─────────────────────────
 *
 * Perché firmare senza poter leggere non è firmare. Il PDF si serve
 * dallo stesso token, in sola lettura, e la pagina lo mostra aperto
 * sopra al riquadro della firma invece che dietro a un link.
 */

export const maxDuration = 60

/**
 * I modi ammessi, elencati.
 *
 * Arriva dal browser e finisce stampato nel registro di prova: senza
 * elenco, chi manda la richiesta decide cosa si legge su un documento
 * firmato.
 */
const METODOS = new Set<Metodo>(['trazo', 'escrito', 'guardada'])

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params
    const pedido = await abrir(token)
    if (!pedido) return NextResponse.json({ error: 'caducado' }, { status: 404 })

    const plantilla = plantillaPorId(pedido.plantillaId)!
    const yaFirmado = (pedido.p.firmas?.[pedido.plantillaId]?.firmas ?? []).some(
        (f) => f.rol === pedido.rol
    )

    // Il nome come lo scrive il documento: glielo proponiamo già scritto
    // perché deve corrispondere a quello del contratto, non a come si
    // firma di solito.
    const datos = await datosDelExpediente(pedido.p)
    const parte = plantilla.bloques
        .flatMap((b) => (b.tipo === 'firmas' ? b.partes : []))
        .find((x) => x.rol === pedido.rol)
    const nombre = (parte?.nombre ?? '')
        .replace(/\{\{(\w+)\}\}/g, (_, id: string) => datos[id] ?? '')
        .trim()

    return NextResponse.json({
        data: {
            numero: numeroCorto(pedido.p.id),
            documento: plantilla.nombre,
            queEs: plantilla.queEs,
            rol: pedido.rol,
            nombre,
            nota: pedido.nota,
            yaFirmado,
        },
    })
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    const { token } = await params

    // Il limite prima di tutto: è una porta pubblica.
    const LIMITE = { cuantas: 12, segundos: 600 }
    if (!dentroDelLimite(quienCuenta(request), LIMITE)) {
        return demasiadas(LIMITE.segundos)
    }

    const pedido = await abrir(token)
    if (!pedido) return NextResponse.json({ error: 'caducado' }, { status: 404 })

    const plantilla = plantillaPorId(pedido.plantillaId)!
    const body = (await request.json().catch(() => null)) as {
        nombre?: string
        png?: string
        metodo?: Metodo
    } | null

    const nombre = String(body?.nombre ?? '').trim().slice(0, 140)
    const metodoPedido = String(body?.metodo ?? '') as Metodo
    const metodo: Metodo = METODOS.has(metodoPedido) ? metodoPedido : 'trazo'

    if (nombre.length < 2) {
        return NextResponse.json({ error: 'Falta tu nombre' }, { status: 400 })
    }
    if (!trazoValido(String(body?.png ?? ''))) {
        return NextResponse.json({ error: 'La firma no ha llegado bien' }, { status: 400 })
    }

    const datos = await datosDelExpediente(pedido.p)
    if (faltanEn(plantilla, datos).length > 0) {
        // Non si dice al cliente QUALI dati mancano: è un indirizzo
        // pubblico e quelli sono affari del fascicolo.
        return NextResponse.json(
            { error: 'Este documento todavía no está listo para firmar.' },
            { status: 409 }
        )
    }

    const todas: Firmas = { ...(pedido.p.firmas ?? {}) }
    const previo = todas[pedido.plantillaId]

    // Firmato due volte non vuol dire niente, e un link che si può
    // ripremere dieci volte va chiuso dopo la prima.
    if (previo?.firmas.some((f) => f.rol === pedido.rol)) {
        return NextResponse.json({ error: 'Ya está firmado' }, { status: 409 })
    }

    try {
        const expediente = numeroCorto(pedido.p.id)
        const congelado = previo?.congelado ?? new Date().toISOString()
        const impronta =
            previo?.huella ??
            huella(await presentado(plantilla, datos, expediente, congelado))

        const firma: Firma = {
            rol: pedido.rol,
            nombre,
            metodo,
            png: sinCabecera(String(body?.png ?? '')),
            fecha: new Date().toISOString(),
            ip:
                request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                request.headers.get('x-real-ip') ||
                undefined,
            agente: agenteCorto(request.headers.get('user-agent')),
        }

        const registro: RegistroFirma = {
            congelado,
            huella: impronta,
            // L'impronta dei dati si rifà a ogni firma: sono gli stessi
            // dati, e ricalcolarla costa niente.
            huellaDatos: huellaDeDatos(datos),
            firmas: [...(previo?.firmas ?? []), firma],
        }
        todas[pedido.plantillaId] = registro

        /**
         * Firmato: il link muore qui.
         *
         * Non per prudenza generica — perché ha finito. Un indirizzo di
         * scrittura che resta aperto dopo aver servito è una
         * responsabilità che non serve più a niente.
         */
        const guardado = await guardarEnProyecto(String(pedido.p.id), {
            firmas: todas,
            firma_token: undefined,
            firma_caduca: undefined,
            firma_plantilla: undefined,
            firma_rol: undefined,
            firma_nota: undefined,
        })
        if (!guardado) {
            return NextResponse.json(
                { error: 'No se ha podido guardar la firma.' },
                { status: 502 }
            )
        }

        return NextResponse.json({
            data: { cuando: enPalabras(firma.fecha), documento: plantilla.nombre },
        })
    } catch (error) {
        console.error('POST /api/firma/[token]:', error)
        return NextResponse.json(
            { error: 'No se ha podido registrar la firma.' },
            { status: 500 }
        )
    }
}
