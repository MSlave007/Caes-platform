'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, FileText, Loader2 } from 'lucide-react'
import StatusChip, { normalize } from '@/components/platform/StatusChip'
import { DOCUMENTS } from '@/lib/documents'
import { AHORRO_MINIMO_PCT, eur } from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

import { PISTA, posicionPista, esperaAlInstalador, estado } from '@/lib/caes/status'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Le cinque tappe come le vive l'installatore.
 *
 * Prima erano tre e si fermavano ad «Aprobado», che è circa metà del
 * processo: tutto quello che gli interessa davvero — firme, tramitazione,
 * incasso — restava invisibile. Vedi src/lib/caes/status.ts
 */
const TIMELINE = PISTA

/**
 * Dettaglio dell'espediente, lato installatore.
 *
 * Qui non si modifica niente: una volta inviato, la palla è dell'agenzia.
 * Serve a rispondere a due domande — a che punto siamo, e quanto mi tocca —
 * senza dover telefonare a nessuno.
 */
export default function InstallerProjectDetail({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params)
    const [p, setP] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch(`/api/projects/${id}`)
            .then((r) => r.json())
            .then((j) => setP(j.data ?? null))
            .catch((e) => console.error('Error al cargar:', e))
            .finally(() => setLoading(false))
    }, [id])

    if (loading) {
        return (
            <div className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando el expediente…
            </div>
        )
    }

    if (!p) {
        return (
            <div className="rounded-2xl border border-dashed border-[var(--caes-line)] px-8 py-14 text-center">
                <h1 className="text-[20px] font-semibold tracking-[-0.026em]">
                    Este expediente no existe.
                </h1>
                <Link
                    href="/installer/dashboard"
                    className="mt-6 inline-flex items-center gap-2 text-[14px] text-[var(--caes-mut)] underline-offset-4 hover:text-[var(--caes-ink)] hover:underline"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a mis expedientes
                </Link>
            </div>
        )
    }

    const st = normalize(p.status)
    const rejected = st === 'rejected'
    const currentStep = rejected ? -1 : posicionPista(st)
    const tuTurno = esperaAlInstalador(st)
    const detalle = estado(st)

    const specs = DOCUMENTS[p.source === 'client' ? 'client' : 'installer']
    const uploaded = new Set((p.docs ?? []).map((d) => d.id))
    const yours = (p.savings_eur * p.installer_pct) / 100
    const below = p.savings_pct < AHORRO_MINIMO_PCT

    return (
        <div className="flex flex-col gap-9">
            <Link
                href="/installer/dashboard"
                className="group inline-flex w-fit items-center gap-2.5 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
            >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                Mis expedientes
            </Link>

            <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                    <p className="label-mono text-[var(--caes-mut)]">Expediente #{p.id}</p>
                    <h1 className="mt-4 text-balance text-[clamp(26px,3.2vw,36px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                        {p.client_name}
                    </h1>
                    <p className="mt-2 text-[14px] text-[var(--caes-mut)]">{p.address}</p>
                </div>
                <StatusChip status={p.status} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                <div className="flex flex-col gap-6">
                    {/* ------------------------------------------- avanzamento */}
                    <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            En qué punto está
                        </h2>

                        {rejected ? (
                            <div className="mt-6 rounded-xl border border-[#E0B48C] bg-[#FBF1E7] p-5 text-[14px] leading-[1.6] text-[#7A4A12]">
                                La agencia ha rechazado este expediente.
                                {below && (
                                    <>
                                        {' '}
                                        El ahorro verificado fue del{' '}
                                        <b>
                                            {p.savings_pct.toLocaleString('es-ES', {
                                                maximumFractionDigits: 1,
                                            })}{' '}
                                            %
                                        </b>
                                        , por debajo del {AHORRO_MINIMO_PCT} % que exige la
                                        norma.
                                    </>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* Se la palla è sua deve saltare all'occhio:
                                    è l'avviso che evita la telefonata. */}
                                {tuTurno ? (
                                    <div className="mt-6 rounded-[8px] border border-[#D8B26A] bg-[#FBF5E8] px-4 py-3.5">
                                        <p className="text-[14px] font-semibold text-[#7A5A1C]">
                                            Te toca a ti: {detalle.label.toLowerCase()}
                                        </p>
                                        <p className="mt-1 text-[13px] leading-[1.5] text-[#8A6A2C]">
                                            {detalle.hint}
                                        </p>
                                    </div>
                                ) : null}

                            <ol className="relative mt-7 flex flex-col">
                                <span
                                    aria-hidden
                                    className="absolute bottom-8 left-[11px] top-3 w-px bg-[var(--caes-line)]"
                                />
                                {TIMELINE.map((s, i) => {
                                    const done = i < currentStep
                                    const now = i === currentStep
                                    return (
                                        <motion.li
                                            key={s.id}
                                            initial={{ opacity: 0, x: -6 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
                                            className="relative flex gap-5 pb-8 last:pb-0"
                                        >
                                            <span
                                                className={`relative z-10 mt-0.5 flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full ${done
                                                        ? 'bg-[var(--caes-green)] text-white'
                                                        : now
                                                            ? 'bg-[var(--caes-ink)] text-[var(--caes-lime)]'
                                                            : 'bg-[var(--caes-band)] text-[var(--caes-faint)]'
                                                    }`}
                                            >
                                                {done ? (
                                                    <Check className="h-3 w-3" strokeWidth={3} />
                                                ) : (
                                                    <span className="h-[6px] w-[6px] rounded-full bg-current" />
                                                )}
                                            </span>
                                            <div>
                                                <h3
                                                    className={`text-[15px] font-semibold tracking-[-0.018em] ${now || done ? '' : 'text-[var(--caes-faint)]'
                                                        }`}
                                                >
                                                    {s.label}
                                                </h3>
                                                <p className="mt-1 max-w-[46ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                                                    {s.body}
                                                </p>
                                            </div>
                                        </motion.li>
                                    )
                                })}
                            </ol>
                            </>
                        )}
                    </section>

                    {/* ------------------------------------------- documenti */}
                    <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Lo que enviaste
                        </h2>
                        <ul className="mt-6 flex flex-col gap-2">
                            {specs.map((s) => {
                                const has = uploaded.has(s.id)
                                return (
                                    <li
                                        key={s.id}
                                        className={`flex items-center gap-3.5 rounded-xl border px-4 py-3 ${has
                                                ? 'border-[var(--caes-line)]'
                                                : 'border-dashed border-[var(--caes-line)] opacity-55'
                                            }`}
                                    >
                                        <FileText
                                            className="h-4 w-4 shrink-0 text-[var(--caes-faint)]"
                                            strokeWidth={1.7}
                                        />
                                        <span className="min-w-0 flex-1 truncate text-[14px]">
                                            {s.label}
                                        </span>
                                        <span className="shrink-0 text-[12px] text-[var(--caes-faint)]">
                                            {has ? 'Enviado' : s.required ? 'Falta' : 'No aportado'}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    </section>
                </div>

                {/* ------------------------------------------------ tu parte */}
                <aside>
                    <section className="rounded-2xl bg-[var(--caes-deep)] p-7 text-[#DDE9E1]">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-white">
                            Tu parte
                        </h2>
                        <p className="mt-2 text-[13px] leading-[1.5] text-[rgba(221,233,225,.6)]">
                            {p.installer_pct} % del valor del certificado. Quedó fijado
                            cuando enviaste el expediente.
                        </p>

                        <div className="mt-6 font-mono tabular text-[34px] leading-none tracking-[-0.04em] text-[var(--caes-lime)]">
                            {eur(yours)}
                        </div>

                        <div className="mt-7 flex flex-col gap-2.5 border-t border-white/10 pt-6 text-[13px]">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[rgba(221,233,225,.72)]">
                                    Valor del certificado
                                </span>
                                <span className="font-mono tabular font-medium text-white">
                                    {eur(p.savings_eur)}
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[rgba(221,233,225,.72)]">
                                    Ahorro verificado
                                </span>
                                <span
                                    className={`font-mono tabular font-medium ${below ? 'text-[#F0B79E]' : 'text-white'}`}
                                >
                                    {p.savings_pct.toLocaleString('es-ES', {
                                        maximumFractionDigits: 1,
                                    })}{' '}
                                    %
                                </span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-[rgba(221,233,225,.72)]">Equipo</span>
                                <span className="text-right text-white">
                                    {p.make} {p.model}
                                </span>
                            </div>
                        </div>

                        {st !== 'approved' && !rejected && (
                            <p className="mt-6 rounded-lg bg-white/[.06] px-3.5 py-3 text-[12.5px] leading-[1.5] text-[rgba(221,233,225,.6)]">
                                El importe es definitivo cuando la agencia aprueba. Hasta
                                entonces puede ajustarse si la documentación dice otra cosa.
                            </p>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    )
}
