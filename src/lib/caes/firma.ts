import { createHash } from 'node:crypto'
import { componer, type FirmaGrafica, type Prueba } from './pdf'
import type { Datos, Plantilla } from './plantillas'

/**
 * Firmare senza pagare nessuno.
 *
 * ── L'IDEA ────────────────────────────────────────────────────────────
 *
 * Una firma elettronica per un Convenio CAE non ha bisogno di un
 * certificato qualificato: ha bisogno di essere DIMOSTRABILE. Cioè di
 * poter rispondere, un anno dopo, a tre domande: chi ha firmato, cosa
 * esattamente ha firmato, e come si sa che quel foglio non è cambiato
 * da allora.
 *
 * Le piattaforme a abbonamento rispondono a quelle tre domande e si
 * fanno pagare per il fatto di conservarne la traccia. La traccia però è
 * questa: un'impronta, un nome, un'ora, un indirizzo. Sta in quattro
 * campi.
 *
 * ── COSA È E COSA NON È ───────────────────────────────────────────────
 *
 * È una firma elettronica SEMPLICE (eIDAS art. 3.10). Non è avanzata,
 * non è qualificata, e il documento lo dice a chiare lettere nella
 * pagina di prova invece di lasciarlo capire. Ammissibile come prova:
 * l'art. 25.1 vieta di negarle efficacia solo perché è elettronica. Ma
 * di fronte a una contestazione vale quanto vale la traccia, e per
 * questo la traccia è tutta stampata sul documento.
 *
 * ⚠️ Va confermato con il soggetto delegato quale tipo di firma accetta
 * per il Convenio. Questa è una domanda per Bettergy, non per il codice.
 *
 * ── PERCHÉ IL DOCUMENTO SI CONGELA ────────────────────────────────────
 *
 * Perché «ha firmato questo» deve voler dire qualcosa. Alla prima firma
 * si fissa un istante, e da lì in poi il PDF si ricompone SEMPRE con
 * quell'istante nei metadati: stessi dati, stesse firme, stessi identici
 * byte.
 *
 * Che è una proprietà con due facce, e sono tutte e due quello che
 * serve:
 *
 *   · il documento firmato si può ricalcolare e verificare quando si
 *     vuole, senza conservare il file
 *   · se qualcuno cambia un dato del fascicolo dopo la firma, il
 *     documento smette di riprodurre la sua impronta — e si vede
 */

export type Metodo = 'trazo' | 'escrito' | 'guardada'

export type Firma = {
    /** Chi firma, nei termini del documento: «El Cedente», «El Cesionario». */
    rol: string
    nombre: string
    metodo: Metodo
    /** Il tratto, PNG in base64 senza l'intestazione `data:`. */
    png: string
    /** ISO, in UTC. */
    fecha: string
    /**
     * Da dove.
     *
     * Sono dati personali e si conservano apposta: senza, «chi ha
     * firmato» resta una affermazione senza niente sotto. È la stessa
     * ragione per cui le conserva chiunque faccia firmare.
     */
    ip?: string
    agente?: string
}

export type RegistroFirma = {
    /** L'istante della prima firma: da lì il documento non si muove più. */
    congelado: string
    /** SHA-256 del documento come si presentava alla firma. */
    huella: string
    firmas: Firma[]
}

/** Per plantilla: `convenio`, `res060`, `anexo1`. */
export type Firmas = Record<string, RegistroFirma>

export function huella(bytes: Uint8Array): string {
    return createHash('sha256').update(bytes).digest('hex')
}

/**
 * Il documento com'è quando glielo mettiamo davanti.
 *
 * Senza firme e senza pagina di prova: è quello di cui si prende
 * l'impronta, perché è quello che il firmante ha letto. Metterci dentro
 * la prova della propria firma sarebbe un serpente che si morde la coda.
 */
export async function presentado(
    plantilla: Plantilla,
    datos: Datos,
    expediente: string,
    congelado: string
): Promise<Uint8Array> {
    const hecho = await componer(plantilla, datos, {
        expediente,
        fecha: new Date(congelado),
    })
    return hecho.bytes
}

