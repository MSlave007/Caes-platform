'use client'

import { use, useEffect, useRef, useState } from 'react'
import {
    Camera,
    Check,
    ExternalLink,
    FileText,
    ImageIcon,
    Loader2,
    Upload,
    X,
} from 'lucide-react'

/**
 * «Suelta aquí los papeles».
 *
 * ── PER CHI È ─────────────────────────────────────────────────────────
 *
 * Per un installatore in piedi in un pianerottolo, col telefono in una
 * mano. Non entra, non cerca il suo espediente fra quaranta, non deve
 * indovinare in che casella va ogni foto: apre il link che gli è
 * arrivato su WhatsApp e molla tutto.
 *
 * ── PERCHÉ QUASI NIENTE IN PAGINA ─────────────────────────────────────
 *
 * Perché è un indirizzo pubblico. Non c'è il nome del cliente, non c'è
 * la casa, non c'è una cifra: c'è il numero dell'espediente — che è suo
 * e lo riconosce — e una riga che ha scritto chi rivede.
 *
 * ── PERCHÉ DICE DOVE È FINITO OGNI FILE ───────────────────────────────
 *
 * Perché altrimenti è una scatola nera: uno carica sei foto, non succede
 * niente di visibile, e richiama per sapere se sono arrivate. Dire «esta
 * ha ido a: Foto de dónde estaba el equipo anterior» fa due cose: gli
 * conferma che è arrivata, e gli fa vedere l'errore quando c'è.
 */

/**
 * Fuori da Google, come la pagina del cliente. E un indirizzo pubblico
 * su cui si SCRIVE: farlo trovare a chi cerca sarebbe il modo piu
 * veloce di riempirlo di roba che non c entra.
 *
 * Il file e client, quindi il meta si mette con le regole del layout:
 * il robots.txt lo copre comunque, e li e dove conta.
 */
type Casilla = {
    id: string
    label: string
    why: string
    obligatorio: boolean
    /** Conviene scattarla in cantiere: è un lavoro diverso da cercare un PDF. */
    foto: boolean
    hecho: boolean
}
type Estado = {
    numero: string
    nota: string | null
    /** Il suo pannello, se ha un account. `null` se no. */
    panel: string | null
    /** Tutte le caselle, non solo quelle vuote. */
    lista: Casilla[]
    faltan: Casilla[]
    recibidos: number
}
type Subido = {
    /** Chiave stabile: due file possono chiamarsi uguale. */
    id: string
    nombre: string
    estado: 'subiendo' | 'hecho' | 'error'
    casilla?: string
    seguro?: boolean
    error?: string
}

