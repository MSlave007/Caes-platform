'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, Search, ShieldCheck, ShieldOff } from 'lucide-react'
import { eur } from '@/lib/caes/estimate'
import { normalize } from '@/components/platform/StatusChip'
import type { Project } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

type Installer = {
    name: string
    projects: number
    approved: number
    savings: number
    lastSeen: string
    /** Verificato dall'agenzia: senza questo non riceve clienti */
    verified: boolean
}

/**
 * Gestione degli installatori.
 *
 * L'elenco si ricava dagli espedienti: non esiste ancora una tabella di
 * installatori, e inventarne una vuota avrebbe mostrato una pagina morta.
 * Quando ci sarà, cambia solo la fonte — la scheda resta questa.
 *
 * ⚠️ La verifica è per ora solo visiva: non viene salvata da nessuna parte.
 */
export default function AdminInstallers() {
    const [projects, setProjects] = useState<Project[]>([])
    const [loading, setLoading] = useState(true)
    const [q, setQ] = useState('')
    const [verified, setVerified] = useState<Record<string, boolean>>({})

    useEffect(() => {
        fetch('/api/projects')
            .then((r) => r.json())
            .then((j) => setProjects(j.data ?? []))
            .catch((e) => console.error('Error al cargar:', e))
            .finally(() => setLoading(false))
    }, [])

    const installers = useMemo<Installer[]>(() => {
        const map = new Map<string, Installer>()
        for (const p of projects) {
            if (!p.installer_name) continue
            const cur =
                map.get(p.installer_name) ??
                ({
                    name: p.installer_name,
                    projects: 0,
                    approved: 0,
                    savings: 0,
                    lastSeen: p.created_at,
                    verified: true,
                } as Installer)

            cur.projects += 1
            if (normalize(p.status) === 'approved') {
                cur.approved += 1
                cur.savings += p.savings_eur
            }
            if (p.created_at > cur.lastSeen) cur.lastSeen = p.created_at
            map.set(p.installer_name, cur)
        }
        return [...map.values()].sort((a, b) => b.projects - a.projects)
    }, [projects])

    const filtered = installers.filter((i) =>
        i.name.toLowerCase().includes(q.trim().toLowerCase())
    )

    const isVerified = (name: string) => verified[name] ?? true

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
            <div>
                <p className="label-mono text-[var(--caes-mut)]">Instaladores</p>
                <h1 className="mt-4 text-balance text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    {installers.length} trabajando <em className="serif-accent">contigo</em>.
                </h1>
                <p className="mt-4 max-w-[54ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Solo los verificados reciben clientes del calculador. Quitar la
                    verificación no borra nada: deja de mandarle trabajo nuevo.
                </p>
            </div>

            <div className="relative max-w-[24rem]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--caes-faint)]" />
                <input
                    type="search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Buscar instalador"
                    className="w-full rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] py-2.5 pl-11 pr-4 text-[13.5px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-14 text-center">
                    <h2 className="text-[19px] font-semibold tracking-[-0.026em]">
                        {q ? 'Ningún instalador con ese nombre.' : 'Todavía no hay instaladores.'}
                    </h2>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {filtered.map((inst, i) => {
                        const ok = isVerified(inst.name)
                        return (
                            <motion.li
                                key={inst.name}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: i * 0.05, ease: EASE }}
                                className="grid items-center gap-5 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6 lg:grid-cols-[minmax(0,1fr)_repeat(3,auto)_auto]"
                            >
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <h2 className="truncate text-[15.5px] font-semibold tracking-[-0.02em]">
                                            {inst.name}
                                        </h2>
                                        {ok ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--caes-green)]/12 px-2.5 py-1 text-[11px] font-medium text-[var(--caes-green)]">
                                                <Check className="h-3 w-3" strokeWidth={3} />
                                                Verificado
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--caes-band)] px-2.5 py-1 text-[11px] text-[var(--caes-mut)]">
                                                Sin verificar
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-[13px] text-[var(--caes-mut)]">
                                        Último expediente:{' '}
                                        {new Intl.DateTimeFormat('es-ES', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        }).format(new Date(inst.lastSeen))}
                                    </p>
                                </div>

                                <Metric label="Expedientes" value={String(inst.projects)} />
                                <Metric label="Aprobados" value={String(inst.approved)} />
                                <Metric label="Ahorro certificado" value={eur(inst.savings)} />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setVerified((v) => ({ ...v, [inst.name]: !ok }))
                                    }
                                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] transition-colors ${ok
                                            ? 'border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[#C4643F]/50 hover:text-[#9B4526]'
                                            : 'border-[var(--caes-ink)] font-medium text-[var(--caes-ink)] hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)]'
                                        }`}
                                >
                                    {ok ? (
                                        <>
                                            <ShieldOff className="h-3.5 w-3.5" />
                                            Quitar verificación
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            Verificar
                                        </>
                                    )}
                                </button>
                            </motion.li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

function Metric({ label, value }: { label: string; value: string }) {
    return (
        <div className="lg:w-[130px] lg:text-right">
            <div className="label-mono text-[var(--caes-faint)]">{label}</div>
            <div className="mt-1.5 font-mono tabular text-[15px] font-medium">{value}</div>
        </div>
    )
}
