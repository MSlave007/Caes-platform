'use client'

import { useRef, useState } from 'react'
import {
    Check,
    ChevronRight,
    AlertTriangle,
    Upload,
    Loader2,
    Paperclip,
    ScanText,
    Trash2,
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
 * ── ANCHE QUANDO IL DOCUMENTO NON C'È ─────────────────────────────────
 *
 * Prima le righe senza documento erano spente: non si aprivano e non
 * dicevano niente. Chi rivede vedeva «Falta» e basta, senza sapere cosa
 * quella carta avrebbe dovuto dare — e un buco di cui non conosci il
 * contenuto non si può né valutare né tappare.
 *
 * Adesso si aprono lo stesso. Dentro non c'è il visore, c'è l'elenco dei
 * dati che quel documento avrebbe portato, con la riga di aiuto che dice
 * dove si leggono di solito. Sono campi scrivibili: se il dato lo si ha
 * per un'altra via lo si mette a mano e resta marcato «corregido», cioè a
 * nome di chi rivede e non del documento. La differenza fra «manca una
 * carta» e «manca un dato» torna visibile, che è quello che serve per
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
     * Si sbaglia: la fattura finisce nello slot del certificato, lo
     * stesso PDF entra due volte. Senza un modo di disfare, l'unico
     * rimedio era lasciare lì il file sbagliato — e un fascicolo con
     * dentro la carta di un altro è peggio di un fascicolo incompleto.
     *
     * L'indice è quello del file dentro lo slot: un riquadro ne contiene
     * più d'uno e si cancella quello che si sta guardando, non il primo.
     */
    onBorrar: (docId: string, indice: number) => Promise<void>
    /** Slot in cui una cancellazione è in corso. */
    borrando: string | null
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
    const confirmado = v.estado === 'confirmado' || v.estado === 'corregido'
    const dudoso = !confirmado && typeof v.confianza === 'number' && v.confianza < CONFIANZA_BAJA
    const vacio = v.valor === null || v.valor === ''

    return (
        <div className="flex flex-col gap-1 border-b border-[var(--caes-line-2)] py-2.5 last:border-b-0">
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
                            inputMode={def.tipo === 'numero' ? 'decimal' : undefined}
                            placeholder="—"
                            className={`rounded-[6px] border bg-white px-2.5 py-1.5 text-[13.5px] text-[var(--caes-ink)] outline-none focus:border-[var(--caes-green)] ${
                                // I testi lunghi — nome, indirizzo, codice modello —
                                // in 104 px a destra non si leggevano: si vedeva la
                                // coda della stringa e mai l'inizio.
                                def.tipo === 'texto'
                                    ? 'w-[168px] text-left'
                                    : 'w-[104px] text-right tabular-nums'
                                } ${dudoso ? 'border-[#D9A94F]' : 'border-[var(--caes-line)]'}`}
                        />
                        <span className="w-[62px] font-mono text-[10px] text-[var(--caes-faint)]">
                            {def.unidad ?? ''}
                        </span>
                    </span>
                )}

                {/* I campi di controllo non si spuntano: nessuno risponde
                    di loro, servono solo al paragone qui sotto. */}
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
                <span className="pr-[92px] text-[11.5px] leading-[1.4] text-[var(--caes-faint)]">
                    {def.ayuda}
                </span>
            )}

            {/* Lo stesso dato in un'altra carta non è una ripetizione: è il
                riscontro. Se le due non coincidono, il fascicolo ha un
                problema che qui si vede e altrove no. */}
            {otras.length > 0 && (
                <span className="pr-[92px] text-[11.5px] leading-[1.4] text-[var(--caes-faint)]">
                    También en: {otras.join(' · ')}
                </span>
            )}

            {dudoso && (
                <span className="flex items-center gap-1.5 text-[11.5px] text-[#8A5B0B]">
                    <AlertTriangle className="h-3 w-3" />
                    Lectura poco segura ({Math.round((v.confianza ?? 0) * 100)} %)
                </span>
            )}
        </div>
    )
}

