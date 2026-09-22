'use client'

import { useEffect, useRef, useState } from 'react'
import {
    AlertTriangle,
    Check,
    CheckCheck,
    ChevronRight,
    Loader2,
    Paperclip,
    ScanText,
    Upload,
    X,
} from 'lucide-react'
import DocumentViewer from './DocumentViewer'
import {
    avisos,
    camposDe,
    otrasFuentes,
    CONFIANZA_BAJA,
    type Aviso,
    type CampoDef,
    type Extraccion,
    type ValorCampo,
} from '@/lib/caes/extraction'
import { docLabel, type DocSpec } from '@/lib/documents'

/**
 * Revisione di un fascicolo: documenti e dati estratti, insieme.
 *
 * ── PERCHÉ È UNA LISTA SOLA ───────────────────────────────────────────
 *
 * Prima erano due colonne parallele: i documenti a sinistra, i dati
 * estratti a destra. Scorrevano entrambe, e il collegamento fra «questo
 * dato» e «quel documento» lo doveva fare chi rivede, a mente. Con otto
 * documenti diventava uno scorrimento lungo che mostrava poco.
 *
 * Qui i dati stanno DENTRO il documento da cui escono. Chiuso, ogni
 * documento è una riga sola con il suo conteggio. Aperto, occupa tutta la
 * larghezza: documento da una parte, i suoi campi dall'altra, affiancati.
 * Il collegamento è fisico, non da ricostruire.
 *
 * ── LE TRE CORSIE ─────────────────────────────────────────────────────
 *
 * I programmi che fanno questo mestiere — estrarre e far verificare —
 * dividono sempre il lavoro in tre corsie: quello che passa liscio,
 * quello che si guarda campo per campo, e quello che si rifà a mano. Il
 * pannello le rispecchia.
 *
 * A separarle è la CONFIDENZA, e la soglia nel settore sta fra l'80 e
 * l'85 % per l'estrazione documentale. Qui è CONFIANZA_BAJA = 0,8.
 *
 * Sopra la soglia si conferma in blocco: sono letture che il modello ha
 * fatto senza esitare, e farle spuntare una per una è un rito, non un
 * controllo. Sotto, restano gialle e ferme — quelle sì che vanno guardate
 * contro il documento, ed è lì che deve andare l'attenzione risparmiata
 * sopra.
 *
 * Per questo il bottone non dice mai «conferma tutto» e basta: dice
 * quanti ne conferma e quanti ne lascia. I dubbi si confermano con un
 * secondo gesto, separato e dichiarato.
 *
 * ── ANCHE QUANDO IL DOCUMENTO NON C'È ─────────────────────────────────
 *
 * Le righe senza documento si aprono lo stesso. Dentro non c'è il visore,
 * c'è l'elenco dei dati che quella carta avrebbe portato, con la riga di
 * aiuto che dice dove si leggono di solito. Sono campi scrivibili: se il
 * dato lo si ha per un'altra via lo si mette a mano e resta «corregido»,
 * cioè a nome di chi rivede e non del documento. La differenza fra «manca
 * una carta» e «manca un dato» torna visibile, che è quello che serve per
 * decidere se chiamare l'installatore o andare avanti.
 *
 * ── L'ORDINE È INFORMAZIONE ───────────────────────────────────────────
 *
 * Prima i documenti da cui si estrae qualcosa, ordinati per quanto
 * pesano: la fattura e il certificato energetico danno da soli metà del
 * fascicolo, e stanno in cima. In fondo, separati, quelli che servono
 * solo come riscontro e da cui non si prende niente: si spuntano e basta.
 */

type Props = {
    specs: DocSpec[]
    /** Documenti effettivamente caricati, con il loro percorso. */
    subidos: { id: string; name: string; path?: string }[]
    verified: Record<string, boolean>
    onVerificar: (docId: string) => void
    extraccion: Extraccion
    onCambiar: (campoId: string, valor: string) => void
    onConfirmar: (campoId: string) => void
    /** Conferma in blocco: un solo gesto, un solo aggiornamento di stato. */
    onConfirmarVarios: (campoIds: string[]) => void
    /**
     * Carica documenti da qui.
     *
     * L'installatore manda quello che gli pare: tre carte sul portale, la
     * quarta per WhatsApp perché «era più veloce», il certificato
     * energetico su un Drive. Finora quel pezzo si perdeva — il fascicolo
     * restava bloccato in attesa di un caricamento che non arrivava, e
     * l'unico modo di sbloccarlo era telefonare. Se il file ce l'hai già
     * sul computer, lo metti tu e si va avanti.
     */
    onSubir: (docId: string, files: FileList) => Promise<void>
    /** Slot in cui un caricamento è in corso. */
    subiendo: string | null
    /**
     * Manda al modello il file che si sta guardando.
     *
     * L'indice serve per gli slot con più file: leggere sempre il primo
     * mentre a schermo c'è il secondo è il tipo di scarto che fa dire
     * «l'AI non funziona» quando funziona benissimo, sulla carta
     * sbagliata.
     */
    onLeer: (docId: string, indice: number) => Promise<void>
    /** Slot che il modello sta leggendo adesso. */
    leyendo: string | null
    /**
     * Togliere un file caricato per sbaglio.
     *
     * L'indice è quello del file dentro lo slot: un riquadro ne contiene
     * più d'uno e si cancella quello indicato, non il primo.
     */
    onBorrar: (docId: string, indice: number) => Promise<void>
    /** Slot in cui una cancellazione è in corso. */
    borrando: string | null
}

