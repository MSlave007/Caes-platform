import { senales, type Extraccion } from '@/lib/caes/extraction'

/**
 * Il testo della richiesta di modifiche, gia scritto.
 *
 * ── PERCHE NON LO SCRIVE UN MODELLO ───────────────────────────────────
 *
 * Perche il sistema sa gia esattamente cosa manca e cosa non torna. Un
 * modello ci metterebbe sopra un costo, un'attesa e la possibilita di
 * dire una cosa che non e vera, per riassumere dei dati che abbiamo in
 * mano. Quando la risposta e nota, generarla e un passo indietro.
 *
 * ── PERCHE UNA PROPOSTA E NON IL TESTO FINALE ─────────────────────────
 *
 * Perche quel messaggio l'installatore lo legge tal quale ed e l'unica
 * cosa su cui agisce. Chi rivede sa cose che il sistema non sa — che
 * quella foto era gia stata mandata per WhatsApp, che con quel cliente
 * conviene chiamare. Si modifica prima di mandare, e il campo resta
 * editabile.
 */
export function motivoSugerido(
    faltan: { label: string }[],
    extraccion: Extraccion | null | undefined
): string {
    const partes: string[] = []

    if (faltan.length > 0) {
        // Solo la prima lettera: `toLowerCase()` su tutta l'etichetta
        // dava «resguardo del registro del rite», e RITE e una sigla.
        const nombres = faltan.map(
            (f) => f.label.charAt(0).toLowerCase() + f.label.slice(1)
        )
        partes.push(
            faltan.length === 1
                ? `Falta ${nombres[0]}.`
                : `Faltan estos documentos: ${nombres.join(', ')}.`
        )
    }

    const noCuadran = senales(extraccion ?? {}).filter((s) => s.estado === 'alarma')
    if (noCuadran.length > 0) {
        // Con i due valori affiancati: «no coincide» da solo obbliga
        // l'installatore ad aprire i documenti per capire cosa guardare.
        partes.push(
            ...noCuadran.map((s) =>
                s.valores.length > 1
                    ? `${s.titulo} (${s.valores[0]} / ${s.valores[1]}).`
                    : `${s.titulo} (${s.valores[0]}).`
            )
        )
    }

    if (partes.length === 0) return ''

    partes.push(
        'En cuanto lo tengas, vuelve a enviarlo desde tu panel y lo miramos.'
    )
    return partes.join(' ')
}
