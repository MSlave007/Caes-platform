import { NextResponse } from 'next/server'
import { soloAgencia, negado } from '@/lib/auth/guard'
import { plantillaPorId } from '@/lib/caes/pdf'
import { faltanEn } from '@/lib/caes/plantillas'
import {
    agenteCorto,
    enPalabras,
    huella,
    presentado,
    sinCabecera,
    trazoValido,
    type Firma,
    type Firmas,
    type Metodo,
    type RegistroFirma,
} from '@/lib/caes/firma'
import {
    cargarProyecto,
    datosDelExpediente,
    guardarEnProyecto,
    numeroCorto,
} from '@/lib/caes/servidor'

/**
 * Raccogliere una firma.
 *
 * ── COSA SUCCEDE ALLA PRIMA ───────────────────────────────────────────
 *
 * Il documento si congela. Si fissa l'istante, si prende l'impronta del
 * PDF così com'era in quel momento, e da lì in poi quel documento si
 * ricompone sempre uguale — byte per byte.
 *
 * Da cui la proprietà che fa funzionare tutto il resto: se qualcuno
 * cambia un dato del fascicolo dopo la firma, il documento smette di
 * riprodurre la sua impronta. Non lo impediamo — a volte un dato va
 * davvero corretto — ma non si può più far finta che sia lo stesso
 * foglio, e la schermata lo dice.
 *
 * ── PERCHÉ NON SI FIRMA UN DOCUMENTO INCOMPLETO ───────────────────────
 *
 * Perché un documento incompleto esce con «BORRADOR» di traverso e con
 * dentro «[ falta: NIF del sujeto delegado ]». Farlo firmare vorrebbe
 * dire raccogliere il consenso di qualcuno su un foglio che sappiamo
 * essere sbagliato.
 *
 * ── PERCHÉ IL NOME NON BASTA A DECIDERE CHI FIRMA ─────────────────────
 *
 * Il ruolo deve essere uno di quelli che il documento prevede. Senza
 * questo controllo si può firmare come «El Notario» — un ruolo che nel
 * Convenio non esiste — e la pagina di prova lo stamperebbe come se
 * fosse vero.
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

type Cuerpo = {
    id?: string
    plantilla?: string
    rol?: string
    nombre?: string
    png?: string
    metodo?: Metodo
}

function ipDe(request: Request): string | undefined {
    const h = request.headers
    return (
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        h.get('x-real-ip') ||
        undefined
    )
}

/**
 * Chi ha firmato, e se il documento è ancora quello che hanno firmato.
 *
 * ── LA SECONDA DOMANDA È IL PUNTO ─────────────────────────────────────
 *
 * Un elenco di firme lo può tenere chiunque. Quello che qui si può fare
 * e altrove no è ricalcolare l'impronta del documento con i dati di
 * ADESSO e confrontarla con quella salvata alla firma.
 *
 * Se non coincidono, qualcuno ha corretto un dato dopo che il cliente
 * aveva firmato. Non è vietato — a volte un NIF va davvero corretto — ma
 * da quel momento la firma sta su un foglio diverso, e chi rivede deve
 * saperlo prima di mandare il fascicolo.
 */