type Archivo = { id: string; name: string; path?: string }

/* ==================================================================== *
 *  CAMPI
 * ==================================================================== */

const hecho = (v?: ValorCampo) => v?.estado === 'confirmado' || v?.estado === 'corregido'

const lleno = (v?: ValorCampo) =>
    v?.valor !== null && v?.valor !== undefined && v?.valor !== ''

const dudoso = (v?: ValorCampo) =>
    !hecho(v) && typeof v?.confianza === 'number' && v.confianza < CONFIANZA_BAJA

/**
 * Divide i campi ancora da confermare nelle due corsie.
 *
 * La differenza fra i due numeri è l'unica cosa che il bottone di
 * conferma in blocco deve dire.
 */
function corsie(campos: CampoDef[], e: Extraccion) {
    const pendientes = campos.filter((c) => !c.control && !hecho(e[c.id]) && lleno(e[c.id]))
    return {
        seguros: pendientes.filter((c) => !dudoso(e[c.id])).map((c) => c.id),
        dudosos: pendientes.filter((c) => dudoso(e[c.id])).map((c) => c.id),
    }
}

function Campo({
    def,
    v,
    otras,
    onCambiar,
    onConfirmar,
}: {
    def: CampoDef
    v: ValorCampo
    /** Etichette delle altre carte in cui lo stesso dato compare. */
    otras: string[]
    onCambiar: (valor: string) => void
    onConfirmar: () => void
}) {
    const confirmado = hecho(v)
    const inseguro = dudoso(v)
    const vacio = !lleno(v)

    /**
     * Invio: conferma e passa al campo dopo.
     *
     * È il gesto che rende sopportabile una colonna di dodici campi: si
     * scrive, invio, si è già nel prossimo. Senza, ogni campo costa due
     * clic e uno spostamento del mouse.
     */
    const alPulsar = (ev: React.KeyboardEvent<HTMLElement>) => {
        if (ev.key !== 'Enter') return
        ev.preventDefault()
        if (!vacio) onConfirmar()

        const lista = ev.currentTarget.closest('[data-campos]')
        if (!lista) return
        const todos = Array.from(lista.querySelectorAll<HTMLElement>('input, select'))
        const yo = todos.indexOf(ev.currentTarget as HTMLElement)
        todos[yo + 1]?.focus()
    }

    return (
        <div
            className={`flex flex-col gap-1 border-b border-[var(--caes-line-2)] px-2 py-2.5 last:border-b-0 ${inseguro ? 'bg-[var(--caes-falta)]/[.06]' : ''
                }`}
        >
            <div className="flex items-center gap-2.5">
                <span className="min-w-0 flex-1 truncate text-[13.5px] text-[var(--caes-mut)]">
                    {def.label}
                    {def.destino !== 'documentos' && (
                        <span
                            title="Entra en el cálculo del CAE"
                            className="ml-1.5 text-[var(--caes-green)]"
                        >
                            ·
                        </span>
                    )}
                </span>

                {def.tipo === 'opcion' ? (
                    <select
                        value={String(v.valor ?? '')}
                        onChange={(e) => onCambiar(e.target.value)}
                        onKeyDown={alPulsar}
                        className="w-[150px] rounded-[6px] border border-[var(--caes-line)] bg-white px-2.5 py-1.5 text-[13.5px] text-[var(--caes-ink)] outline-none focus:border-[var(--caes-green)]"
                    >
                        <option value="">—</option>
                        {def.opciones?.map((o) => (
                            <option key={o.id} value={o.id}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    <span className="flex items-baseline gap-1.5">
                        <input
                            value={String(v.valor ?? '')}
                            onChange={(e) => onCambiar(e.target.value)}
                            onKeyDown={alPulsar}
                            inputMode={def.tipo === 'numero' ? 'decimal' : undefined}
                            placeholder="—"
                            title={String(v.valor ?? '')}
                            className={`rounded-[6px] border bg-white px-2.5 py-1.5 text-[13.5px] text-[var(--caes-ink)] outline-none focus:border-[var(--caes-green)] ${
                                // I testi lunghi — nome, indirizzo, codice modello —
                                // in 104 px a destra non si leggevano: si vedeva la
                                // coda della stringa e mai l'inizio.
                                def.tipo === 'texto'
                                    ? 'w-[168px] text-left'
                                    : 'w-[104px] text-right tabular-nums'
                                } ${inseguro ? 'border-[var(--caes-falta)]' : 'border-[var(--caes-line)]'}`}
                        />
                        <span className="w-[54px] font-mono text-[10px] text-[var(--caes-faint)]">
                            {def.unidad ?? ''}
                        </span>
                    </span>
                )}

                {/* I campi di controllo non si spuntano: nessuno risponde
                    di loro, servono solo al paragone in fondo. */}
                {def.control ? (
                    <span className="w-6 shrink-0" />
                ) : (
                    <button
                        type="button"
                        onClick={onConfirmar}
                        disabled={vacio}
                        title={confirmado ? 'Confirmado' : 'Confirmar'}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${confirmado
                                ? 'bg-[var(--caes-green)] text-white'
                                : 'border border-[var(--caes-line)] text-[var(--caes-faint)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)] disabled:opacity-25'
                            }`}
                    >
                        <Check className="h-3 w-3" strokeWidth={3} />
                    </button>
                )}
            </div>

            {/* Dove si legge. Sparisce appena il campo è pieno: serve a
                trovarlo, non a decorare quello che è già stato trovato. */}
            {vacio && def.ayuda && (
                <span className="pr-[84px] text-[11.5px] leading-[1.4] text-[var(--caes-faint)]">
                    {def.ayuda}
                </span>
            )}

            {/* Lo stesso dato in un'altra carta non è una ripetizione: è il
                riscontro. Se le due non coincidono, il fascicolo ha un
                problema che qui si vede e altrove no. */}
            {otras.length > 0 && (
                <span className="pr-[84px] text-[11.5px] leading-[1.4] text-[var(--caes-faint)]">
                    También en: {otras.join(' · ')}
                </span>
            )}

            {inseguro && (
                <span className="flex items-start gap-1.5 pr-[84px] text-[11.5px] leading-[1.4] text-[var(--caes-falta-ink)]">
                    <AlertTriangle className="mt-[2px] h-3 w-3 shrink-0" />
                    Lectura poco segura ({Math.round((v.confianza ?? 0) * 100)} %) · compruébala
                    contra el documento
                </span>
            )}

            {/* Chi risponde di questo dato.
                Questi valori finiscono nel Convenio CAE e nel RES60, che
                qualcuno firma e per cui risponde dieci anni: «confermato»
                senza «da chi» non e una conferma. La firma la scrive il
                server dalla sessione, non il browser. */}
            {confirmado && v.por && (
                <span className="pr-[84px] text-[11.5px] leading-[1.4] text-[var(--caes-faint)]">
                    Comprobado por {v.por}
                    {v.en
                        ? ` · ${new Date(v.en).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                        })}`
                        : ''}
                </span>
            )}
        </div>
    )
}

/**
 * Il bottone che chiude una corsia intera.
 *
 * Non dice «confirmar todo» perché non conferma tutto: lascia fuori le
 * letture insicure, e dirlo è metà del suo valore. Se non ce ne sono,
 * la distinzione sparisce e resta il bottone semplice.
 */
function ConfirmarTodo({
    seguros,
    dudosos,
    onConfirmar,
    compacto,
}: {
    seguros: string[]
    dudosos: string[]
    onConfirmar: (ids: string[]) => void
    compacto?: boolean
}) {
    if (seguros.length === 0 && dudosos.length === 0) return null

    return (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {seguros.length > 0 && (
                <button
                    type="button"
                    onClick={() => onConfirmar(seguros)}
                    className={`flex items-center gap-1.5 rounded-full border border-[var(--caes-green)] px-3 py-1.5 text-[var(--caes-green)] transition-colors hover:bg-[var(--caes-green)] hover:text-white ${compacto ? 'text-[12px]' : 'text-[12.5px]'
                        }`}
                >
                    <CheckCheck className="h-3.5 w-3.5" />
                    {dudosos.length > 0
                        ? `Confirmar ${seguros.length} seguros`
                        : `Confirmar los ${seguros.length}`}
                </button>
            )}

            {dudosos.length > 0 && (
                <button
                    type="button"
                    onClick={() => onConfirmar(dudosos)}
                    title="Solo si ya las has mirado contra el documento"
                    className="text-[11.5px] text-[var(--caes-falta-ink)] underline-offset-4 hover:underline"
                >
                    {seguros.length > 0 ? 'y las ' : 'Confirmar las '}
                    {dudosos.length} dudosas
                </button>
            )}
        </span>
    )
}

/* ==================================================================== *
 *  CONTATORI
 * ==================================================================== */

/** Barra di avanzamento: quanto e fatto su quanto serve. */
function Medidor({
    etiqueta,
    hechos,
    total,
    nota,
    acento,
}: {
    etiqueta: string
    hechos: number
    total: number
    nota: string
    acento?: boolean
}) {
    const pct = total === 0 ? 100 : Math.round((hechos / total) * 100)
    const completo = hechos === total

    return (
        <div className="flex flex-1 flex-col gap-2.5 px-5 py-4">
            <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                {etiqueta}
            </span>
            <span className="flex items-baseline gap-2">
                <span
                    className={`font-mono tabular text-[26px] font-medium leading-none tracking-[-0.03em] ${completo ? 'text-[var(--caes-green)]' : 'text-[var(--caes-ink)]'
                        }`}
                >
                    {hechos}
                </span>
                <span className="font-mono tabular text-[15px] text-[var(--caes-faint)]">
                    / {total}
                </span>
            </span>
            <span className="h-[3px] w-full overflow-hidden rounded-full bg-[var(--caes-line)]">
                <span
                    className={`block h-full rounded-full transition-all duration-500 ${completo
                            ? 'bg-[var(--caes-green)]'
                            : acento
                                ? 'bg-[var(--caes-falta)]'
                                : 'bg-[var(--caes-ink)]'
                        }`}
                    style={{ width: `${pct}%` }}
                />
            </span>
            <span className="text-[12.5px] leading-[1.35] text-[var(--caes-mut)]">{nota}</span>
        </div>
    )
}

/**
 * I pallini dei dati: uno per campo, pieno quando e confermato.
 *
 * Oltre gli otto smettono di funzionare: una fila di dodici puntini non
 * si conta a colpo d'occhio, si misura — e intanto mangia la riga sul
 * telefono. Da li in poi parla solo il numero, che quel lavoro lo fa
 * meglio.
 */
function Puntos({ total, hechos }: { total: number; hechos: number }) {
    if (total > 8) return null

    return (
        <span className="flex items-center gap-[3px]" aria-hidden>
            {Array.from({ length: total }).map((_, i) => (
                <span
                    key={i}
                    className={`h-[5px] w-[5px] rounded-full ${i < hechos ? 'bg-[var(--caes-green)]' : 'bg-[var(--caes-line)]'
                        }`}
                />
            ))}
        </span>
    )
}

/**
 * I riscontri fra carte diverse.
 *
 * Sta in fondo perché è l'ultima cosa che si guarda, non perché conti
 * meno: un allarme qui vale più di dieci campi spuntati sopra, perché
 * dice che due documenti si contraddicono — e quello, documento per
 * documento, non si vede.
 */
function Avisos({ lista }: { lista: Aviso[] }) {
    const alarmas = lista.filter((a) => a.estado === 'alarma')
    const cuadran = lista.filter((a) => a.estado === 'ok')
    const pendientes = lista.filter((a) => a.estado === 'pendiente')

    return (
        <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                Contrastes entre documentos · automáticos
            </span>

            {alarmas.map((a) => (
                <div
                    key={a.comprobacion.id}
                    className="flex gap-3.5 rounded-xl border border-[var(--caes-falta)] bg-[var(--caes-falta)]/[.07] px-4 py-3.5"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--caes-falta-ink)]" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-[14px] font-medium text-[var(--caes-ink)]">
                            {a.comprobacion.titulo}
                        </span>
                        <span className="font-mono text-[12px] tabular-nums text-[var(--caes-falta-ink)]">
                            {a.valores[0]} ≠ {a.valores[1]}
                        </span>
                        <span className="text-[12.5px] leading-[1.5] text-[var(--caes-mut)]">
                            {a.comprobacion.porque}
                        </span>
                    </div>
                </div>
            ))}

            {/* Quelli che tornano non meritano un riquadro a testa: una
                riga che dice che sono stati fatti basta e avanza. */}
            {(cuadran.length > 0 || pendientes.length > 0) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-[var(--caes-line-2)] px-4 py-3">
                    {cuadran.length > 0 && (
                        <span className="flex items-center gap-2 text-[12.5px] text-[var(--caes-mut)]">
                            <Check
                                className="h-3.5 w-3.5 text-[var(--caes-green)]"
                                strokeWidth={3}
                            />
                            {cuadran.length}{' '}
                            {cuadran.length === 1 ? 'contraste cuadra' : 'contrastes cuadran'}
                        </span>
                    )}
                    {pendientes.length > 0 && (
                        <span className="text-[12.5px] text-[var(--caes-faint)]">
                            {pendientes.length} sin comprobar: falta alguno de los dos datos
                        </span>
                    )}
                </div>
            )}
        </div>
    )
}

/* ==================================================================== *
 *  ARCHIVI
 * ==================================================================== */

/**
 * La riga dei file di uno slot.
 *
 * Ogni file è una pastiglia: si clicca per guardarlo, la × lo toglie, e
 * la conferma sta dentro la pastiglia stessa — «¿Borrarlo? Sí / No».
 * Non una finestra di sistema: quella ferma tutto, arriva staccata da
 * dov'eri e, con tre foto nello stesso riquadro, fa dimenticare quale
 * avevi in mano.
 */
function Archivos({
    docs,
    cual,
    setCual,
    onBorrar,
    borrando,
    onAnadir,
    multiple,
}: {
    docs: Archivo[]
    cual: number
    setCual: (i: number) => void
    onBorrar: (i: number) => void
    borrando: boolean
    onAnadir: () => void
    multiple?: boolean
}) {
    const [confirmar, setConfirmar] = useState<number | null>(null)

    return (
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {docs.map((d, i) =>
                confirmar === i ? (
                    <span
                        key={`c-${i}`}
                        className="flex items-center gap-2 rounded-full border border-[var(--caes-mal)] bg-[var(--caes-mal)]/[.06] px-3 py-1.5 text-[12px]"
                    >
                        <span className="text-[var(--caes-mal)]">¿Borrarlo?</span>
                        <button
                            type="button"
                            onClick={() => {
                                setConfirmar(null)
                                onBorrar(i)
                            }}
                            className="font-medium text-[var(--caes-mal)] underline-offset-2 hover:underline"
                        >
                            Sí
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmar(null)}
                            className="text-[var(--caes-mut)] underline-offset-2 hover:underline"
                        >
                            No
                        </button>
                    </span>
                ) : (
                    <span
                        key={`a-${i}`}
                        className={`group flex max-w-[260px] items-center gap-1 rounded-full border py-1.5 pl-3 pr-1.5 text-[12px] transition-colors ${i === cual
                                ? 'border-[var(--caes-ink)] bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                : 'border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]'
                            }`}
                    >
                        <button
                            type="button"
                            onClick={() => setCual(i)}
                            className="min-w-0 truncate"
                            title={d.name}
                        >
                            {d.name}
                        </button>
                        <button
                            type="button"
                            onClick={() => setConfirmar(i)}
                            disabled={borrando}
                            title="Borrar este archivo"
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-opacity ${i === cual
                                    ? 'opacity-60 hover:opacity-100'
                                    : 'opacity-40 group-hover:opacity-100'
                                }`}
                        >
                            {borrando ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <X className="h-3 w-3" strokeWidth={2.5} />
                            )}
                        </button>
                    </span>
                )
            )}

            {(multiple || docs.length === 0) && (
                <button
                    type="button"
                    onClick={onAnadir}
                    className="flex items-center gap-1.5 rounded-full border border-dashed border-[var(--caes-line)] px-3 py-1.5 text-[12px] text-[var(--caes-faint)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]"
                >
                    <Paperclip className="h-3 w-3" />
                    Añadir
                </button>
            )}
        </div>
    )
}

