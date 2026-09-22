'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Allura, Caveat, Great_Vibes } from 'next/font/google'
import { Check, Eraser, Loader2, PenLine, Trash2, Type, UserCheck } from 'lucide-react'

/**
 * Il riquadro dove si firma.
 *
 * ── PERCHÉ NON SI PAGA UNA PIATTAFORMA PER QUESTO ─────────────────────
 *
 * Perché quello che una piattaforma di firma fa, per un Convenio CAE, è
 * raccogliere un tratto e ricordarsi chi, quando e su cosa. Il come sta
 * in `src/lib/caes/firma.ts`. Questo è il davanti: un rettangolo bianco
 * e una riga.
 *
 * ── DUE MODI, E NON PER SIMMETRIA ─────────────────────────────────────
 *
 * Disegnare funziona benissimo con un dito e malissimo con un mouse: la
 * firma esce come quella di un bambino, la gente riprova quattro volte e
 * poi lascia perdere. Chi apre il link dal computer scrive il nome e lo
 * vede diventare una firma.
 *
 * E scrivere è anche l'unico modo che funziona senza mouse e senza dito:
 * una tela su cui si disegna non si può firmare con la tastiera.
 *
 * ── PERCHÉ IL CONSENSO È UNA CASELLA DA SPUNTARE ──────────────────────
 *
 * Perché è la differenza fra un tratto e una firma. Un disegno su una
 * tela non dice che chi l'ha fatto voleva obbligarsi: quello lo dice la
 * riga che spunta, ed è la riga che regge se qualcuno contesta.
 */

/**
 * Tre caratteri di firma.
 *
 * Non per decorare: una firma scritta è di chi la sceglie solo se può
 * sceglierla. Tre bastano — uno inglese, uno corsivo stretto, e uno che
 * somiglia a una scrittura a mano invece che a una firma.
 */
const vibes = Great_Vibes({ subsets: ['latin'], weight: '400' })
const allura = Allura({ subsets: ['latin'], weight: '400' })
const caveat = Caveat({ subsets: ['latin'], weight: '600' })

const CARACTERES = [
    { id: 'vibes', nombre: 'Inglesa', clase: vibes.className, familia: vibes.style.fontFamily, tam: 54 },
    { id: 'allura', nombre: 'Cursiva', clase: allura.className, familia: allura.style.fontFamily, tam: 56 },
    { id: 'caveat', nombre: 'A mano', clase: caveat.className, familia: caveat.style.fontFamily, tam: 46 },
] as const

/** Inchiostro, non nero: una firma nera sembra stampata. */
const TINTA = '#16233b'

const ALTO = 172

export type Metodo = 'trazo' | 'escrito' | 'guardada'

