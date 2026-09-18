'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, AlertTriangle } from 'lucide-react'
import {
    estimate,
    eur,
    AHORRO_MINIMO_PCT,
    DEMANDA_CALEFACCION_POR_ZONA,
} from '@/lib/caes/estimate'
import type { Dict, Locale } from '@/lib/i18n/landing'

const SUPERFICIES = [70, 90, 110, 130, 150, 180, 220, 280, 350, 500]
const ZONAS = Object.keys(DEMANDA_CALEFACCION_POR_ZONA)
const SUSTITUIDOS = ['termo_electrico', 'caldera_gas', 'caldera_gasoleo'] as const

const ZONA_CIUDAD: Record<string, string> = {
    A3: 'Cádiz',
    B3: 'Valencia',
    C1: 'Bilbao',
    C3: 'Madrid',
    D2: 'Zaragoza',
    D3: 'Valladolid',
    E1: 'Burgos',
}

type Props = { dict: Dict; locale: Locale }

/** Una cella della barra: etichetta minuscola sopra, select invisibile sotto. */
function Field({
    label,
    children,
    className = '',
}: {
    label: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <label
            className={`flex-1 min-w-0 px-5 py-3.5 border-b sm:border-b-0 sm:border-r border-[var(--caes-line-2)] last:border-0 cursor-pointer group ${className}`}
        >
            <span className="label-mono block text-[var(--caes-faint)]">{label}</span>
            {children}
        </label>
    )
}

const selectClass =
    'mt-1 w-full bg-transparent text-[15.5px] font-medium tracking-[-0.012em] text-[var(--caes-ink)] outline-none cursor-pointer appearance-none focus-visible:ring-2 focus-visible:ring-[var(--caes-green)]/40 rounded-sm'

