'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { estado } from '@/lib/caes/status'

/**
 * Quello che la piattaforma sta aspettando DA TE.
 *
 * ── PERCHÉ IN CIMA E NON NELL'ELENCO ──────────────────────────────────
 *
 * Nell'elenco degli espedienti ogni riga aveva la sua pastiglia di
 * stato, e «Cambios solicitados» era una pastiglia come le altre, dello
 * stesso peso di «Aprobado». Ma le due cose non si somigliano per
 * niente: una è una notizia, l'altra è un lavoro fermo che aspetta te.
 *
 * Nella mappa del percorso «le settimane di silenzio» era uno dei tre
 * punti in cui il giro si rompe. Se la piattaforma rimanda indietro una
 * pratica e chi la deve correggere non se ne accorge, quel silenzio lo
 * abbiamo prodotto noi — con un'interfaccia che lo dice, ma sottovoce.
 *
 * ── IL MOTIVO SI LEGGE QUI ────────────────────────────────────────────
 *
 * Non «hay cambios solicitados, entra a verlo»: il testo scritto
 * dall'agenzia, per esteso, senza aprire niente. Chi legge dal telefono
 * fra due appuntamenti deve capire in due secondi se deve tornare in
 * cantiere o se basta una foto.
 */

export type Pendiente = {
    id: string
    cliente: string
    estado: string
    /** Quello che ha scritto l'agenzia. Senza questo l'avviso è inutile. */
    motivo?: string | null
}

export default function TeToca({ pendientes }: { pendientes: Pendiente[] }) {
    if (pendientes.length === 0) return null

    return (
        <section className="rounded-2xl border border-[#D9A94F]/55 bg-[#D9A94F]/[.08] p-6 sm:p-7">
            <div className="flex items-start gap-4">
                <span className="mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D9A94F]/25 text-[#8A5B0B]">
                    <AlertTriangle className="h-4 w-4" strokeWidth={2.2} />
                </span>

                <div className="min-w-0 flex-1">
                    <h2 className="text-[16px] font-semibold tracking-[-0.018em] text-[#6F4708]">
                        {pendientes.length === 1
                            ? 'Hay un expediente esperándote'
                            : `Hay ${pendientes.length} expedientes esperándote`}
                    </h2>
                    <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-[1.55] text-[#7A5A16]">
                        Hasta que no los toques no se mueven. Nadie más puede hacerlo
                        por ti.
                    </p>

                    <ul className="mt-5 flex flex-col gap-2.5">
                        {pendientes.map((p) => {
                            const e = estado(p.estado)
                            return (
                                <li key={p.id}>
                                    <Link
                                        href={`/installer/project/${p.id}`}
                                        className="group flex flex-wrap items-start gap-x-4 gap-y-2 rounded-xl border border-[#D9A94F]/45 bg-[var(--caes-paper)] px-4 py-3.5 transition-colors hover:border-[#C4863F]"
                                    >
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-baseline gap-x-2.5">
                                                <span className="text-[14.5px] font-medium text-[var(--caes-ink)]">
                                                    {p.cliente}
                                                </span>
                                                <span className="font-mono text-[11px] text-[var(--caes-faint)]">
                                                    #{String(p.id).slice(0, 8)}
                                                </span>
                                                <span className="rounded-full bg-[#D9A94F]/20 px-2 py-0.5 text-[11px] text-[#8A5B0B]">
                                                    {e.label}
                                                </span>
                                            </span>

                                            {/* Il testo dell'agenzia, per esteso. */}
                                            {p.motivo ? (
                                                <span className="mt-2 block max-w-[68ch] whitespace-pre-wrap text-[13.5px] leading-[1.55] text-[var(--caes-ink)]">
                                                    {p.motivo}
                                                </span>
                                            ) : (
                                                <span className="mt-2 block text-[13px] text-[var(--caes-mut)]">
                                                    {e.hint}
                                                </span>
                                            )}
                                        </span>

                                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)]" />
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            </div>
        </section>
    )
}
