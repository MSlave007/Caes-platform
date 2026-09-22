'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, Phone, Send } from 'lucide-react'
import { eur } from '@/lib/caes/estimate'
import type { Lead } from '@/lib/mockLeads'
import type { Project } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

const URGENCIA: Record<Lead['when'], { label: string; cls: string }> = {
    ya: {
        label: 'Cuanto antes',
        cls: 'bg-[var(--caes-lime)] text-[var(--caes-lime-ink)]',
    },
    meses: {
        label: 'En unos meses',
        cls: 'bg-[var(--caes-band)] text-[var(--caes-mut)]',
    },
    mirando: {
        label: 'Solo mirando',
        cls: 'bg-transparent text-[var(--caes-faint)] border border-[var(--caes-line)]',
    },
}

/**
 * Lead in arrivo dal calcolatore pubblico.
 *
 * Ordinati per urgenza dichiarata e non per data: un «cuanto antes» di ieri
 * vale più di un «solo estoy mirando» di stamattina, e mandare a un
 * installatore un lead freddo è il modo più rapido per farsi ignorare
 * la volta dopo.
 */
export default function AdminLeads() {
    const [leads, setLeads] = useState<Lead[]>([])
    const [installers, setInstallers] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            fetch('/api/leads').then((r) => r.json()),
            fetch('/api/projects').then((r) => r.json()),
        ])
            .then(([l, p]) => {
                setLeads(l.data ?? [])
                const names = new Set<string>()
                for (const pr of (p.data ?? []) as Project[]) {
                    if (pr.installer_name) names.add(pr.installer_name)
                }
                setInstallers([...names].sort())
            })
            .catch((e) => console.error('Error al cargar:', e))
            .finally(() => setLoading(false))
    }, [])

    const sorted = useMemo(() => {
        const rank: Record<Lead['when'], number> = { ya: 0, meses: 1, mirando: 2 }
        return [...leads].sort(
            (a, b) =>
                rank[a.when] - rank[b.when] || b.created_at.localeCompare(a.created_at)
        )
    }, [leads])

    const assign = async (id: string, installer: string) => {
        setBusy(id)
        try {
            const res = await fetch(`/api/leads/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    installer_name: installer || null,
                    status: installer ? 'assigned' : 'new',
                }),
            })
            const j = await res.json()
            if (j.data) setLeads((ls) => ls.map((l) => (l.id === id ? j.data : l)))
        } catch (e) {
            console.error('Error al asignar:', e)
        } finally {
            setBusy(null)
        }
    }

    const nuevos = leads.filter((l) => l.status === 'new').length

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
                <p className="label-mono text-[var(--caes-mut)]">Leads</p>
                <h1 className="mt-4 text-balance text-[clamp(28px,3.4vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                    {/*
                        Tre casi, non due. Zero perche sono stati tutti
                        distribuiti e zero perche non ne e mai arrivato
                        nessuno danno lo stesso numero e vogliono dire
                        cose opposte: «Todos repartidos» su una pagina
                        vuota si vanta di un lavoro che non e mai
                        esistito.
                    */}
                    {nuevos > 0 ? (
                        <>
                            {nuevos} sin <em className="serif-accent">asignar</em>.
                        </>
                    ) : sorted.length > 0 ? (
                        <>
                            Todos <em className="serif-accent">repartidos</em>.
                        </>
                    ) : (
                        <>
                            Todavía no ha llamado <em className="serif-accent">nadie</em>.
                        </>
                    )}
                </h1>
                <p className="mt-4 max-w-[58ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Gente que ha calculado su ahorro y ha pedido que le llamen. Todavía
                    no tienen factura ni expediente: son clientes potenciales que hay que
                    poner en manos de un instalador de su zona.
                </p>
            </div>

            {sorted.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-14 text-center">
                    <h2 className="text-[19px] font-semibold tracking-[-0.026em]">
                        Todavía no ha entrado ningún lead.
                    </h2>
                    <p className="mx-auto mt-3 max-w-[44ch] text-[14px] text-[var(--caes-mut)]">
                        Aparecerán aquí en cuanto alguien complete el calculador y deje
                        sus datos.
                    </p>
                </div>
            ) : (
                <ul className="flex flex-col gap-3">
                    {sorted.map((l, i) => {
                        const u = URGENCIA[l.when]
                        return (
                            <motion.li
                                key={l.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.45, delay: Math.min(i, 8) * 0.04, ease: EASE }}
                                className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-6"
                            >
                                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2.5">
                                            <h2 className="text-[15.5px] font-semibold tracking-[-0.02em]">
                                                {l.name}
                                            </h2>
                                            <span
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${u.cls}`}
                                            >
                                                {u.label}
                                            </span>
                                            {l.status === 'assigned' && (
                                                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--caes-green)]/12 px-2.5 py-1 text-[11px] font-medium text-[var(--caes-green)]">
                                                    <Check className="h-3 w-3" strokeWidth={3} />
                                                    Asignado
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[13px] text-[var(--caes-mut)]">
                                            <a
                                                href={`tel:${l.phone.replace(/\s/g, '')}`}
                                                className="inline-flex items-center gap-2 text-[var(--caes-ink)] underline-offset-4 hover:underline"
                                            >
                                                <Phone className="h-3.5 w-3.5" />
                                                {l.phone}
                                            </a>
                                            {l.email && <span>{l.email}</span>}
                                            <span className="font-mono">CP {l.postal}</span>
                                            <span>{l.factura_mensual} €/mes · {l.sistema}</span>
                                        </div>

                                        {/* La stima che ha visto: l'installatore chiama informato */}
                                        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 rounded-xl bg-[var(--caes-band)] px-4 py-3 text-[12.5px] text-[var(--caes-mut)]">
                                            <span>
                                                Coste neto{' '}
                                                <b className="font-mono tabular text-[var(--caes-ink)]">
                                                    {eur(l.estimacion.coste_neto ?? 0)}
                                                </b>
                                            </span>
                                            <span>
                                                Ahorro/año{' '}
                                                <b className="font-mono tabular text-[var(--caes-ink)]">
                                                    {eur(l.estimacion.ahorro_anual ?? 0)}
                                                </b>
                                            </span>
                                            <span>
                                                Retorno{' '}
                                                <b className="font-mono tabular text-[var(--caes-ink)]">
                                                    {l.estimacion.anos_retorno ?? '—'} años
                                                </b>
                                            </span>
                                        </div>
                                    </div>

                                    {/* assegnazione */}
                                    <div className="flex shrink-0 flex-col justify-center gap-2 lg:w-[15rem]">
                                        <label className="label-mono text-[var(--caes-faint)]">
                                            Mandar a
                                        </label>
                                        <div className="relative">
                                            <select
                                                value={l.installer_name ?? ''}
                                                disabled={busy === l.id}
                                                onChange={(e) => assign(l.id, e.target.value)}
                                                className="w-full appearance-none rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 pr-10 text-[14px] outline-none transition-colors focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12 disabled:opacity-50"
                                            >
                                                <option value="">Sin asignar</option>
                                                {installers.map((n) => (
                                                    <option key={n} value={n}>
                                                        {n}
                                                    </option>
                                                ))}
                                            </select>
                                            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--caes-faint)]">
                                                {busy === l.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Send className="h-3.5 w-3.5" />
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </motion.li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
