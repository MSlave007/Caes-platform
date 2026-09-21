'use client'

import { useState } from 'react'
import { ArrowRight, Loader2 } from 'lucide-react'
import {
    estado,
    siguientes,
    posicion,
    FLUJO,
    type EstadoId,
} from '@/lib/caes/status'

/**
 * Avanzamento dell'espediente lungo il ciclo di vita.
 *
 * Sta sopra la barra di decisione perché copre tutto quello che viene DOPO
 * l'approvazione — firme, soggetto delegato, emissione, incasso — che prima
 * non esisteva nel modello e che è esattamente la parte che interessa
 * all'installatore.
 *
 * Mostra sempre di chi è la palla: è l'informazione che evita la telefonata.
 */

const TONO: Record<string, string> = {
    neutral: 'bg-[var(--caes-faint)]',
    info: 'bg-[#4B77A8]',
    warn: 'bg-[#C4863F]',
    ok: 'bg-[var(--caes-green)]',
    bad: 'bg-[#B4543A]',
}

const ACTOR_TEXTO: Record<string, string> = {
    installer: 'Espera al instalador',
    agency: 'Os toca a vosotros',
    external: 'Fuera de vuestras manos',
    none: 'Nada pendiente',
}

/**
 * Gli stati che tornano indietro all'installatore.
 *
 * Per questi il motivo non è facoltativo. Un «cambios solicitados» senza
 * dire cosa cambiare è la cosa peggiore che si possa mandare: la pratica
 * si ferma, l'installatore non sa cosa fare, e l'unico modo di
 * scoprirlo è una telefonata. È esattamente la settimana di silenzio
 * che questa piattaforma dovrebbe togliere, prodotta da noi.
 */
const EXIGEN_MOTIVO: EstadoId[] = ['changes_requested', 'rejected']

export default function StatusControl({
    current,
    onChange,
}: {
    current: string
    /** `motivo` arriva valorizzato solo per gli stati che lo esigono. */
    onChange: (next: EstadoId, motivo?: string) => Promise<void>
}) {
    const [busy, setBusy] = useState<EstadoId | null>(null)
    const [pidiendo, setPidiendo] = useState<EstadoId | null>(null)
    const [motivo, setMotivo] = useState('')
    const e = estado(current)
    const opciones = siguientes(current)
    const i = posicion(current)

    async function ir(next: EstadoId, texto?: string) {
        setBusy(next)
        try {
            await onChange(next, texto)
            setPidiendo(null)
            setMotivo('')
        } finally {
            setBusy(null)
        }
    }

    /** Chiede il motivo prima, quando lo stato lo esige. */
    function pulsar(next: EstadoId) {
        if (EXIGEN_MOTIVO.includes(next)) {
            setPidiendo(next)
            return
        }
        void ir(next)
    }

    return (
        <div className="rounded-[10px] border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${TONO[e.tone]}`} />
                    <span className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--caes-ink)]">
                        {e.label}
                    </span>
                    <span className="font-mono text-[9.5px] uppercase tracking-[.13em] text-[var(--caes-faint)]">
                        {ACTOR_TEXTO[e.actor]}
                    </span>
                </div>

                {/* avanzamento nel flusso normale */}
                {i >= 0 ? (
                    <div className="flex items-center gap-1.5">
                        {FLUJO.map((id, n) => (
                            <span
                                key={id}
                                title={estado(id).label}
                                className={`h-[3px] w-7 rounded-full ${n <= i ? 'bg-[var(--caes-green)]' : 'bg-[var(--caes-line)]'
                                    }`}
                            />
                        ))}
                    </div>
                ) : null}
            </div>

            <p className="mt-2.5 max-w-[68ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                {e.hint}
            </p>

            {opciones.length > 0 ? (
                <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-[var(--caes-line-2)] pt-5">
                    <span className="font-mono text-[9.5px] uppercase tracking-[.13em] text-[var(--caes-faint)]">
                        Mover a
                    </span>
                    {opciones.map((id) => {
                        const o = estado(id)
                        return (
                            <button
                                key={id}
                                type="button"
                                disabled={busy !== null}
                                onClick={() => pulsar(id)}
                                className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13.5px] text-[var(--caes-ink)] transition-colors hover:border-[var(--caes-ink)] disabled:opacity-40"
                            >
                                {busy === id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <ArrowRight className="h-3.5 w-3.5 text-[var(--caes-faint)]" />
                                )}
                                {o.label}
                            </button>
                        )
                    })}
                </div>
            ) : null}

            {/* Il motivo. Compare solo quando serve, e senza di lui il
                pulsante non si preme: la scorciatoia «mando indietro e
                poi chiamo» e' quella che si prende sempre, se c'e'. */}
            {pidiendo && (
                <div className="mt-4 rounded-xl border border-[#D9A94F]/55 bg-[#D9A94F]/[.07] p-5">
                    <label
                        htmlFor="motivo"
                        className="text-[14px] font-semibold text-[#6F4708]"
                    >
                        {pidiendo === 'rejected'
                            ? '¿Por qué no sigue adelante?'
                            : '¿Qué tiene que corregir?'}
                    </label>
                    <p className="mt-1.5 max-w-[62ch] text-[13px] leading-[1.5] text-[#7A5A16]">
                        Lo lee el instalador tal cual, en su panel. Sé concreto: «falta
                        la foto de la etiqueta, no se lee el número de serie» le ahorra
                        una llamada y a ti otra vuelta.
                    </p>

                    <textarea
                        id="motivo"
                        rows={3}
                        autoFocus
                        value={motivo}
                        onChange={(ev) => setMotivo(ev.target.value)}
                        className="mt-3.5 w-full resize-y rounded-xl border border-[#D9A94F]/55 bg-[var(--caes-paper)] px-4 py-3 text-[14px] leading-[1.55] text-[var(--caes-ink)] outline-none transition-colors focus:border-[#C4863F]"
                    />

                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            disabled={busy !== null || motivo.trim().length < 10}
                            onClick={() => ir(pidiendo, motivo.trim())}
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-5 py-2.5 text-[13.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Mandárselo
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setPidiendo(null)
                                setMotivo('')
                            }}
                            className="rounded-full px-4 py-2.5 text-[13.5px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                        >
                            Dejarlo
                        </button>
                        {motivo.trim().length < 10 && (
                            <span className="text-[12.5px] text-[#8A5B0B]">
                                Escribe qué falta antes de mandarlo.
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
