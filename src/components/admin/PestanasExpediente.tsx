'use client'

import Link from 'next/link'
import { ClipboardCheck, FileText } from 'lucide-react'

/**
 * Le due facce di un espediente.
 *
 * ── PERCHÉ ESISTONO ───────────────────────────────────────────────────
 *
 * Un espediente si lavora in due schermate: la REVISIONE, dove si guarda
 * quello che è arrivato e si confermano i dati, e i DOCUMENTI, dove
 * escono le tre carte da firmare. Sono due momenti dello stesso lavoro,
 * ma erano collegate da un link piccolo in mezzo alla pagina: chi
 * arrivava dalla coda non capiva che i documenti esistevano, e chi era
 * nei documenti non sapeva come tornare ai dati.
 *
 * Due schede in cima, uguali su tutte e due le pagine, dicono da sole la
 * cosa che il link non diceva: sono due viste della stessa pratica, e ci
 * si muove avanti e indietro quante volte serve.
 *
 * ── IL CONTEGGIO ──────────────────────────────────────────────────────
 *
 * `pendientes` è quanti documenti non sono ancora a posto. Sta sulla
 * scheda perché è la domanda che uno si fa prima di cliccare: «devo
 * andarci o è già tutto fatto?». Zero non mostra niente — un pallino che
 * dice «0» è rumore.
 */
export default function PestanasExpediente({
    id,
    activa,
    pendientes,
}: {
    id: string
    activa: 'revision' | 'documentos'
    /** Documenti non ancora rivisti. `undefined` finché non si sa. */
    pendientes?: number
}) {
    const pestanas = [
        {
            id: 'revision' as const,
            href: `/admin/review/${id}`,
            label: 'Revisión',
            nota: 'Lo que ha llegado',
            Icono: ClipboardCheck,
            aviso: undefined as number | undefined,
        },
        {
            id: 'documentos' as const,
            href: `/admin/review/${id}/documentos`,
            label: 'Documentos',
            nota: 'Lo que sale a firmar',
            Icono: FileText,
            aviso: pendientes,
        },
    ]

    return (
        <nav
            aria-label="Partes del expediente"
            className="flex flex-wrap gap-2 border-b border-[var(--caes-line)] pb-px print:hidden"
        >
            {pestanas.map((t) => {
                const activo = activa === t.id
                return (
                    <Link
                        key={t.id}
                        href={t.href}
                        aria-current={activo ? 'page' : undefined}
                        className={`group relative flex items-center gap-3 rounded-t-xl border border-b-0 px-5 py-3 transition-colors ${activo
                            ? 'border-[var(--caes-line)] bg-[var(--caes-panel)]'
                            : 'border-transparent text-[var(--caes-mut)] hover:bg-[var(--caes-band)]/60 hover:text-[var(--caes-ink)]'
                            }`}
                    >
                        <t.Icono
                            className={`h-4 w-4 shrink-0 ${activo ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-faint)]'
                                }`}
                            strokeWidth={1.8}
                        />
                        <span className="flex flex-col leading-tight">
                            <span
                                className={`text-[14px] ${activo
                                    ? 'font-semibold tracking-[-0.016em] text-[var(--caes-ink)]'
                                    : ''
                                    }`}
                            >
                                {t.label}
                            </span>
                            <span className="text-[11.5px] text-[var(--caes-faint)]">
                                {t.nota}
                            </span>
                        </span>

                        {t.aviso !== undefined && t.aviso > 0 && (
                            <span
                                title={`${t.aviso} sin acabar`}
                                className="ml-1 shrink-0 rounded-full bg-[var(--caes-falta)]/20 px-2 py-0.5 font-mono text-[11px] tabular-nums text-[var(--caes-falta-ink)]"
                            >
                                {t.aviso}
                            </span>
                        )}

                        {/* La linea che «attacca» la scheda attiva al
                            contenuto sotto, coprendo il bordo del nav. */}
                        {activo && (
                            <span className="absolute -bottom-px left-0 right-0 h-px bg-[var(--caes-panel)]" />
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}
