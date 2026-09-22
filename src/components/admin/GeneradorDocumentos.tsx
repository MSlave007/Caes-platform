'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
    AlertTriangle,
    Check,
    ChevronDown,
    Download,
    FileText,
    Pencil,
    ExternalLink,
    PenLine,
    RotateCcw,
} from 'lucide-react'
import Firmas, { type Estado as EstadoFirmas } from '@/components/admin/Firmas'
import FirmaEnHoja, { type AjusteFirma } from '@/components/admin/FirmaEnHoja'
import {
    HUECOS,
    PLANTILLAS,
    estadoDe,
    faltanEn,
    type Bloque,
    type Datos,
    type Hueco,
    type Origen,
    type Plantilla,
} from '@/lib/caes/plantillas'
import BuscarCatastro from './BuscarCatastro'
import type { Localizacion } from '@/lib/caes/catastro'

/**
 * Anteprima dei documenti che il fascicolo produce.
 *
 * ── A COSA SERVE VEDERLI PRIMA ────────────────────────────────────────
 *
 * Il salto fra «ho i dati» e «ho i documenti» sembra automatico e non lo
 * è: i tre documenti chiedono una ventina di cose, e solo una parte esce
 * dalle carte che l'installatore carica. Il resto sta nell'anagrafica,
 * nel Catasto, o non sta da nessuna parte.
 *
 * Questa schermata mostra i documenti come verranno, con i buchi ancora
 * aperti evidenziati e detto da dove dovrebbero riempirsi. È più utile di
 * un elenco di campi mancanti perché li mostra nel posto in cui mancano:
 * un buco in mezzo a una clausola si capisce subito quanto pesa, la
 * stessa riga in una lista no.
 *
 * ── PERCHÉ IL FOGLIO STA AL CENTRO E DA SOLO ──────────────────────────
 *
 * Prima il documento aveva una colonna di servizio a destra: che cos'è,
 * cosa manca, cosa è stato corretto, i bottoni. Tre cose diverse
 * impaginate come se fossero una, e il foglio stretto in due terzi di
 * schermo — cioè la cosa che si è venuti a guardare, ridotta a comparsa.
 *
 * Adesso il foglio è al centro, largo quanto una pagina, e attorno non ha
 * niente. Quello che lo descrive sta sopra, prima di entrare nel
 * documento: si legge una volta e poi si smette di guardarlo. Quello che
 * serve dopo averlo letto — scaricare, mandare a firmare — sta in una
 * barra che resta a fondo schermo mentre si scorre, perché sono azioni
 * che uno decide alla fine del documento ma da qualunque punto.
 *
 * ── I TRE GRADINI ─────────────────────────────────────────────────────
 *
 * `incompleto` → manca un dato obbligatorio, non si emette.
 * `listo para revisar` → ci sono tutti, ma nessuno li ha ancora guardati.
 * `listo para firmar` → qualcuno li ha guardati e ci mette la faccia.
 *
 * Il salto dal secondo al terzo non lo fa il programma. È la stessa
 * regola dell'estrazione: la macchina propone, la firma la copre una
 * persona.
 */

type Props = {
    /** Serve a chiedere il PDF: i dati veri li rimonta il server. */
    expedienteId: string
    datos: Datos
    /**
     * Quello che è stato riscritto a mano dentro il documento.
     *
     * Tenuto separato da `datos` apposta: i valori sono già dentro, ma
     * sapere QUALI sono stati toccati è la differenza fra un documento
     * generato e un documento generato e poi corretto. Il secondo, se
     * nessuno si ricorda quali erano, si rigenera perdendo le correzioni.
     */
    retoques: Datos
    onRetocar: (huecoId: string, valor: string) => void
    /** Torna al valore che veniva dai dati. */
    onDeshacer: (huecoId: string) => void
    /** Documenti già passati in rassegna da una persona. */
    revisados: Record<string, boolean>
    onRevisar: (plantillaId: string) => void
    /** L'anteprima sta girando su dati inventati. */
    conEjemplo?: boolean
}

const ORIGEN_LABEL: Record<Origen, string> = {
    extraido: 'de los documentos',
    perfil: 'de la ficha del instalador',
    agencia: 'lo pone la agencia',
    calculado: 'se calcula',
    catastro: 'del Catastro',
    fijo: 'fijo',
}

const ORIGEN_ORDEN: Origen[] = ['extraido', 'perfil', 'catastro', 'agencia', 'calculado', 'fijo']

/* ==================================================================== *
 *  IL TESTO SCRIVIBILE
 * ==================================================================== */

