import { estado, type Actor } from '@/lib/caes/status'
import type { Project } from '@/lib/mockDb'

/**
 * La cartera: chi sta bloccando cosa, e da quanto.
 *
 * ── PERCHÉ ESISTE QUESTO FILE ─────────────────────────────────────────
 *
 * È lo stesso conto fatto a due altezze diverse.
 *
 *   In basso, l'installatore guarda i SUOI clienti e vuole sapere quale
 *   chiamare oggi.
 *   In alto, il capo guarda i SUOI installatori e vuole sapere quale
 *   chiamare oggi.
 *
 * La domanda è la stessa — «chi sta fermo, da quanti giorni, e quanti
 * soldi ci sono sopra» — e cambia solo il soggetto. Per questo il conto
 * sta qui fuori e non dentro una pagina: perché la seconda vista non sia
 * una copia della prima scritta due volte, che è il modo in cui le due
 * viste cominciano a dire numeri diversi.
 *
 * ── QUELLO CHE NON C'È QUI ────────────────────────────────────────────
 *
 * Niente che qualcuno debba digitare. Nessuna fase di vendita, nessuna
 * probabilità di chiusura, nessun punteggio. Tutto quello che segue si
 * ricava dagli espedienti che esistono già: chi blocca lo dice
 * `estado(id).actor`, da quando lo dice la data. Un campo che va
 * riempito a mano, dopo tre settimane, è vuoto — e una pagina con i
 * campi vuoti non è neutra, racconta il falso.
 */

/** Oltre questo, un espediente fermo in mano all'installatore è un problema. */
export const DIAS_PARADO = 7

/** Oltre questo silenzio, un installatore ha smesso di lavorare con noi. */
export const DIAS_DORMIDO = 90

/** Sotto questi giorni, e con pochi espedienti, è ancora uno che sta imparando. */
const DIAS_NUEVO = 30
const EXPEDIENTES_NUEVO = 3

export type Situacion =
    /**
     * Ha un account e nessun espediente. Mai usato.
     *
     * Diverso da `nuevo`, che vuol dire «appena arrivato, i numeri bassi
     * sono l'inizio» — quello qualcosa l'ha già mandato. Questo ha le
     * chiavi e non ha ancora aperto la porta, e la palla è NOSTRA:
     * gliene dobbiamo dare una.
     */
    | 'sin-estrenar'
    /** Ha roba ferma in mano da troppo. È quello da chiamare. */
    | 'necesita'
    /** Da mesi non manda niente. */
    | 'dormido'
    /** Appena arrivato: i numeri bassi non sono un problema, sono l'inizio. */
    | 'nuevo'
    /** Niente di fermo. Non vuol dire attivo, vuol dire che non blocca. */
    | 'al-dia'

export type Parado = {
    id: string
    cliente: string
    estadoId: string
    dias: number
    euros: number
}

export type Instalador = {
    nombre: string
    situacion: Situacion
    /** Clienti distinti, non espedienti: è la misura della sua base. */
    clientes: number
    expedientes: number
    /** Fermi in mano SUA, dal più vecchio. */
    parados: Parado[]
    /** Giorni del più vecchio fermo. 0 se non ha niente fermo. */
    diasPeor: number
    /** In mano a noi: aspettano l'agenzia. */
    enRevision: number
    /** Risparmio degli espedienti chiusi e pagati, €. */
    cobrado: number
    /** Risparmio di quelli avviati ma non ancora pagati, €. */
    enJuego: number
    /** Data dell'ultimo movimento, ISO. */
    ultima: string
    diasSilencio: number
}

export type ClienteCartera = {
    nombre: string
    /** Quasi sempre uno solo. Più di uno è la cosa che il capo deve vedere. */
    instaladores: string[]
    expedientes: Project[]
    /** Quanti dei suoi sono fermi in mano all'installatore. */
    parados: number
    ultima: string
    diasSilencio: number
    total: number
}

/* ------------------------------------------------------------- tempo */

const DIA = 86_400_000

