'use client'

import Link from 'next/link'
import { ArrowRight, Clock, Inbox, Send, Wallet } from 'lucide-react'

/**
 * Cosa c'è da fare oggi.
 *
 * ── PERCHÉ ESISTE ─────────────────────────────────────────────────────
 *
 * Il riepilogo mostrava quattro numeri: espedienti, approvati, risparmio
 * certificato, margine. Sono fotografie — dicono com'è andata, non cosa
 * fare adesso. Chi apre la pagina la mattina ha una domanda sola: «di
 * cosa mi devo occupare?», e per rispondere doveva aprire la coda e
 * guardarsela.
 *
 * ── LA REGOLA ─────────────────────────────────────────────────────────
 *
 * Qui dentro entra solo quello su cui l'agenzia può AGIRE. Un espediente
 * in attesa del soggetto delegato non è un'azione: è un'attesa, e sta
 * nel flusso più sotto. Mescolare le due cose è il modo più veloce per
 * rendere inutile un elenco di cose da fare — dopo tre giorni che ci
 * sono righe su cui non si può fare niente, non lo si guarda più.
 *
 * Quando non c'è niente da fare l'elenco lo dice, invece di sparire:
 * una pagina vuota lascia il dubbio che non abbia caricato.
 */

export type Accion = {
    id: string
    /** Il numero è la cosa che si legge per prima. */
    cuantos: number
    titulo: string
    /** Perché tocca a te, in una riga. */
    detalle: string
    href: string
    icono: 'revisar' | 'emitir' | 'cobrar' | 'leads'
    /** Giorni che aspetta il più vecchio. Sopra una settimana è un avviso. */
    diasMasViejo?: number
}

const ICONOS = {
    revisar: Inbox,
    emitir: Send,
    cobrar: Wallet,
    leads: ArrowRight,
} as const

export default function AccionesHoy({ acciones }: { acciones: Accion[] }) {
    const vivas = acciones.filter((a) => a.cuantos > 0)

    if (vivas.length === 0) {
        return (
            <div className="rounded-2xl border border-[var(--caes-green)]/35 bg-[var(--caes-green)]/[.05] px-6 py-5">
                <p className="text-[15px] font-medium text-[var(--caes-ink)]">
                    No hay nada esperándote.
                </p>
                <p className="mt-1.5 text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                    Todo lo que se mueve ahora mismo depende del instalador o del
                    sujeto delegado. Lo tienes abajo, en el recorrido.
                </p>
            </div>
        )
    }

    return (
        <ul className="grid gap-3 sm:grid-cols-2">
            {vivas.map((a) => {
                const Icono = ICONOS[a.icono]
                // Una settimana ferma non e' un ritardo tecnico: e' il
                // punto in cui il cliente comincia a chiamare.
                const viejo = (a.diasMasViejo ?? 0) >= 7

                return (
                    <li key={a.id}>
                        <Link
                            href={a.href}
                            className={`group flex h-full items-start gap-4 rounded-2xl border p-5 transition-all duration-300 hover:shadow-[0_18px_40px_-28px_rgba(6,35,26,.35)] ${viejo
                                ? 'border-[#D9A94F]/55 bg-[#D9A94F]/[.07] hover:border-[#C4863F]'
                                : 'border-[var(--caes-line)] bg-[var(--caes-panel)] hover:border-[var(--caes-ink)]/30'
                                }`}
                        >
                            <span
                                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${viejo
                                    ? 'bg-[#D9A94F]/25 text-[#8A5B0B]'
                                    : 'bg-[var(--caes-band)] text-[var(--caes-mut)]'
                                    }`}
                            >
                                <Icono className="h-4 w-4" strokeWidth={1.8} />
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="flex items-baseline gap-2.5">
                                    <span className="font-mono tabular-nums text-[26px] font-medium leading-none tracking-[-0.035em] text-[var(--caes-ink)]">
                                        {a.cuantos}
                                    </span>
                                    <span className="text-[15px] font-medium tracking-[-0.016em] text-[var(--caes-ink)]">
                                        {a.titulo}
                                    </span>
                                </span>

                                <span className="mt-2 block max-w-[42ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                                    {a.detalle}
                                </span>

                                {a.diasMasViejo !== undefined && a.diasMasViejo > 0 && (
                                    <span
                                        className={`mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] ${viejo ? 'text-[#8A5B0B]' : 'text-[var(--caes-faint)]'
                                            }`}
                                    >
                                        <Clock className="h-3 w-3" />
                                        El más antiguo lleva {a.diasMasViejo}{' '}
                                        {a.diasMasViejo === 1 ? 'día' : 'días'}
                                    </span>
                                )}
                            </span>

                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)]" />
                        </Link>
                    </li>
                )
            })}
        </ul>
    )
}
