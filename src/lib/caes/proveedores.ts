/**
 * I sujetos delegados con cui l'agenzia lavora.
 *
 * ── PERCHÉ È UN ELENCO E NON UNA COSTANTE ─────────────────────────────
 *
 * Il Convenio CAE è un contratto fra il cliente e il CESIONARIO, cioè il
 * soggetto delegato accreditato presso il MITECO. Fino a ieri quel
 * soggetto era scritto dentro il testo del modello — nome, NIF, codice
 * di accreditamento, rappresentante — come se fosse sempre lo stesso.
 *
 * Non lo è. Bettergy è uno dei possibili, e il prezzo al MWh cambia con
 * il contratto che si ha con ciascuno. Quindi non cambia solo la cifra:
 * cambia la controparte del contratto, il suo NIF, il suo codice SD e
 * chi lo firma. Un Convenio con il nome di un soggetto e il codice di un
 * altro non è un documento con un errore, è un documento che non vale.
 *
 * ── PERCHÉ STA NEL CODICE E NON IN UNA TABELLA ────────────────────────
 *
 * Sono identità giuridiche: ragione sociale, NIF, codice di
 * accreditamento ministeriale. Cambiano raramente e un errore qui
 * invalida dei contratti. Starci dentro al codice vuol dire che una
 * modifica passa da una revisione e resta nella storia di git, invece di
 * essere una cella cambiata di fretta in un pannello.
 *
 * Il PREZZO è un'altra cosa: si negozia e si muove. Sta qui come valore
 * predefinito del soggetto, ma ogni espediente può portarne uno suo —
 * vale quello scritto sul contratto firmato quel giorno, non quello di
 * oggi.
 */

export type Proveedor = {
    id: string
    /** Come compare nell'elenco a tendina. */
    etiqueta: string

    razon: string
    nif: string
    /** Il codice con cui il MITECO lo ha accreditato come soggetto delegato. */
    codigoSD: string

    representante: string
    dni: string
    cargo: string

    domicilio: string
    /** La città in cui si firma. Separata dal domicilio: ricavarla
     *  tagliando la stringa dell'indirizzo funziona finché qualcuno non
     *  scrive una virgola in più. */
    localidad: string
    telefono: string
    email: string

    /** €/MWh predefiniti per questo soggetto. Il mercato sta fra 85 e 155. */
    tarifaEurMwh: number
}

export const PROVEEDORES: Proveedor[] = [
    {
        id: 'bettergy',
        etiqueta: 'Bettergy, S.L.',
        razon: 'BETTERGY, S.L.',
        nif: 'B93149870',
        codigoSD: 'SD-B93149870',
        representante: 'Antonio José Ruiz López',
        dni: '44584446G',
        cargo: 'Administrador Solidario',
        domicilio: 'Avenida Juan López Peñalver, 17, C.P. 29590-Málaga',
        localidad: 'Málaga',
        telefono: '952025789',
        email: 'cae@bettergy.es',
        // ⚠️ DA CONFERMARE: 130 €/MWh è quello che gira oggi nel
        // simulatore. Va messo quello del contratto vero, perché da qui
        // esce la clausola della contraprestazione del Convenio.
        tarifaEurMwh: 130,
    },
]

export const PROVEEDOR_DEFECTO = 'bettergy'

/**
 * Il soggetto di un espediente.
 *
 * Non restituisce mai `undefined`: un documento senza cesionario non si
 * può nemmeno impaginare, quindi in mancanza si torna a quello
 * predefinito e chi rivede lo vede scritto nell'elenco a tendina.
 */
export function proveedor(id?: string | null): Proveedor {
    return (
        PROVEEDORES.find((p) => p.id === id) ??
        PROVEEDORES.find((p) => p.id === PROVEEDOR_DEFECTO) ??
        PROVEEDORES[0]
    )
}

/**
 * La tariffa che vale per un espediente, in €/MWh.
 *
 * L'ordine conta: prima quella scritta sull'espediente, poi quella del
 * soggetto. Quella dell'espediente è il prezzo pattuito quel giorno, ed
 * è quello che il cliente ha firmato.
 */
export function tarifaDe(p: { proveedor?: string | null; tarifa_eur_mwh?: number | null }): number {
    if (typeof p.tarifa_eur_mwh === 'number' && p.tarifa_eur_mwh > 0) {
        return p.tarifa_eur_mwh
    }
    return proveedor(p.proveedor).tarifaEurMwh
}
