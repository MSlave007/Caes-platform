import { estado } from '@/lib/caes/status'
import type { Extraccion } from '@/lib/caes/extraction'
import type { Project } from '@/lib/mockDb'

/**
 * Quanto tempo è passato da quando l'opera è finita.
 *
 * ── PERCHÉ NESSUN ALTRO PUÒ SAPERLO ───────────────────────────────────
 *
 * L'installatore la data di fine lavori non ce l'ha in testa: sta sul
 * RITE, dentro un fascicolo fra i suoi quaranta. Il cliente non sa
 * nemmeno che esista un termine. L'unico posto dove quella data e
 * l'oggi stanno insieme è qui.
 *
 * Un'opera finita da molto e ancora non presentata sono soldi che stanno
 * per evaporare, e se ne accorge nessuno finché non è tardi.
 *
 * ── PERCHÉ IL TERMINE NON È SCRITTO NEL CODICE ────────────────────────
 *
 * Perché non lo so con certezza, e un numero inventato messo dentro un
 * motore di calcolo diventa il numero che tutti citano. Lo fissa
 * l'agenzia negli ajustes: finché la casella è vuota il sistema mostra
 * **l'età dell'opera senza dare un verdetto**, che è già molto più di
 * quello che c'è oggi.
 *
 * Meglio una casella vuota che una scadenza sbagliata scritta con
 * sicurezza.
 */

const DIA = 86_400_000

/** La data di fine lavori, se qualcuno l'ha confermata guardando il RITE. */
export function finDeObra(p: Project): string | null {
    const e = (p.extraccion ?? {}) as Extraccion
    const v = e.fecha_fin_obra
    if (!v) return null
    // Solo confermata: una data letta dal modello e non ancora guardata
    // non è una base per dire a qualcuno che sta per perdere dei soldi.
    if (v.estado !== 'confirmado' && v.estado !== 'corregido') return null
    const texto = String(v.valor ?? '').trim()
    return texto || null
}

export type Reloj = {
    /** Giorni da quando l'opera è finita. */
    dias: number
    /** Mesi, arrotondati, per dirlo a voce. */
    meses: number
    /**
     * Quanto manca, in giorni, quando l'agenzia ha fissato un termine.
     * Negativo vuol dire che è passato.
     */
    quedan: number | null
    /** Vero quando il termine c'è ed è già passato. */
    vencido: boolean
    /** Vero quando manca meno di due mesi. Prima è presto per allarmare. */
    cerca: boolean
}

/**
 * `ahora` arriva da fuori: leggere l'orologio dentro il calcolo lo
 * renderebbe impuro, e farebbe ballare i «giorni fa» fra server e
 * browser.
 */
export function relojDe(
    p: Project,
    ahora: number,
    mesesLimite: number | null | undefined
): Reloj | null {
    const fin = finDeObra(p)
    if (!fin) return null

    const t = Date.parse(fin)
    if (Number.isNaN(t)) return null

    // Una data futura non è un ritardo: è un errore di trascrizione, e
    // ha già il suo controllo fra i confronti automatici.
    if (t > ahora) return null

    const dias = Math.floor((ahora - t) / DIA)
    const meses = Math.round(dias / 30.44)

    if (!mesesLimite || mesesLimite <= 0) {
        return { dias, meses, quedan: null, vencido: false, cerca: false }
    }

    const limite = t + mesesLimite * 30.44 * DIA
    const quedan = Math.floor((limite - ahora) / DIA)
    return {
        dias,
        meses,
        quedan,
        vencido: quedan < 0,
        cerca: quedan >= 0 && quedan <= 60,
    }
}

/**
 * Gli espedienti a cui l'orologio conta contro davvero.
 *
 * Solo quelli ancora aperti: su uno già pagato o rifiutato il tempo non
 * corre più, e metterli nell'elenco vorrebbe dire una lista che non si
 * svuota mai — cioè una lista che si smette di guardare.
 */
export function corriendo(p: Project): boolean {
    const e = estado(p.status)
    return !e.terminal && p.status !== 'paid'
}