export default function Subida({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params)

    const [estado, setEstado] = useState<Estado | null>(null)
    const [caducado, setCaducado] = useState(false)
    const [subidos, setSubidos] = useState<Subido[]>([])
    const [encima, setEncima] = useState(false)
    const input = useRef<HTMLInputElement>(null)
    const camara = useRef<HTMLInputElement>(null)
    const suelto = useRef<HTMLInputElement>(null)

    useEffect(() => {
        let vivo = true
        fetch(`/api/subida/${token}`)
            .then(async (r) => {
                if (!vivo) return
                if (!r.ok) {
                    setCaducado(true)
                    return
                }
                const j = await r.json()
                setEstado(j.data)
            })
            .catch(() => vivo && setCaducado(true))
        return () => {
            vivo = false
        }
    }, [token])

    /**
     * Uno per volta, non tutti insieme.
     *
     * Con sei foto in parallelo su una rete di cantiere si perde tutto
     * quando la terza fallisce. In fila, ognuna arriva o non arriva per
     * conto suo, e si vede quale.
     */
    async function mandar(archivos: FileList) {
        for (const archivo of Array.from(archivos)) {
            // Un id per file, non l'indice: due foto possono chiamarsi
            // «IMG_0042.jpg» e con il nome si aggiornava la riga
            // sbagliata.
            const id = crypto.randomUUID()
            const actualizar = (cambio: Partial<Subido>) =>
                setSubidos((s) => s.map((x) => (x.id === id ? { ...x, ...cambio } : x)))

            setSubidos((s) => [
                ...s,
                { id, nombre: archivo.name, estado: 'subiendo' },
            ])

            const cuerpo = new FormData()
            cuerpo.append('archivo', archivo)

            try {
                const r = await fetch(`/api/subida/${token}`, {
                    method: 'POST',
                    body: cuerpo,
                })
                const j = await r.json()
                if (r.ok) {
                    actualizar({
                        estado: 'hecho',
                        casilla: j.data?.casilla,
                        seguro: j.data?.seguro,
                    })

                    /**
                     * E la riga sparisce da «lo que falta».
                     *
                     * Solo quando il modello è sicuro: depennare una
                     * casella per un file finito lì per caso è peggio
                     * che lasciarla, perché chi carica smette di
                     * cercare quel documento.
                     */
                    if (j.data?.seguro && j.data?.casillaId) {
                        setEstado((e) => {
                            if (!e) return e
                            const lista = e.lista.map((c) =>
                                c.id === j.data.casillaId ? { ...c, hecho: true } : c
                            )
                            return {
                                ...e,
                                recibidos: e.recibidos + 1,
                                lista,
                                faltan: lista.filter((c) => c.obligatorio && !c.hecho),
                            }
                        })
                    } else {
                        setEstado((e) =>
                            e ? { ...e, recibidos: e.recibidos + 1 } : e
                        )
                    }
                } else {
                    actualizar({
                        estado: 'error',
                        error: j?.error ?? 'No ha subido',
                    })
                }
            } catch {
                actualizar({ estado: 'error', error: 'Sin conexión' })
            }
        }
    }

    /**
     * Il bottone di una riga apre lo stesso selettore di quello grande.
     *
     * Non manda il file in QUELLA casella: lo smista il modello come
     * tutto il resto, ed è quello che promette la riga in cima — «non
     * devi acertar ninguna casilla». È un modo di dire «questo ce l'ho
     * adesso» senza aprire una selezione generale con dentro
     * quattrocento foto.
     *
     * Per le foto apre la fotocamera, per i documenti i file: chi ha il
     * telefono in mano davanti al contatore non vuole la galleria.
     */
    const pedirArchivo = (_id: string, foto: boolean) => {
        void _id
        if (foto) camara.current?.click()
        else suelto.current?.click()
    }

    if (caducado) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[var(--caes-paper)] px-6 font-sans text-[var(--caes-ink)]">
                <div className="max-w-[34rem] text-center">
                    <h1 className="text-balance text-[26px] font-semibold tracking-[-0.03em]">
                        Este enlace ya no vale.
                    </h1>
                    <p className="mx-auto mt-4 max-w-[42ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                        Los enlaces para subir papeles caducan. Pídele uno nuevo a
                        quien te lo mandó: se hace en un segundo.
                    </p>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-[var(--caes-paper)] px-6 py-14 font-sans text-[var(--caes-ink)] sm:px-10 sm:py-20">
            <div className="mx-auto max-w-[40rem]">
                <span className="flex items-center gap-2.5" aria-label="CAES">
                    <span className="relative block h-[18px] w-[18px] rounded-[3px] bg-[var(--caes-ink)]">
                        <span className="absolute bottom-[4px] left-[4px] block h-[6px] w-[6px] rounded-[1px] bg-[var(--caes-lime)]" />
                    </span>
                    <span className="font-mono text-[14px] font-medium tracking-[.15em]">
                        CAES
                    </span>
                </span>

                <p className="label-mono mt-12 text-[var(--caes-mut)]">
                    {estado ? `Referencia ${estado.numero}` : 'Cargando…'}
                </p>
                <h1 className="mt-4 text-balance text-[clamp(28px,4vw,40px)] font-semibold leading-[1.06] tracking-[-0.04em]">
                    Suelta aquí los papeles.
                </h1>
                <p className="mt-4 max-w-[48ch] text-[15.5px] leading-[1.6] text-[var(--caes-mut)]">
                    Súbelos todos juntos y sin ordenar. Ya los colocamos nosotros en su
                    sitio — no tienes que acertar ninguna casilla.
                </p>

                {estado?.nota && (
                    <p className="mt-6 rounded-xl border border-[var(--caes-falta)]/50 bg-[var(--caes-falta-bg)] px-4 py-3.5 text-[14px] leading-[1.55] text-[var(--caes-falta-deep)]">
                        {estado.nota}
                    </p>
                )}

                {/**
                 * Quello che era già arrivato prima di oggi.
                 *
                 * Chi riapre il link il giorno dopo vedeva la stessa
                 * lista di ieri e nessun segno dei file che aveva già
                 * mandato: l'unica conclusione ragionevole è che non
                 * fossero arrivati, e li rimandava tutti.
                 *
                 * Quanti, non quali: dire i nomi vorrebbe dire aprire
                 * un indirizzo pubblico su cosa c'è dentro
                 * l'espediente.
                 */}
                {estado && estado.recibidos > 0 && (
                    <p className="mt-6 text-[13.5px] text-[var(--caes-mut)]">
                        Ya hay{' '}
                        <strong className="font-medium text-[var(--caes-ink)]">
                            {estado.recibidos}{' '}
                            {estado.recibidos === 1 ? 'documento' : 'documentos'}
                        </strong>{' '}
                        en este expediente. Lo que mandes ahora se suma, no
                        sustituye nada.
                    </p>
                )}

                {/* ── la zona ──────────────────────────────────────── */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault()
                        setEncima(true)
                    }}
                    onDragLeave={() => setEncima(false)}
                    onDrop={(e) => {
                        e.preventDefault()
                        setEncima(false)
                        if (e.dataTransfer.files?.length) void mandar(e.dataTransfer.files)
                    }}
                    className={`mt-8 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
                        encima
                            ? 'border-[var(--caes-green)] bg-[var(--caes-green)]/[.06]'
                            : 'border-[var(--caes-line)] bg-[var(--caes-panel)]'
                    }`}
                >
                    <Upload
                        className="mx-auto h-7 w-7 text-[var(--caes-faint)]"
                        strokeWidth={1.6}
                    />
                    {/**
                      * La macchina fotografica per prima, sul telefono.
                      *
                      * Chi apre questo link sta in piedi in un
                      * pianerottolo e la foto non ce l'ha ancora: la deve
                      * fare adesso. «Elegir archivos» apre la galleria e
                      * lo obbliga a uscire, fotografare, tornare e
                      * ritrovare il link — tre passaggi per una cosa che
                      * è un tocco.
                      *
                      * `capture` lo capisce solo un telefono. Su un
                      * computer il bottone non compare: là non c'è
                      * nessuna fotocamera da aprire.
                      */}
                    <div className="mt-5 flex flex-col items-center gap-3">
                        <button
                            type="button"
                            onClick={() => camara.current?.click()}
                            className="inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-7 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 sm:hidden"
                        >
                            <Camera className="h-4 w-4" />
                            Hacer una foto
                        </button>

                        <button
                            type="button"
                            onClick={() => input.current?.click()}
                            className="inline-flex items-center gap-2.5 rounded-full border border-[var(--caes-line)] bg-[var(--caes-paper)] px-7 py-3.5 text-[15px] font-medium transition-colors hover:border-[var(--caes-ink)]/40 sm:border-0 sm:bg-[var(--caes-ink)] sm:text-[var(--caes-paper)] sm:hover:opacity-90"
                        >
                            Elegir archivos
                        </button>
                    </div>

                    <p className="mt-4 text-[13px] text-[var(--caes-faint)]">
                        PDF o fotos. Puedes mandar varias de golpe.
                    </p>

                    <input
                        ref={camara}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.length) void mandar(e.target.files)
                            e.target.value = ''
                        }}
                    />
                    <input
                        ref={input}
                        type="file"
                        multiple
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.length) void mandar(e.target.files)
                            e.target.value = ''
                        }}
                    />
                    {/* Un secondo, uguale, per i bottoni delle righe: lo
                        stesso `ref` premuto da due posti apre una sola
                        volta e la seconda non succede niente. */}
                    <input
                        ref={suelto}
                        type="file"
                        multiple
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => {
                            if (e.target.files?.length) void mandar(e.target.files)
                            e.target.value = ''
                        }}
                    />
                </div>

                {/* ── dove è finito ognuno ─────────────────────────── */}
                {subidos.length > 0 && (
                    <ul className="mt-8 flex flex-col gap-2">
                        {subidos.map((s) => (
                            <li
                                key={s.id}
                                className="flex items-start gap-3 rounded-xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-4 py-3"
                            >
                                <span className="mt-0.5 shrink-0">
                                    {s.estado === 'subiendo' ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-[var(--caes-faint)]" />
                                    ) : s.estado === 'hecho' ? (
                                        <Check
                                            className="h-4 w-4 text-[var(--caes-green)]"
                                            strokeWidth={3}
                                        />
                                    ) : (
                                        <X className="h-4 w-4 text-[var(--caes-mal)]" />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[14px]">{s.nombre}</p>
                                    {s.estado === 'hecho' && (
                                        <p className="mt-0.5 text-[12.5px] text-[var(--caes-mut)]">
                                            {s.seguro ? (
                                                <>Va a: {s.casilla}</>
                                            ) : (
                                                // Quando non è sicuro lo dice:
                                                // «lo guarda una persona» è una
                                                // promessa che si può mantenere,
                                                // «va a X» quando non lo sa no.
                                                <>Guardado. Lo coloca una persona.</>
                                            )}
                                        </p>
                                    )}
                                    {s.estado === 'error' && (
                                        <p className="mt-0.5 text-[12.5px] text-[var(--caes-mal)]">
                                            {s.error}
                                        </p>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}

                {/* ── quello che serve, e quello che c'è già ───────── */}
                {estado && estado.lista.length > 0 && (
                    <section className="mt-12 flex flex-col gap-8">
                        <Bloque
                            titulo="Fotos que hay que hacer"
                            pie="Con el móvil, ahí mismo. No hace falta que salgan bonitas — tienen que verse."
                            casillas={estado.lista.filter((c) => c.foto)}
                            onElegir={(id) => pedirArchivo(id, true)}
                        />
                        <Bloque
                            titulo="Documentos"
                            pie="PDF o foto de la hoja, las dos valen."
                            casillas={estado.lista.filter((c) => !c.foto)}
                            onElegir={(id) => pedirArchivo(id, false)}
                        />

                        <p className="text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                            Si mandas algo que no está en la lista, también vale: lo
                            colocamos igual.
                        </p>

                        {/* Per chi un account ce l'ha. Da qui non si entra:
                            senza sessione quella pagina non apre. Serve solo
                            a non dover cercare il proprio espediente fra
                            quaranta dopo aver caricato. */}
                        {estado.panel && (
                            <a
                                href={estado.panel}
                                className="inline-flex items-center gap-2 self-start text-[13px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-ink)] hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Si tienes cuenta, ver el expediente entero
                            </a>
                        )}
                    </section>
                )}

                {/**
                 * E quando non manca niente lo DICE.
                 *
                 * Prima la sezione spariva e basta. Chi aveva appena
                 * caricato sei foto restava davanti a una pagina che
                 * non gli diceva se aveva finito — ed è esattamente il
                 * momento in cui telefona per chiedere.
                 *
                 * Due versioni, perché sono due situazioni diverse: chi
                 * ha appena finito di caricare vuole sapere che può
                 * chiudere, chi apre il link a cose fatte vuole sapere
                 * che non deve fare niente.
                 */}
                {estado && estado.faltan.length === 0 && (
                    <section className="mt-10 flex items-start gap-3.5 rounded-2xl border border-[var(--caes-green)]/30 bg-[var(--caes-green)]/[.06] px-5 py-4.5">
                        <Check
                            className="mt-0.5 h-5 w-5 shrink-0 text-[var(--caes-green)]"
                            strokeWidth={2.6}
                        />
                        <div>
                            <p className="text-[15px] font-medium">
                                {subidos.some((s) => s.estado === 'hecho')
                                    ? 'Ya está todo. Puedes cerrar.'
                                    : 'No falta ningún papel.'}
                            </p>
                            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                                {subidos.some((s) => s.estado === 'hecho')
                                    ? 'Lo revisamos nosotros y te decimos algo si hay que corregir cosas.'
                                    : 'Están todos. Si quieres mandar alguno más, súbelo igual.'}
                            </p>
                        </div>
                    </section>
                )}
            </div>
        </main>
    )
}

/**
 * Un gruppo di caselle: le foto, o le carte.
 *
 * Divise perché sono due lavori. Le foto si fanno in cantiere col
 * telefono in mano; i documenti si cercano, e spesso da un'altra parte e
 * un altro giorno. In un elenco unico si leggevano tutte allo stesso
 * modo, e chi le guardava non sapeva cosa poteva chiudere lì e cosa no.
 */
function Bloque({
    titulo,
    pie,
    casillas,
    onElegir,
}: {
    titulo: string
    pie: string
    casillas: Casilla[]
    onElegir: (id: string) => void
}) {
    if (casillas.length === 0) return null

    const hechas = casillas.filter((c) => c.hecho).length

    return (
        <section>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="text-[15px] font-semibold tracking-[-0.018em]">{titulo}</h2>
                {/* Il conto che sale. «3 de 5» risponde alla domanda vera
                    di chi sta caricando, che è quanto manca alla fine. */}
                <span className="label-mono text-[var(--caes-faint)]">
                    {hechas} de {casillas.length}
                </span>
            </div>
            <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--caes-mut)]">{pie}</p>

            <ul className="mt-4 flex flex-col gap-2">
                {casillas.map((c) => (
                    <li
                        key={c.id}
                        className={`flex items-start gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
                            c.hecho
                                ? 'border-[var(--caes-green)]/25 bg-[var(--caes-green)]/[.05]'
                                : 'border-[var(--caes-line)] bg-[var(--caes-panel)]'
                        }`}
                    >
                        <span className="mt-0.5 shrink-0">
                            {c.hecho ? (
                                <Check
                                    className="h-4 w-4 text-[var(--caes-green)]"
                                    strokeWidth={3}
                                />
                            ) : c.foto ? (
                                <ImageIcon
                                    className="h-4 w-4 text-[var(--caes-faint)]"
                                    strokeWidth={1.7}
                                />
                            ) : (
                                <FileText
                                    className="h-4 w-4 text-[var(--caes-faint)]"
                                    strokeWidth={1.7}
                                />
                            )}
                        </span>

                        <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-x-2 text-[14.5px] font-medium leading-[1.4]">
                                {c.label}
                                {!c.obligatorio && (
                                    <span className="text-[11.5px] font-normal text-[var(--caes-faint)]">
                                        opcional
                                    </span>
                                )}
                            </p>
                            {/* Il perché anche quando è già fatto: chi
                                torna il giorno dopo vuole poter
                                controllare che quella che ha mandato
                                fosse quella giusta. */}
                            <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--caes-mut)]">
                                {c.why}
                            </p>
                        </div>

                        {!c.hecho && (
                            <button
                                type="button"
                                onClick={() => onElegir(c.id)}
                                className="mt-0.5 shrink-0 rounded-full border border-[var(--caes-line)] bg-[var(--caes-paper)] px-3.5 py-1.5 text-[12.5px] transition-colors hover:border-[var(--caes-ink)] hover:bg-[var(--caes-band)]"
                            >
                                {c.foto ? 'Hacerla' : 'Subirlo'}
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    )
}