export async function GET(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.trim()
    const plantilla = plantillaPorId(url.searchParams.get('plantilla')?.trim() ?? '')
    if (!id || !plantilla) {
        return NextResponse.json({ error: 'Falta el documento' }, { status: 400 })
    }

    const p = await cargarProyecto(id)
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const datos = await datosDelExpediente(p)

    /**
     * Chi deve firmare, e con che nome.
     *
     * Il nome esce dal modello — «{{cliente_nombre}}» per il Cedente,
     * «{{cesionario_representante}}» per il Cesionario — riempito con i
     * dati del fascicolo. Suggerendo lo stesso nome a tutti, chi firma
     * per il soggetto delegato si trovava scritto sopra il nome del
     * cliente, e il primo che non se ne accorge lo lascia lì.
     */
    const partes = plantilla.bloques.flatMap((b) =>
        b.tipo === 'firmas'
            ? b.partes.map((x) => ({
                  rol: x.rol,
                  nombre: x.nombre.replace(
                      /\{\{(\w+)\}\}/g,
                      (_, id: string) => datos[id] ?? ''
                  ).trim(),
              }))
            : []
    )
    const registro = p.firmas?.[plantilla.id]

    /**
     * Il link di firma in attesa, se è di QUESTO documento.
     *
     * Ce n'è uno per fascicolo: mostrarlo anche sotto gli altri due
     * documenti farebbe credere che il cliente stia per firmare il
     * Convenio mentre gli abbiamo mandato l'Anexo.
     */
    const suyo = p.firma_token && p.firma_plantilla === plantilla.id
    const enlace = suyo
        ? { token: p.firma_token, caduca: p.firma_caduca ?? null, rol: p.firma_rol ?? '' }
        : null

    if (!registro?.firmas.length) {
        return NextResponse.json({
            data: {
                firmas: [],
                faltan: partes,
                coincide: true,
                enlace,
                bloqueado: false,
            },
        })
    }
    let coincide = true
    try {
        const ahora = huella(
            await presentado(plantilla, datos, numeroCorto(p.id), registro.congelado)
        )
        coincide = ahora === registro.huella
    } catch (error) {
        // Non sapere se coincide non è come sapere che coincide: senza
        // risposta si dice che non si sa, non che va tutto bene.
        console.error('GET /api/firmas:', error)
        return NextResponse.json({
            data: {
                firmas: registro.firmas.map(resumir),
                faltan: partes.filter((x) => !registro.firmas.some((f) => f.rol === x.rol)),
                coincide: null,
            },
        })
    }

    return NextResponse.json({
        data: {
            congelado: registro.congelado,
            huella: registro.huella,
            coincide,
            firmas: registro.firmas.map(resumir),
            faltan: partes.filter((x) => !registro.firmas.some((f) => f.rol === x.rol)),
            enlace,
            /**
             * Una firma basta a chiudere il documento.
             *
             * Non tutte: se il Cedente ha firmato e il Cesionario no, i
             * dati sono comunque quelli che il Cedente ha letto. Cambiarli
             * per far comodo al secondo vorrebbe dire far firmare a due
             * persone due fogli diversi.
             */
            bloqueado: true,
        },
    })
}

/**
 * Quello che serve a schermo — tratto compreso.
 *
 * Il tratto sembrava di troppo in un elenco, e infatti in elenco non si
 * guarda. Ma il foglio sopra al pannello deve mostrarlo: senza, chi
 * firma vede scritto «firmato» e il documento identico a prima, e
 * conclude che non è successo niente. Sono pochi kB.
 */
function resumir(f: Firma) {
    return {
        rol: f.rol,
        nombre: f.nombre,
        metodo: f.metodo,
        cuando: enPalabras(f.fecha),
        png: f.png,
    }
}

