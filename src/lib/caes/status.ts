/**
 * Ciclo di vita di un espediente CAES — fonte unica.
 *
 * Prima gli stati erano quattro (`submitted`, `under_review`, `approved`,
 * `rejected`), dichiarati in mockDb ma scritti a mano in sei file diversi,
 * con due incoerenze già presenti: `draft` usato nel codice ma assente dal
 * tipo, e `in_review` nella scheda installatore contro `under_review`
 * altrove.
 *
 * Il difetto grosso però era un altro: **`approved` non è la fine, è circa
 * metà**. Quando l'agenzia approva, il fascicolo deve ancora passare da
 * firme, soggetto delegato, verificatore esterno, Ministero, emissione e
 * pagamento. Tutto quello che interessa davvero all'installatore — «quando
 * mi pagate» — succedeva fuori dal modello.
 *
 * È lo stesso buco che avevamo trovato nella mappa del percorso alla fase
 * 05, «le settimane di silenzio»: il cliente chiama l'installatore, e
 * l'installatore non ha niente da rispondere perché nemmeno lui sa a che
 * punto è.
 *
 * ── DUE SCELTE DI PROGETTO ────────────────────────────────────────────
 *
 * 1) Non spacchettiamo «delegato / verificatore / Ministero» in tre stati.
 *    Voi non sapete quando Bettergy passa la pratica al verificatore:
 *    dichiarare uno stato che non potete aggiornare è peggio che non
 *    averlo. Un solo `at_delegate` copre onestamente quello che sapete.
 *
 * 2) Ogni stato dichiara DI CHI È LA PALLA. Per l'installatore è
 *    l'informazione più importante — più della tassonomia: vuole sapere se
 *    deve fare qualcosa lui o se può solo aspettare.
 */

/** Chi deve muoversi perché la pratica avanzi. */
export type Actor = 'installer' | 'agency' | 'external' | 'none'

export type EstadoId =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'changes_requested'
    | 'rejected'
    | 'approved'
    | 'awaiting_signatures'
    | 'at_delegate'
    | 'issued'
    | 'paid'

/** Le cinque tappe che vede l'installatore. Più stati mappano sulla stessa. */
export type PistaId = 'enviado' | 'revision' | 'tuyo' | 'tramitacion' | 'cobrado'

export type Estado = {
    id: EstadoId
    /** Etichetta lato agenzia, quella precisa. */
    label: string
    /** Riga di spiegazione nel riepilogo. */
    hint: string
    actor: Actor
    /** Tappa mostrata all'installatore. null = non ancora inviato. */
    pista: PistaId | null
    /** Esce dal flusso normale: rifiuti e richieste di modifica. */
    excepcion?: boolean
    /** Stato finale: non si va oltre. */
    terminal?: boolean
    /** Colore del pallino, fra i token del brand. */
    tone: 'neutral' | 'info' | 'warn' | 'ok' | 'bad'
}

/**
 * In ordine di avanzamento. Le eccezioni stanno in fondo perché non fanno
 * parte della progressione, ma possono capitare da quasi ogni punto.
 */
