'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, Download, Loader2, Search } from 'lucide-react'
import ProjectRow from '@/components/admin/ProjectRow'
import { normalize } from '@/components/platform/StatusChip'
import { eur, CUOTA_CAES_PCT } from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

type SortKey = 'date' | 'value' | 'savings'

/**
 * Archivio completo degli espedienti.
 *
 * Diverso dalla coda: lì si lavora su ciò che aspetta, qui si cerca nel
 * pregresso. Quindi ordinamento, totali e esportazione, non filtri di stato
 * pensati per smaltire.
 */
export default function AdminProjects() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [q, setQ] = useState('')
    const [sort, setSort] = useState<SortKey>('date')

    useEffect(() => {
        fetch('/api/projects')
            .then((r) => r.json())
            .then((j) => setProjects(j.data ?? []))
            .catch((e) => console.error('Error al cargar:', e))
            .finally(() => setLoading(false))
    }, [])

    const rows = useMemo(() => {
        const needle = q.trim().toLowerCase()
        const list = projects.filter(
            (p) =>
                !needle ||
                p.client_name?.toLowerCase().includes(needle) ||
                p.installer_name?.toLowerCase().includes(needle) ||
                p.address?.toLowerCase().includes(needle) ||
                p.id.includes(needle)
        )
        return [...list].sort((a, b) => {
            if (sort === 'value') return b.savings_eur - a.savings_eur
            if (sort === 'savings') return b.savings_pct - a.savings_pct
            return b.created_at.localeCompare(a.created_at)
        })
    }, [projects, q, sort])

    const totals = useMemo(() => {
        const approved = projects.filter((p) => normalize(p.status) === 'approved')
        const certified = approved.reduce((a, p) => a + p.savings_eur, 0)
        const ours = approved.reduce(
            (a, p) => a + p.savings_eur * ((p.agency_pct ?? CUOTA_CAES_PCT) / 100),
            0
        )
        return { certified, ours, approved: approved.length }
    }, [projects])

    /** Esportazione: un CSV generato nel browser, senza passare dal server. */
    const exportCsv = () => {
        const head = [
            'id',
            'fecha',
            'origen',
            'cliente',
            'instalador',
            'direccion',
            'estado',
            'ahorro_pct',
            'valor_eur',
            'instalador_pct',
            'agencia_pct',
        ]
        const lines = rows.map((p) =>
            [
                p.id,
                p.created_at,
                p.source,
                p.client_name,
                p.installer_name ?? '',
                p.address,
                p.status,
                String(p.savings_pct).replace('.', ','),
                String(p.savings_eur).replace('.', ','),
                p.installer_pct,
                p.agency_pct ?? '',
            ]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(';')
        )
        const csv = [head.join(';'), ...lines].join('\r\n')
        // BOM: senza, Excel in spagnolo rompe gli accenti.
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `expedientes-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-9">
            <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                    <p className="label-mono text-[var(--caes-mut)]">Expedientes</p>
                    <h1 className="mt-4 text-balance text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                        {projects.length} en total, {totals.approved}{' '}
                        <em className="serif-accent">certificados</em>.
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={exportCsv}
                    className="inline-flex items-center gap-2.5 rounded-full border border-[var(--caes-line)] px-5 py-3 text-[14px] text-[var(--caes-ink)] transition-colors hover:border-[var(--caes-ink)]/40 hover:bg-[var(--caes-band)]"
                >
                    <Download className="h-4 w-4" />
                    Exportar CSV
                </button>
            </div>

            <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-3">
                {[
                    {
                        k: 'Ahorro certificado',
                        v: eur(totals.certified),
                        n: 'suma de los expedientes aprobados',
                    },
                    {
                        k: 'Tu margen acumulado',
                        v: eur(totals.ours),
                        n: 'sobre esos mismos expedientes',
                    },
                    {
                        k: 'Ticket medio',
                        v: totals.approved ? eur(totals.certified / totals.approved) : '—',
                        n: 'valor medio por expediente aprobado',
                    },
                ].map((s, i) => (
                    <motion.div
                        key={s.k}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: i * 0.06, ease: EASE }}
                        className="bg-[var(--caes-panel)] p-6"
                    >
                        <div className="label-mono text-[var(--caes-faint)]">{s.k}</div>
                        <div className="mt-4 font-sans text-[clamp(22px,2.2vw,28px)] font-semibold leading-none tracking-[-0.04em] tabular">
                            {s.v}
                        </div>
                        <p className="mt-2.5 text-[12.5px] text-[var(--caes-mut)]">{s.n}</p>
                    </motion.div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-full max-w-[24rem]">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--caes-faint)]" />
                    <input
                        type="search"
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Cliente, instalador, dirección o número"
                        className="w-full rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] py-2.5 pl-11 pr-4 text-[13.5px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                    />
                </div>

                <div className="flex items-center gap-2 text-[13px] text-[var(--caes-mut)]">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {(
                        [
                            { id: 'date', l: 'Fecha' },
                            { id: 'value', l: 'Valor' },
                            { id: 'savings', l: 'Ahorro %' },
                        ] as { id: SortKey; l: string }[]
                    ).map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => setSort(s.id)}
                            className={`rounded-full px-3.5 py-2 transition-colors ${sort === s.id
                                    ? 'bg-[var(--caes-band)] font-medium text-[var(--caes-ink)]'
                                    : 'hover:text-[var(--caes-ink)]'
                                }`}
                        >
                            {s.l}
                        </button>
                    ))}
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-14 text-center">
                    <h2 className="text-[19px] font-semibold tracking-[-0.026em]">
                        Nada coincide con esa búsqueda.
                    </h2>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {rows.map((p, i) => (
                        <motion.li
                            key={p.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: Math.min(i, 10) * 0.03, ease: EASE }}
                        >
                            <ProjectRow p={p} />
                        </motion.li>
                    ))}
                </ul>
            )}
        </div>
    )
}
