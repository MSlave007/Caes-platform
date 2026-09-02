'use client'

import Link from 'next/link'
import { ArrowRight, Home, Wrench } from 'lucide-react'
import StatusChip from '@/components/platform/StatusChip'
import { eur, AHORRO_MINIMO_PCT } from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

/**
 * Riga di un espediente nella coda dell'agenzia.
 *
 * L'origine (installatore o cliente) è la prima cosa a sinistra perché
 * cambia tutto il resto: documenti richiesti, chi va contattato e se c'è
 * già un installatore assegnato o va trovato.
 */
export default function ProjectRow({ p }: { p: Project }) {
    const below = p.savings_pct < AHORRO_MINIMO_PCT

    return (
        <Link
            href={`/admin/review/${p.id}`}
            className="group grid items-center gap-4 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-5 transition-all duration-300 hover:border-[var(--caes-ink)]/25 hover:shadow-[0_18px_40px_-26px_rgba(6,35,26,.35)] lg:grid-cols-[auto_minmax(0,1fr)_120px_92px_128px_auto] lg:p-6"
        >
            {/* origine */}
            <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                    background:
                        p.source === 'installer'
                            ? 'var(--caes-band)'
                            : 'rgba(199,240,74,.28)',
                }}
                title={p.source === 'installer' ? 'Lo abre el instalador' : 'Lo abre el cliente'}
            >
                {p.source === 'installer' ? (
                    <Wrench className="h-4 w-4 text-[var(--caes-mut)]" strokeWidth={1.7} />
                ) : (
                    <Home className="h-4 w-4 text-[var(--caes-lime-ink)]" strokeWidth={1.7} />
                )}
            </span>

            <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3">
                    <h3 className="truncate text-[15.5px] font-semibold tracking-[-0.02em]">
                        {p.client_name}
                    </h3>
                    <span className="font-mono text-[11.5px] text-[var(--caes-faint)]">
                        #{p.id}
                    </span>
                </div>
                <p className="mt-1 truncate text-[13px] text-[var(--caes-mut)]">
                    {p.installer_name ?? 'Sin instalador asignado'} · {p.address}
                </p>
            </div>

            {/* risparmio verificato */}
            <span className="flex items-center gap-2">
                <span
                    className={`font-mono tabular text-[13.5px] ${below ? 'text-[#9B4526]' : 'text-[var(--caes-mut)]'}`}
                >
                    {p.savings_pct.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %
                </span>
                {below && (
                    <span
                        className="rounded bg-[#C4643F]/14 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[.08em] text-[#9B4526]"
                        title={`Por debajo del ${AHORRO_MINIMO_PCT} % mínimo`}
                    >
                        Bajo
                    </span>
                )}
            </span>

            <span className="font-mono tabular text-[14.5px] font-medium lg:text-right">
                {eur(p.savings_eur)}
            </span>

            <StatusChip status={p.status} />

            <ArrowRight className="hidden h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)] lg:block" />
        </Link>
    )
}