export async function POST(request: Request) {
    // Firma l'agenzia, o l'agenzia con il cliente davanti. Il link per
    // firmare da lontano è un'altra porta, con il suo token.
    const quien = await soloAgencia()
    if (!quien) return negado()

    const body = (await request.json().catch(() => null)) as Cuerpo | null
    const id = String(body?.id ?? '').trim()
    const plantilla = plantillaPorId(String(body?.plantilla ?? '').trim())
    const rol = String(body?.rol ?? '').trim()
    const nombre = String(body?.nombre ?? '').trim().slice(0, 140)
    const metodoPedido = String(body?.metodo ?? '') as Metodo
    const metodo: Metodo = METODOS.has(metodoPedido) ? metodoPedido : 'trazo'

    if (!id || !plantilla) {
        return NextResponse.json({ error: 'Falta el documento' }, { status: 400 })
    }
    if (nombre.length < 2) {
        return NextResponse.json({ error: 'Falta el nombre de quien firma' }, { status: 400 })
    }
    if (!trazoValido(String(body?.png ?? ''))) {
        return NextResponse.json({ error: 'La firma no ha llegado bien' }, { status: 400 })
    }

    // Il ruolo dev'essere uno che questo documento prevede.
    const roles = plantilla.bloques.flatMap((b) =>
        b.tipo === 'firmas' ? b.partes.map((p) => p.rol) : []
    )
    if (!roles.includes(rol)) {
        return NextResponse.json({ error: 'Ese firmante no existe en este documento' }, { status: 400 })
    }

    const p = await cargarProyecto(id)
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const datos = await datosDelExpediente(p)
    const faltan = faltanEn(plantilla, datos)
    if (faltan.length > 0) {
        return NextResponse.json(
            {
                error: `Faltan ${faltan.length} datos. No se firma un borrador.`,
                faltan: faltan.map((h) => h.label),
            },
            { status: 409 }
        )
    }

    const expediente = numeroCorto(p.id)
    const todas: Firmas = { ...(p.firmas ?? {}) }
    const previo = todas[plantilla.id]

    try {
        /**
         * Congelare: solo la prima volta.
         *
         * Le firme successive entrano nello stesso documento, quello che
         * il primo ha letto. Rifissare l'istante a ogni firma vorrebbe
         * dire che il secondo firma un foglio diverso dal primo.
         */
        const congelado = previo?.congelado ?? new Date().toISOString()
        const impronta =
            previo?.huella ??
            huella(await presentado(plantilla, datos, expediente, congelado))

        const firma: Firma = {
            rol,
            nombre,
            metodo,
            png: sinCabecera(String(body?.png ?? '')),
            fecha: new Date().toISOString(),
            ip: ipDe(request),
            agente: agenteCorto(request.headers.get('user-agent')),
        }

        // Rifirmare sostituisce: due firme dello stesso ruolo sullo
        // stesso documento non vogliono dire niente.
        const registro: RegistroFirma = {
            congelado,
            huella: impronta,
            firmas: [...(previo?.firmas ?? []).filter((f) => f.rol !== rol), firma],
        }
        todas[plantilla.id] = registro

        if (!(await guardarEnProyecto(id, { firmas: todas }))) {
            return NextResponse.json(
                { error: 'No se ha podido guardar la firma.' },
                { status: 502 }
            )
        }

        return NextResponse.json({
            data: {
                rol,
                nombre,
                cuando: enPalabras(firma.fecha),
                huella: impronta,
                faltan: roles.filter((r) => !registro.firmas.some((f) => f.rol === r)),
            },
        })
    } catch (error) {
        console.error('POST /api/firmas:', error)
        return NextResponse.json(
            { error: 'No se ha podido registrar la firma.' },
            { status: 500 }
        )
    }
}

/**
 * Togliere una firma.
 *
 * Esiste perché si sbaglia: si firma il documento aperto invece di
 * quello accanto, o si firma come Cedente essendo il Cesionario. Togliere
 * l'ultima scongela il documento — se non c'è più nessuna firma, non c'è
 * più niente da tenere fermo.
 */
export async function DELETE(request: Request) {
    const quien = await soloAgencia()
    if (!quien) return negado()

    const url = new URL(request.url)
    const id = url.searchParams.get('id')?.trim()
    const cual = url.searchParams.get('plantilla')?.trim() ?? ''
    const rol = url.searchParams.get('rol')?.trim() ?? ''

    if (!id || !plantillaPorId(cual)) {
        return NextResponse.json({ error: 'Falta el documento' }, { status: 400 })
    }

    const p = await cargarProyecto(id)
    if (!p) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const todas: Firmas = { ...(p.firmas ?? {}) }
    const previo = todas[cual]
    if (!previo) return NextResponse.json({ ok: true })

    const quedan = previo.firmas.filter((f) => f.rol !== rol)
    if (quedan.length === 0) {
        delete todas[cual]
    } else {
        todas[cual] = { ...previo, firmas: quedan }
    }

    if (!(await guardarEnProyecto(id, { firmas: todas }))) {
        return NextResponse.json({ error: 'No se ha podido quitar.' }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
}
