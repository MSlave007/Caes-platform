import { NextResponse } from 'next/server'
import { negado, quienLlama } from '@/lib/auth/guard'
import { dentroDelLimite, quienCuenta, demasiadas } from '@/lib/auth/ritmo'
import {
    desdeCodigoPostal,
    husoDeLongitud,
    limpiarRC,
    rcDeInmueble,
    type Localizacion,
} from '@/lib/caes/catastro'

/**
 * La consulta al Catastro, dalla referencia catastral.
 *
 * ── COSA RISOLVE ──────────────────────────────────────────────────────
 *
 * Cinque dei sette buchi del Convenio — referencia, coordinate UTM,
 * huso, località e provincia — si cercano oggi a mano sul portale, per
 * ogni espediente, in un'altra finestra. Il sesto e il settimo
 * (provincia e comunità) escono dal codice postale, che arriva anche
 * lui da questa consulta.
 *
 * ── PERCHÉ DALLA REFERENCIA E NON DALL'INDIRIZZO ──────────────────────
 *
 * Perché dall'indirizzo non è affidabile. Il servizio vuole provincia,
 * comune, sigla della via, nome esatto e numero, e quello che arriva
 * dalla fattura è testo libero: «Av. de la Palmera 22, Sevilla».
 * Provato: risponde «NO EXISTE NINGÚN INMUEBLE» anche per indirizzi che
 * esistono, perché la sigla o il nome non coincidono con come li scrive
 * il Catastro. Un aiuto che sbaglia una volta su tre non si usa.
 *
 * Dalla referencia è esatto e non ha casi limite. E la referencia il
 * cliente ce l'ha: sta sulla ricevuta dell'IBI, sulla scrittura e sul
 * **certificato energetico**, che è un documento che il fascicolo
 * chiede già.
 *
 * ── TRE CHIAMATE, E IL MOTIVO DI OGNUNA ───────────────────────────────
 *
 *   1. i dati dell'immobile   provincia e comune, separati
 *   2. le coordinate in gradi per sapere la longitudine
 *   3. le coordinate in UTM    nel huso che esce dalla longitudine
 *
 * La Spagna sta su cinque husi. Darlo sbagliato non rompe niente a
 * vedersi e indica un posto a centinaia di chilometri — e il huso è un
 * campo del Convenio, non una nota interna. Si potrebbe dedurre dalla
 * provincia, ma ai confini una tabella sbaglia in silenzio, che è il
 * modo peggiore di sbagliare.
 */

const COORD =
    'https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_CPMRC'
const DATOS =
    'https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json/Consulta_DNPRC'

/** Il servizio delle coordinate risponde in XML, e per tre valori non serve un parser. */
function entre(xml: string, etiqueta: string): string | null {
    const m = xml.match(new RegExp(`<${etiqueta}>([^<]*)</${etiqueta}>`))
    return m ? m[1].trim() : null
}

/**
 * Il Catastro non è nostro e a volte è lento.
 *
 * ── PERCHÉ È UNA FUNZIONE E NON UNA COSTANTE ──────────────────────────
 *
 * Perché `AbortSignal.timeout()` è a scatto singolo: il conto alla
 * rovescia parte quando si crea il segnale, non quando si usa. Scritto
 * come costante di modulo funzionava una volta — quella subito dopo il
 * caricamento — e da lì in poi ogni chiamata nasceva con un segnale già
 * annullato e falliva in un decimo di secondo, dicendo «il Catastro non
 * ha risposto in tempo» mentre il Catastro rispondeva benissimo.
 *
 * Preso davvero, e il sintomo indicava esattamente dalla parte
 * sbagliata.
 */
const conPrisa = (): RequestInit => ({
    headers: { 'User-Agent': 'CAES Platform' },
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
})

async function coordenadas(rc: string, srs: string): Promise<string> {
    const url = `${COORD}?Provincia=&Municipio=&SRS=${encodeURIComponent(srs)}&RC=${encodeURIComponent(rc)}`
    return (await fetch(url, conPrisa())).text()
}

type Inmueble = { provincia: string | null; municipio: string | null; ldt: string | null }

