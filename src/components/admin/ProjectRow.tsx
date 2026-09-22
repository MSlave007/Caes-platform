'use client'

import Link from 'next/link'
import { ArrowRight, Home, Wrench } from 'lucide-react'
import { eur, AHORRO_MINIMO_PCT } from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

/**
 * Da quanti giorni non si muove.
 *
 * L'ultimo movimento quando c'è, se no la data di apertura. Non è
 * «quanto è in questa fase» — quello non lo sappiamo — ed è meglio dire
 * una cosa vera che una precisa e inventata.
 */
function diasParado(p: Project): number {
    const ultimo = (p as { updated_at?: string }).updated_at || p.created_at
    const t = Date.parse(ultimo)
    if (!Number.isFinite(t)) return 0
    return Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

/** Le stesse soglie della cartera: una settimana ferma è già tanto. */
const AVISO = 7
const MUCHO = 21

/**
 * Riga di un espediente nella coda dell'agenzia.
 *
 * L'origine (installatore o cliente) è la prima cosa a sinistra perché
 * cambia tutto il resto: documenti richiesti, chi va contattato e se c'è
 * già un installatore assegnato o va trovato.
 */
export default function ProjectRow({ p }: { p: Project }) {
    /**
     * Il risparmio puo non esserci ancora.
     *
     * Un espediente appena aperto non e stato calcolato: `savings_pct` e
     * nullo, e qui si andava in errore formattando un valore che non
     * c'era. «Sconosciuto» e «sotto il minimo» sono cose diverse, e
     * trattarle uguale metterebbe un'etichetta «Bajo» su pratiche che
     * nessuno ha ancora guardato.
     */
    const pct = typeof p.savings_pct === 'number' ? p.savings_pct : null
    const below = pct !== null && pct < AHORRO_MINIMO_PCT
    const dias = diasParado(p)

    return (
        <Link
            href={`/admin/review/${p.id}`}
            className="group grid items-center gap-4 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-5 transition-all duration-300 hover:border-[var(--caes-ink)]/25 hover:shadow-[0_18px_40px_-26px_rgba(6,35,26,.35)] lg:grid-cols-[auto_minmax(0,1fr)_128px_100px_112px_auto] lg:p-6"
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

            {/**
              * Il risparmio solo quando è un problema.
              *
              * 31,8 % e 25,7 % sono tutti e due «va bene»: un risultato
              * tecnico, non una decisione. Conta in un caso solo — sotto
              * il minimo di legge — e allora non è un numero, è un
              * blocco. Mostrarlo sempre voleva dire mettere in fila
              * venti cifre di cui diciannove non cambiano niente.
              */}
            <span className="flex items-center gap-2">
                {below && (
                    <span
                        className="flex items-center gap-1.5 rounded-full bg-[var(--caes-bloqueo)]/14 px-2.5 py-1 text-[11.5px] text-[var(--caes-bloqueo-ink)]"
                        title={`Por debajo del ${AHORRO_MINIMO_PCT} % que exige la norma`}
                    >
                        <span className="font-mono tabular">
                            {pct!.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %
                        </span>
                        bajo mínimo
                    </span>
                )}
            </span>

            <span className="font-mono tabular text-[14.5px] font-medium lg:text-right">
                {eur(p.savings_eur)}
            </span>

            {/**
              * Da quanto non si muove, al posto della pastiglia di stato.
              *
              * Lo stato lo dice già il titolo del gruppo sopra — la coda
              * si raggruppa per fase — e ripeterlo su ogni riga era
              * rumore. Questo invece non c'era, ed è il numero che
              * cambia cosa fai: tre settimane fermo e ieri si vedevano
              * identici.
              */}
            <span
                className={`text-[12.5px] lg:text-right ${dias >= MUCHO
                        ? 'font-medium text-[var(--caes-bloqueo-ink)]'
                        : dias >= AVISO
                            ? 'text-[var(--caes-falta-ink)]'
                            : 'text-[var(--caes-faint)]'
                    }`}
                title="Desde el último movimiento"
            >
                {dias === 0 ? 'hoy' : dias === 1 ? 'hace 1 día' : `hace ${dias} días`}
            </span>

            <ArrowRight className="hidden h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)] lg:block" />
        </Link>
    )
}
