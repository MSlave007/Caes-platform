'use client'

import { use, useEffect, useRef, useState } from 'react'
import { Check, Loader2, Upload, X } from 'lucide-react'

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
type Falta = { id: string; label: string; why: string }
type Estado = { numero: string; nota: string | null; faltan: Falta[]; recibidos: number }
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
                    <button
                        type="button"
                        onClick={() => input.current?.click()}
                        className="mt-5 inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-7 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        Elegir archivos
                    </button>
                    <p className="mt-4 text-[13px] text-[var(--caes-faint)]">
                        PDF o fotos. Puedes hacerlas ahora con la cámara.
                    </p>
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

                {/* ── cosa manca ancora ────────────────────────────── */}
                {estado && estado.faltan.length > 0 && (
                    <section className="mt-10">
                        <p className="label-mono text-[var(--caes-faint)]">
                            Lo que falta · {estado.faltan.length}
                        </p>
                        <ul className="mt-3 flex flex-col gap-2.5">
                            {estado.faltan.map((f) => (
                                <li key={f.id} className="text-[14px] leading-[1.5]">
                                    {f.label}
                                    <span className="block text-[12.5px] text-[var(--caes-faint)]">
                                        {f.why}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-6 text-[12.5px] leading-[1.5] text-[var(--caes-faint)]">
                            Esta lista es de cuando abriste la página: no se actualiza
                            sola mientras subes. Si los has mandado todos, ya está.
                        </p>
                    </section>
                )}
            </div>
        </main>
    )
}
