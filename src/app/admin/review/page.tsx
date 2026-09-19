'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ESTADOS, type EstadoId } from '@/lib/caes/status'
import { motion } from 'framer-motion'
import { Loader2, Search } from 'lucide-react'
import ProjectRow from '@/components/admin/ProjectRow'
import { normalize } from '@/components/platform/StatusChip'
import type { Project, Source } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

type SourceFilter = 'all' | Source
/** Un filtro per ogni stato reale, piu "todos". */
type StatusFilter = 'all' | EstadoId

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    ...ESTADOS.filter((e) => e.id !== 'draft').map((e) => ({
        id: e.id as StatusFilter,
        label: e.label,
    })),
]

const SOURCE_TABS: { id: SourceFilter; label: string }[] = [
    { id: 'all', label: 'Todo' },
    { id: 'installer', label: 'De instaladores' },
    { id: 'client', label: 'De clientes' },
]

export default function AdminReviewQueue() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [source, setSource] = useState<SourceFilter>('all')
    const params = useSearchParams()
    const desdeUrl = params.get('estado')
    const [status, setStatus] = useState<StatusFilter>(
        desdeUrl && STATUS_TABS.some((t) => t.id === desdeUrl)
            ? (desdeUrl as StatusFilter)
            : 'submitted'
    )
    const [q, setQ] = useState('')

    useEffect(() => {
        fetch('/api/projects')
            .then((r) => r.json())
            .then((j) => setProjects(j.data ?? []))
            .catch((e) => console.error('Error al cargar la cola:', e))
            .finally(() => setLoading(false))
    }, [])

    const counts = useMemo(() => {
        const bySource = (s: SourceFilter) =>
            s === 'all' ? projects : projects.filter((p) => p.source === s)
        return {
            all: projects.length,
            installer: bySource('installer').length,
            client: bySource('client').length,
        }
    }, [projects])

    const filtered = useMemo(() => {
        const needle = q.trim().toLowerCase()
        return projects.filter((p) => {
            if (source !== 'all' && p.source !== source) return false

            const st = normalize(p.status)
            if (status !== 'all' && st !== status) return false

            if (!needle) return true
            return (
                p.client_name?.toLowerCase().includes(needle) ||
                p.installer_name?.toLowerCase().includes(needle) ||
                p.address?.toLowerCase().includes(needle) ||
                p.id.includes(needle)
            )
        })
    }, [projects, source, status, q])

    const pending = projects.filter((p) =>
        normalize(p.status) === 'submitted'
    ).length

    return (
        <div className="flex flex-col gap-9">
            <div>
                <p className="label-mono text-[var(--caes-mut)]">Cola de revisión</p>
                <h1 className="mt-4 text-balance text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    {pending > 0 ? (
                        <>
                            {pending} esperando <em className="serif-accent">tu firma</em>.
                        </>
                    ) : (
                        <>
                            La cola está <em className="serif-accent">vacía</em>.
                        </>
                    )}
                </h1>
            </div>

            {/* --------------------------------------------------- filtri */}
            <div className="flex flex-col gap-4">
                {/* origine: è il taglio che cambia davvero la lavorazione */}
                <div className="flex flex-wrap items-center gap-2">
                    {SOURCE_TABS.map((t) => {
                        const on = t.id === source
                        const n = counts[t.id]
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setSource(t.id)}
                                className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-[13.5px] transition-colors ${on
                                        ? 'bg-[var(--caes-ink)] font-medium text-[var(--caes-paper)]'
                                        : 'border border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)]/30 hover:text-[var(--caes-ink)]'
                                    }`}
                            >
                                {t.label}
                                <span
                                    className={`font-mono tabular text-[11.5px] ${on ? 'text-[var(--caes-lime)]' : 'text-[var(--caes-faint)]'}`}
                                >
                                    {n}
                                </span>
                            </button>
                        )
                    })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--caes-line)] pt-4">
                    <div className="flex flex-wrap items-center gap-1">
                        {STATUS_TABS.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setStatus(t.id)}
                                className={`rounded-full px-3.5 py-2 text-[13px] transition-colors ${t.id === status
                                        ? 'bg-[var(--caes-band)] font-medium text-[var(--caes-ink)]'
                                        : 'text-[var(--caes-mut)] hover:text-[var(--caes-ink)]'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full max-w-[22rem]">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--caes-faint)]" />
                        <input
                            type="search"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Cliente, instalador, dirección o número"
                            className="w-full rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] py-2.5 pl-11 pr-4 text-[13.5px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                        />
                    </div>
                </div>
            </div>

            {/* ---------------------------------------------------- lista */}
            {loading ? (
                <div className="flex items-center gap-3 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-6 py-8 text-[14px] text-[var(--caes-mut)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando la cola…
                </div>
            ) : filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--caes-line)] bg-[var(--caes-panel)]/60 px-8 py-14 text-center">
                    <h2 className="text-[19px] font-semibold tracking-[-0.026em]">
                        Nada aquí con estos filtros.
                    </h2>
                    <p className="mx-auto mt-3 max-w-[42ch] text-[14px] text-[var(--caes-mut)]">
                        Prueba a cambiar el estado o el origen, o quita la búsqueda.
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {filtered.map((p, i) => (
                        <motion.li
                            key={p.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.04, ease: EASE }}
                        >
                            <ProjectRow p={p} />
                        </motion.li>
                    ))}
                </ul>
            )}
        </div>
    )
}