/**
 * Un buco, scrivibile dentro il documento.
 *
 * ── PERCHÉ contentEditable E NON UN input ─────────────────────────────
 *
 * Un `<input>` non va a capo. Dentro una clausola, un indirizzo di
 * sessanta caratteri in un input inline esce dal margine e sfonda
 * l'impaginazione. Uno `span` contentEditable invece si comporta come il
 * testo che lo circonda: va a capo, si giustifica, si stampa.
 *
 * Il prezzo è che il testo lì dentro lo scrive il DOM, non React. Se
 * React gli rimettesse i figli a ogni render, il cursore tornerebbe a
 * inizio riga a ogni tasto — il difetto classico di contentEditable.
 * Quindi l'elemento nasce senza figli e il valore ce lo mette un
 * effetto, ma solo quando nessuno ci sta scrivendo dentro.
 */
function Editable({
    valor,
    vacio,
    titulo,
    className,
    onCommit,
}: {
    valor: string
    /** Cosa si legge quando è vuoto. Lo scrive il CSS, non React. */
    vacio: string
    titulo: string
    className: string
    onCommit: (v: string) => void
}) {
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        if (document.activeElement === el) return
        if (el.textContent !== valor) el.textContent = valor
    }, [valor])

    return (
        <span
            ref={ref}
            data-hueco
            data-vacio={vacio}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            role="textbox"
            tabIndex={0}
            title={titulo}
            onBlur={(e) => {
                const v = (e.currentTarget.textContent ?? '').trim()
                if (v !== valor) onCommit(v)
            }}
            onKeyDown={(e) => {
                // Invio chiude, Esc annulla. In un documento l'a-capo
                // dentro un buco non vuol dire niente: il buco è un dato,
                // non un paragrafo.
                if (e.key === 'Enter') {
                    e.preventDefault()
                    e.currentTarget.blur()
                }
                if (e.key === 'Escape') {
                    e.preventDefault()
                    e.currentTarget.textContent = valor
                    e.currentTarget.blur()
                }
            }}
            onPaste={(e) => {
                // Incollare da un PDF porta dietro grassetti, font e
                // interruzioni di riga del documento di partenza. Qui
                // dentro deve entrare testo e basta.
                e.preventDefault()
                const t = e.clipboardData.getData('text/plain').replace(/\s+/g, ' ').trim()
                document.execCommand('insertText', false, t)
            }}
            className={className}
        />
    )
}

/**
 * Sostituisce i buchi nel testo.
 *
 * Quello che manca non diventa una stringa vuota: diventa una pastiglia
 * con il nome del dato e la sua provenienza. Un contratto con dei vuoti
 * invisibili si legge come se fosse finito, ed è il modo migliore per
 * mandare in firma un documento a metà.
 *
 * Tutti e tre gli stati — pieno, corretto a mano, vuoto — si scrivono.
 * Quello che cambia è il colore, perché sapere se un dato viene dalla
 * carta o dalla tastiera di chi rivede è un'informazione che serve a chi
 * firma. In stampa i colori spariscono: sul foglio è un documento, non
 * un modulo.
 */