/* ==================================================================== *
 *  PANNELLO
 * ==================================================================== */

export default function DocumentReview({
    specs,
    subidos,
    verified,
    onVerificar,
    extraccion,
    onCambiar,
    onConfirmar,
    onConfirmarVarios,
    onSubir,
    subiendo,
    onLeer,
    leyendo,
    onBorrar,
    borrando,
}: Props) {
    const [abierto, setAbierto] = useState<string | null>(null)
    // Quale dei file dello slot aperto si sta guardando. Un riquadro puo
    // contenerne piu di uno: le tre foto dell'impianto sono un gesto solo
    // in cantiere, ma qui si guardano una per una.
    const [cual, setCual] = useState(0)
    // A tutto schermo: il documento grande, i campi di fianco.
    const [ampliado, setAmpliado] = useState(false)
    // Lo slot su cui si sta trascinando un file.
    const [encima, setEncima] = useState<string | null>(null)

    // Un input per slot: uno solo condiviso costringerebbe a ricordarsi
    // per quale riga era stato aperto.
    const inputs = useRef<Record<string, HTMLInputElement | null>>({})

    const abrir = (id: string | null) => {
        setAbierto(id)
        setCual(0)
        if (!id) setAmpliado(false)
    }

    // Esc chiude l'ingrandimento, non il pannello: e' l'ordine in cui uno
    // si aspetta di tornare indietro.
    useEffect(() => {
        if (!ampliado) return
        const alPulsar = (e: KeyboardEvent) => e.key === 'Escape' && setAmpliado(false)
        window.addEventListener('keydown', alPulsar)
        return () => window.removeEventListener('keydown', alPulsar)
    }, [ampliado])

    // Raggruppati, non indicizzati: con una Map a chiave unica il secondo
    // file di uno slot spariva senza dirlo a nessuno.
    const mapa = new Map<string, Archivo[]>()
    for (const d of subidos) mapa.set(d.id, [...(mapa.get(d.id) ?? []), d])

    // Le altre carte da cui lo stesso dato si legge: solo quelle che in
    // questo fascicolo si chiedono davvero. Mandare chi rivede a cercare
    // un NIF nel DNI del cliente quando il fascicolo arriva
    // dall'installatore — che quel documento non lo carica — è un giro a
    // vuoto.
    const enEsteExpediente = new Set(specs.map((s) => s.id))
    const fuentes = (c: CampoDef, docId: string) =>
        otrasFuentes(c, docId)
            .filter((d) => enEsteExpediente.has(d))
            .map(docLabel)

    const conDatos = specs
        .filter((s) => camposDe(s.id).length > 0)
        .sort((a, b) => camposDe(b.id).length - camposDe(a.id).length)
    const sinDatos = specs.filter((s) => camposDe(s.id).length === 0)

    /** La colonna dei campi, uguale dentro la riga e a tutto schermo. */
    const columnaCampos = (s: DocSpec, has: boolean) => {
        const campos = camposDe(s.id)
        const { seguros, dudosos } = corsie(campos, extraccion)

        if (campos.length === 0) {
            return (
                <p className="text-[13.5px] leading-[1.5] text-[var(--caes-mut)]">
                    De este documento no se extrae ningún dato. Sirve como comprobación: mira
                    que coincida con los demás y márcalo.
                </p>
            )
        }

        return (
            <div className="flex min-h-0 flex-col" data-campos>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                        {has ? 'Lo que sale de aquí' : 'Lo que saldría de aquí'}
                    </span>
                    <ConfirmarTodo
                        seguros={seguros}
                        dudosos={dudosos}
                        onConfirmar={onConfirmarVarios}
                        compacto
                    />
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    {campos.map((c) => (
                        <Campo
                            key={c.id}
                            def={c}
                            v={extraccion[c.id] ?? { valor: null, estado: 'vacio' }}
                            otras={fuentes(c, s.id)}
                            onCambiar={(valor) => onCambiar(c.id, valor)}
                            onConfirmar={() => onConfirmar(c.id)}
                        />
                    ))}
                </div>
            </div>
        )
    }

    /** La colonna del documento: i file, il visore, il modo di aggiungerne. */
    const columnaDocumento = (s: DocSpec, docs: Archivo[], has: boolean) => (
        <div className="flex min-h-0 flex-1 flex-col gap-2.5">
            {has ? (
                <>
                    <Archivos
                        docs={docs}
                        cual={cual}
                        setCual={setCual}
                        onBorrar={(i) => void onBorrar(s.id, i).then(() => setCual(0))}
                        borrando={borrando === s.id}
                        onAnadir={() => inputs.current[s.id]?.click()}
                        multiple={s.multiple}
                    />
                    <div className="min-h-0 flex-1">
                        <DocumentViewer
                            key={`${s.id}-${cual}-${docs[cual]?.path ?? ''}`}
                            path={docs[cual]?.path}
                            nombre={docs[cual]?.name ?? s.label}
                            ampliado={ampliado}
                            onAmpliar={() => setAmpliado((a) => !a)}
                            onClose={() => (ampliado ? setAmpliado(false) : abrir(null))}
                        />
                    </div>
                </>
            ) : (
                <div className="flex flex-1 flex-col justify-center gap-3 rounded-xl border border-dashed border-[var(--caes-line)] p-6">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                        {s.required ? 'Documento obligatorio' : 'Documento opcional'} · no aportado
                    </span>
                    <p className="text-[13.5px] leading-[1.5] text-[var(--caes-mut)]">{s.why}</p>
                    <p className="text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                        Si te lo han mandado por otro canal, arrástralo aquí o súbelo tú: el
                        expediente no tiene por qué esperar a que el instalador vuelva al
                        portal. Y si lo que tienes es solo el dato y no la carta, escríbelo al
                        lado: queda como corregido, a tu nombre y no al del documento.
                        {s.required && ' Aun así, el expediente no se aprueba sin el documento.'}
                    </p>
                    <button
                        type="button"
                        onClick={() => inputs.current[s.id]?.click()}
                        className="mt-1 flex w-fit items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]"
                    >
                        <Paperclip className="h-3.5 w-3.5" />
                        Subirlo yo
                    </button>
                </div>
            )}
        </div>
    )

    const fila = (s: DocSpec) => {
        const docs = mapa.get(s.id) ?? []
        const has = docs.length > 0
        const ok = verified[s.id]
        const campos = camposDe(s.id)
        // I campi di controllo si mostrano ma non si contano: il conteggio
        // dice quanto lavoro resta, e su quelli non c'e lavoro da fare.
        const aConfirmar = campos.filter((c) => !c.control)
        const pendientes = aConfirmar.filter((c) => !hecho(extraccion[c.id])).length
        const esAbierto = abierto === s.id
        // Si apre anche senza documento, purche abbia qualcosa da mostrare.
        const abrible = has || campos.length > 0
        const cargando = subiendo === s.id
        const leyendoEste = leyendo === s.id
        const arrastrando = encima === s.id

        return (
            <li
                key={s.id}
                onDragOver={(e) => {
                    e.preventDefault()
                    setEncima(s.id)
                }}
                onDragLeave={() => setEncima((v) => (v === s.id ? null : v))}
                onDrop={(e) => {
                    e.preventDefault()
                    setEncima(null)
                    if (e.dataTransfer.files?.length) void onSubir(s.id, e.dataTransfer.files)
                }}
                className={`overflow-hidden rounded-xl border transition-colors ${arrastrando
                        ? 'border-[var(--caes-green)] bg-[var(--caes-green)]/[.06]'
                        : !has
                            ? 'border-dashed border-[var(--caes-line)]'
                            : esAbierto
                                ? 'border-[var(--caes-ink)]'
                                : ok
                                    ? 'border-[var(--caes-green)]/35 bg-[var(--caes-green)]/[.04]'
                                    : 'border-[var(--caes-line)]'
                    }`}
            >
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                    <button
                        type="button"
                        onClick={() => abrir(esAbierto ? null : s.id)}
                        disabled={!abrible}
                        className="flex min-w-0 flex-1 items-center gap-3.5 text-left disabled:cursor-default"
                    >
                        {/* Il marcatore dice una cosa sola: il documento c'e,
                            manca, o e gia verificato. */}
                        <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${!has
                                    ? s.required
                                        ? 'border-dashed border-[var(--caes-falta-ink)] text-[var(--caes-falta-ink)]'
                                        : 'border-dashed border-[var(--caes-line)] text-[var(--caes-faint)]'
                                    : ok
                                        ? 'border-[var(--caes-green)] bg-[var(--caes-green)] text-white'
                                        : 'border-[var(--caes-line-2)] text-[var(--caes-faint)]'
                                }`}
                        >
                            {!has ? (
                                <Upload className="h-3 w-3" strokeWidth={2} />
                            ) : ok ? (
                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            ) : (
                                <ChevronRight
                                    className={`h-3.5 w-3.5 transition-transform ${esAbierto ? 'rotate-90' : ''
                                        }`}
                                    strokeWidth={2.5}
                                />
                            )}
                        </span>

                        <span className="min-w-0">
                            <span
                                className={`block truncate text-[14.5px] font-medium ${has ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-faint)]'
                                    }`}
                            >
                                {s.label}
                            </span>
                            {arrastrando ? (
                                <span className="text-[12px] text-[var(--caes-green)]">
                                    Suéltalo aquí
                                </span>
                            ) : !has ? (
                                <span
                                    className={`text-[12px] ${s.required ? 'text-[var(--caes-falta-ink)]' : 'text-[var(--caes-faint)]'
                                        }`}
                                >
                                    {s.required
                                        ? 'Falta · sin él no se puede aprobar'
                                        : 'No aportado · opcional'}
                                </span>
                            ) : docs.length > 1 ? (
                                <span className="text-[12px] text-[var(--caes-faint)]">
                                    {docs.length} archivos
                                </span>
                            ) : null}
                        </span>
                    </button>

                    {/* I dati: pallini piu conteggio. Si legge senza aprire, e
                        si legge anche quando il documento non e arrivato —
                        e' proprio li che serve sapere cosa manca. */}
                    {aConfirmar.length > 0 && (
                        <span className="flex shrink-0 items-center gap-2.5">
                            <Puntos
                                total={aConfirmar.length}
                                hechos={aConfirmar.length - pendientes}
                            />
                            <span
                                className={`font-mono text-[11.5px] tabular-nums ${pendientes === 0
                                        ? 'text-[var(--caes-green)]'
                                        : has
                                            ? 'text-[var(--caes-falta-ink)]'
                                            : 'text-[var(--caes-faint)]'
                                    }`}
                            >
                                {aConfirmar.length - pendientes} / {aConfirmar.length} datos
                            </span>
                        </span>
                    )}

                    <input
                        ref={(el) => {
                            inputs.current[s.id] = el
                        }}
                        type="file"
                        accept={s.accept}
                        multiple={s.multiple}
                        className="hidden"
                        onChange={(e) => {
                            const files = e.target.files
                            if (files && files.length > 0) void onSubir(s.id, files)
                            // Azzerare il valore: altrimenti ricaricare lo
                            // stesso file due volte di fila non scatta.
                            e.target.value = ''
                        }}
                    />

                    <span className="flex shrink-0 items-center gap-1">
                        {cargando ? (
                            <span className="flex items-center gap-1.5 px-2 text-[12.5px] text-[var(--caes-mut)]">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Subiendo…
                            </span>
                        ) : (
                            <>
                                {/* Leggere col modello. Solo dove c'e qualcosa
                                    da leggere e qualcosa da cavarne. */}
                                {has && campos.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => void onLeer(s.id, cual)}
                                        disabled={leyendoEste}
                                        title="Extraer los datos de este documento"
                                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)] disabled:opacity-50"
                                    >
                                        {leyendoEste ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <ScanText className="h-3.5 w-3.5" />
                                        )}
                                        {leyendoEste ? 'Leyendo…' : 'Leer'}
                                    </button>
                                )}

                                {!has && campos.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => abrir(esAbierto ? null : s.id)}
                                        className="rounded-full px-3 py-1.5 text-[12.5px] text-[var(--caes-faint)] transition-colors hover:text-[var(--caes-ink)]"
                                    >
                                        {esAbierto ? 'Ocultar' : 'Qué sale de aquí'}
                                    </button>
                                )}

                                {!has && (
                                    <button
                                        type="button"
                                        onClick={() => inputs.current[s.id]?.click()}
                                        className="flex items-center gap-1.5 rounded-full border border-[var(--caes-line)] px-3 py-1.5 text-[12.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]"
                                    >
                                        <Paperclip className="h-3.5 w-3.5" />
                                        Subirlo yo
                                    </button>
                                )}

                                {has && (
                                    <button
                                        type="button"
                                        onClick={() => onVerificar(s.id)}
                                        className={`rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${ok
                                                ? 'text-[var(--caes-green)] hover:text-[var(--caes-ink)]'
                                                : 'border border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]'
                                            }`}
                                    >
                                        {ok ? 'Verificado' : 'Verificar'}
                                    </button>
                                )}
                            </>
                        )}
                    </span>
                </div>

                {/* Aperto: documento e campi affiancati.
                    L'altezza non e' un dettaglio estetico. Una fattura
                    dentro un riquadro basso resta illeggibile e chi rivede
                    finisce per scaricarsela — cioe' per uscire dal pannello,
                    che e' il contrario di quello che il pannello serve a
                    fare. */}
                {esAbierto && abrible && !ampliado && (
                    <div className="grid gap-5 border-t border-[var(--caes-line-2)] bg-[var(--caes-band)]/40 p-5 lg:h-[70vh] lg:min-h-[480px] lg:grid-cols-[minmax(0,1.55fr)_minmax(330px,1fr)]">
                        {/* L'altezza fissa vale solo dove le due colonne
                            stanno affiancate. Stretta, la griglia impila:
                            70vh spartiti in due darebbero mezzo schermo di
                            documento e mezzo di campi, cioe' nessuno dei
                            due usabile. */}
                        <div className="flex min-h-[420px] flex-col lg:min-h-0">
                            {columnaDocumento(s, docs, has)}
                        </div>
                        {columnaCampos(s, has)}
                    </div>
                )}
            </li>
        )
    }

    // Due assi indipendenti: i documenti e i dati. Mescolarli in un solo
    // conteggio nascondeva quale dei due stava frenando l'approvazione.
    const docsPresentes = specs.filter((s) => mapa.has(s.id)).length
    const docsVerificados = specs.filter((s) => mapa.has(s.id) && verified[s.id]).length
    const faltanObligatorios = specs.filter((s) => s.required && !mapa.has(s.id)).length

    // Un campo per id, non per riga: modello e NIF compaiono sotto piu di
    // una carta, e contarli due volte gonfiava il totale senza che ci
    // fosse niente in piu da confermare.
    const camposTotales = [
        ...new Map(
            specs
                .flatMap((s) => camposDe(s.id))
                .filter((c) => !c.control)
                .map((c) => [c.id, c])
        ).values(),
    ]
    const camposHechos = camposTotales.filter((c) => hecho(extraccion[c.id])).length
    const todo = corsie(camposTotales, extraccion)

    const abiertoSpec = specs.find((s) => s.id === abierto)
    const docsAbiertos = abiertoSpec ? (mapa.get(abiertoSpec.id) ?? []) : []

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col divide-y divide-[var(--caes-line-2)] rounded-xl border border-[var(--caes-line-2)] sm:flex-row sm:divide-x sm:divide-y-0">
                <Medidor
                    etiqueta="Documentos verificados"
                    hechos={docsVerificados}
                    total={docsPresentes}
                    nota={
                        faltanObligatorios > 0
                            ? `${faltanObligatorios} obligatorio${faltanObligatorios === 1 ? '' : 's'} sin aportar`
                            : 'Están todos los obligatorios'
                    }
                    acento={faltanObligatorios > 0}
                />
                <Medidor
                    etiqueta="Datos confirmados"
                    hechos={camposHechos}
                    total={camposTotales.length}
                    nota={
                        camposHechos === camposTotales.length
                            ? 'Nada pendiente de comprobar'
                            : 'Ábrelos y compruébalos contra el documento'
                    }
                />
            </div>

            {/* La conferma in blocco di tutto il fascicolo sta qui in cima
                perche' e' la scorciatoia: si chiude in un gesto quello che
                non ha bisogno di essere guardato, e si scende solo sui
                gialli. */}
            {(todo.seguros.length > 0 || todo.dudosos.length > 0) && (
                <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5 rounded-xl border border-[var(--caes-line-2)] bg-[var(--caes-band)]/40 px-4 py-3">
                    <span className="text-[13px] leading-[1.45] text-[var(--caes-mut)]">
                        {todo.dudosos.length > 0 ? (
                            <>
                                {todo.seguros.length + todo.dudosos.length} datos leídos sin
                                confirmar.{' '}
                                <span className="text-[var(--caes-falta-ink)]">
                                    {todo.dudosos.length}{' '}
                                    {todo.dudosos.length === 1
                                        ? 'es una lectura poco segura'
                                        : 'son lecturas poco seguras'}
                                </span>{' '}
                                y conviene mirarlas contra el documento.
                            </>
                        ) : (
                            <>
                                {todo.seguros.length} datos leídos sin confirmar, todos con
                                lectura segura.
                            </>
                        )}
                    </span>
                    <ConfirmarTodo
                        seguros={todo.seguros}
                        dudosos={todo.dudosos}
                        onConfirmar={onConfirmarVarios}
                    />
                </div>
            )}

            <ul className="flex flex-col gap-2.5">{conDatos.map(fila)}</ul>

            {sinDatos.length > 0 && (
                <div className="flex flex-col gap-2.5">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                        Solo comprobación · no se extrae nada
                    </span>
                    <ul className="flex flex-col gap-2.5">{sinDatos.map(fila)}</ul>
                </div>
            )}

            <Avisos lista={avisos(extraccion)} />

            {/* A tutto schermo: la stessa roba, grande.
                Il documento prende quasi tutta la finestra e i campi
                restano di fianco, perche' verificare vuol dire guardare
                l'uno e scrivere nell'altro senza cambiare schermata. */}
            {ampliado && abiertoSpec && (
                <div className="fixed inset-0 z-50 flex flex-col gap-4 bg-[var(--caes-paper)] p-4 lg:p-6">
                    <div className="flex items-center justify-between gap-4">
                        <span className="truncate text-[15px] font-medium text-[var(--caes-ink)]">
                            {abiertoSpec.label}
                        </span>
                        <button
                            type="button"
                            onClick={() => setAmpliado(false)}
                            className="flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-3.5 py-1.5 text-[12.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cerrar · Esc
                        </button>
                    </div>
                    <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
                        {columnaDocumento(abiertoSpec, docsAbiertos, docsAbiertos.length > 0)}
                        {columnaCampos(abiertoSpec, docsAbiertos.length > 0)}
                    </div>
                </div>
            )}
        </div>
    )
}
