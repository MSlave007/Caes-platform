/**
 * Dalla revisione alla rubrica: i contatti del cliente si riempiono da soli.
 *
 * ── IL PROBLEMA ───────────────────────────────────────────────────────
 *
 * Su `/installer/clientes` la maggior parte delle schede diceva «Sin
 * datos de contacto». Schede senza telefono e senza email: una rubrica
 * da cui non si può chiamare nessuno, cioè non una rubrica.
 *
 * Eppure il dato c'è. **La fattura è intestata**: nome, NIF, indirizzo
 * e quasi sempre il telefono stanno lì, scritti da chi l'ha emessa. Il
 * lettore automatico li tira fuori e chi rivede li conferma guardando
 * il documento.
 *
 * Restavano dentro l'espediente. Un dato verificato che non esce dalla
 * pratica in cui è stato verificato è un dato che qualcuno ribatterà a
 * mano la prossima volta — e allora saranno due versioni dello stesso
 * telefono, e nessuno saprà quale è buona.
 *
 * ── LE DUE REGOLE ─────────────────────────────────────────────────────
 *
 * 1. **Solo quello che un umano ha guardato.** `confirmado` e
 *    `corregido` vogliono dire che chi rivede ha avuto il documento
 *    davanti. Quello che il modello ha letto e nessuno ha ancora
 *    controllato (`pendiente`) non entra in rubrica: la rubrica si
 *    usa per telefonare a delle persone.
 *
 * 2. **Non si sovrascrive mai.** Si riempiono solo i campi vuoti. Se
 *    l'installatore ha scritto un telefono, quello è il telefono che
 *    usa lui per chiamare quel cliente, e vale più di quello stampato
 *    su una fattura di otto mesi fa.
 */

// Il tipo e quello vero, non una copia: due definizioni della stessa
// cosa divergono, e quella sbagliata e sempre quella che nessuno
// aggiorna.
import type { Extraccion, ValorCampo } from '@/lib/caes/extraction'

export type { Extraccion }

/** I campi della scheda che si possono riempire da soli. */
export type ParcheFicha = {
    nif?: string
    telefono?: string
    email?: string
    direccion?: string
}

/**
 * Gli stati che vogliono dire «una persona lo ha guardato».
 *
 * `corregido` conta più di `confirmado`, non meno: vuol dire che il
 * modello aveva sbagliato e qualcuno ha scritto il valore giusto a mano.
 */
const MIRADOS = new Set(['confirmado', 'corregido'])

/** Da dove viene ogni campo della scheda. */
const DE_DONDE: Record<keyof ParcheFicha, string> = {
    nif: 'nif_cliente',
    telefono: 'telefono_cliente',
    email: 'email_cliente',
    direccion: 'direccion_actuacion',
}

function limpio(v: ValorCampo | undefined): string | null {
    if (!v || !MIRADOS.has(v.estado)) return null
    const texto = String(v.valor ?? '').trim()
    return texto || null
}

/**
 * Cosa si può aggiungere alla scheda, senza toccare quello che c'è già.
 *
 * Restituisce un oggetto vuoto quando non c'è niente da fare — e chi
 * chiama deve controllarlo, così non si scrive sul database per dire
 * zero cose.
 */
export function rellenarFicha(
    extraccion: Extraccion | null | undefined,
    ficha: Partial<Record<keyof ParcheFicha, string | null | undefined>>
): ParcheFicha {
    if (!extraccion) return {}

    const parche: ParcheFicha = {}
    for (const [campo, origen] of Object.entries(DE_DONDE) as [
        keyof ParcheFicha,
        string,
    ][]) {
        // Quello che c'è già vince sempre. Vedi la regola 2 in cima.
        if (String(ficha[campo] ?? '').trim()) continue
        const valor = limpio(extraccion[origen])
        if (valor) parche[campo] = valor.slice(0, 200)
    }
    return parche
}

/** Comodo per chi chiama: c'è qualcosa da scrivere? */
export function hayAlgoQueRellenar(parche: ParcheFicha): boolean {
    return Object.keys(parche).length > 0
}
