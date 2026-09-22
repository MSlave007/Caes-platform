import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { negado, soloAgencia } from '@/lib/auth/guard'
import { campo as definicionDe } from '@/lib/caes/extraction'

/**
 * Quanto ci prende il lettore automatico, campo per campo.
 *
 * ── PERCHÉ ESISTE QUESTA ROTTA ────────────────────────────────────────
 *
 * Perché altrimenti `lecturas` sarebbe una tabella che si scrive e non
 * si legge: dati raccolti a ogni revisione e guardati mai. Metà lavoro.
 *
 * ── PERCHÉ NON DÀ UNA PERCENTUALE SUBITO ──────────────────────────────
 *
 * Con tre letture, «67 % di precisione» non è un dato: è rumore con una
 * cifra decimale. Sotto un minimo si mostrano i conteggi grezzi e si
 * dice che sono pochi — che è la verità, e non induce nessuno a
 * cambiare una soglia per colpa di due casi sfortunati.
 */

/** Sotto questo numero di letture, una percentuale non vuol dire niente. */
export const MINIMO_PARA_PORCENTAJE = 20

export type ResumenCampo = {
    campo: string
    etiqueta: string
    /** Quante volte quel campo è stato deciso da una persona. */
    total: number
    /** Di quelle, quante volte il modello aveva già ragione. */
    aciertos: number
    /** `null` quando i casi sono troppo pochi per dire una percentuale. */
    precision: number | null
    /** Confidenza media dichiarata dal modello, per confrontarla col vero. */
    confianzaMedia: number | null
}

export async function GET() {
    // Materiale di qualità interna, e dice anche quali fascicoli hanno
    // avuto correzioni. Solo agenzia.
    const quien = await soloAgencia()
    if (!quien) return negado()

    if (!quien.userId) {
        return NextResponse.json({ data: [], total: 0, demo: true })
    }

    const supabase = await createClient()
    const { data, error } = await supabase
        .from('lecturas')
        .select('campo, coincide, confianza')
        // Un tetto: questa è una statistica, non un export. Con molte
        // righe si guarderanno le ultime, che sono anche le più utili —
        // dicono come va ADESSO, non com'è andata in un anno.
        .order('created_at', { ascending: false })
        .limit(5000)

    if (error) {
        // Tabella non ancora creata: non è un errore da mostrare.
        return NextResponse.json({ data: [], total: 0, disponible: false })
    }

    const porCampo = new Map<
        string,
        { total: number; aciertos: number; suma: number; conConfianza: number }
    >()

    for (const fila of data ?? []) {
        const c = porCampo.get(fila.campo) ?? {
            total: 0,
            aciertos: 0,
            suma: 0,
            conConfianza: 0,
        }
        c.total += 1
        if (fila.coincide) c.aciertos += 1
        if (typeof fila.confianza === 'number') {
            c.suma += fila.confianza
            c.conConfianza += 1
        }
        porCampo.set(fila.campo, c)
    }

    const resumen: ResumenCampo[] = [...porCampo.entries()].map(([campo, c]) => ({
        campo,
        etiqueta: definicionDe(campo)?.label ?? campo,
        total: c.total,
        aciertos: c.aciertos,
        precision:
            c.total >= MINIMO_PARA_PORCENTAJE
                ? Math.round((c.aciertos / c.total) * 1000) / 10
                : null,
        confianzaMedia:
            c.conConfianza > 0
                ? Math.round((c.suma / c.conConfianza) * 100) / 100
                : null,
    }))

    // I peggiori davanti: sono quelli su cui si può fare qualcosa. Un
    // campo che il modello prende sempre non chiede nessuna decisione.
    resumen.sort((a, b) => {
        if (a.precision === null && b.precision === null) return b.total - a.total
        if (a.precision === null) return 1
        if (b.precision === null) return -1
        return a.precision - b.precision
    })

    return NextResponse.json({
        data: resumen,
        total: (data ?? []).length,
    })
}
