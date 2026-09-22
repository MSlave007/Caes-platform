import { senales, type Extraccion } from '@/lib/caes/extraction'
import { DOCUMENTS } from '@/lib/documents'
import { CAJON } from '@/lib/caes/clasificar'
import type { Project } from '@/lib/mockDb'

/**
 * Quanto lavoro chiede questo fascicolo, prima di aprirlo.
 *
 * ── PERCHÉ NON BASTA L'ORDINE DI ARRIVO ───────────────────────────────
 *
 * La coda è cronologica, e la cronologia non dice niente su quanto
 * costerà un fascicolo. Alcuni sono puliti — tutte le carte, niente che
 * si contraddice, letture sicure — e si chiudono in due minuti. Altri
 * hanno un NIF che non torna, e vogliono mezz'ora.
 *
 * Mescolati, il costo è quello del peggiore: chi rivede apre a caso e
 * non sa mai se sta per perdere due minuti o trenta. Separati, i puliti
 * si chiudono di fila e il tempo vero va dove serve.
 *
 * ── LE TRE SITUAZIONI ─────────────────────────────────────────────────
 *
 *   parado   mancano documenti obbligatori. Non è lavoro di revisione,
 *            è lavoro di sollecito: non si può approvare comunque.
 *   mirar    c'è qualcosa che non torna, o letture poco sicure.
 *   limpio   niente di sospeso. Resta da guardare — vedi sotto.
 *
 * ── «LIMPIO» NON VUOL DIRE «APPROVATO DA SOLO» ────────────────────────
 *
 * La firma di chi rivede ha peso legale: attesta che la documentazione
 * regge la richiesta di CAE. Approvare in automatico vorrebbe dire che
 * nessuno ha guardato, e il giorno di un controllo la differenza si
 * vede. Qui si dice «sembra a posto, guarda e conferma», che alla stessa
 * velocità lascia la responsabilità a una persona.
 */

/** Sotto questa confidenza, una lettura va guardata. La stessa soglia della revisione. */
export const CONFIANZA_MINIMA = 0.8

export type Nivel = 'parado' | 'mirar' | 'limpio'

export type Riesgo = {
    nivel: Nivel
    /** Perché, in una riga ciascuno. Si mostrano, non si contano. */
    motivos: string[]
    /** Allarmi accesi, che è il motivo più serio di tutti. */
    alarmas: number
    /** Documenti obbligatori che non sono arrivati. */
    faltanDocs: number
    /** Letture sotto la soglia. */
    dudosos: number
    /**
     * File che il lettore non ha saputo collocare.
     *
     * Sono finiti in «Otras fotos o documentos» perché il modello non
     * era sicuro — e fa bene a non indovinare. Ma qualcuno deve
     * spostarli, e finora nessuno lo veniva a sapere.
     */
    sinColocar: number
}

/**
 * Quali documenti sono obbligatori dipende da chi apre il fascicolo:
 * l'installatore porta le carte dell'opera, il cliente che arriva dal
 * calcolatore ne porta molte meno.
 */
function obligatoriosDe(source: Project['source']): string[] {
    const lista = DOCUMENTS[source] ?? DOCUMENTS.installer
    return lista.filter((d) => d.required).map((d) => d.id)
}

export function riesgoDe(p: Project): Riesgo {
    const extraccion = (p.extraccion ?? {}) as Extraccion

    const alarmas = senales(extraccion).filter((s) => s.estado === 'alarma').length

    const aportados = new Set((p.docs ?? []).map((d) => d.id))
    const faltanDocs = obligatoriosDe(p.source).filter((id) => !aportados.has(id)).length

    const dudosos = Object.values(extraccion).filter(
        (v) =>
            v &&
            v.estado !== 'confirmado' &&
            v.estado !== 'corregido' &&
            typeof v.confianza === 'number' &&
            v.confianza < CONFIANZA_MINIMA
    ).length

    /**
     * Quello che il lettore ha messo nel cassetto senza esserne sicuro.
     *
     * `auto` distingue chi l'ha messo lì: un file che una persona ha
     * caricato apposta in «otras» è a posto dov'è, uno smistato dal
     * modello con poca confidenza è una domanda in attesa di risposta.
     */
    const sinColocar = (p.docs ?? []).filter(
        (d) => d.auto && d.id === CAJON
    ).length

    const motivos: string[] = []
    if (faltanDocs > 0) {
        motivos.push(
            `${faltanDocs} ${faltanDocs === 1 ? 'documento obligatorio' : 'documentos obligatorios'} sin aportar`
        )
    }
    if (alarmas > 0) {
        motivos.push(
            `${alarmas} ${alarmas === 1 ? 'comprobación no cuadra' : 'comprobaciones no cuadran'}`
        )
    }
    if (dudosos > 0) {
        motivos.push(
            `${dudosos} ${dudosos === 1 ? 'lectura poco segura' : 'lecturas poco seguras'}`
        )
    }
    if (sinColocar > 0) {
        motivos.push(
            `${sinColocar} ${sinColocar === 1 ? 'archivo sin colocar' : 'archivos sin colocar'}`
        )
    }

    // L'ordine conta: «mancano carte» batte «c'e un allarme», perche nel
    // primo caso non si puo fare niente comunque, e aprire il fascicolo
    // e tempo buttato.
    const nivel: Nivel =
        faltanDocs > 0
            ? 'parado'
            : alarmas > 0 || dudosos > 0 || sinColocar > 0
              ? 'mirar'
              : 'limpio'

    return { nivel, motivos, alarmas, faltanDocs, dudosos, sinColocar }
}

/** Quanto pesa, per ordinare dentro lo stesso livello. */
function peso(r: Riesgo): number {
    return r.alarmas * 10 + r.dudosos + r.sinColocar
}

const ORDEN: Record<Nivel, number> = { limpio: 0, mirar: 1, parado: 2 }

/**
 * La coda, riordinata.
 *
 * I puliti davanti — non perché contino di più, ma perché si chiudono
 * di fila e liberano la testa per gli altri. Poi quelli da guardare, dal
 * più carico. In fondo quelli fermi per carte che mancano, che non sono
 * lavoro di revisione.
 */
export function ordenarPorRiesgo<T extends Project>(
    proyectos: T[]
): { proyecto: T; riesgo: Riesgo }[] {
    return proyectos
        .map((proyecto) => ({ proyecto, riesgo: riesgoDe(proyecto) }))
        .sort((a, b) => {
            if (ORDEN[a.riesgo.nivel] !== ORDEN[b.riesgo.nivel]) {
                return ORDEN[a.riesgo.nivel] - ORDEN[b.riesgo.nivel]
            }
            if (peso(a.riesgo) !== peso(b.riesgo)) {
                return peso(b.riesgo) - peso(a.riesgo)
            }
            // A parità di tutto, il più vecchio: qualcuno aspetta da più
            // tempo, ed è l'unica cosa che resta da dire.
            return (a.proyecto.created_at ?? '').localeCompare(
                b.proyecto.created_at ?? ''
            )
        })
}
