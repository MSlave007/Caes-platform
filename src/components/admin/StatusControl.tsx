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

export default function StatusControl({
    current,
    onChange,
}: {
    current: string
    onChange: (next: EstadoId) => Promise<void>
}) {
    const [busy, setBusy] = useState<EstadoId | null>(null)
    const e = estado(current)
    const opciones = siguientes(current)
    const i = posicion(current)

    async function ir(next: EstadoId) {
        setBusy(next)
        try {
            await onChange(next)
        } finally {
            setBusy(null)
        }
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
                                onClick={() => ir(id)}
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
        </div>
    )
}