function Texto({
    texto,
    datos,
    retoques,
    onRetocar,
    bloqueado,
}: {
    texto: string
    datos: Datos
    retoques: Datos
    onRetocar: (id: string, v: string) => void
    /** Firmato: i buchi si leggono e basta. Vedi `Firmas`. */
    bloqueado?: boolean
}) {
    const trozos = texto.split(/(\{\{\w+\}\})/g)

    return (
        <>
            {trozos.map((t, i) => {
                const m = t.match(/^\{\{(\w+)\}\}$/)
                if (!m) return <span key={i}>{t}</span>

                const id = m[1]
                const hueco = HUECOS[id]
                const valor = datos[id] ?? ''
                const aMano = retoques[id] !== undefined

                // Lo stato al passaggio del mouse e al fuoco sta in
                // globals.css, su [data-hueco]: una regola sola per tutti
                // e tre i colori, invece di tre varianti da tenere
                // allineate a mano.
                const color = !valor
                    ? 'border border-dashed border-[var(--caes-falta-ink)] bg-[var(--caes-falta)]/[.10] px-1.5 text-[var(--caes-falta-ink)]'
                    : aMano
                        ? 'bg-[var(--caes-ink)]/[.07] px-[3px] text-[var(--caes-ink)] underline decoration-[var(--caes-ink)]/30 decoration-dotted underline-offset-[3px] print:no-underline'
                        : 'bg-[var(--caes-green)]/[.10] px-[3px] text-[var(--caes-ink)]'

                /**
                 * Firmato: il buco smette di essere un campo.
                 *
                 * Non disabilitato — proprio non è più un campo: niente
                 * cursore, niente riquadro al passaggio del mouse, niente
                 * fuoco da tastiera. Un campo disabilitato invita a
                 * riprovare; un testo no.
                 */
                if (bloqueado) {
                    /**
                     * E senza i colori dei campi.
                     *
                     * Quei colori dicono da dove viene ogni dato — dalla
                     * carta o dalla tastiera di chi rivede — e servono
                     * finché c'è una decisione da prendere. Firmato non
                     * c'è più: è un documento, e un documento non ha i
                     * campi evidenziati. È la stessa cosa che si fa in
                     * stampa, per la stessa ragione.
                     *
                     * E lasciarli colorati inviterebbe a cliccarci, il
                     * che vuol dire far provare a correggere una cosa
                     * che non si corregge.
                     */
                    return (
                        <span key={`${id}-${i}`} title={titulo(hueco, id, aMano)}>
                            {valor}
                        </span>
                    )
                }

                return (
                    <Editable
                        key={`${id}-${i}`}
                        valor={valor}
                        vacio={hueco ? `${hueco.label} · ${ORIGEN_LABEL[hueco.origen]}` : id}
                        titulo={titulo(hueco, id, aMano)}
                        className={`print:bg-transparent print:px-0 ${color}`}
                        onCommit={(v) => onRetocar(id, v)}
                    />
                )
            })}
        </>
    )
}

type Trazo = {
    nombre: string
    cuando: string
    png?: string
    ajuste?: { escala: number; dx: number; dy: number }
}

function titulo(hueco: Hueco | undefined, id: string, aMano: boolean): string {
    if (aMano) return `${hueco?.label ?? id} · escrito a mano`
    return hueco?.nota ?? hueco?.label ?? id
}