async function inmueble(rcCompleta: string): Promise<Inmueble | { error: string }> {
    const url = `${DATOS}?Provincia=&Municipio=&RefCat=${encodeURIComponent(rcCompleta)}`
    const res = await fetch(url, conPrisa())
    const j = (await res.json()) as {
        consulta_dnprcResult?: {
            lerr?: { des: string }[]
            bico?: { bi?: { dt?: { np?: string; nm?: string }; ldt?: string } }
            // Con una referencia di 14 cifre l'immobile può essere più di
            // uno — un edificio con dieci appartamenti. I dati che ci
            // servono (comune, provincia) sono gli stessi per tutti.
            lrcdnp?: { rcdnp?: { dt?: { np?: string; nm?: string } }[] }
        }
    }
    const r = j.consulta_dnprcResult
    if (!r) return { error: 'El Catastro ha contestado algo que no entendemos.' }
    if (r.lerr?.length) return { error: r.lerr[0].des }

    const bi = r.bico?.bi
    if (bi) {
        return {
            provincia: bi.dt?.np ?? null,
            municipio: bi.dt?.nm ?? null,
            ldt: bi.ldt ?? null,
        }
    }
    const primero = r.lrcdnp?.rcdnp?.[0]?.dt
    return {
        provincia: primero?.np ?? null,
        municipio: primero?.nm ?? null,
        ldt: null,
    }
}

export async function GET(request: Request) {
    const quien = await quienLlama()
    if (!quien) return negado()

    // È un servizio pubblico di un'amministrazione: non si martella.
    const LIMITE = { cuantas: 30, segundos: 300 }
    if (!dentroDelLimite(quienCuenta(request, quien.userId), LIMITE)) {
        return demasiadas(LIMITE.segundos)
    }

    const url = new URL(request.url)
    const completa = limpiarRC(url.searchParams.get('rc'))
    const rc = rcDeInmueble(completa)
    if (!rc) {
        return NextResponse.json(
            {
                error: 'La referencia catastral tiene que tener al menos 14 caracteres. Está en el recibo del IBI y en el certificado energético.',
            },
            { status: 400 }
        )
    }

    try {
        // 1 e 2 insieme: non dipendono l'una dall'altra, e aspettarle in
        // fila raddoppierebbe l'attesa di chi sta rivedendo.
        const [datos, geo] = await Promise.all([
            inmueble(completa),
            coordenadas(rc, 'EPSG:4326'),
        ])

        const err = entre(geo, 'des')
        if (err) {
            // L'errore del Catastro si gira così com'è: è più preciso di
            // qualunque riscrittura, e chi rivede lo riconosce dal
            // portale.
            return NextResponse.json({ error: err, delCatastro: true }, { status: 404 })
        }

        const lon = Number(entre(geo, 'xcen'))
        if (!Number.isFinite(lon)) {
            return NextResponse.json(
                { error: 'El Catastro ha contestado algo que no entendemos.' },
                { status: 502 }
            )
        }

        // 3. e adesso nel sistema che chiede el Convenio
        const huso = husoDeLongitud(lon)
        const utm = await coordenadas(rc, `EPSG:258${huso}`)
        const x = entre(utm, 'xcen')
        const y = entre(utm, 'ycen')
        if (!x || !y) {
            return NextResponse.json(
                { error: 'El Catastro no ha dado las coordenadas UTM.' },
                { status: 502 }
            )
        }

        const inm = 'error' in datos ? null : datos
        // Il codice postale sta dentro la riga dell'indirizzo ufficiale;
        // da lì esce la comunità autonoma senza chiedere niente a nessuno.
        const porCP = desdeCodigoPostal(inm?.ldt ?? url.searchParams.get('cp'))

        const localizacion: Localizacion = {
            ref_catastral: completa || rc,
            utm_huso: String(huso),
            utm_x: x,
            utm_y: y,
            localidad: inm?.municipio ?? null,
            provincia: inm?.provincia ?? porCP?.provincia ?? null,
            ccaa: porCP?.ccaa ?? null,
            direccion: inm?.ldt ?? entre(utm, 'ldt'),
        }

        return NextResponse.json({ data: localizacion })
    } catch (e) {
        const esTiempo = e instanceof Error && e.name === 'TimeoutError'
        return NextResponse.json(
            {
                error: esTiempo
                    ? 'El Catastro no ha contestado a tiempo. Vuelve a probar en un momento.'
                    : 'No se ha podido consultar el Catastro.',
            },
            { status: 504 }
        )
    }
}