/** Lo stesso documento con i tratti addosso e la prova in fondo. */
export async function firmado(
    plantilla: Plantilla,
    datos: Datos,
    expediente: string,
    registro: RegistroFirma
): Promise<Uint8Array> {
    const graficas: Record<string, FirmaGrafica> = {}
    for (const f of registro.firmas) {
        graficas[f.rol] = {
            png: f.png,
            nombre: f.nombre,
            fecha: enPalabras(f.fecha),
        }
    }

    const hecho = await componer(plantilla, datos, {
        expediente,
        fecha: new Date(registro.congelado),
        firmas: graficas,
        prueba: pruebaDe(registro),
    })
    return hecho.bytes
}

function pruebaDe(registro: RegistroFirma): Prueba {
    return {
        huella: registro.huella,
        firmantes: registro.firmas.map((f) => ({
            rol: f.rol,
            nombre: f.nombre,
            metodo: f.metodo,
            cuando: enPalabras(f.fecha),
            ip: f.ip,
            agente: f.agente,
        })),
    }
}

/**
 * L'ora come la legge una persona, nel fuso in cui si è firmato.
 *
 * In UTC nel database perché è l'unico modo di ordinarle; in ora di
 * Madrid sul foglio perché «14:32 CEST» è un'ora che il firmante
 * riconosce e «12:32Z» è un'ora che nessuno ha vissuto.
 */
export function enPalabras(iso: string): string {
    try {
        return new Intl.DateTimeFormat('es-ES', {
            dateStyle: 'long',
            timeStyle: 'long',
            timeZone: 'Europe/Madrid',
        }).format(new Date(iso))
    } catch {
        return iso
    }
}

/**
 * Il navigatore in una riga corta.
 *
 * Una stringa di agente intera è lunga il doppio della pagina e non dice
 * niente di più: quello che serve alla prova è «da un telefono Android
 * con Chrome», non l'elenco dei motori di rendering che quel browser
 * finge di essere.
 */
export function agenteCorto(ua: string | null): string | undefined {
    if (!ua) return undefined

    const sistema = /iPhone|iPad/i.test(ua)
        ? 'iOS'
        : /Android/i.test(ua)
          ? 'Android'
          : /Mac OS X/i.test(ua)
            ? 'macOS'
            : /Windows/i.test(ua)
              ? 'Windows'
              : /Linux/i.test(ua)
                ? 'Linux'
                : 'desconocido'

    // L'ordine conta: Edge dice di essere Chrome, e Chrome dice di essere
    // Safari. Il primo che risponde è quello vero.
    const navegador = /Edg\//i.test(ua)
        ? 'Edge'
        : /OPR\//i.test(ua)
          ? 'Opera'
          : /Firefox\//i.test(ua)
            ? 'Firefox'
            : /Chrome\//i.test(ua)
              ? 'Chrome'
              : /Safari\//i.test(ua)
                ? 'Safari'
                : 'desconocido'

    // «desconocido · desconocido» non è una prova: è una riga in più
    // nel registro che dice di non sapere niente. Meglio non stamparla.
    if (navegador === 'desconocido' && sistema === 'desconocido') return undefined
    return `${navegador} · ${sistema}`
}

/**
 * Il tratto, controllato prima di conservarlo.
 *
 * È un'immagine che arriva da fuori e che finirà dentro un PDF: senza
 * controllo, «png» può essere un file di dieci megabyte o non essere un
 * PNG. Si guardano gli otto byte d'intestazione, che è il modo in cui un
 * PNG dice di esserlo, e non la parola dopo `data:` — quella la scrive
 * chi manda.
 */
const CABECERA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const MAX_TRAZO = 400 * 1024

export function trazoValido(base64: string): boolean {
    const limpio = base64.replace(/^data:image\/png;base64,/, '')
    if (!limpio || limpio.length > MAX_TRAZO) return false
    try {
        const bytes = Buffer.from(limpio, 'base64')
        if (bytes.length < 16) return false
        return CABECERA_PNG.every((b, i) => bytes[i] === b)
    } catch {
        return false
    }
}

export function sinCabecera(base64: string): string {
    return base64.replace(/^data:image\/png;base64,/, '')
}