export const ESTADOS: Estado[] = [
    {
        id: 'draft',
        label: 'Borrador',
        hint: 'El instalador aún lo está rellenando. No ha llegado a vosotros.',
        actor: 'installer',
        pista: null,
        tone: 'neutral',
    },
    {
        id: 'submitted',
        label: 'Enviado',
        hint: 'Ha llegado a la cola. Nadie lo ha abierto todavía.',
        actor: 'agency',
        pista: 'enviado',
        tone: 'info',
    },
    {
        id: 'under_review',
        label: 'En revisión',
        hint: 'Alguien de la agencia lo está comprobando ahora mismo.',
        actor: 'agency',
        pista: 'revision',
        tone: 'info',
    },
    {
        id: 'approved',
        label: 'Aprobado',
        hint: 'Verificado y con el reparto fijado. Los cuatro documentos ya se pueden generar.',
        actor: 'agency',
        pista: 'revision',
        tone: 'ok',
    },
    {
        id: 'awaiting_signatures',
        label: 'Pendiente de firmas',
        hint: 'Faltan las firmas del instalador, del cliente o vuestra. Aquí se atasca lo que ya estaba listo.',
        actor: 'installer',
        pista: 'tuyo',
        tone: 'warn',
    },
    {
        id: 'at_delegate',
        label: 'En el sujeto delegado',
        hint: 'Enviado a Bettergy. De ahí pasa al verificador externo y al Ministerio. Fuera de vuestras manos.',
        actor: 'external',
        pista: 'tramitacion',
        tone: 'info',
    },
    {
        id: 'issued',
        label: 'CAE emitido',
        hint: 'El certificado existe. Falta que se venda y llegue el dinero.',
        actor: 'external',
        pista: 'tramitacion',
        tone: 'ok',
    },
    {
        id: 'paid',
        label: 'Cobrado y repartido',
        hint: 'El dinero ha llegado y el reparto está hecho.',
        actor: 'none',
        pista: 'cobrado',
        terminal: true,
        tone: 'ok',
    },

    // ── eccezioni ──────────────────────────────────────────────────────
    {
        id: 'changes_requested',
        label: 'Cambios solicitados',
        hint: 'Devuelto al instalador. Hasta que no lo corrija, aquí no se mueve.',
        actor: 'installer',
        pista: 'tuyo',
        excepcion: true,
        tone: 'warn',
    },
    {
        id: 'rejected',
        label: 'Rechazado',
        hint: 'No sigue adelante. Conviene que el motivo quede escrito.',
        actor: 'none',
        pista: null,
        excepcion: true,
        terminal: true,
        tone: 'bad',
    },
]

const PORID = new Map(ESTADOS.map((e) => [e.id, e]))

export function estado(id: string): Estado {
    return PORID.get(id as EstadoId) ?? ESTADOS[1]
}

/** Progressione normale, senza le eccezioni. */
export const FLUJO: EstadoId[] = ESTADOS.filter((e) => !e.excepcion).map((e) => e.id)

/** Posizione nella progressione; -1 per le eccezioni. */
export function posicion(id: string): number {
    return FLUJO.indexOf(id as EstadoId)
}

/**
 * Dove si può andare da qui.
 *
 * Avanti di un passo, più le due eccezioni — che si possono chiedere da
 * qualunque punto vivo, perché un problema può saltare fuori tardi.
 */
export function siguientes(id: string): EstadoId[] {
    const e = estado(id)
    if (e.terminal) return []

    const i = posicion(id)
    const avanti: EstadoId[] = i >= 0 && i < FLUJO.length - 1 ? [FLUJO[i + 1]] : []

    // Da un'eccezione si rientra nel flusso dalla revisione.
    if (e.excepcion) return ['under_review']

    return [...avanti, 'changes_requested', 'rejected']
}

/** Le cinque tappe visibili all'installatore. */
export const PISTA: { id: PistaId; label: string; body: string }[] = [
    {
        id: 'enviado',
        label: 'Enviado',
        body: 'Tu expediente ha llegado. No tienes que hacer nada.',
    },
    {
        id: 'revision',
        label: 'En revisión',
        body: 'La agencia está comprobando los documentos y el cálculo.',
    },
    {
        id: 'tuyo',
        label: 'Te toca a ti',
        body: 'Hay algo que solo puedes hacer tú. Hasta entonces no avanza.',
    },
    {
        id: 'tramitacion',
        label: 'En tramitación',
        body: 'Está en el sujeto delegado y el Ministerio. Nadie puede acelerarlo.',
    },
    {
        id: 'cobrado',
        label: 'Cobrado',
        body: 'El dinero ha llegado y el reparto está hecho.',
    },
]

/** Indice della tappa visibile; -1 se non è ancora entrato nel flusso. */
export function posicionPista(id: string): number {
    const p = estado(id).pista
    return p ? PISTA.findIndex((x) => x.id === p) : -1
}

/** Vero quando la palla è dell'installatore: è quello che deve saltare all'occhio. */
export function esperaAlInstalador(id: string): boolean {
    return estado(id).actor === 'installer' && id !== 'draft'
}
