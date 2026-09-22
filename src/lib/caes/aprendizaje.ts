import type { Extraccion, ValorCampo } from '@/lib/caes/extraction'

/**
 * Quello che il sistema impara mentre si lavora.
 *
 * Due cose, diverse ma con la stessa idea sotto: **non buttare via
 * quello che una persona ha appena verificato.**
 *
 *   1. Se il lettore automatico ha indovinato o no, campo per campo.
 *   2. Che SCOP ha quel modello di macchina.
 *
 * Nessuna delle due si puo recuperare dopo. I dati che non si salvano
 * oggi non ci sono domani, e il valore di tutte e due arriva col tempo:
 * cominciare tardi vuol dire cominciare da zero.
 */

/* ------------------------------------------------- cosa ha indovinato */

/**
 * I campi che portano dati personali.
 *
 * Di questi si registra SE la lettura era giusta, non cosa diceva. Per
 * misurare l'accuratezza basta sapere che coincideva; salvare il NIF
 * anche qui vorrebbe dire tenerlo in due posti invece che in uno, e
 * ogni copia di un dato personale e una copia da proteggere.
 */
const PERSONALES = new Set([
    'nombre_cliente',
    'nombre_cliente_dni',
    'nif_cliente',
    'nif_cliente_dni',
    'telefono_cliente',
    'email_cliente',
    'direccion_actuacion',
    'direccion_titularidad',
    'cp',
    'nif_instalador',
])

export type Lectura = {
    proyecto_id: string
    documento: string
    campo: string
    confianza: number | null
    /** L'umano ha dato per buono quello che c'era scritto? */
    coincide: boolean
    valor_leido: string | null
    valor_final: string | null
    lector: string | null
    modelo: string | null
}

const decidido = (v?: ValorCampo) =>
    v?.estado === 'confirmado' || v?.estado === 'corregido'

/** Stesso valore a meno di spazi e maiuscole. */
function igual(a: unknown, b: unknown): boolean {
    const n = (v: unknown) => String(v ?? '').trim().toLowerCase()
    return n(a) === n(b)
}

/**
 * Le decisioni prese in questo salvataggio, e nessun'altra.
 *
 * Si guarda il prima e il dopo: interessa solo chi e passato da «non
 * deciso» a «confermato» o «corretto» adesso. Rileggere un fascicolo
 * gia rivisto non deve riscrivere le stesse righe, se no il conto
 * dell'accuratezza pesa due volte la stessa persona.
 */
export function lecturasNuevas(
    antes: Extraccion | null | undefined,
    despues: Extraccion | null | undefined,
    ctx: { proyectoId: string; documentoDe: (campo: string) => string; lector?: string | null; modelo?: string | null }
): Lectura[] {
    if (!despues) return []
    const fuera: Lectura[] = []

    for (const [campo, ahora] of Object.entries(despues)) {
        if (!ahora || !decidido(ahora)) continue
        if (decidido(antes?.[campo])) continue // gia contata prima

        // Senza una lettura del modello non c'e niente da misurare: il
        // dato l'ha messo una persona da zero, e non dice se il lettore
        // funziona.
        const leido = ahora.leido
        if (leido === undefined || leido === null || leido === '') continue

        const coincide = igual(leido, ahora.valor)
        const personal = PERSONALES.has(campo)

        fuera.push({
            proyecto_id: ctx.proyectoId,
            documento: ctx.documentoDe(campo),
            campo,
            confianza: typeof ahora.confianza === 'number' ? ahora.confianza : null,
            coincide,
            valor_leido: personal ? null : String(leido).slice(0, 200),
            valor_final: personal ? null : String(ahora.valor ?? '').slice(0, 200),
            lector: ctx.lector ?? null,
            modelo: ctx.modelo ?? null,
        })
    }

    return fuera
}

/* ------------------------------------------------- il catalogo macchine */

/**
 * Marca e modello scritti sempre nello stesso modo.
 *
 * Senza questo «DAIKIN», «Daikin» e «Daikin » sono tre macchine
 * diverse, e il catalogo non impara niente: ogni fascicolo ne crea una
 * nuova.
 */
export function normalizar(v: unknown): string {
    return String(v ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toUpperCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
}

export type Equipo = {
    marca: string
    modelo: string
    scop: number | null
    scop_acs: number | null
    potencia_kw: number | null
}

const numero = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null
    const n = Number(String(v).replace(',', '.'))
    return Number.isFinite(n) ? n : null
}

/**
 * La scheda di macchina che esce da questo fascicolo, se ne esce una.
 *
 * Solo da valori **confermati**: il catalogo si usera per non rileggere
 * la scheda tecnica di nessuno, quindi quello che ci entra deve essere
 * roba che una persona ha guardato. Un catalogo costruito su letture
 * automatiche non verificate propaga l'errore invece di risparmiare
 * lavoro.
 */
export function equipoDe(e: Extraccion | null | undefined): Equipo | null {
    if (!e) return null
    if (!decidido(e.marca) || !decidido(e.modelo)) return null

    const marca = normalizar(e.marca?.valor)
    const modelo = normalizar(e.modelo?.valor)
    if (!marca || !modelo) return null

    const dato = (id: string) =>
        decidido(e[id]) ? numero(e[id]?.valor) : null

    const scop = dato('scop')
    const scop_acs = dato('scop_acs')
    const potencia_kw = dato('potencia_kw')

    // Senza nessuno dei tre non c'e niente da ricordare: marca e
    // modello da soli non fanno risparmiare una lettura.
    if (scop === null && scop_acs === null && potencia_kw === null) return null

    return { marca, modelo, scop, scop_acs, potencia_kw }
}
