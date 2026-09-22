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
 * ── LA REGOLA: SOLO STATI CHE SAPPIAMO DAVVERO ────────────────────────
 *
 * La prima versione ne aveva dieci e aggiungeva `under_review`,
 * `awaiting_signatures`, `at_delegate`. Erano di troppo:
 *
 * - `under_review` non si distingue da `submitted`. Non esiste un momento
 *   in cui qualcuno aggiorna l'uno e non l'altro: una pratica arrivata è
 *   una pratica in revisione.
 * - `awaiting_signatures` e `at_delegate` descrivono cose che succedono
 *   davvero, ma che voi non potete aggiornare con affidabilità — non
 *   sapete quando Bettergy passa il fascicolo al verificatore.
 *
 * Uno stato che nessuno aggiorna è peggio che non averlo: mostra al
 * cliente un'informazione ferma e sbagliata. Meglio pochi stati veri.
 *
 * Resta la seconda scelta: ogni stato dichiara DI CHI È LA PALLA. Per
 * l'installatore conta più della tassonomia — vuole sapere se deve fare
 * qualcosa lui o se può solo aspettare.
 */

/** Chi deve muoversi perché la pratica avanzi. */
export type Actor = 'installer' | 'agency' | 'external' | 'none'

export type EstadoId =
    | 'draft'
    | 'submitted'
    | 'changes_requested'
    | 'rejected'
    | 'approved'
    | 'issued'
    | 'paid'

/** Le cinque tappe che vede l'installatore. Più stati mappano sulla stessa. */
export type PistaId = 'enviado' | 'tuyo' | 'aprobado' | 'emitido' | 'cobrado'

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
        hint: 'Ha llegado y está en revisión. Nada que hacer por parte del instalador.',
        actor: 'agency',
        pista: 'enviado',
        tone: 'info',
    },
    {
        id: 'approved',
        label: 'Aprobado',
        hint: 'Verificado, reparto fijado y documentos generados. En trámite hacia el sujeto delegado.',
        actor: 'external',
        pista: 'aprobado',
        tone: 'ok',
    },
    {
        id: 'issued',
        label: 'CAE emitido',
        hint: 'El certificado existe. Falta que se venda y llegue el dinero.',
        actor: 'external',
        pista: 'emitido',
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
    if (e.excepcion) return ['submitted']

    return [...avanti, 'changes_requested', 'rejected']
}

/** Le cinque tappe visibili all'installatore. */
export const PISTA: { id: PistaId; label: string; body: string }[] = [
    {
        id: 'enviado',
        label: 'Enviado',
        body: 'Ha llegado y la agencia lo está revisando. No tienes que hacer nada.',
    },
    {
        id: 'tuyo',
        label: 'Te toca a ti',
        body: 'Hay algo que solo puedes hacer tú. Hasta entonces no avanza.',
    },
    {
        id: 'aprobado',
        label: 'Aprobado',
        body: 'Verificado y en trámite. Tu comisión ya está fijada.',
    },
    {
        id: 'emitido',
        label: 'CAE emitido',
        body: 'El certificado existe. Falta que se venda y llegue el dinero.',
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

/**
 * Un espediente che l'agenzia ha aperto e assegnato.
 *
 * ── COME SI RICONOSCE ─────────────────────────────────────────────────
 *
 * Dallo stato `draft` dentro `projects`, e non serve altro: le bozze
 * dell'installatore NON stanno li, stanno nella tabella `drafts`. Una
 * riga in `projects` con stato `draft` puo essere nata in un modo solo,
 * cioe l'ha aperta l'agenzia per qualcuno.
 *
 * ── PERCHE' NON BASTA `esperaAlInstalador` ────────────────────────────
 *
 * Perche quella esclude `draft` apposta: una bozza che uno sta ancora
 * scrivendo non e una cosa che «lo aspetta». Ma una bozza che gli
 * hanno aperto ADDOSSO si: non sa nemmeno di averla, e se non gliela si
 * mette davanti resta li per sempre.
 */
export function abiertoPorLaAgencia(id: string): boolean {
    return id === 'draft'
}