export function diasDesde(iso: string, ahora: number): number {
    const t = Date.parse(iso)
    if (Number.isNaN(t)) return 0
    return Math.max(0, Math.floor((ahora - t) / DIA))
}

/** Chi ha la palla adesso. Unica fonte: la tabella degli stati. */
export function bloquea(estadoId: string): Actor {
    return estado(estadoId).actor
}

/* -------------------------------------------------------- il conto */

/**
 * `ahora` si passa da fuori apposta: leggere l'orologio durante il
 * calcolo rende la funzione impura, e React 16.1 lo segnala. Si legge
 * una volta sola, dopo il montaggio, e si passa giù.
 */
export function carteraDeInstaladores(
    proyectos: Project[],
    ahora: number
): Instalador[] {
    const mapa = new Map<string, Project[]>()
    for (const p of proyectos) {
        // Senza installatore l'espediente arriva dal calcolatore e non è
        // ancora di nessuno. Non è la cartera di qualcuno: è lavoro da
        // assegnare, e ha una sua riga altrove.
        if (!p.installer_name) continue
        const lista = mapa.get(p.installer_name)
        if (lista) lista.push(p)
        else mapa.set(p.installer_name, [p])
    }

    const fuera: Instalador[] = []
    for (const [nombre, suyos] of mapa) {
        const clientes = new Set(suyos.map((p) => p.client_name)).size

        const parados: Parado[] = suyos
            .filter((p) => bloquea(p.status) === 'installer')
            .map((p) => ({
                id: p.id,
                cliente: p.client_name,
                estadoId: p.status,
                dias: diasDesde(p.created_at, ahora),
                euros: p.savings_eur,
            }))
            .sort((a, b) => b.dias - a.dias)

        const enRevision = suyos.filter((p) => bloquea(p.status) === 'agency').length

        let cobrado = 0
        let enJuego = 0
        for (const p of suyos) {
            if (p.status === 'paid') cobrado += p.savings_eur
            else if (p.status !== 'rejected' && p.status !== 'draft') {
                enJuego += p.savings_eur
            }
        }

        const ultima = suyos.reduce(
            (max, p) => (p.created_at > max ? p.created_at : max),
            suyos[0].created_at
        )
        const primera = suyos.reduce(
            (min, p) => (p.created_at < min ? p.created_at : min),
            suyos[0].created_at
        )
        const diasSilencio = diasDesde(ultima, ahora)
        const diasPeor = parados.length ? parados[0].dias : 0

        // L'ordine conta: «ha roba ferma» batte «è sparito», perché sul
        // primo si può ancora fare qualcosa oggi.
        let situacion: Situacion = 'al-dia'
        if (diasPeor >= DIAS_PARADO) situacion = 'necesita'
        else if (diasSilencio >= DIAS_DORMIDO) situacion = 'dormido'
        else if (
            diasDesde(primera, ahora) <= DIAS_NUEVO &&
            suyos.length <= EXPEDIENTES_NUEVO
        ) {
            situacion = 'nuevo'
        }

        fuera.push({
            nombre,
            situacion,
            clientes,
            expedientes: suyos.length,
            parados,
            diasPeor,
            enRevision,
            cobrado,
            enJuego,
            ultima,
            diasSilencio,
        })
    }

    return fuera.sort(ordenPorUrgencia)
}

/**
 * Prima chi ha bisogno di una telefonata, e dentro quelli prima chi
 * aspetta da più tempo.
 *
 * L'ordine alfabetico è l'ammissione che non sappiamo cosa è
 * importante. Qui lo sappiamo.
 */
const PESO: Record<Situacion, number> = {
    necesita: 0,
    // Subito dopo chi va chiamato: è l'unica altra riga in cui la palla è
    // nostra. Le altre due sono situazioni da guardare, non da fare.
    'sin-estrenar': 1,
    dormido: 2,
    nuevo: 3,
    'al-dia': 4,
}

function ordenPorUrgencia(a: Instalador, b: Instalador): number {
    if (PESO[a.situacion] !== PESO[b.situacion]) {
        return PESO[a.situacion] - PESO[b.situacion]
    }
    if (a.situacion === 'necesita') return b.diasPeor - a.diasPeor
    if (a.situacion === 'dormido') return b.diasSilencio - a.diasSilencio
    return b.expedientes - a.expedientes
}

