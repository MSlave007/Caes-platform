/**
 * Notifiche per email sui cambi di stato.
 *
 * ── PERCHÉ ────────────────────────────────────────────────────────────
 *
 * Nella mappa del percorso, alla fase 05, «le settimane di silenzio» era
 * uno dei tre punti in cui il giro si rompe: il cliente chiama
 * l'installatore per sapere a che punto è la pratica, e l'installatore non
 * ha niente da rispondere. Lo stato visibile nell'applicazione risolve
 * metà del problema; l'altra metà è che nessuno apre un'applicazione per
 * sapere se è cambiato qualcosa. La email arriva da sola.
 *
 * ── COSA MANDIAMO ─────────────────────────────────────────────────────
 *
 * Una riga, non una newsletter. Chi la riceve è un installatore in
 * cantiere che la legge dal telefono fra due appuntamenti: deve capire in
 * due secondi se deve fare qualcosa.
 *
 * Solo tre stati meritano una email, e sono quelli in cui qualcosa cambia
 * per chi la riceve:
 *
 *   changes_requested  → devi fare qualcosa tu, e la pratica è ferma
 *   approved           → è passata, la tua quota è fissata
 *   paid               → sono arrivati i soldi
 *
 * `submitted` no: l'ha appena mandata lui, lo sa. `rejected` sì ma con
 * il motivo scritto, altrimenti genera una telefonata invece di evitarla.
 *
 * ── REGOLE, NON PREFERENZE ────────────────────────────────────────────
 *
 * 1. MAI link ai documenti dentro una email. Un indirizzo in una email
 *    passa da server che non controlliamo e resta nella casella per anni.
 *    Si manda il link all'applicazione, dove serve la sessione.
 * 2. Mai importi che non siano già stati confermati al destinatario.
 * 3. Il consenso va registrato: se scriviamo al cliente finale servono
 *    base giuridica e un modo per disiscriversi.
 *
 * ── STATO: NON COLLEGATA ──────────────────────────────────────────────
 *
 * Manca la scelta del fornitore (Resend, Postmark, SES...) e la relativa
 * chiave, che sta lato server e non va mai chiamata NEXT_PUBLIC_.
 *
 * Finché `enviar` non trova un trasporto configurato, registra e basta:
 * così si può collegare il richiamo nei punti giusti del codice e vedere
 * nei log che partirebbe, senza mandare niente a nessuno per sbaglio.
 */

import { estado, type EstadoId } from '@/lib/caes/status'

/** Gli unici stati che meritano di far suonare un telefono. */
const AVISABLES: EstadoId[] = ['changes_requested', 'approved', 'paid', 'rejected']

export type Destinatario = {
    email: string
    nombre?: string
    /** 'installer' riceve la sua quota, 'client' riceve la sua. */
    rol: 'installer' | 'client'
}

export type AvisoEstado = {
    expedienteId: string
    clienteNombre: string
    estado: EstadoId
    /** Obbligatorio quando lo stato è 'rejected' o 'changes_requested'. */
    motivo?: string
    /** Link all'applicazione, MAI a un documento. */
    enlace: string
}

export function debeAvisar(id: string): boolean {
    return AVISABLES.includes(id as EstadoId)
}

/**
 * Il testo. Volutamente corto: oggetto leggibile nella lista dei messaggi
 * senza aprirlo, e tre righe di corpo.
 */
export function redactar(a: AvisoEstado, d: Destinatario) {
    const e = estado(a.estado)
    const ref = `#${a.expedienteId}`

    const asuntos: Partial<Record<EstadoId, string>> = {
        changes_requested: `${ref} · Necesitamos que corrijas algo`,
        approved: `${ref} · Aprobado`,
        paid: `${ref} · Cobrado`,
        rejected: `${ref} · No ha salido adelante`,
    }

    const cuerpos: Partial<Record<EstadoId, string>> = {
        changes_requested: `El expediente de ${a.clienteNombre} está parado hasta que lo corrijas.\n\n${a.motivo ?? 'Revisa la documentación.'}`,
        approved: `El expediente de ${a.clienteNombre} ha pasado la revisión. Tu comisión queda fijada.`,
        paid: `Ha llegado el dinero del expediente de ${a.clienteNombre} y el reparto está hecho.`,
        rejected: `El expediente de ${a.clienteNombre} no sigue adelante.\n\n${a.motivo ?? 'Sin motivo indicado.'}`,
    }

    const asunto = asuntos[a.estado] ?? `${ref} · ${e.label}`
    const cuerpo = cuerpos[a.estado] ?? e.hint

    return {
        asunto,
        // Niente HTML per ora: un messaggio di tre righe non lo richiede, e
        // il testo semplice non finisce nello spam né si rompe sui telefoni.
        texto: `${cuerpo}\n\nVer el expediente: ${a.enlace}\n\nCAES`,
    }
}

/**
 * Manda — o registra, finché non c'è un trasporto.
 *
 * Restituisce `false` quando non ha mandato niente, così chi chiama può
 * decidere se è un problema o no. Non solleva eccezioni: una notifica che
 * non parte non deve far fallire l'approvazione di un fascicolo.
 */
export async function enviar(a: AvisoEstado, d: Destinatario): Promise<boolean> {
    if (!debeAvisar(a.estado)) return false

    const { asunto, texto } = redactar(a, d)

    // Manca l'indirizzo: e la cosa da collegare, quindi si vede nei log
    // invece di uscire in silenzio.
    if (!d.email) {
        console.info(
            `[notifica senza destinatario — collegare l'email dal profilo] ${asunto}`
        )
        return false
    }

    // Qui andrà il fornitore scelto. Finché non c'è, si registra soltanto.
    if (!process.env.EMAIL_API_KEY) {
        console.info(
            `[notifica non inviata — nessun trasporto configurato] a: ${d.email} · ${asunto}`
        )
        return false
    }

    try {
        // DA COLLEGARE: chiamata al fornitore.
        console.info(`[notifica] a: ${d.email} · ${asunto}`)
        void texto
        return true
    } catch {
        // Una notifica persa non deve mai far fallire l'operazione che
        // l'ha generata.
        return false
    }
}