function BloqueVista({
    b,
    datos,
    retoques,
    onRetocar,
    bloqueado,
    firmas,
    onMoverFirma,
    onQuitarFirma,
}: {
    b: Bloque
    datos: Datos
    retoques: Datos
    onRetocar: (id: string, v: string) => void
    bloqueado?: boolean
    /** Per ruolo: il tratto già raccolto, se c'è. */
    firmas?: Record<string, Trazo>
    onMoverFirma?: (rol: string, a: AjusteFirma) => void
    onQuitarFirma?: (rol: string) => void
}) {
    // Niente componente scorciatoia definito qui dentro: React lo
    // rimonterebbe a ogni render, e un contentEditable rimontato perde
    // il cursore mentre ci stai scrivendo.
    const propsTexto = { datos, retoques, onRetocar, bloqueado }

    switch (b.tipo) {
        case 'titulo':
            return (
                <h3 className="mb-6 mt-1 text-center text-[15px] font-semibold leading-[1.45] tracking-[-0.01em] text-[var(--caes-ink)]">
                    <Texto texto={b.texto} {...propsTexto} />
                </h3>
            )
        case 'seccion':
            return (
                <h4 className="mb-2.5 mt-6 text-[13px] font-semibold tracking-[-0.005em] text-[var(--caes-ink)]">
                    <Texto texto={b.texto} {...propsTexto} />
                </h4>
            )
        case 'parrafo':
            return (
                <p className="mb-3 text-justify text-[12.5px] leading-[1.7] text-[var(--caes-ink)]">
                    <Texto texto={b.texto} {...propsTexto} />
                </p>
            )
        case 'nota':
            return (
                <p className="mb-3 text-[11.5px] italic leading-[1.55] text-[var(--caes-mut)]">
                    <Texto texto={b.texto} {...propsTexto} />
                </p>
            )
        case 'campos':
            return (
                <dl className="mb-4 grid grid-cols-[minmax(160px,auto)_1fr] gap-x-5 gap-y-2 text-[12.5px] leading-[1.55]">
                    {b.filas.map((f, i) => (
                        <div key={i} className="contents">
                            <dt className="font-medium text-[var(--caes-mut)]">{f.etiqueta}</dt>
                            <dd className="text-[var(--caes-ink)]">
                                <Texto texto={f.texto} {...propsTexto} />
                            </dd>
                        </div>
                    ))}
                </dl>
            )
        case 'tabla':
            return (
                <div className="mb-4 overflow-x-auto">
                    <table className="w-full border-collapse text-[12px]">
                        <thead>
                            <tr>
                                {b.cabeceras.map((c, i) => (
                                    <th
                                        key={i}
                                        className="border border-[var(--caes-line)] bg-[var(--caes-band)] px-2.5 py-2 text-left font-semibold text-[var(--caes-ink)]"
                                    >
                                        {c}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {b.filas.map((fila, i) => (
                                <tr key={i}>
                                    {fila.map((celda, j) => (
                                        <td
                                            key={j}
                                            className="border border-[var(--caes-line)] px-2.5 py-2 text-[var(--caes-ink)]"
                                        >
                                            <Texto texto={celda} {...propsTexto} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )
        case 'firmas':
            return (
                <div className="mt-12 flex flex-wrap gap-12">
                    {b.partes.map((p, i) => {
                        const puesta = firmas?.[p.rol]
                        return (
                            <div key={i} className="min-w-[200px] flex-1">
                                <span className="block text-[11px] uppercase tracking-[.08em] text-[var(--caes-mut)]">
                                    {p.rol}
                                </span>

                                {/**
                                  * Il tratto sopra la riga, come sul PDF.
                                  *
                                  * Senza, chi aveva appena firmato vedeva il
                                  * pannello dire «firmato» e il foglio sopra
                                  * identico a prima — e l'unica conclusione
                                  * ragionevole è che non fosse successo
                                  * niente.
                                  */}
                                {/**
                                  * Qui la firma si prende e si sposta.
                                  *
                                  * Non è un'anteprima: è il posto dove si
                                  * decide dove va. Le misure sono le stesse
                                  * del PDF — stanno in `cajaFirma.ts` — così
                                  * dove la lasci è dove si stampa.
                                  */}
                                {puesta?.png ? (
                                    <FirmaEnHoja
                                        png={puesta.png}
                                        ajuste={
                                            puesta.ajuste ?? { escala: 1, dx: 0, dy: 0 }
                                        }
                                        partes={b.partes.length}
                                        onMover={(a) => onMoverFirma?.(p.rol, a)}
                                        onQuitar={() => onQuitarFirma?.(p.rol)}
                                    />
                                ) : (
                                    <span className="block h-[76px]" />
                                )}

                                {/* Firmato: il nome è quello di chi ha
                                    firmato, non quello che il modello si
                                    aspettava. È così che esce nel PDF, e
                                    due nomi diversi fra schermo e foglio
                                    sono il genere di differenza che si
                                    scopre quando è già stampato. */}
                                <span className="mt-2 block border-t border-[var(--caes-ink)] pt-2 text-[12.5px] text-[var(--caes-ink)]">
                                    {puesta ? (
                                        puesta.nombre
                                    ) : (
                                        <Texto texto={p.nombre} {...propsTexto} />
                                    )}
                                </span>

                                {puesta && (
                                    <span className="mt-1 block text-[10.5px] text-[var(--caes-mut)]">
                                        Firmado el {puesta.cuando}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                </div>
            )
    }
}

/* ==================================================================== *
 *  QUELLO CHE STA SOPRA AL FOGLIO
 * ==================================================================== */

/** Una riga che si apre. Sopra il riassunto, sotto il dettaglio. */
function Desplegable({
    resumen,
    children,
    tono = 'neutro',
}: {
    resumen: React.ReactNode
    children: React.ReactNode
    tono?: 'neutro' | 'aviso' | 'bien'
}) {
    const [abierto, setAbierto] = useState(false)

    const borde =
        tono === 'aviso'
            ? 'border-[var(--caes-falta)] bg-[var(--caes-falta)]/[.06]'
            : tono === 'bien'
                ? 'border-[var(--caes-green)]/40 bg-[var(--caes-green)]/[.05]'
                : 'border-[var(--caes-line-2)]'

    return (
        <div className={`rounded-xl border ${borde}`}>
            <button
                type="button"
                onClick={() => setAbierto((a) => !a)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
            >
                {resumen}
                <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-[var(--caes-faint)] transition-transform ${abierto ? 'rotate-180' : ''
                        }`}
                />
            </button>
            {abierto && (
                <div className="border-t border-[var(--caes-line-2)] px-4 py-3.5">{children}</div>
            )}
        </div>
    )
}

/** Cosa manca, raggruppato per chi lo deve procurare. */
function Faltan({ huecos }: { huecos: Hueco[] }) {
    const porOrigen = ORIGEN_ORDEN.map((o) => ({
        origen: o,
        lista: huecos.filter((h) => h.origen === o),
    })).filter((g) => g.lista.length > 0)

    return (
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {porOrigen.map((g) => (
                <div key={g.origen} className="flex flex-col gap-1.5">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                        {ORIGEN_LABEL[g.origen]} · {g.lista.length}
                    </span>
                    {g.lista.map((h) => (
                        <span
                            key={h.id}
                            className="text-[12.5px] leading-[1.45] text-[var(--caes-mut)]"
                        >
                            {h.label}
                            {h.nota && (
                                <span className="block text-[11.5px] text-[var(--caes-faint)]">
                                    {h.nota}
                                </span>
                            )}
                        </span>
                    ))}
                </div>
            ))}
        </div>
    )
}

/**
 * Il cartello che dice che si può scrivere.
 *
 * ── PERCHÉ NON BASTAVA IL CURSORE ─────────────────────────────────────
 *
 * Prima l'unico indizio era una riga di testo grigia e il cursore che
 * cambiava passandoci sopra. Non basta: in un documento uno non va a
 * strofinare il mouse sulle parole per scoprire se sono cliccabili,
 * perché i documenti non si cliccano. Se la cosa non è scritta, non
 * esiste.
 *
 * E i tre colori si spiegano qui una volta invece di lasciarli
 * indovinare: sapere che il grigio punteggiato vuol dire «l'ha scritto
 * una persona» cambia come si legge il documento.
 */
function Leyenda() {
    const muestras = [
        { clase: 'bg-[var(--caes-green)]/[.18]', texto: 'de los documentos' },
        {
            clase: 'bg-[var(--caes-ink)]/[.12] underline decoration-dotted underline-offset-[3px]',
            texto: 'escrito a mano',
        },
        {
            clase: 'border border-dashed border-[var(--caes-falta-ink)] bg-[var(--caes-falta)]/[.18]',
            texto: 'todavía falta',
        },
    ]

    return (
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-4 text-center">
            <span className="flex items-center gap-2 text-[13px] text-[var(--caes-mut)]">
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                Haz clic en cualquier dato resaltado para corregirlo.
            </span>
            <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5">
                {muestras.map((m) => (
                    <span
                        key={m.texto}
                        className="flex items-center gap-1.5 text-[12px] text-[var(--caes-faint)]"
                    >
                        <span className={`h-3 w-6 rounded-[3px] ${m.clase}`} />
                        {m.texto}
                    </span>
                ))}
            </span>
        </div>
    )
}

/* ==================================================================== *
 *  LA SCHERMATA
 * ==================================================================== */

export default function GeneradorDocumentos({
    expedienteId,
    datos,
    retoques,
    onRetocar,
    onDeshacer,
    revisados,
    onRevisar,
    conEjemplo,
}: Props) {
    const [activa, setActiva] = useState<Plantilla['id']>('convenio')
    /**
     * Lo stato delle firme vive qui e non dentro `Firmas`.
     *
     * Perché lo guardano in due, e sono fratelli: il foglio, che ci
     * disegna sopra i tratti e smette di farsi correggere, e il pannello
     * sotto. Tenendolo dentro il pannello, il foglio sopra non saprebbe
     * di essere firmato.
     */
    const [firmasDe, setFirmasDe] = useState<Record<string, EstadoFirmas | null>>({})
    const estadoFirmas = firmasDe[activa] ?? null
    const plantilla = PLANTILLAS.find((p) => p.id === activa) ?? PLANTILLAS[0]

    // Il pannello si rilegge da solo quando si torna sulla scheda, e
    // ogni lettura passa di qui. Va tenuto stabile o l'effetto che lo
    // chiama riparte a ogni render.
    const recibirFirmas = useCallback(
        (e: EstadoFirmas | null) => setFirmasDe((m) => ({ ...m, [activa]: e })),
        [activa]
    )

    /** Per ruolo: il tratto, la data e come sta nel riquadro. */
    const trazos = useMemo(() => {
        const m: Record<string, Trazo> = {}
        for (const f of estadoFirmas?.firmas ?? []) {
            m[f.rol] = {
                nombre: f.nombre,
                cuando: f.cuando,
                png: f.png,
                ajuste: f.ajuste,
            }
        }
        return m
    }, [estadoFirmas])

    const bloqueado = Boolean(estadoFirmas?.bloqueado) && !conEjemplo
    /** Firmato da tutte le parti: non c'è più niente da chiedere. */
    const firmado =
        !conEjemplo &&
        Boolean(estadoFirmas) &&
        (estadoFirmas?.faltan.length ?? 1) === 0

    /**
     * Spostare e togliere si fanno sul foglio, ma li esegue il pannello.
     *
     * È lui che parla con `/api/firmas` e che tiene lo stato: due posti
     * che scrivono la stessa cosa sarebbero due posti da tenere
     * allineati. Il foglio chiede, il pannello fa.
     */
    const acciones = useRef<{
        mover?: (rol: string, a: AjusteFirma) => void
        quitar?: (rol: string) => void
    }>({})
    const moverFirma = useCallback(
        (rol: string, a: AjusteFirma) => acciones.current.mover?.(rol, a),
        []
    )
    const quitarFirma = useCallback(
        (rol: string) => acciones.current.quitar?.(rol),
        []
    )

    const faltan = useMemo(() => faltanEn(plantilla, datos), [plantilla, datos])
    const estado = estadoDe(plantilla, datos, Boolean(revisados[plantilla.id]))
    const retocados = Object.keys(retoques)

    /**
     * L'indirizzo del PDF vero.
     *
     * Non porta i dati: porta quale fascicolo e quale documento. Li
     * rimonta il server dall'estrazione confermata e dai ritocchi
     * salvati — vedi `/api/documentos`. Un contratto firmato non si
     * compone con quello che dice il browser.
     */
    const enlace = (descargar: boolean) =>
        `/api/documentos?id=${encodeURIComponent(expedienteId)}` +
        `&plantilla=${plantilla.id}` +
        (conEjemplo ? '&ejemplo=1' : '') +
        (descargar ? '&descargar=1' : '')

    return (
        <div className="flex flex-col gap-5">
            {/* ── le tre schede ───────────────────────────────────── */}
            <div className="flex flex-wrap gap-2 print:hidden">
                {PLANTILLAS.map((p) => {
                    const f = faltanEn(p, datos).length
                    const e = estadoDe(p, datos, Boolean(revisados[p.id]))
                    const sel = p.id === activa

                    return (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => setActiva(p.id)}
                            className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-left transition-colors ${sel
                                    ? 'border-[var(--caes-ink)] bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                    : 'border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]'
                                }`}
                        >
                            <FileText className="h-3.5 w-3.5 shrink-0" />
                            <span className="text-[13.5px] font-medium">{p.nombre}</span>
                            <span
                                className={`font-mono text-[11px] ${sel
                                        ? 'opacity-70'
                                        : e === 'incompleto'
                                            ? 'text-[var(--caes-falta-ink)]'
                                            : 'text-[var(--caes-green)]'
                                    }`}
                            >
                                {e === 'incompleto'
                                    ? `faltan ${f}`
                                    : e === 'listo_firmar'
                                        ? 'para firmar'
                                        : 'para revisar'}
                            </span>
                        </button>
                    )
                })}
            </div>

            {conEjemplo && (
                <p className="flex items-center gap-2.5 rounded-xl border border-[var(--caes-falta-ink)] bg-[var(--caes-falta)]/[.10] px-4 py-3 text-[12.5px] text-[var(--caes-falta-ink)] print:hidden">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Vista con datos de ejemplo del expediente de muestra. No son datos reales de
                    este expediente.
                </p>
            )}

            {/* ── cosa è questo documento ─────────────────────────── */}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-1 print:hidden">
                <span className="text-[14px] font-medium text-[var(--caes-ink)]">
                    {plantilla.nombre}
                </span>
                <span className="text-[12.5px] leading-[1.5] text-[var(--caes-mut)]">
                    {plantilla.queEs}
                </span>
                <span className="text-[12px] text-[var(--caes-faint)]">
                    Lo firma: {plantilla.firman.toLowerCase()}
                </span>
            </div>

            {/* ── cosa manca, e cosa è stato corretto ─────────────── */}
            <div className="flex flex-col gap-2.5 print:hidden">
                {faltan.length > 0 ? (
                    <Desplegable
                        tono="aviso"
                        resumen={
                            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--caes-ink)]">
                                    <AlertTriangle className="h-3.5 w-3.5 text-[var(--caes-falta-ink)]" />
                                    Faltan {faltan.length} datos para poder emitirlo
                                </span>
                                <span className="text-[12px] text-[var(--caes-mut)]">
                                    {ORIGEN_ORDEN.map((o) => {
                                        const n = faltan.filter((h) => h.origen === o).length
                                        return n > 0 ? `${ORIGEN_LABEL[o]} (${n})` : null
                                    })
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            </span>
                        }
                    >
                        <Faltan huecos={faltan} />

                        {/* Quando mancano dati del Catastro, il modo di
                            prenderli sta QUI, accanto all'elenco di cosa
                            manca — non in un'altra scheda. Vedi
                            src/components/admin/BuscarCatastro.tsx. */}
                        {faltan.some((h) => h.origen === 'catastro') && (
                            <div className="mt-5">
                                <BuscarCatastro
                                    sugerida={String(datos.ref_catastral ?? '')}
                                    onEncontrado={(d: Localizacion) => {
                                        // Uno per uno, come se li avesse
                                        // scritti chi rivede: restano suoi,
                                        // e si possono correggere a mano
                                        // come qualunque altro ritocco.
                                        for (const [id, valor] of Object.entries(d)) {
                                            if (id === 'direccion') continue
                                            if (valor) onRetocar(id, String(valor))
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </Desplegable>
                ) : (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[var(--caes-green)]/40 bg-[var(--caes-green)]/[.05] px-4 py-3">
                        <span className="flex items-center gap-2 text-[13px] font-medium text-[var(--caes-ink)]">
                            <Check className="h-3.5 w-3.5 text-[var(--caes-green)]" strokeWidth={3} />
                            Están todos los datos
                        </span>
                        <span className="text-[12.5px] text-[var(--caes-mut)]">
                            {estado === 'listo_firmar'
                                ? 'Revisado. Puede ir a firma.'
                                : 'Léelo entero antes de darlo por bueno: los datos están, pero nadie los ha visto en su sitio.'}
                        </span>
                    </div>
                )}

                {retocados.length > 0 && (
                    <Desplegable
                        resumen={
                            <span className="flex items-center gap-2 text-[12.5px] text-[var(--caes-mut)]">
                                <Pencil className="h-3.5 w-3.5 text-[var(--caes-faint)]" />
                                {retocados.length}{' '}
                                {retocados.length === 1
                                    ? 'dato escrito a mano'
                                    : 'datos escritos a mano'}
                            </span>
                        }
                    >
                        <div className="grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                            {retocados.map((id) => (
                                <span
                                    key={id}
                                    className="flex items-start justify-between gap-2 text-[12.5px] leading-[1.4] text-[var(--caes-mut)]"
                                >
                                    <span className="min-w-0">
                                        {HUECOS[id]?.label ?? id}
                                        <span className="block truncate text-[11.5px] text-[var(--caes-faint)]">
                                            {retoques[id] || '(vacío)'}
                                        </span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => onDeshacer(id)}
                                        title="Volver al valor de los datos"
                                        className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                                    >
                                        <RotateCcw className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </Desplegable>
                )}
            </div>

            {/**
              * Sui dati di esempio si dice perché non si può firmare.
              *
              * Il pannello spariva e basta, e la barra intanto diceva
              * «Listo para firmar»: restava una promessa che la pagina
              * non poteva mantenere. Nasconderlo è giusto — quelle firme
              * starebbero su dati inventati — ma va detto.
              */}
            {conEjemplo && (
                <p className="rounded-2xl border border-dashed border-[var(--caes-line)] px-5 py-4 text-[13px] leading-[1.5] text-[var(--caes-mut)] print:hidden">
                    Estás viendo <strong className="font-medium">datos de ejemplo</strong>,
                    así que aquí no se firma: esas firmas estarían sobre datos
                    inventados. Cambia a «Datos del expediente» arriba para firmarlo
                    de verdad.
                </p>
            )}

            {/* «Haz clic en cualquier dato para corregirlo» su un
                documento firmato è un invito a fare una cosa che non si
                può fare. */}
            {!bloqueado && (
                <div className="print:hidden">
                    <Leyenda />
                </div>
            )}

            {/* ── il foglio ───────────────────────────────────────── */}
            <div
                id="documento-imprimible"
                className="mx-auto w-full max-w-[820px] rounded-sm border border-[var(--caes-line-2)] bg-white px-10 py-12 shadow-[0_1px_2px_rgba(0,0,0,.04),0_12px_32px_-12px_rgba(0,0,0,.10)] sm:px-16 sm:py-16 print:max-w-none print:rounded-none print:border-0 print:px-0 print:py-0 print:shadow-none"
            >
                {plantilla.bloques.map((b, i) => (
                    <BloqueVista
                        key={i}
                        b={b}
                        datos={datos}
                        retoques={retoques}
                        onRetocar={onRetocar}
                        bloqueado={bloqueado}
                        firmas={trazos}
                        onMoverFirma={moverFirma}
                        onQuitarFirma={quitarFirma}
                    />
                ))}
            </div>

            {/**
              * Le firme sotto il foglio, non sopra.
              *
              * Si firma dopo aver letto, e la schermata mette le cose
              * nell'ordine in cui si fanno. Sopra, il riquadro della
              * firma sarebbe la prima cosa che si vede e l'ultima che
              * si dovrebbe toccare.
              *
              * Con i dati di esempio non compare: quelle firme starebbero
              * su dati inventati e non varrebbero niente, ma sembrerebbero
              * firme.
              */}
            {!conEjemplo && (
                <Firmas
                    expedienteId={expedienteId}
                    plantillaId={plantilla.id}
                    completo={faltan.length === 0}
                    onEstado={recibirFirmas}
                    acciones={acciones}
                />
            )}

            {/* ── le azioni finali, sempre a portata ──────────────── */}
            <div className="sticky bottom-5 z-30 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--caes-line)] bg-[var(--caes-paper)]/95 px-2.5 py-2 shadow-[0_2px_8px_rgba(0,0,0,.06),0_16px_40px_-16px_rgba(0,0,0,.22)] backdrop-blur print:hidden">
                {/**
                  * Lo stato, ma senza mentire sui dati di esempio.
                  *
                  * Lo calcolava su quello che aveva davanti, dati finti
                  * compresi: «Listo para firmar» era vero dell'esempio e
                  * falso di quel fascicolo.
                  */}
                <span
                    className={`flex items-center gap-2 px-3 text-[12.5px] ${conEjemplo
                            ? 'text-[var(--caes-faint)]'
                            : estado === 'incompleto'
                                ? 'text-[var(--caes-falta-ink)]'
                                : firmado
                                    ? 'text-[var(--caes-green)]'
                                    : 'text-[var(--caes-mut)]'
                        }`}
                >
                    {conEjemplo ? (
                        'Datos de ejemplo'
                    ) : estado === 'incompleto' ? (
                        <>
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Faltan {faltan.length}
                        </>
                    ) : firmado ? (
                        <>
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            Firmado
                        </>
                    ) : (
                        'Listo para firmar'
                    )}
                </span>

                {/**
                  * Firmare È la validazione.
                  *
                  * «Marcar como revisado» sembrava un passo prima della
                  * firma. Non lo è mai stato — firmare chiede solo che i
                  * dati siano completi — ma l'ordine dei bottoni lo
                  * faceva credere, e chi premeva «revisado» restava lì
                  * senza capire cosa fare dopo.
                  *
                  * Il bottone porta al pannello invece di firmare da qui:
                  * chi firma deve scegliere per chi, e vedere il foglio
                  * sopra.
                  */}
                {!conEjemplo && estado !== 'incompleto' && !firmado && (
                    <button
                        type="button"
                        onClick={() =>
                            document
                                .getElementById('firmas')
                                ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        }
                        className="flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-4 py-2 text-[12.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        <PenLine className="h-3.5 w-3.5" />
                        Firmar
                    </button>
                )}

                {/* Segnare come rivisti dei dati inventati non vuol
                    dire niente. */}
                {faltan.length === 0 && !conEjemplo && (
                    <button
                        type="button"
                        onClick={() => onRevisar(plantilla.id)}
                        className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] transition-colors ${estado === 'listo_firmar'
                                ? 'text-[var(--caes-green)] hover:text-[var(--caes-ink)]'
                                : 'border border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]'
                            }`}
                    >
                        <PenLine className="h-3.5 w-3.5" />
                        {estado === 'listo_firmar' ? 'Revisado' : 'Marcar como revisado'}
                    </button>
                )}

                {/**
                  * Aprire e scaricare sono due gesti diversi.
                  *
                  * Chi rivede vuole guardarlo — e lo guarda venti volte
                  * prima di mandarlo. Scaricare venti copie in
                  * «Descargas» per leggerle e poi cancellarle non e' un
                  * modo di lavorare.
                  *
                  * Tutti e due escono anche incompleti: la bozza serve
                  * proprio a vedere cosa manca, e quando manca qualcosa
                  * il PDF porta «BORRADOR» di traverso su ogni pagina.
                  */}
                <a
                    href={enlace(false)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-3.5 py-2 text-[12.5px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]"
                >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {faltan.length > 0 ? 'Ver el borrador' : 'Ver el PDF'}
                </a>

                <a
                    href={enlace(true)}
                    className="flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                >
                    <Download className="h-3.5 w-3.5" />
                    Descargar
                </a>
            </div>
        </div>
    )
}