/* ------------------------------------------------------- i clienti */

/**
 * Gli stessi espedienti guardati per cliente invece che per
 * installatore. Serve a rispondere a una domanda sola, che oggi non ha
 * risposta da nessuna parte: **il cliente X di chi è?**
 */
/**
 * Gli account che non hanno ancora nessun espediente.
 *
 * La cartera si costruisce dagli espedienti, quindi chi non ne ha
 * sparisce — e sparisce proprio quando serve vederlo, cioè per dargli
 * la prima pratica. Qui si aggiungono in fondo, con tutti i numeri a
 * zero, perché a zero sono davvero.
 *
 * Si confrontano per nome, che è l'unica cosa che i due elenchi hanno in
 * comune: la cartera non conosce gli id degli account, li deduce dal
 * nome scritto sugli espedienti.
 */
export function conCuentasSinEstrenar(
    cartera: Instalador[],
    cuentas: { nombre: string }[],
    ahora: number
): Instalador[] {
    const yaEstan = new Set(cartera.map((i) => i.nombre.trim().toLowerCase()))

    const sinEstrenar: Instalador[] = cuentas
        .filter((c) => c.nombre && !yaEstan.has(c.nombre.trim().toLowerCase()))
        .map((c) => ({
            nombre: c.nombre,
            situacion: 'sin-estrenar' as const,
            clientes: 0,
            expedientes: 0,
            parados: [],
            diasPeor: 0,
            enRevision: 0,
            cobrado: 0,
            enJuego: 0,
            ultima: new Date(ahora).toISOString(),
            diasSilencio: 0,
        }))

    return [...cartera, ...sinEstrenar]
}

export function carteraDeClientes(
    proyectos: Project[],
    ahora: number
): ClienteCartera[] {
    const mapa = new Map<string, Project[]>()
    for (const p of proyectos) {
        if (!p.client_name) continue
        const lista = mapa.get(p.client_name)
        if (lista) lista.push(p)
        else mapa.set(p.client_name, [p])
    }

    const fuera: ClienteCartera[] = []
    for (const [nombre, suyos] of mapa) {
        const instaladores = [
            ...new Set(suyos.map((p) => p.installer_name).filter(Boolean)),
        ] as string[]

        const ultima = suyos.reduce(
            (max, p) => (p.created_at > max ? p.created_at : max),
            suyos[0].created_at
        )

        fuera.push({
            nombre,
            instaladores,
            expedientes: [...suyos].sort((a, b) =>
                b.created_at.localeCompare(a.created_at)
            ),
            parados: suyos.filter((p) => bloquea(p.status) === 'installer').length,
            ultima,
            diasSilencio: diasDesde(ultima, ahora),
            total: suyos.reduce((s, p) => s + p.savings_eur, 0),
        })
    }

    return fuera.sort((a, b) => b.expedientes.length - a.expedientes.length)
}

/** Il riassunto in cima: quello che il capo legge prima di sedersi. */
export function resumenCartera(
    instaladores: Instalador[],
    clientes: ClienteCartera[]
) {
    const necesitan = instaladores.filter((i) => i.situacion === 'necesita')
    return {
        instaladores: instaladores.length,
        // Distinti davvero. Sommare i clienti di ogni installatore conta
        // due volte chi sta da due installatori — ed è proprio il caso
        // che questa pagina serve a far notare, quindi sarebbe il posto
        // peggiore in cui sbagliarlo.
        clientes: clientes.filter((c) => c.instaladores.length > 0).length,
        necesitan,
        // I soldi che stanno fermi per colpa di qualcuno, non i soldi
        // in generale: è la cifra che rende una telefonata urgente.
        euroParado: necesitan.reduce(
            (s, i) => s + i.parados.reduce((t, p) => t + p.euros, 0),
            0
        ),
        dormidos: instaladores.filter((i) => i.situacion === 'dormido').length,
    }
}
