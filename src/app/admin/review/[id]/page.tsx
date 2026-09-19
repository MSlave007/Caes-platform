'use client'

import { use, useEffect, useMemo, useState } from 'react'
import StatusControl from '@/components/admin/StatusControl'
import DocumentViewer from '@/components/admin/DocumentViewer'
import ExtractedFields from '@/components/admin/ExtractedFields'
import {
    CAMPOS,
    faltanParaFormula,
    type Extraccion,
} from '@/lib/caes/extraction'
import type { EstadoId } from '@/lib/caes/status'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    AlertTriangle,
    ArrowLeft,
    Check,
    FileText,
    Home,
    Loader2,
    Wrench,
    X,
} from 'lucide-react'
import StatusChip from '@/components/platform/StatusChip'
import { DOCUMENTS } from '@/lib/documents'
import {
    AHORRO_MINIMO_PCT,
    COMISION_MAXIMA_PCT,
    eur,
} from '@/lib/caes/estimate'
import type { Project } from '@/lib/mockDb'

const EASE = [0.16, 1, 0.3, 1] as const

export default function AdminReviewDetail({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params)
    const router = useRouter()

    const [p, setP] = useState<Project | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Valori modificabili in revisione
    const [savings, setSavings] = useState(0)
    const [agencyPct, setAgencyPct] = useState(65)
    const [verified, setVerified] = useState<Record<string, boolean>>({})

    /** Documento aperto nel visore, a sinistra. */
    const [docAbierto, setDocAbierto] = useState<string | null>(null)

    /**
     * I dati estratti dai documenti.
     *
     * DA COLLEGARE: oggi partono vuoti. Quando /api/extract chiamera un
     * modello vero, arriveranno precompilati con la loro confidenza — e il
     * pannello serve esattamente a confermarli o correggerli.
     */
    const [extraccion, setExtraccion] = useState<Extraccion>(() =>
        Object.fromEntries(CAMPOS.map((c) => [c.id, { valor: null, estado: 'vacio' as const }]))
    )

    const cambiarCampo = (id: string, valor: string) =>
        setExtraccion((prev) => ({
            ...prev,
            // Toccato a mano: diventa "corregido", cioe risponde chi rivede.
            [id]: { ...prev[id], valor, estado: valor ? 'corregido' : 'vacio' },
        }))

    const confirmarCampo = (id: string) =>
        setExtraccion((prev) => ({
            ...prev,
            [id]: { ...prev[id], estado: prev[id]?.valor ? 'confirmado' : 'vacio' },
        }))

    const faltan = faltanParaFormula(extraccion)

    /** Etichetta leggibile di uno slot documento, da entrambi i ruoli. */
    const etiquetaDocumento = (id: string) =>
        [...DOCUMENTS.installer, ...DOCUMENTS.client].find((d) => d.id === id)?.label ?? id

    useEffect(() => {
        fetch(`/api/projects/${id}`)
            .then((r) => r.json())
            .then((j) => {
                const proj: Project = j.data
                setP(proj)
                setSavings(proj?.savings_eur ?? 0)
                setAgencyPct(proj?.agency_pct ?? 65)
                setVerified(
                    Object.fromEntries((proj?.docs ?? []).map((d) => [d.id, d.verified]))
                )
            })
            .catch((e) => console.error('Error al cargar el expediente:', e))
            .finally(() => setLoading(false))
    }, [id])

    const specs = useMemo(
        () => (p ? DOCUMENTS[p.source === 'client' ? 'client' : 'installer'] : []),
        [p]
    )

    const uploaded = new Set((p?.docs ?? []).map((d) => d.id))
    const missing = specs.filter((s) => s.required && !uploaded.has(s.id))
    const allVerified = specs
        .filter((s) => s.required && uploaded.has(s.id))
        .every((s) => verified[s.id])

    const belowMinimum = (p?.savings_pct ?? 0) < AHORRO_MINIMO_PCT
    const canApprove = missing.length === 0 && allVerified && !belowMinimum

    // Ripartizione: l'installatore ha bloccato la sua quota all'invio;
    // l'agenzia sceglie la propria sul residuo.
    const installerCut = (savings * (p?.installer_pct ?? 0)) / 100
    const remaining = savings - installerCut
    const agencyCut = (remaining * agencyPct) / 100
    const reserve = remaining - agencyCut

    const patch = async (body: Partial<Project>) => {
        const res = await fetch(`/api/projects/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('No se ha podido guardar el cambio')
        return res.json()
    }

    const decide = async (status: 'approved' | 'rejected') => {
        setBusy(status === 'approved' ? 'approve' : 'reject')
        setError(null)
        try {
            // Le spunte di verifica vivevano solo nello stato locale: chi
            // riapriva la pratica le ritrovava tutte da rifare. Vanno salvate
            // insieme alla decisione.
            const docsVerificados = (p?.docs ?? []).map((d) => ({
                ...d,
                verified: Boolean(verified[d.id]),
            }))

            await patch(
                status === 'approved'
                    ? { status, savings_eur: savings, agency_pct: agencyPct, docs: docsVerificados }
                    : { status, docs: docsVerificados }
            )
            router.push('/admin/review')
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Error al guardar')
            setBusy(null)
        }
    }

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
                    href="/admin/review"
                    className="mt-6 inline-flex items-center gap-2 text-[14px] text-[var(--caes-mut)] underline-offset-4 hover:text-[var(--caes-ink)] hover:underline"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver a la cola
                </Link>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-9">
            <Link
                href="/admin/review"
                className="group inline-flex w-fit items-center gap-2.5 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
            >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                Volver a la cola
            </Link>

            {/* ------------------------------------------------ intestazione */}
            <div className="flex flex-wrap items-start justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3">
                        <span
                            className="flex h-9 w-9 items-center justify-center rounded-full"
                            style={{
                                background:
                                    p.source === 'installer'
                                        ? 'var(--caes-band)'
                                        : 'rgba(199,240,74,.28)',
                            }}
                        >
                            {p.source === 'installer' ? (
                                <Wrench className="h-4 w-4 text-[var(--caes-mut)]" strokeWidth={1.7} />
                            ) : (
                                <Home className="h-4 w-4 text-[var(--caes-lime-ink)]" strokeWidth={1.7} />
                            )}
                        </span>
                        <span className="label-mono text-[var(--caes-mut)]">
                            Expediente #{p.id} ·{' '}
                            {p.source === 'installer' ? 'Lo abre el instalador' : 'Lo abre el cliente'}
                        </span>
                    </div>
                    <h1 className="mt-4 text-balance text-[clamp(26px,3.2vw,36px)] font-semibold leading-[1.06] tracking-[-0.038em]">
                        {p.client_name}
                    </h1>
                    <p className="mt-2 text-[14px] text-[var(--caes-mut)]">
                        {p.installer_name ?? 'Sin instalador asignado'} · {p.address}
                    </p>
                </div>
                <StatusChip status={p.status} />
            </div>

            {/* --------------------------------------------------- avvisi */}
            {(belowMinimum || missing.length > 0) && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="flex items-start gap-3.5 rounded-2xl border border-[#E0B48C] bg-[#FBF1E7] p-5"
                >
                    <AlertTriangle className="mt-[2px] h-[18px] w-[18px] shrink-0 text-[#8A5B0B]" />
                    <div className="text-[14px] leading-[1.6] text-[#7A4A12]">
                        {belowMinimum && (
                            <p>
                                El ahorro verificado es del{' '}
                                <b>{p.savings_pct.toLocaleString('es-ES')} %</b>, por debajo
                                del {AHORRO_MINIMO_PCT} % que exige la norma. Este expediente
                                no es elegible.
                            </p>
                        )}
                        {missing.length > 0 && (
                            <p className={belowMinimum ? 'mt-2' : ''}>
                                Faltan {missing.length} documentos obligatorios:{' '}
                                {missing.map((m) => m.label).join(', ')}.
                            </p>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Documenti a sinistra, dati estratti a destra. Il riparto sta
                sotto: e una decisione che si prende DOPO aver verificato,
                non mentre si verifica. */}
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
                <div className="flex flex-col gap-6">
                {/* ------------------------------------------- documenti */}
                <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Documentación
                        </h2>
                        <span className="font-mono text-[11.5px] text-[var(--caes-faint)]">
                            {Object.values(verified).filter(Boolean).length} / {uploaded.size}{' '}
                            verificados
                        </span>
                    </div>

                    <ul className="mt-6 flex flex-col gap-2.5">
                        {specs.map((s) => {
                            const has = uploaded.has(s.id)
                            const ok = verified[s.id]
                            return (
                                <li
                                    key={s.id}
                                    className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${!has
                                            ? 'border-dashed border-[var(--caes-line)] opacity-60'
                                            : ok
                                                ? 'border-[var(--caes-green)]/35 bg-[var(--caes-green)]/[.04]'
                                                : 'border-[var(--caes-line)]'
                                        }`}
                                >
                                    <FileText
                                        className="h-4 w-4 shrink-0 text-[var(--caes-faint)]"
                                        strokeWidth={1.7}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-medium">
                                            {s.label}
                                        </p>
                                        <p className="text-[12px] text-[var(--caes-faint)]">
                                            {has
                                                ? 'Subido'
                                                : s.required
                                                    ? 'Falta · obligatorio'
                                                    : 'No aportado · opcional'}
                                        </p>
                                    </div>

                                    {has && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setVerified((v) => ({ ...v, [s.id]: !v[s.id] }))
                                            }
                                            className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] transition-colors ${ok
                                                    ? 'bg-[var(--caes-green)] font-medium text-white'
                                                    : 'border border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)]/30 hover:text-[var(--caes-ink)]'
                                                }`}
                                        >
                                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                            {ok ? 'Verificado' : 'Verificar'}
                                        </button>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </section>

                    {docAbierto ? (
                        <DocumentViewer
                            path={(p?.docs ?? []).find((d) => d.id === docAbierto)?.path}
                            nombre={etiquetaDocumento(docAbierto)}
                            onClose={() => setDocAbierto(null)}
                        />
                    ) : null}
                </div>

                {/* ------------------------------------ dati estratti */}
                <section className="flex flex-col gap-4">
                    <div className="flex items-baseline justify-between gap-4">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Datos extraídos
                        </h2>
                        <span className="font-mono text-[11.5px] text-[var(--caes-faint)]">
                            {faltan.length === 0
                                ? 'todo confirmado'
                                : `faltan ${faltan.length} de la fórmula`}
                        </span>
                    </div>
                    <ExtractedFields
                        extraccion={extraccion}
                        documentoAbierto={docAbierto}
                        onAbrirDocumento={setDocAbierto}
                        onCambiar={cambiarCampo}
                        onConfirmar={confirmarCampo}
                        etiquetaDocumento={etiquetaDocumento}
                    />
                </section>
            </div>

            {/* Il riparto, sotto: si decide dopo aver verificato. */}
                {/* ------------------------------------------- ripartizione */}
                <aside className="flex flex-col gap-6">
                    <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                            Ahorro reconocido
                        </h2>
                        <p className="mt-2 text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                            Lo que calculó el motor. Ajústalo solo si la documentación dice
                            otra cosa.
                        </p>

                        <div className="mt-6 flex items-baseline gap-2">
                            <input
                                type="number"
                                min={0}
                                step={10}
                                value={savings}
                                onChange={(e) => setSavings(Number(e.target.value) || 0)}
                                className="w-[9rem] rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 font-mono tabular text-[20px] font-medium outline-none transition-colors focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12"
                            />
                            <span className="text-[14px] text-[var(--caes-mut)]">€ / año</span>
                        </div>
                    </section>

                    <section className="rounded-2xl bg-[var(--caes-deep)] p-7 text-[#DDE9E1]">
                        <h2 className="text-[16px] font-semibold tracking-[-0.02em] text-white">
                            Tu margen
                        </h2>
                        <p className="mt-2 text-[13px] leading-[1.5] text-[rgba(221,233,225,.6)]">
                            Sobre {eur(remaining)}, que es lo que queda después de la comisión
                            del instalador.
                        </p>

                        <div className="mt-6 font-mono tabular text-[34px] leading-none tracking-[-0.04em] text-[var(--caes-lime)]">
                            {eur(agencyCut)}
                        </div>

                        <input
                            type="range"
                            min={0}
                            max={100}
                            step={5}
                            value={agencyPct}
                            onChange={(e) => setAgencyPct(Number(e.target.value))}
                            className="caes-range mt-6 w-full"
                            aria-label="Margen de la agencia"
                        />
                        <div className="mt-3 flex justify-between font-mono text-[11px] text-[rgba(221,233,225,.5)]">
                            <span>0 %</span>
                            <span>{agencyPct} %</span>
                            <span>100 %</span>
                        </div>

                        <div className="mt-7 flex flex-col gap-2.5 border-t border-white/10 pt-6 text-[13px]">
                            {[
                                {
                                    l: `Instalador · ${p.installer_pct} %`,
                                    v: installerCut,
                                    c: 'var(--caes-lime)',
                                    note: 'bloqueado al enviar',
                                },
                                { l: `Agencia · ${agencyPct} %`, v: agencyCut, c: '#4FCB8E' },
                                { l: 'Reserva', v: reserve, c: 'rgba(221,233,225,.35)' },
                            ].map((r) => (
                                <div key={r.l} className="flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-2.5 text-[rgba(221,233,225,.72)]">
                                        <i
                                            className="block h-[7px] w-[7px] shrink-0 rounded-[2px]"
                                            style={{ background: r.c }}
                                        />
                                        {r.l}
                                        {r.note && (
                                            <span className="text-[11.5px] text-[rgba(221,233,225,.4)]">
                                                {r.note}
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-mono tabular text-[13.5px] font-medium text-white">
                                        {eur(r.v)}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {p.installer_pct > COMISION_MAXIMA_PCT && (
                            <p className="mt-5 rounded-lg bg-[#C4643F]/20 px-3.5 py-2.5 text-[12.5px] text-[#F0B79E]">
                                La comisión del instalador supera el {COMISION_MAXIMA_PCT} %
                                legal. El acuerdo CAES no sería válido.
                            </p>
                        )}
                    </section>
                </aside>

            {error && (
                <p
                    role="alert"
                    className="rounded-xl border border-[#E0B48C] bg-[#FBF1E7] px-4 py-3 text-[13.5px] text-[#7A4A12]"
                >
                    {error}
                </p>
            )}

            {/* --------------------------------------- ciclo di vita */}
            {p ? (
                <div className="mt-8">
                    <StatusControl
                        current={p.status}
                        onChange={async (next: EstadoId) => {
                            await patch({ status: next })
                            setP((prev) => (prev ? { ...prev, status: next } : prev))
                        }}
                    />
                </div>
            ) : null}

            {/* ------------------------------------------------- decisione */}
            <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--caes-line)] bg-[var(--caes-paper)] py-6">
                <p className="max-w-[46ch] text-[13px] leading-[1.55] text-[var(--caes-mut)]">
                    {canApprove
                        ? 'Todo comprobado. Al aprobar se fija el reparto y se emite el certificado.'
                        : 'No se puede aprobar hasta que esté todo verificado y el ahorro supere el mínimo.'}
                </p>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => decide('rejected')}
                        disabled={busy !== null}
                        className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-5 py-3 text-[14.5px] text-[var(--caes-mut)] transition-colors hover:border-[#C4643F]/50 hover:text-[#9B4526] disabled:opacity-40"
                    >
                        {busy === 'reject' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <X className="h-4 w-4" />
                        )}
                        Rechazar
                    </button>
                    <button
                        type="button"
                        onClick={() => decide('approved')}
                        disabled={!canApprove || busy !== null}
                        className="inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-7 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        {busy === 'approve' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Check className="h-4 w-4" strokeWidth={2.5} />
                        )}
                        Aprobar y emitir
                    </button>
                </div>
            </div>
        </div>
    )
}
