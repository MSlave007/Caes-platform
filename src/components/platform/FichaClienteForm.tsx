'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, X } from 'lucide-react'

/**
 * Creare o correggere una scheda cliente.
 *
 * ── PERCHÉ UN PANNELLO E NON UNA PAGINA ───────────────────────────────
 *
 * Perché si arriva qui da due posti — dall'elenco per creare, dalla
 * scheda per correggere — e in tutti e due i casi si torna esattamente
 * dov'eravamo. Una pagina a parte vorrebbe dire perdere il posto e
 * doverci tornare.
 *
 * ── PERCHÉ IL NIF HA UN AVVISO E NON UN CONTROLLO ─────────────────────
 *
 * Perché un NIF sbagliato lo vede solo chi ha il documento davanti, e
 * non siamo noi. Bloccare il salvataggio su una forma che non ci torna
 * vorrebbe dire impedire di registrare un cliente vero perché il nostro
 * controllo è più stretto della realtà — NIE, CIF di società, documenti
 * stranieri. Si avvisa e si lascia passare.
 */

export type DatosCliente = {
    nombre: string
    nif: string
    telefono: string
    email: string
    direccion: string
}

const VACIO: DatosCliente = {
    nombre: '',
    nif: '',
    telefono: '',
    email: '',
    direccion: '',
}

/** Forma tipica spagnola: 8 cifre + lettera, o lettera + 7 cifre + control. */
const FORMA_NIF = /^([0-9]{8}[A-Za-z]|[XYZxyz][0-9]{7}[A-Za-z]|[A-Za-z][0-9]{8})$/

export default function FichaClienteForm({
    inicial,
    titulo,
    onGuardar,
    onCerrar,
}: {
    inicial?: Partial<DatosCliente>
    titulo: string
    onGuardar: (d: DatosCliente) => Promise<void>
    onCerrar: () => void
}) {
    const [d, setD] = useState<DatosCliente>({ ...VACIO, ...inicial })
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const primero = useRef<HTMLInputElement>(null)

    useEffect(() => {
        primero.current?.focus()
        const esc = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
        document.addEventListener('keydown', esc)
        return () => document.removeEventListener('keydown', esc)
    }, [onCerrar])

    const nifRaro = d.nif.trim().length > 0 && !FORMA_NIF.test(d.nif.trim())

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!d.nombre.trim()) {
            setError('El nombre es lo único imprescindible.')
            return
        }
        setGuardando(true)
        setError(null)
        try {
            await onGuardar({
                nombre: d.nombre.trim(),
                nif: d.nif.trim(),
                telefono: d.telefono.trim(),
                email: d.email.trim(),
                direccion: d.direccion.trim(),
            })
        } catch (err) {
            setError(err instanceof Error ? err.message : 'No se ha podido guardar')
            setGuardando(false)
        }
    }

    const campo =
        'mt-2 w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 text-[14.5px] text-[var(--caes-ink)] outline-none transition-colors focus:border-[var(--caes-green)]'
    const etiqueta = 'label-mono block text-[var(--caes-faint)]'

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--caes-ink)]/25 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
            onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                className="max-h-[92vh] w-full max-w-[34rem] overflow-y-auto rounded-t-3xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7 shadow-[0_40px_80px_-30px_rgba(6,35,26,.45)] sm:rounded-3xl"
            >
                <div className="flex items-start justify-between gap-4">
                    <h2 className="text-[19px] font-semibold tracking-[-0.026em] text-[var(--caes-ink)]">
                        {titulo}
                    </h2>
                    <button
                        type="button"
                        onClick={onCerrar}
                        aria-label="Cerrar"
                        className="-mr-2 -mt-1 rounded-full p-2 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <p className="mt-2 max-w-[48ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                    Estos datos se escriben solos en el Convenio y en el Anexo. Cuanto
                    más completos, menos hay que rellenar a mano después.
                </p>

                <form onSubmit={enviar} className="mt-7 flex flex-col gap-5">
                    <div>
                        <label htmlFor="fc-nombre" className={etiqueta}>
                            Nombre o razón social
                        </label>
                        <input
                            ref={primero}
                            id="fc-nombre"
                            className={campo}
                            value={d.nombre}
                            onChange={(e) => setD({ ...d, nombre: e.target.value })}
                            placeholder="Nombre y apellidos"
                        />
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                            <label htmlFor="fc-nif" className={etiqueta}>
                                NIF o NIE
                            </label>
                            <input
                                id="fc-nif"
                                className={campo}
                                value={d.nif}
                                onChange={(e) => setD({ ...d, nif: e.target.value })}
                                placeholder="00000000X"
                            />
                            {nifRaro && (
                                <p className="mt-2 text-[12.5px] leading-[1.45] text-[#8A5B0B]">
                                    No tiene la forma habitual. Si es un CIF o un
                                    documento extranjero, déjalo así.
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="fc-tel" className={etiqueta}>
                                Teléfono
                            </label>
                            <input
                                id="fc-tel"
                                type="tel"
                                className={campo}
                                value={d.telefono}
                                onChange={(e) => setD({ ...d, telefono: e.target.value })}
                                placeholder="600 000 000"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="fc-email" className={etiqueta}>
                            Correo
                        </label>
                        <input
                            id="fc-email"
                            type="email"
                            className={campo}
                            value={d.email}
                            onChange={(e) => setD({ ...d, email: e.target.value })}
                            placeholder="cliente@ejemplo.es"
                        />
                        <p className="mt-2 text-[12.5px] leading-[1.45] text-[var(--caes-faint)]">
                            Es donde le llegará el Convenio cuando haya que firmarlo.
                        </p>
                    </div>

                    <div>
                        <label htmlFor="fc-dir" className={etiqueta}>
                            Dirección
                        </label>
                        <input
                            id="fc-dir"
                            className={campo}
                            value={d.direccion}
                            onChange={(e) => setD({ ...d, direccion: e.target.value })}
                            placeholder="Calle, número, población"
                        />
                    </div>

                    {error && (
                        <p
                            role="alert"
                            className="flex items-start gap-2.5 rounded-xl border border-[#E0B48C] bg-[#FBF1E7] px-4 py-3 text-[13.5px] leading-[1.5] text-[#7A4A12]"
                        >
                            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                            {error}
                        </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center gap-3">
                        <button
                            type="submit"
                            disabled={guardando}
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-6 py-3 text-[14.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:opacity-40"
                        >
                            {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Guardar
                        </button>
                        <button
                            type="button"
                            onClick={onCerrar}
                            className="rounded-full px-4 py-3 text-[14px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                        >
                            Dejarlo
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
