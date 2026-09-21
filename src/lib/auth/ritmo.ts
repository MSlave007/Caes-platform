/**
 * Un tetto al numero di chiamate.
 *
 * ── PERCHÉ SERVE ──────────────────────────────────────────────────────
 *
 * Non ce n'era da nessuna parte, e tre rotte lo rendono un problema
 * concreto:
 *
 *   /api/extract   costa soldi veri a ogni chiamata, perché dietro c'è
 *                  un modello a pagamento. Un ciclo lasciato aperto per
 *                  sbaglio — o qualcuno che lo fa apposta — è una
 *                  fattura, non un rallentamento
 *   /api/leads     accetta scritture senza account: è il modulo del
 *                  calcolatore pubblico, quindi il posto naturale per
 *                  riempire una tabella di spazzatura
 *   /api/upload    ogni file occupa spazio che si paga
 *
 * ── COS'È E COSA NON È ────────────────────────────────────────────────
 *
 * È un contatore in memoria, per processo. Vuol dire che con più
 * istanze del server il tetto vale per ciascuna, e che a ogni riavvio
 * si azzera. NON è una difesa da un attacco distribuito: quella si fa
 * davanti all'applicazione, non dentro.
 *
 * È la rete che ferma il ciclo impazzito e l'abuso di una persona sola,
 * che sono i due casi che abbiamo davvero. Meglio questa che niente,
 * purché sia chiaro che è questa.
 */

type Ventana = { hasta: number; cuantas: number }

const REGISTRO = new Map<string, Ventana>()

/** Ogni tanto si buttano via le finestre scadute, o la mappa cresce. */
function limpiar(ahora: number) {
    if (REGISTRO.size < 500) return
    for (const [k, v] of REGISTRO) if (v.hasta < ahora) REGISTRO.delete(k)
}

export type Limite = {
    /** Quante chiamate si accettano nella finestra. */
    cuantas: number
    /** Quanto dura la finestra, in secondi. */
    segundos: number
}

/**
 * Registra una chiamata e dice se si può proseguire.
 *
 * `clave` deve identificare chi chiama: l'id utente quando c'è, e
 * l'indirizzo IP quando non c'è. Mettere la sola rotta vorrebbe dire un
 * tetto condiviso fra tutti, e allora basta una persona per chiudere
 * fuori le altre.
 */
export function dentroDelLimite(clave: string, l: Limite): boolean {
    const ahora = Date.now()
    limpiar(ahora)

    const v = REGISTRO.get(clave)
    if (!v || v.hasta < ahora) {
        REGISTRO.set(clave, { hasta: ahora + l.segundos * 1000, cuantas: 1 })
        return true
    }

    v.cuantas += 1
    return v.cuantas <= l.cuantas
}

/**
 * Chi sta chiamando, per contarlo.
 *
 * L'indirizzo IP arriva dalle intestazioni del proxy e si può falsificare:
 * va bene per contare, non per decidere chi sei. Qui serve solo a
 * contare.
 */
export function quienCuenta(request: Request, userId?: string | null): string {
    if (userId) return `u:${userId}`
    const h = request.headers
    const ip =
        h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        h.get('x-real-ip') ||
        'desconocido'
    return `ip:${ip}`
}

/** La risposta quando si è superato il tetto. */
export function demasiadas(segundos: number) {
    return Response.json(
        { error: 'Demasiadas peticiones. Espera un momento y vuelve a intentarlo.' },
        { status: 429, headers: { 'Retry-After': String(segundos) } }
    )
}
