'use client'

import Link from 'next/link'
import { estado, ESTADOS, FLUJO } from '@/lib/caes/status'

/**
 * Dove stanno gli espedienti, disegnato come il percorso che è.
 *
 * ── COS'ERA ───────────────────────────────────────────────────────────
 *
 * Quattro riquadri affiancati con dentro un numero. Erano allineati e
 * avevano un trattino di raccordo, ma restavano quattro scatole: non si
 * leggeva un movimento, si leggevano quattro conteggi. E i due spenti in
 * fondo, grigi e tratteggiati, sembravano disabilitati più che vuoti.
 *
 * ── COS'È ADESSO ──────────────────────────────────────────────────────
 *
 * Una barra continua, divisa in proporzione a quanti espedienti stanno
 * in ogni tappa. Si vede in un colpo DOVE si accumula il lavoro, che è
 * la domanda vera: se la prima fetta è metà barra, il collo di bottiglia
 * è la revisione, e lo sta facendo l'agenzia.
 *
 * Sotto, le tappe con il loro numero e — la cosa che mancava — CHI sta
 * fermando ciascuna. Il modello degli stati sa già rispondere: ogni
 * stato ha un `actor`. «Aspetta te» e «aspetta il soggetto delegato»
 * sono due attese diversissime e prima si leggevano uguali.
 */

/** Chi deve muoversi, detto a chi guarda dalla parte dell'agenzia. */
const QUIEN = {
    agency: { texto: 'Te toca a ti', color: 'text-[var(--caes-ink)]' },
    installer: { texto: 'Espera al instalador', color: 'text-[var(--caes-mut)]' },
    external: { texto: 'Fuera de vuestras manos', color: 'text-[var(--caes-mut)]' },
    none: { texto: 'Cerrado', color: 'text-[var(--caes-faint)]' },
} as const

export default function Recorrido({
    cuenta,
}: {
    /** Quanti espedienti per stato. */
    cuenta: Record<string, number>
}) {
    const tappe = FLUJO.filter((id) => id !== 'draft')
    const total = tappe.reduce((a, id) => a + (cuenta[id] ?? 0), 0)

    return (
        <div>
            <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h2 className="text-[17px] font-semibold tracking-[-0.024em]">
                    El recorrido
                </h2>
                <span className="font-mono text-[9.5px] uppercase tracking-[.13em] text-[var(--caes-faint)]">
                    Pulsa una etapa para filtrar la cola
                </span>
            </div>

            {/* La barra: dove si accumula il lavoro, in proporzione. */}
            <div className="mt-5 flex h-2.5 overflow-hidden rounded-full bg-[var(--caes-line)]">
                {tappe.map((id) => {
                    const n = cuenta[id] ?? 0
                    if (n === 0) return null
                    const e = estado(id)
                    const mio = e.actor === 'agency'
                    return (
                        <span
                            key={id}
                            title={`${e.label}: ${n}`}
                            style={{ width: `${(n / Math.max(total, 1)) * 100}%` }}
                            className={mio ? 'bg-[var(--caes-ink)]' : 'bg-[var(--caes-green)]/55'}
                        />
                    )
                })}
            </div>

            {/* Le tappe, in fila come un percorso. */}
            <ol className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
                {tappe.map((id, i) => {
                    const e = estado(id)
                    const n = cuenta[id] ?? 0
                    const vivo = n > 0
                    const mio = e.actor === 'agency' && vivo
                    const quien = QUIEN[e.actor as keyof typeof QUIEN] ?? QUIEN.none

                    return (
                        <li key={id} className="flex flex-1 items-stretch">
                            <Link
                                href={`/admin/review?estado=${id}`}
                                className={`group flex flex-1 flex-col gap-1.5 border-b-2 px-4 py-3.5 transition-colors ${mio
                                    ? 'border-[var(--caes-ink)] bg-[var(--caes-band)]/60'
                                    : vivo
                                        ? 'border-[var(--caes-green)]/45 hover:bg-[var(--caes-band)]/40'
                                        : 'border-[var(--caes-line)] hover:bg-[var(--caes-band)]/30'
                                    }`}
                            >
                                <span className="flex items-baseline gap-2">
                                    <span
                                        className={`font-mono tabular-nums text-[24px] font-medium leading-none tracking-[-0.035em] ${vivo ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-line-2)]'
                                            }`}
                                    >
                                        {n}
                                    </span>
                                    <span
                                        className={`text-[13.5px] font-medium ${vivo ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-faint)]'
                                            }`}
                                    >
                                        {e.label}
                                    </span>
                                </span>

                                <span
                                    className={`text-[11.5px] ${vivo ? quien.color : 'text-[var(--caes-faint)]'
                                        }`}
                                >
                                    {vivo ? quien.texto : '—'}
                                </span>
                            </Link>

                            {/* La punta che unisce una tappa alla successiva:
                                è quella che fa leggere «percorso» invece di
                                «quattro riquadri». */}
                            {i < tappe.length - 1 && (
                                <span
                                    aria-hidden
                                    className="hidden w-0 self-center border-y-[7px] border-l-[7px] border-y-transparent border-l-[var(--caes-line)] sm:block"
                                />
                            )}
                        </li>
                    )
                })}
            </ol>

            {/* Le eccezioni non sono tappe: chi è qui è uscito dal percorso. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="font-mono text-[9.5px] uppercase tracking-[.13em] text-[var(--caes-faint)]">
                    Fuera del recorrido
                </span>
                {ESTADOS.filter((e) => e.excepcion).map((e) => {
                    const n = cuenta[e.id] ?? 0
                    return (
                        <Link
                            key={e.id}
                            href={`/admin/review?estado=${e.id}`}
                            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${n > 0
                                ? 'border-[#D9A94F]/55 bg-[#D9A94F]/[.08] text-[#7A5A16] hover:border-[#C4863F]'
                                : 'border-[var(--caes-line)] text-[var(--caes-faint)] hover:border-[var(--caes-line-2)]'
                                }`}
                        >
                            {e.label}
                            <b className="font-mono tabular-nums font-medium">{n}</b>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}