export default function SimulatorBar({ dict, locale }: Props) {
    const t = dict.simulator
    const [superficie, setSuperficie] = useState(150)
    const [zona, setZona] = useState('C3')
    const [sustituido, setSustituido] = useState<string>('termo_electrico')
    const [shown, setShown] = useState(false)

    const result = useMemo(
        () => estimate({ superficieM2: superficie, zona, sustituido }),
        [superficie, zona, sustituido]
    )

    const money = (n: number) => eur(n, dict.intlLocale)
    const pct = (n: number) =>
        new Intl.NumberFormat(dict.intlLocale, { maximumFractionDigits: 1 }).format(n)

    // La barra della soglia si legge su una scala 0–80%, così il 20% legale
    // cade a un quarto e resta visibile come tacca.
    const SCALE = 80
    const fill = Math.min(100, (result.ahorroPct / SCALE) * 100)
    const threshold = (AHORRO_MINIMO_PCT / SCALE) * 100

    return (
        <div id="simulador" className="scroll-mt-24">
            <div className="rounded-[10px] border border-[var(--caes-line)] bg-[var(--caes-panel)] shadow-[0_2px_4px_rgba(6,35,26,.05),0_26px_54px_-26px_rgba(6,35,26,.42)] overflow-hidden">
                <div className="flex flex-col sm:flex-row items-stretch">
                    <Field label={t.fields.equipo}>
                        <span className="mt-1 block text-[15.5px] font-medium tracking-[-0.012em] text-[var(--caes-ink)]">
                            {t.equipoValue}
                        </span>
                    </Field>

                    <Field label={t.fields.superficie}>
                        <select
                            className={selectClass}
                            value={superficie}
                            onChange={(e) => {
                                setSuperficie(parseFloat(e.target.value))
                                setShown(false)
                            }}
                        >
                            {SUPERFICIES.map((m) => (
                                <option key={m} value={m}>
                                    {new Intl.NumberFormat(dict.intlLocale).format(m)} m²
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label={t.fields.zona}>
                        <select
                            className={selectClass}
                            value={zona}
                            onChange={(e) => {
                                setZona(e.target.value)
                                setShown(false)
                            }}
                        >
                            {ZONAS.map((z) => (
                                <option key={z} value={z}>
                                    {z} · {ZONA_CIUDAD[z]}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <Field label={t.fields.sustituido}>
                        <select
                            className={selectClass}
                            value={sustituido}
                            onChange={(e) => {
                                setSustituido(e.target.value)
                                setShown(false)
                            }}
                        >
                            {SUSTITUIDOS.map((s) => (
                                <option key={s} value={s}>
                                    {t.substitutes[s]}
                                </option>
                            ))}
                        </select>
                    </Field>

                    <button
                        type="button"
                        onClick={() => setShown(true)}
                        className="flex items-center justify-center gap-2.5 bg-[var(--caes-green)] hover:bg-[var(--caes-green-hi)] text-[var(--caes-panel)] px-8 py-4 sm:py-0 text-[14.5px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--caes-lime)]"
                    >
                        {shown ? t.recalculate : t.submit}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                    </button>
                </div>

                {shown && (
                    <div
                        className="border-t border-[var(--caes-line-2)] bg-white/60 px-5 py-5 sm:px-7"
                        role="status"
                        aria-live="polite"
                    >
                        <div className="label-mono text-[var(--caes-faint)]">
                            {t.result.heading}
                        </div>

                        <div className="mt-4 grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)] sm:items-end">
                            <div>
                                <div className="label-mono text-[var(--caes-faint)]">
                                    {t.result.annual}
                                </div>
                                <div className="font-mono tabular text-[30px] leading-none tracking-[-0.03em] text-[var(--caes-ink)] mt-2">
                                    {money(result.valorTotal)}
                                </div>
                            </div>

                            <div>
                                <div className="label-mono text-[var(--caes-faint)]">
                                    {t.result.yours}
                                </div>
                                <div className="font-mono tabular text-[30px] leading-none tracking-[-0.03em] text-[var(--caes-green)] mt-2">
                                    {money(result.parteInstalador)}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="label-mono text-[var(--caes-faint)]">
                                        {t.result.savings}
                                    </span>
                                    <span className="font-mono tabular text-[15px] font-medium text-[var(--caes-ink)]">
                                        {pct(result.ahorroPct)} %
                                    </span>
                                </div>
                                <div className="relative mt-3 h-1.5 rounded-full bg-[var(--caes-line)]">
                                    <div
                                        className="absolute inset-y-0 left-0 rounded-full bg-[var(--caes-lime)]"
                                        style={{ width: `${fill}%` }}
                                    />
                                    <div
                                        className="absolute -top-1 -bottom-1 w-px bg-[var(--caes-ink)]"
                                        style={{ left: `${threshold}%` }}
                                    />
                                </div>
                                <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-[var(--caes-mut)]">
                                    {result.cumpleMinimo ? (
                                        <>
                                            <Check
                                                className="h-3.5 w-3.5 text-[var(--caes-green)]"
                                                aria-hidden
                                            />
                                            {t.result.qualifies}
                                        </>
                                    ) : (
                                        <>
                                            <AlertTriangle
                                                className="h-3.5 w-3.5 text-amber-600"
                                                aria-hidden
                                            />
                                            {t.result.notQualifies}
                                        </>
                                    )}
                                    <span className="text-[var(--caes-faint)]">
                                        · {t.result.threshold}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--caes-line-2)] pt-4">
                            <p className="max-w-[62ch] text-[12.5px] leading-relaxed text-[var(--caes-mut)]">
                                {t.result.disclaimer}
                            </p>
                            <Link
                                href={`/${locale === 'es' ? 'es' : 'en'}#empezar`}
                                className="inline-flex items-center gap-2 rounded-md border border-[var(--caes-ink)] px-4 py-2 text-[13.5px] font-medium text-[var(--caes-ink)] transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)]"
                            >
                                {t.result.cta}
                                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-3.5 flex flex-wrap gap-x-7 gap-y-2">
                {t.footnotes.map((f) => (
                    <span
                        key={f}
                        className="label-mono flex items-center gap-2 text-[var(--caes-mut)]"
                    >
                        <i className="block h-[5px] w-[5px] rounded-full bg-[var(--caes-green)]" />
                        {f}
                    </span>
                ))}
            </div>
        </div>
    )
}