/** Barra di avanzamento: quanto e fatto su quanto serve. */
function Medidor({
    etiqueta,
    hecho,
    total,
    nota,
    acento,
}: {
    etiqueta: string
    hecho: number
    total: number
    nota: string
    acento?: boolean
}) {
    const pct = total === 0 ? 100 : Math.round((hecho / total) * 100)
    const completo = hecho === total

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
                    {hecho}
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
                                ? 'bg-[#D9A94F]'
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
    const hechos = lista.filter((a) => a.estado === 'ok')
    const pendientes = lista.filter((a) => a.estado === 'pendiente')

    return (
        <div className="flex flex-col gap-2.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                Contrastes entre documentos · automáticos
            </span>

            {alarmas.map((a) => (
                <div
                    key={a.comprobacion.id}
                    className="flex gap-3.5 rounded-xl border border-[#D9A94F] bg-[#D9A94F]/[.07] px-4 py-3.5"
                >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#8A5B0B]" />
                    <div className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-[14px] font-medium text-[var(--caes-ink)]">
                            {a.comprobacion.titulo}
                        </span>
                        <span className="font-mono text-[12px] tabular-nums text-[#8A5B0B]">
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
            {(hechos.length > 0 || pendientes.length > 0) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl border border-[var(--caes-line-2)] px-4 py-3">
                    {hechos.length > 0 && (
                        <span className="flex items-center gap-2 text-[12.5px] text-[var(--caes-mut)]">
                            <Check
                                className="h-3.5 w-3.5 text-[var(--caes-green)]"
                                strokeWidth={3}
                            />
                            {hechos.length}{' '}
                            {hechos.length === 1 ? 'contraste cuadra' : 'contrastes cuadran'}
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

export default function DocumentReview({
    specs,
    subidos,
    verified,
    onVerificar,
    extraccion,
    onCambiar,
    onConfirmar,
    onSubir,
    subiendo,
    onLeer,
    leyendo,
    onBorrar,
    borrando,
}: Props) {
    const [abierto, setAbierto] = useState<string | null>(null)
    // Un input per slot: uno solo condiviso costringerebbe a ricordarsi
    // per quale riga era stato aperto.
    const inputs = useRef<Record<string, HTMLInputElement | null>>({})
    // Quale dei file dello slot aperto si sta guardando. Un riquadro puo
    // contenerne piu di uno: le tre foto dell'impianto sono un gesto solo
    // in cantiere, ma qui si guardano una per una.
    const [cual, setCual] = useState(0)

    const abrir = (id: string | null) => {
        setAbierto(id)
        setCual(0)
    }

    // Raggruppati, non indicizzati: con una Map a chiave unica il secondo
    // file di uno slot spariva senza dirlo a nessuno.
    const mapa = new Map<string, typeof subidos>()
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

    const fila = (s: DocSpec) => {
        const docs = mapa.get(s.id) ?? []
        const has = docs.length > 0
        const ok = verified[s.id]
        const campos = camposDe(s.id)
        // I campi di controllo si mostrano ma non si contano: il conteggio
        // dice quanto lavoro resta, e su quelli non c'e lavoro da fare.
        const aConfirmar = campos.filter((c) => !c.control)
        const pendientes = aConfirmar.filter(
            (c) => !['confirmado', 'corregido'].includes(extraccion[c.id]?.estado ?? 'vacio')
        ).length
        const esAbierto = abierto === s.id
        // Si apre anche senza documento, purche abbia qualcosa da mostrare.
        const abrible = has || campos.length > 0
        const cargando = subiendo === s.id
        const leyendoEste = leyendo === s.id
        const borrandoEste = borrando === s.id

        return (
            <li
                key={s.id}
                className={`overflow-hidden rounded-xl border transition-colors ${!has
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
                                        ? 'border-dashed border-[#C4863F] text-[#C4863F]'
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
                            {!has ? (
                                <span
                                    className={`text-[12px] ${s.required ? 'text-[#8A5B0B]' : 'text-[var(--caes-faint)]'
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
                                            ? 'text-[#8A5B0B]'
                                            : 'text-[var(--caes-faint)]'
                                    }`}
                            >
                                {aConfirmar.length - pendientes} / {aConfirmar.length} datos
                            </span>
                        </span>
                    )}

                    {/* Caricare da qui. L'input sta fuori dalla condizione
                        perche serve in tutti e due i casi: aggiungere la
                        carta che manca, o aggiungerne un'altra a quelle che
                        ci sono gia. */}
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
                        {/* Leggere col modello. Solo dove c'e qualcosa da
                            leggere e qualcosa da cavarne. */}
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

                        {/* Senza documento non c'e niente da verificare, ma
                            qualcosa da guardare si': va detto a parole, che
                            una riga tratteggiata da sola non invita a
                            cliccare. */}
                        {!has && campos.length > 0 && (
                            <button
                                type="button"
                                onClick={() => abrir(esAbierto ? null : s.id)}
                                className="rounded-full px-3 py-1.5 text-[12.5px] text-[var(--caes-faint)] transition-colors hover:text-[var(--caes-ink)]"
                            >
                                {esAbierto ? 'Ocultar' : 'Qué sale de aquí'}
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => inputs.current[s.id]?.click()}
                            disabled={cargando}
                            title={has ? 'Añadir otro archivo' : 'Subir este documento'}
                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors disabled:opacity-50 ${has
                                    ? 'text-[var(--caes-faint)] hover:text-[var(--caes-ink)]'
                                    : 'border border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]'
                                }`}
                        >
                            {cargando ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Paperclip className="h-3.5 w-3.5" />
                            )}
                            {cargando ? 'Subiendo…' : has ? 'Añadir' : 'Subirlo yo'}
                        </button>

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
                    </span>
                </div>

                {/* Aperto: documento e suoi campi affiancati, tutta la larghezza */}
                {esAbierto && abrible && (
                    <div className="grid gap-5 border-t border-[var(--caes-line-2)] bg-[var(--caes-band)]/40 p-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                        <div className="flex min-h-[300px] flex-col gap-2.5">
                            {has ? (
                                <>
                                    {/* Piu file nello stesso riquadro: si sceglie
                                        quale guardare, senza chiudere e riaprire.
                                        Accanto, il modo di toglierne uno: si
                                        cancella QUELLO che si sta guardando, che
                                        e' l'unico che si e' appena visto essere
                                        sbagliato. */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        {docs.length > 1 &&
                                            docs.map((d, i) => (
                                                <button
                                                    key={`${d.name}-${i}`}
                                                    type="button"
                                                    onClick={() => setCual(i)}
                                                    className={`max-w-[190px] truncate rounded-full border px-3 py-1.5 text-[12px] transition-colors ${i === cual
                                                            ? 'border-[var(--caes-ink)] bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                                            : 'border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)] hover:text-[var(--caes-ink)]'
                                                        }`}
                                                >
                                                    {d.name}
                                                </button>
                                            ))}

                                        <button
                                            type="button"
                                            disabled={borrandoEste}
                                            onClick={() => {
                                                const cual_ = docs[cual]
                                                if (!cual_) return
                                                // Cancellare un documento non si
                                                // annulla: si chiede, e si dice
                                                // quale, perche in un riquadro con
                                                // tre foto «questo» non basta.
                                                if (
                                                    !window.confirm(
                                                        `¿Borrar «${cual_.name}»? No se puede deshacer.`
                                                    )
                                                )
                                                    return
                                                void onBorrar(s.id, cual).then(() => setCual(0))
                                            }}
                                            className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] text-[var(--caes-faint)] transition-colors hover:text-[#8A2E2E] disabled:opacity-50"
                                        >
                                            {borrandoEste ? (
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-3.5 w-3.5" />
                                            )}
                                            {borrandoEste
                                                ? 'Borrando…'
                                                : docs.length > 1
                                                    ? 'Borrar el que veo'
                                                    : 'Borrar'}
                                        </button>
                                    </div>
                                    <div className="min-h-0 flex-1">
                                        <DocumentViewer
                                            key={`${s.id}-${cual}`}
                                            path={docs[cual]?.path}
                                            nombre={docs[cual]?.name ?? s.label}
                                            onClose={() => abrir(null)}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-1 flex-col justify-center gap-3 rounded-xl border border-dashed border-[var(--caes-line)] p-6">
                                    <span className="font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                                        {s.required ? 'Documento obligatorio' : 'Documento opcional'}{' '}
                                        · no aportado
                                    </span>
                                    <p className="text-[13.5px] leading-[1.5] text-[var(--caes-mut)]">
                                        {s.why}
                                    </p>
                                    <p className="text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                                        Si te lo han mandado por otro canal — WhatsApp, un
                                        correo, un Drive — súbelo tú con «Subirlo yo»: el
                                        expediente no tiene por qué esperar a que el instalador
                                        vuelva al portal. Y si lo que tienes es solo el dato y no
                                        la carta, escríbelo al lado: queda como corregido, a tu
                                        nombre y no al del documento.
                                        {s.required && ' Aun así, el expediente no se aprueba sin el documento.'}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col">
                            {campos.length > 0 ? (
                                <>
                                    <span className="mb-1 font-mono text-[9.5px] uppercase tracking-[.14em] text-[var(--caes-faint)]">
                                        {has ? 'Lo que sale de aquí' : 'Lo que saldría de aquí'}
                                    </span>
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
                                </>
                            ) : (
                                <p className="text-[13.5px] leading-[1.5] text-[var(--caes-mut)]">
                                    De este documento no se extrae ningún dato. Sirve como
                                    comprobación: mira que coincida con los demás y márcalo.
                                </p>
                            )}
                        </div>
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
    const camposHechos = camposTotales.filter((c) =>
        ['confirmado', 'corregido'].includes(extraccion[c.id]?.estado ?? 'vacio')
    ).length

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col divide-y divide-[var(--caes-line-2)] rounded-xl border border-[var(--caes-line-2)] sm:flex-row sm:divide-x sm:divide-y-0">
                <Medidor
                    etiqueta="Documentos verificados"
                    hecho={docsVerificados}
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
                    hecho={camposHechos}
                    total={camposTotales.length}
                    nota={
                        camposHechos === camposTotales.length
                            ? 'Nada pendiente de comprobar'
                            : 'Ábrelos y compruébalos contra el documento'
                    }
                />
            </div>

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
        </div>
    )
}
