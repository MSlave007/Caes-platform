'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2, Plus, Search, Trash2 } from 'lucide-react'
import StatusChip, { normalize } from '@/components/platform/StatusChip'
import TeToca, { type Pendiente } from '@/components/platform/TeToca'
import { esperaAlInstalador, estado } from '@/lib/caes/status'
import { COMISION_MAXIMA_PCT, eur } from '@/lib/caes/estimate'
import {
    contarArchivos,
    deleteDraft,
    listDrafts,
    timeAgo,
    type Draft,
} from '@/lib/draft'

const EASE = [0.16, 1, 0.3, 1] as const

type Project = {
    id: string
    client_name: string
    address?: string
    status: string
    savings_eur?: number
    /** Il motivo scritto dall'agenzia quando rimanda indietro. */
    admin_notes?: string | null
    created_at: string
    project_date: string
}

export default function InstallerDashboard() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [borradores, setBorradores] = useState<Draft[]>([])

    // Le bozze arrivano dall'account (e dalla copia in questo browser, che
    // copre il cantiere senza campo). Si leggono dopo il montaggio: durante
    // il render non si puo ne chiamare l'API ne toccare localStorage.
    useEffect(() => {
        let vivo = true
        void listDrafts().then((d) => vivo && setBorradores(d))
        return () => {
            vivo = false
        }
    }, [])

    const borrar = async (id: string) => {
        await deleteDraft(id)
        setBorradores(await listDrafts())
    }

    /**
     * Gli espedienti passano dall'API, non da Supabase diretto.
     *
     * Prima questa pagina interrogava il database dal browser. Con una
     * sessione le regole di riga davano i propri, il che e giusto — ma
     * senza sessione davano zero, e in dimostrazione la dashboard
     * dell'installatore risultava sempre vuota mentre quella
     * dell'agenzia mostrava le stesse pratiche. Due letture diverse
     * degli stessi dati sono due posti dove divergere.
     */
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch('/api/projects')
                const j = await res.json()
                setProjects(j.data ?? [])
            } catch (err) {
                console.error('Error al cargar los expedientes:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return projects
        return projects.filter(
            (p) =>
                p.client_name?.toLowerCase().includes(q) ||
                p.address?.toLowerCase().includes(q) ||
                p.status?.toLowerCase().includes(q)
        )
    }, [projects, search])

    /**
     * Quelli fermi in attesa di lui.
     *
     * Non «gli aperti»: quelli su cui NESSUNO puo' muoversi al posto suo.
     * Il modello degli stati lo sa gia' — `actor === 'installer'` — e
     * fino a ora quell'informazione finiva in una pastiglia dello stesso
     * peso di tutte le altre.
     */
    const pendientes = useMemo<Pendiente[]>(
        () =>
            projects
                .filter((p) => esperaAlInstalador(normalize(p.status)))
                .map((p) => ({
                    id: p.id,
                    cliente: p.client_name,
                    estado: normalize(p.status),
                    motivo: p.admin_notes,
                })),
        [projects]
    )

    /** Quelli che sta guardando l'agenzia: non c'e' niente da fare. */
    const enRevision = projects.filter(
        (p) => estado(normalize(p.status)).actor === 'agency'
    ).length

    const totalSavings = projects.reduce((a, p) => a + (p.savings_eur || 0), 0)
    const open = projects.filter((p) =>
        ['draft', 'submitted', 'changes_requested', 'approved', 'issued'].includes(
            normalize(p.status)
        )
    ).length
    const approved = projects.filter((p) => normalize(p.status) === 'approved').length

    // Quota massima che l'installatore può trattenere sugli espedienti approvati.
    const potential = projects
        .filter((p) => normalize(p.status) === 'approved')
        .reduce((a, p) => a + (p.savings_eur || 0) * (COMISION_MAXIMA_PCT / 100), 0)

    return (
        <div className="flex flex-col gap-12">
            {/* ------------------------------------------------ intestazione */}
            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="label-mono text-[var(--caes-mut)]">Tus expedientes</p>
                    <h1 className="mt-4 text-balance text-[clamp(28px,3.6vw,40px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                        {open > 0 ? (
                            <>
                                Tienes {open} <em className="serif-accent">en curso</em>.
                            </>
                        ) : (
                            <>
                                Todo <em className="serif-accent">al día</em>.
                            </>
                        )}
                    </h1>
                </div>

                <Link
                    href="/installer/documentos"
                    className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-6 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo expediente
                </Link>
            </div>

            {/* Prima di tutto il resto: quello che aspetta lui. */}
            <TeToca pendientes={pendientes} />

            {/* ------------------------------------------------------ numeri */}
            <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-2 lg:grid-cols-4">
                {[
                    // Il primo non e' un conteggio, e' una domanda: quanti
                    // stanno fermi da qualcuno che non sei tu. E' quello
                    // che uno vuole sapere entrando, e prima non c'era.
                    {
                        k: 'En manos de la agencia',
                        v: String(enRevision),
                        n:
                            enRevision > 0
                                ? 'los estamos mirando. No tienes que hacer nada'
                                : 'nada esperando revisión',
                    },
                    { k: 'Aprobados', v: String(approved), n: 'certificado ya emitido' },
                    { k: 'Ahorro certificado', v: eur(totalSavings), n: 'suma de todos los proyectos' },
                    {
                        k: 'Tu parte, como máximo',
                        v: eur(potential),
                        n: `hasta el ${COMISION_MAXIMA_PCT} % que marca la norma`,
                    },
                ].map((s, i) => (
                    <motion.div
                        key={s.k}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: i * 0.07, ease: EASE }}
                        className="bg-[var(--caes-panel)] p-6"
                    >
                        <div className="label-mono text-[var(--caes-faint)]">{s.k}</div>
                        <div className="mt-4 font-sans text-[clamp(24px,2.6vw,30px)] font-semibold leading-none tracking-[-0.04em] tabular">
                            {s.v}
                        </div>
                        <p className="mt-2.5 text-[12.5px] leading-[1.45] text-[var(--caes-mut)]">
                            {s.n}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* ----------------------------------------------------- bozze

                Stanno sopra gli espedienti inviati e non in fondo: sono
                l'unica cosa in questa pagina su cui c'e ancora da fare
                qualcosa. Un espediente inviato si guarda; una bozza si
                finisce, ed e li che si perde tempo se non si ritrova. */}
            {borradores.length > 0 && (
                <div>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Sin terminar
                        </h2>
                        <p className="text-[13px] text-[var(--caes-mut)]">
                            {borradores.every((b) => b.sincronizado)
                                ? 'Guardados en tu cuenta. Los retomas desde cualquier dispositivo.'
                                : 'Alguno está solo en este dispositivo. Se sube en cuanto haya conexión.'}
                        </p>
                    </div>

                    <ul className="mt-5 flex flex-col gap-2.5">
                        {borradores.map((b, i) => (
                            <motion.li
                                key={b.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: Math.min(i, 6) * 0.04, ease: EASE }}
                                className="group flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-dashed border-[var(--caes-line)] bg-[var(--caes-panel)] px-5 py-4 transition-colors hover:border-[var(--caes-ink)]/30"
                            >
                                <Link
                                    href={`/installer/documentos?b=${b.id}`}
                                    className="min-w-0 flex-1"
                                >
                                    <span className="block truncate text-[15px] font-medium tracking-[-0.018em]">
                                        {b.nombre}
                                    </span>
                                    <span className="text-[12.5px] text-[var(--caes-mut)]">
                                        {contarArchivos(b)}{' '}
                                        {contarArchivos(b) === 1 ? 'archivo' : 'archivos'} ·
                                        guardado {timeAgo(b.savedAt)}
                                    </span>
                                </Link>

                                <Link
                                    href={`/installer/documentos?b=${b.id}`}
                                    className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13px] text-[var(--caes-ink)] transition-colors hover:border-[var(--caes-ink)] hover:bg-[var(--caes-band)]"
                                >
                                    Seguir
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => void borrar(b.id)}
                                    aria-label={`Eliminar ${b.nombre}`}
                                    className="rounded-lg p-2 text-[var(--caes-faint)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </motion.li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ------------------------------------------------------ ricerca */}
            <div>
                <div className="relative max-w-[26rem]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--caes-faint)]" />
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar por cliente, dirección o estado"
                        className="w-full rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] py-3 pl-11 pr-4 text-[14px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                    />
                </div>

                {/* ---------------------------------------------------- lista */}
                <div className="mt-7">
                    {loading ? (
                        <div className="flex items-center gap-3 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-6 py-8 text-[14px] text-[var(--caes-mut)]">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando tus expedientes…
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState searching={search.length > 0} />
                    ) : (
                        <ul className="flex flex-col gap-3">
                            {filtered.map((p, i) => (
                                <motion.li
                                    key={p.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5, delay: Math.min(i, 8) * 0.04, ease: EASE }}
                                >
                                    <Link
                                        href={`/installer/project/${p.id}`}
                                        className="group grid grid-cols-1 items-center gap-4 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-5 transition-all duration-300 hover:border-[var(--caes-ink)]/25 hover:shadow-[0_18px_40px_-26px_rgba(6,35,26,.35)] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:p-6"
                                    >
                                        <div className="min-w-0">
                                            <h2 className="truncate text-[16px] font-semibold tracking-[-0.02em]">
                                                {p.client_name || 'Sin nombre'}
                                            </h2>
                                            <p className="mt-1 truncate text-[13px] text-[var(--caes-mut)]">
                                                {p.address || 'Sin dirección'}
                                            </p>

                                            {/* Di chi e' la palla adesso.
                                                La pastiglia dice in che STATO e',
                                                che non e' la stessa domanda: da
                                                «Aprobado» non si capisce se c'e'
                                                qualcosa da fare o se si aspetta.
                                                Questa riga risponde a quella. */}
                                            {(() => {
                                                const e = estado(normalize(p.status))
                                                const mio = e.actor === 'installer' && normalize(p.status) !== 'draft'
                                                return (
                                                    <p
                                                        className={`mt-2 truncate text-[12.5px] ${mio
                                                            ? 'font-medium text-[#8A5B0B]'
                                                            : 'text-[var(--caes-faint)]'
                                                            }`}
                                                    >
                                                        {mio
                                                            ? 'Te toca a ti'
                                                            : e.actor === 'agency'
                                                                ? 'Lo está revisando la agencia'
                                                                : e.actor === 'external'
                                                                    ? 'En trámite con el sujeto delegado'
                                                                    : 'Cerrado'}
                                                    </p>
                                                )
                                            })()}
                                        </div>

                                        <span className="font-mono text-[12px] text-[var(--caes-faint)]">
                                            {formatDate(p.project_date || p.created_at)}
                                        </span>

                                        <span className="font-mono tabular text-[15px] font-medium sm:w-[110px] sm:text-right">
                                            {p.savings_eur ? eur(p.savings_eur) : '—'}
                                        </span>

                                        <span className="flex items-center gap-4">
                                            <StatusChip status={p.status} />
                                            <ArrowRight className="hidden h-4 w-4 shrink-0 text-[var(--caes-faint)] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-[var(--caes-ink)] sm:block" />
                                        </span>
                                    </Link>
                                </motion.li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}

function formatDate(iso?: string) {
    if (!iso) return '—'
    try {
        return new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        }).format(new Date(iso))
    } catch {
        return '—'
    }
}

function EmptyState({ searching }: { searching: boolean }) {
    return (
        <div className="rounded-2xl border border-dashed border-[var(--caes-line)] bg-[var(--caes-panel)]/60 px-8 py-14 text-center">
            <h2 className="mx-auto max-w-[24ch] text-balance text-[20px] font-semibold leading-[1.2] tracking-[-0.026em]">
                {searching
                    ? 'Nada coincide con esa búsqueda.'
                    : 'Todavía no has abierto ningún expediente.'}
            </h2>
            <p className="mx-auto mt-3 max-w-[44ch] text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                {searching
                    ? 'Prueba con el nombre del cliente, la dirección o el estado.'
                    : 'El primero lleva unos quince minutos. Los siguientes, menos: la plataforma ya conoce tus datos.'}
            </p>
            {!searching && (
                <Link
                    href="/installer/documentos"
                    className="group mt-8 inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-6 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                >
                    Empezar el primero
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
            )}
        </div>
    )
}