export default function Firmar({
    rol,
    nombreSugerido = '',
    ocupado = false,
    error,
    onFirmar,
}: {
    /** Come lo chiama il documento: «El Cedente», «El Cesionario». */
    rol: string
    nombreSugerido?: string
    ocupado?: boolean
    error?: string | null
    onFirmar: (firma: { png: string; nombre: string; metodo: Metodo }) => void
}) {
    const [modo, setModo] = useState<Metodo>('trazo')
    /**
     * La firma salvata nel profilo, se ce n'è una.
     *
     * `undefined` mentre si cerca, `null` quando non c'è. I due stati
     * non sono lo stesso: durante la ricerca non si può ancora dire che
     * non c'è, e mostrare «guarda, non ne hai» per mezzo secondo a chi
     * ne ha una è il modo di farlo disegnare per niente.
     */
    const [guardada, setGuardada] = useState<string | null | undefined>(undefined)
    const [guardarla, setGuardarla] = useState(false)
    const [nombre, setNombre] = useState(nombreSugerido)
    const [caracter, setCaracter] = useState<(typeof CARACTERES)[number]['id']>('vibes')
    const [acepta, setAcepta] = useState(false)
    const [hayTrazo, setHayTrazo] = useState(false)

    const lienzo = useRef<HTMLCanvasElement | null>(null)
    const dibujando = useRef(false)
    const anterior = useRef<{ x: number; y: number } | null>(null)
    /** Il punto medio da cui riparte la curva: vedi `seguir()`. */
    const medio = useRef<{ x: number; y: number } | null>(null)

    /**
     * La tela si ridimensiona con la finestra, e si ridisegna vuota.
     *
     * Un canvas ha due misure: quella su schermo e quella dei pixel. Se
     * si tiene solo la prima, su un telefono il tratto esce sfocato —
     * cioè la firma di qualcuno esce sfocata, che è il posto peggiore
     * dove risparmiare.
     */
    const preparar = useCallback(() => {
        const c = lienzo.current
        if (!c) return
        const ancho = c.parentElement?.clientWidth ?? 320
        const escala = window.devicePixelRatio || 1

        c.width = Math.round(ancho * escala)
        c.height = Math.round(ALTO * escala)
        c.style.width = `${ancho}px`
        c.style.height = `${ALTO}px`

        const ctx = c.getContext('2d')
        if (!ctx) return
        ctx.scale(escala, escala)
        ctx.lineWidth = 2.2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = TINTA
    }, [])

    useEffect(() => {
        preparar()
        window.addEventListener('resize', preparar)
        return () => window.removeEventListener('resize', preparar)
    }, [preparar])

    /**
     * Si cerca la firma salvata, e se c'è si parte da lì.
     *
     * Sulla pagina pubblica del cliente non c'è nessuna sessione, quindi
     * non ne arriva nessuna e i modi restano due. Non c'è niente da
     * spegnere: la funzione semplicemente non compare dove non serve.
     */
    useEffect(() => {
        let vivo = true
        fetch('/api/mi-firma')
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (!vivo) return
                const png = j?.data?.png ?? null
                setGuardada(png)
                if (png) setModo('guardada')
            })
            .catch(() => vivo && setGuardada(null))
        return () => {
            vivo = false
        }
    }, [])

    const punto = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const c = lienzo.current
        if (!c) return { x: 0, y: 0 }
        const r = c.getBoundingClientRect()
        return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    const empezar = (e: React.PointerEvent<HTMLCanvasElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        dibujando.current = true
        const p = punto(e)
        anterior.current = p
        medio.current = p
        if (!hayTrazo) setHayTrazo(true)

        // Un punto solo è una firma legittima: un puntino, una virgola.
        // Senza questo, chi tocca e non trascina non lascia niente.
        const ctx = lienzo.current?.getContext('2d')
        if (ctx) {
            ctx.beginPath()
            ctx.arc(p.x, p.y, 1.1, 0, Math.PI * 2)
            ctx.fillStyle = TINTA
            ctx.fill()
        }
    }

    /**
     * Da punto medio a punto medio, curvando intorno al punto.
     *
     * Il modo ovvio — dal punto precedente al punto attuale — disegna
     * una spezzata, e la spezzata si vede: si vede che quella firma
     * l'ha tracciata una macchina.
     *
     * Il modo quasi ovvio è peggio: partire dal punto precedente e
     * finire a metà strada lascia scoperta l'altra metà, e il tratto
     * esce PUNTEGGIATO. (Era così, e si vedeva benissimo.)
     *
     * Quello giusto: ogni segmento va dal punto medio precedente a
     * quello nuovo, curvando intorno al punto in mezzo. I segmenti si
     * toccano agli estremi, e la curva passa dove è passato il dito.
     */
    const seguir = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dibujando.current) return
        const ctx = lienzo.current?.getContext('2d')
        const de = anterior.current
        const desdeMedio = medio.current
        if (!ctx || !de || !desdeMedio) return

        const a = punto(e)
        const nuevoMedio = { x: (de.x + a.x) / 2, y: (de.y + a.y) / 2 }

        ctx.beginPath()
        ctx.moveTo(desdeMedio.x, desdeMedio.y)
        ctx.quadraticCurveTo(de.x, de.y, nuevoMedio.x, nuevoMedio.y)
        ctx.stroke()

        anterior.current = a
        medio.current = nuevoMedio
    }

    const parar = () => {
        if (!dibujando.current) return
        dibujando.current = false

        // L'ultimo pezzo: dal medio all'ultimo punto vero. Senza, ogni
        // tratto finisce mezzo segmento prima di dove si è alzato il
        // dito — poco, ma sulle code delle firme si vede.
        const ctx = lienzo.current?.getContext('2d')
        if (ctx && medio.current && anterior.current) {
            ctx.beginPath()
            ctx.moveTo(medio.current.x, medio.current.y)
            ctx.lineTo(anterior.current.x, anterior.current.y)
            ctx.stroke()
        }

        anterior.current = null
        medio.current = null
    }

    const borrar = () => {
        const c = lienzo.current
        const ctx = c?.getContext('2d')
        if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
        setHayTrazo(false)
    }

    /** Il tratto, ritagliato al suo contorno e su fondo trasparente. */
    const recortar = (c: HTMLCanvasElement): string | null => {
        const ctx = c.getContext('2d')
        if (!ctx) return null
        const datos = ctx.getImageData(0, 0, c.width, c.height).data

        let x0 = c.width
        let y0 = c.height
        let x1 = -1
        let y1 = -1
        for (let y = 0; y < c.height; y++) {
            for (let x = 0; x < c.width; x++) {
                if (datos[(y * c.width + x) * 4 + 3] > 8) {
                    if (x < x0) x0 = x
                    if (x > x1) x1 = x
                    if (y < y0) y0 = y
                    if (y > y1) y1 = y
                }
            }
        }
        if (x1 < 0) return null

        // Un filo d'aria intorno: senza, nel PDF il tratto tocca il bordo
        // del riquadro e sembra tagliato.
        const aire = 6
        x0 = Math.max(0, x0 - aire)
        y0 = Math.max(0, y0 - aire)
        x1 = Math.min(c.width - 1, x1 + aire)
        y1 = Math.min(c.height - 1, y1 + aire)

        const corte = document.createElement('canvas')
        corte.width = x1 - x0 + 1
        corte.height = y1 - y0 + 1
        corte
            .getContext('2d')
            ?.drawImage(c, x0, y0, corte.width, corte.height, 0, 0, corte.width, corte.height)
        return corte.toDataURL('image/png')
    }

    /** Il nome scritto, disegnato con il carattere scelto. */
    const escrito = async (): Promise<string | null> => {
        const elegido = CARACTERES.find((c) => c.id === caracter) ?? CARACTERES[0]
        const texto = nombre.trim()
        if (!texto) return null

        // Senza aspettare il carattere, la firma esce nel carattere di
        // ripiego del sistema: cioè non è la firma che la persona ha
        // visto sullo schermo prima di premere.
        try {
            await document.fonts.load(`${elegido.tam}px ${elegido.familia}`, texto)
        } catch {
            /* si disegna comunque, con quello che c'è */
        }

        const escala = 3
        const medidor = document.createElement('canvas').getContext('2d')
        if (!medidor) return null
        medidor.font = `${elegido.tam}px ${elegido.familia}`
        const anchoTexto = medidor.measureText(texto).width

        const c = document.createElement('canvas')
        c.width = Math.ceil((anchoTexto + 40) * escala)
        c.height = Math.ceil(elegido.tam * 2 * escala)
        const ctx = c.getContext('2d')
        if (!ctx) return null

        ctx.scale(escala, escala)
        ctx.fillStyle = TINTA
        ctx.font = `${elegido.tam}px ${elegido.familia}`
        ctx.textBaseline = 'middle'
        ctx.fillText(texto, 20, elegido.tam)
        return c.toDataURL('image/png')
    }

    const firmar = async () => {
        if (ocupado) return

        const png =
            modo === 'guardada'
                ? guardada
                    ? `data:image/png;base64,${guardada}`
                    : null
                : modo === 'trazo'
                  ? lienzo.current
                      ? recortar(lienzo.current)
                      : null
                  : await escrito()
        if (!png) return

        /**
         * Salvarla non deve poter far fallire la firma.
         *
         * Sono due cose diverse: una obbliga, l'altra è una comodità.
         * Se il profilo non si scrive, si è firmato lo stesso — e
         * fermare la firma per non aver potuto salvare una preferenza
         * sarebbe il tipo di errore che fa perdere un cliente a metà
         * strada.
         */
        if (guardarla && modo !== 'guardada') {
            await fetch('/api/mi-firma', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ png }),
            }).catch(() => {
                /* firmato comunque */
            })
        }

        onFirmar({ png, nombre: nombre.trim(), metodo: modo })
    }

    const olvidarla = async () => {
        await fetch('/api/mi-firma', { method: 'DELETE' }).catch(() => {})
        setGuardada(null)
        setModo('trazo')
    }

    const listo =
        acepta &&
        nombre.trim().length > 1 &&
        (modo === 'escrito' || modo === 'guardada' || hayTrazo) &&
        !ocupado

    return (
        <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-[15px] font-semibold tracking-[-0.018em]">
                    Firma · {rol}
                </h3>

                <div className="flex items-center gap-1 rounded-full border border-[var(--caes-line)] p-1">
                    {(
                        [
                            // Solo se ce n'è una: un modo vuoto è un modo
                            // che si prova, non funziona, e insegna a non
                            // fidarsi degli altri due.
                            ...(guardada
                                ? [{ id: 'guardada' as const, t: 'Mi firma', icono: UserCheck }]
                                : []),
                            { id: 'trazo' as const, t: 'Dibujarla', icono: PenLine },
                            { id: 'escrito' as const, t: 'Escribirla', icono: Type },
                        ]
                    ).map((o) => (
                        <button
                            key={o.id}
                            type="button"
                            onClick={() => setModo(o.id)}
                            aria-pressed={modo === o.id}
                            className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] transition-colors ${
                                modo === o.id
                                    ? 'bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                    : 'text-[var(--caes-mut)] hover:text-[var(--caes-ink)]'
                            }`}
                        >
                            <o.icono className="h-3.5 w-3.5" />
                            {o.t}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── il nome, che serve in tutti e due i modi ─────────── */}
            <label className="mt-5 block">
                <span className="text-[13px] font-medium">Nombre y apellidos</span>
                <input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoComplete="name"
                    placeholder="Tal y como aparece en el documento"
                    className="mt-1.5 w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-3.5 py-2.5 text-[14px] outline-none transition-colors focus:border-[var(--caes-green)]"
                />
            </label>

            {modo === 'guardada' && guardada ? (
                <div className="mt-4">
                    <div className="flex min-h-[7rem] items-center rounded-xl border border-[var(--caes-line)] bg-white px-6 py-4">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={`data:image/png;base64,${guardada}`}
                            alt="Tu firma guardada"
                            className="max-h-[72px] max-w-full object-contain object-left"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => void olvidarla()}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-mal)] hover:underline"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Olvidar esta firma y hacer otra
                    </button>
                </div>
            ) : modo === 'trazo' ? (
                <div className="mt-4">
                    <div className="relative overflow-hidden rounded-xl border border-[var(--caes-line)] bg-white">
                        <canvas
                            ref={lienzo}
                            onPointerDown={empezar}
                            onPointerMove={seguir}
                            onPointerUp={parar}
                            onPointerLeave={parar}
                            onPointerCancel={parar}
                            className="block w-full touch-none cursor-crosshair"
                            style={{ height: ALTO }}
                        />
                        {/* La riga su cui si firma, e l'invito. Spariscono
                            appena si comincia: da lì in poi sono rumore
                            sotto al tratto. */}
                        {!hayTrazo && (
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-9">
                                <span className="text-[13px] text-[var(--caes-faint)]">
                                    Firma aquí con el dedo o el ratón
                                </span>
                            </div>
                        )}
                        <div className="pointer-events-none absolute inset-x-8 bottom-8 h-px bg-[var(--caes-line)]" />
                    </div>

                    <button
                        type="button"
                        onClick={borrar}
                        disabled={!hayTrazo}
                        className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] text-[var(--caes-mut)] underline-offset-4 transition-colors hover:text-[var(--caes-ink)] hover:underline disabled:opacity-40 disabled:hover:no-underline"
                    >
                        <Eraser className="h-3.5 w-3.5" />
                        Borrar y volver a empezar
                    </button>
                </div>
            ) : (
                <div className="mt-4 flex flex-col gap-2.5">
                    {CARACTERES.map((c) => (
                        <button
                            key={c.id}
                            type="button"
                            onClick={() => setCaracter(c.id)}
                            aria-pressed={caracter === c.id}
                            className={`flex flex-col gap-1.5 rounded-xl border bg-white px-5 py-3.5 text-left transition-colors ${
                                caracter === c.id
                                    ? 'border-[var(--caes-green)] ring-4 ring-[var(--caes-green)]/12'
                                    : 'border-[var(--caes-line)] hover:border-[var(--caes-ink)]/30'
                            }`}
                        >
                            {/* L'etichetta sopra e non di lato: accanto al
                                nome gli rubava larghezza, e su un telefono
                                un cognome lungo si troncava — cioe
                                l'anteprima non era piu la firma che sarebbe
                                uscita. */}
                            <span className="label-mono text-[var(--caes-faint)]">
                                {c.nombre}
                            </span>
                            <span
                                className={`${c.clase} truncate text-[30px] leading-[1.35]`}
                                style={{ color: TINTA }}
                            >
                                {nombre.trim() || 'Tu nombre'}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/**
              * Salvarla si offre qui, non in una schermata di impostazioni.
              *
              * Nessuno va a caricarsi la firma nel profilo prima di
              * averne avuto bisogno. Il momento in cui serve è questo, e
              * sta sotto quella che ha appena fatto.
              *
              * Solo dove c'è una sessione: sulla pagina del cliente
              * `guardada` resta `null` perché la rotta non risponde, e
              * la casella non compare. Il cliente firma una volta nella
              * vita, e la sua firma non è roba nostra da conservare.
              */}
            {modo !== 'guardada' && guardada === null && (
                <label className="mt-5 flex cursor-pointer items-start gap-3">
                    <input
                        type="checkbox"
                        checked={guardarla}
                        onChange={(e) => setGuardarla(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--caes-green)]"
                    />
                    <span className="text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                        Guardar esta firma para la próxima vez.
                    </span>
                </label>
            )}

            {/* ── quello che fa di un tratto una firma ─────────────── */}
            <label className="mt-5 flex cursor-pointer items-start gap-3">
                <input
                    type="checkbox"
                    checked={acepta}
                    onChange={(e) => setAcepta(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--caes-green)]"
                />
                <span className="text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                    Acepto que esta es mi firma y que firmar aquí tiene el mismo
                    valor que firmar a mano el documento que he leído. Se guardará
                    la fecha, la hora y la dirección desde la que firmo.
                </span>
            </label>

            {error && (
                <p className="mt-3 text-[12.5px] text-[var(--caes-mal)]">{error}</p>
            )}

            <button
                type="button"
                onClick={() => void firmar()}
                disabled={!listo}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-6 py-3 text-[14px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
                {ocupado ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                    <Check className="h-4 w-4" strokeWidth={2.6} />
                )}
                Firmar
            </button>
        </section>
    )
}
