'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Home, Loader2, Wrench } from 'lucide-react'
import ProjectRow from '@/components/admin/ProjectRow'
import { normalize } from '@/components/platform/StatusChip'
import { ESTADOS, FLUJO, estado } from '@/lib/caes/status'
import { AHORRO_MINIMO_PCT, eur } from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

export default function AdminDashboard() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch('/api/projects')
            .then((r) => r.json())
            .then((j) => setProjects(j.data ?? []))
            .catch((e) => console.error('Error al cargar los expedientes:', e))
            .finally(() => setLoading(false))
    }, [])

    const m = useMemo(() => {
        const st = (p: Project) => normalize(p.status)
        const pending = projects.filter((p) => ['submitted', 'under_review'].includes(st(p)))
        const approved = projects.filter((p) => st(p) === 'approved')

        // Margine già maturato: solo sugli espedienti approvati, dove la
        // percentuale dell'agenzia è stata effettivamente fissata.
        const earned = approved.reduce((a, p) => {
            const remaining = p.savings_eur * (1 - p.installer_pct / 100)
            return a + remaining * ((p.agency_pct ?? 0) / 100)
        }, 0)

        return {
            pending,
            approved,
            fromInstallers: projects.filter((p) => p.source === 'installer').length,
            fromClients: projects.filter((p) => p.source === 'client').length,
            blocked: pending.filter((p) => p.savings_pct < AHORRO_MINIMO_PCT).length,
            earned,
        }
    }, [projects])

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-12">
            <div>
                <p className="label-mono text-[var(--caes-mut)]">Resumen</p>
                <h1 className="mt-4 text-balance text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    {m.pending.length > 0 ? (
                        <>
                            Hay {m.pending.length} expedientes{' '}
                            <em className="serif-accent">esperando</em>.
                        </>
                    ) : (
                        <>
                            Nada <em className="serif-accent">pendiente</em>.
                        </>
                    )}
                </h1>
            </div>

            {/* ------------------------------------------------------ numeri */}
            <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-2 lg:grid-cols-4">
                {[
                    {
                        k: 'Por revisar',
                        v: String(m.pending.length),
                        n:
                            m.blocked > 0
                                ? `${m.blocked} por debajo del ${AHORRO_MINIMO_PCT} % mínimo`
                                : 'todos elegibles',
                    },
                    {
                        k: 'Aprobados',
                        v: String(m.approved.length),
                        n: 'certificado emitido',
                    },
                    {
                        k: 'Tu margen',
                        v: eur(m.earned),
                        n: 'sobre expedientes ya aprobados',
                    },
                    {
                        k: 'Origen',
                        v: `${m.fromInstallers} / ${m.fromClients}`,
                        n: 'instaladores / clientes',
                    },
                ].map((s, i) => (
                    <motion.div
                        key={s.k}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.55, delay: i * 0.06, ease: EASE }}
                        className="bg-[var(--caes-panel)] p-6"
                    >
                        <div className="label-mono text-[var(--caes-faint)]">{s.k}</div>
                        <div className="mt-4 font-sans text-[clamp(24px,2.4vw,30px)] font-semibold leading-none tracking-[-0.04em] tabular">
                            {s.v}
                        </div>
                        <p className="mt-2.5 text-[12.5px] leading-[1.45] text-[var(--caes-mut)]">
                            {s.n}
                        </p>
                    </motion.div>
                ))}
            </div>

            {/* -------------------------------------------- da dove arrivano */}
            <div className="grid gap-4 sm:grid-cols-2">
                {[
                    {
                        Icon: Wrench,
                        title: 'De instaladores',
                        n: m.fromInstallers,
                        body: 'Llegan con la instalación hecha y la comisión ya fijada. Solo hay que verificar y aprobar.',
                        href: '/admin/review',
                    },
                    {
                        Icon: Home,
                        title: 'De clientes',
                        n: m.fromClients,
                        body: 'Llegan del calculador, sin instalador asignado. Hay que asignarles uno de su zona antes de seguir.',
                        href: '/admin/review',
                    },
                ].map((c) => (
                    <Link
                        key={c.title}
                        href={c.href}
                        className="group rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7 transition-all duration-300 hover:border-[var(--caes-ink)]/25 hover:shadow-[0_18px_40px_-26px_rgba(6,35,26,.35)]"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <c.Icon
                                className="h-5 w-5 text-[var(--caes-green)]"
                                strokeWidth={1.7}
                            />
                            <span className="font-mono tabular text-[26px] font-medium leading-none tracking-[-0.03em]">
                                {c.n}
                            </span>
                        </div>
                        <h2 className="mt-6 text-[16px] font-semibold tracking-[-0.02em]">
                            {c.title}
                        </h2>
                        <p className="mt-2 max-w-[38ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                            {c.body}
                        </p>
                    </Link>
                ))}
            </div>

            {/* -------------------------------------------- ciclo di vita */}
            <div>
                <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-[17px] font-semibold tracking-[-0.024em]">
                        En qué punto están
                    </h2>
                    <span className="font-mono text-[9.5px] uppercase tracking-[.13em] text-[var(--caes-faint)]">
                        Todo el ciclo, no solo la revisión
                    </span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-4 lg:grid-cols-8">
                    {FLUJO.filter((id) => id !== 'draft').map((id) => {
                        const e = estado(id)
                        const n = projects.filter((p) => normalize(p.status) === id).length
                        return (
                            <div key={id} className="bg-[var(--caes-paper)] px-4 py-4">
                                <div className="font-mono tabular text-[22px] font-medium tracking-[-0.03em] text-[var(--caes-ink)]">
                                    {n}
                                </div>
                                <div className="mt-1 text-[12.5px] leading-[1.3] text-[var(--caes-mut)]">
                                    {e.label}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* le eccezioni stanno a parte: non sono una tappa del percorso */}
                <div className="mt-3 flex flex-wrap gap-x-7 gap-y-2">
                    {ESTADOS.filter((e) => e.excepcion).map((e) => (
                        <span key={e.id} className="text-[13px] text-[var(--caes-mut)]">
                            {e.label}{' '}
                            <b className="font-mono tabular font-medium text-[var(--caes-ink)]">
                                {projects.filter((p) => normalize(p.status) === e.id).length}
                            </b>
                        </span>
                    ))}
                </div>
            </div>

            {/* ------------------------------------------------ coda breve */}
            <div>
                <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-[17px] font-semibold tracking-[-0.024em]">
                        Lo primero de la cola
                    </h2>
                    <Link
                        href="/admin/review"
                        className="group inline-flex items-center gap-2 text-[13.5px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                    >
                        Ver toda la cola
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </Link>
                </div>

                <ul className="mt-6 flex flex-col gap-3">
                    {m.pending.slice(0, 4).map((p) => (
                        <li key={p.id}>
                            <ProjectRow p={p} />
                        </li>
                    ))}
                    {m.pending.length === 0 && (
                        <li className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-10 text-center text-[14px] text-[var(--caes-mut)]">
                            No queda nada por revisar.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    )
}
