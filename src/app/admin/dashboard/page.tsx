'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'
import ProjectRow from '@/components/admin/ProjectRow'
import { normalize } from '@/components/platform/StatusChip'
import AccionesHoy, { type Accion } from '@/components/admin/AccionesHoy'
import Recorrido from '@/components/admin/Recorrido'
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

    /**
     * L'ora, presa una volta sola dopo il montaggio.
     *
     * `Date.now()` dentro il render e' impuro: due render della stessa
     * pagina darebbero numeri diversi, e fra server e browser darebbe
     * due HTML diversi. Qui si fissa un istante e si contano i giorni da
     * quello.
     */
    const [ahora, setAhora] = useState<number | null>(null)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    useEffect(() => setAhora(Date.now()), [])

    /** Giorni da quando non si muove. Serve a ordinare per urgenza. */
    const dias = useCallback(
        (p: Project) => {
            const t = p.updated_at ?? p.created_at
            if (!t || ahora === null) return 0
            return Math.max(0, Math.floor((ahora - new Date(t).getTime()) / 86400000))
        },
        [ahora]
    )

    /**
     * Le cose su cui l'agenzia puo' AGIRE.
     *
     * Non tutto quello che e' aperto e' un'azione: un espediente in mano
     * al soggetto delegato e' un'attesa, e sta nel recorrido piu' sotto.
     * Se qui entrassero anche quelli, dopo tre giorni che ci sono righe
     * su cui non si puo' fare niente questa lista non la guarderebbe
     * piu' nessuno.
     */
    const acciones = useMemo<Accion[]>(() => {
        const de = (id: string) => projects.filter((p) => normalize(p.status) === id)
        const viejo = (l: Project[]) =>
            l.length ? Math.max(...l.map(dias)) : undefined

        const porRevisar = de('submitted')
        const porEmitir = de('approved')
        const porCobrar = de('issued')

        return [
            {
                id: 'revisar',
                cuantos: porRevisar.length,
                titulo: porRevisar.length === 1 ? 'expediente por revisar' : 'expedientes por revisar',
                detalle:
                    'Han llegado y esperan que compruebes la documentación y fijes el reparto.',
                href: '/admin/review?estado=submitted',
                icono: 'revisar',
                diasMasViejo: viejo(porRevisar),
            },
            {
                id: 'emitir',
                cuantos: porEmitir.length,
                titulo: porEmitir.length === 1 ? 'aprobado sin CAE' : 'aprobados sin CAE',
                detalle:
                    'Aprobados por vosotros. Si el sujeto delegado tarda, aquí se ve cuánto.',
                href: '/admin/review?estado=approved',
                icono: 'emitir',
                diasMasViejo: viejo(porEmitir),
            },
            {
                id: 'cobrar',
                cuantos: porCobrar.length,
                titulo: porCobrar.length === 1 ? 'CAE sin cobrar' : 'CAE sin cobrar',
                detalle: 'El certificado existe. Falta que llegue el dinero y repartirlo.',
                href: '/admin/review?estado=issued',
                icono: 'cobrar',
                diasMasViejo: viejo(porCobrar),
            },
        ]
    }, [projects, dias])

    /** Quanti espedienti per stato, per il recorrido. */
    const cuenta = useMemo(() => {
        const c: Record<string, number> = {}
        for (const p of projects) {
            const id = normalize(p.status)
            c[id] = (c[id] ?? 0) + 1
        }
        return c
    }, [projects])

    const m = useMemo(() => {
        const st = (p: Project) => normalize(p.status)
        const pending = projects.filter((p) => st(p) === 'submitted')
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
                <p className="mt-3 max-w-[58ch] text-[15px] leading-[1.6] text-[var(--caes-mut)]">
                    Abajo solo lo que depende de vosotros. Lo que está en manos del
                    instalador o del sujeto delegado se ve en el recorrido.
                </p>
            </div>

            {/* ------------------------------------------- cosa tocca a me */}
            <AccionesHoy acciones={acciones} />

            {/* ------------------------------------------------------ numeri

                Tre soli, e nessuno di questi e' un'azione: sono il conto
                di com'e' andata. «Por revisar» e «Aprobados» stavano
                anche qui, ma dirli due volte a dieci centimetri di
                distanza fa perdere il punto di tutte e due — sopra sono
                cose da fare, qui erano statistica. */}
            <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-line)] sm:grid-cols-3">
                {[
                    {
                        k: 'Tu margen',
                        v: eur(m.earned),
                        n: 'sobre expedientes ya aprobados',
                    },
                    {
                        k: 'No elegibles',
                        v: String(m.blocked),
                        n:
                            m.blocked > 0
                                ? `por debajo del ${AHORRO_MINIMO_PCT} % que exige la norma`
                                : 'todos los que esperan superan el mínimo',
                    },
                    {
                        k: 'De dónde llegan',
                        v: `${m.fromInstallers} / ${m.fromClients}`,
                        n: 'instaladores / clientes. Los de cliente llegan sin instalador asignado',
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
                        <div className="mt-4 font-sans text-[clamp(22px,2.2vw,28px)] font-semibold leading-none tracking-[-0.04em] tabular">
                            {s.v}
                        </div>
                        <p className="mt-2.5 max-w-[30ch] text-[12.5px] leading-[1.45] text-[var(--caes-mut)]">
                            {s.n}
                        </p>
                    </motion.div>
                ))}
            </div>

            <Recorrido cuenta={cuenta} />

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
