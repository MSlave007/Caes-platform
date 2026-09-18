'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import {
    estimate,
    eur,
    DEMANDA_CALEFACCION_POR_ZONA,
    COMISION_MAXIMA_PCT,
} from '@/lib/caes/estimate'
import type { Dict, Locale } from '@/lib/i18n/landing'

/**
 * Simulatore dei guadagni dell'installatore.
 *
 * Non è il calcolatore del cliente finale (quello sta in Calculator e
 * risponde a «quanto risparmio io»). Questo risponde alla domanda che fa
 * l'installatore al telefono: «quanto ci guadagno, e quanto ho lasciato
 * indietro dal 2024».
 *
 * I tre anni di arretrato NON sono un cursore: sono il termine di legge per
 * presentare l'actuación dal fine lavori, uguale per tutti. Lo stesso vale
 * per la documentazione: si recupera tutto, e dove mancano le foto del prima
 * si applica il rendimento di default.
 *
 * Il valore del certificato è in prima fila, non nascosto: è la prima cosa
 * che chiede chi guarda i risultati, e senza quello le altre cifre sono
 * numeri senza provenienza.
 *
 * Il valore per pratica esce da estimate(), lo stesso motore del resto del
 * sito: se cambia la tariffa cambia dappertutto insieme.
 */

/** Superfici tipiche: dall'appartamento al piccolo edificio. */
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

/**
 * Casa tipo: 180 m².
 *
 * L'aerotermia si mette su case grandi e piccoli edifici, e nella ficha
 * RES060 è la SUPERFICIE a fare il valore del certificato, non i kW
 * installati. 220 m² in zona D3 fa un certificato da circa 2.000 €, che è
 * la forbice dei certificati veri: l'aerotermia si ristruttura dove il
 * riscaldamento costa, cioè in zona fredda e su case grandi.
 */
const SUPERFICIE_TIPO = 220

/** Termine di legge per presentare l'actuación, anni dal fine lavori. */
const ANOS_RECUPERABLES = 3

/** Minuti dichiarati per pratica: è la promessa del titolo della pagina. */
const MINUTOS_POR_EXPEDIENTE = 15

type Props = { dict: Dict; locale: Locale }

function Select({
    label,
    value,
    onChange,
    children,
}: {
    label: string
    value: string | number
    onChange: (v: string) => void
    children: React.ReactNode
}) {
    return (
        <label className="min-w-0 flex-1 cursor-pointer border-b border-[var(--caes-line-2)] px-5 py-3.5 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
            <span className="label-mono block text-[var(--caes-faint)]">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 w-full cursor-pointer appearance-none rounded-sm bg-transparent text-[15.5px] font-medium tracking-[-0.012em] text-[var(--caes-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--caes-green)]/40"
            >
                {children}
            </select>
        </label>
    )
}

function Slider({
    id,
    label,
    value,
    min,
    max,
    onChange,
    display,
}: {
    id: string
    label: string
    value: number
    min: number
    max: number
    onChange: (n: number) => void
    display: string
}) {
    return (
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-5 py-3.5">
            <label htmlFor={id} className="flex items-baseline justify-between gap-3">
                <span className="label-mono whitespace-nowrap text-[var(--caes-faint)]">
                    {label}
                </span>
                <span className="whitespace-nowrap font-mono tabular text-[15.5px] font-medium tracking-[-0.02em] text-[var(--caes-ink)]">
                    {display}
                </span>
            </label>
            <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={1}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="earn-range w-full cursor-pointer"
            />
        </div>
    )
}

/** Una delle tre colonne del risultato. */
function Block({
    label,
    value,
    sub,
    accent = false,
}: {
    label: string
    value: string
    sub: string
    accent?: boolean
}) {
    return (
        <div className="flex flex-col gap-1.5 border-t border-white/[.1] px-6 py-6 sm:border-l sm:border-t-0 sm:first:border-l-0 sm:first:pl-0">
            <span className="label-mono text-[rgba(221,233,225,.45)]">{label}</span>
            <span
                className={`font-mono tabular text-[clamp(24px,2.6vw,32px)] font-medium leading-[1.1] tracking-[-0.035em] ${accent ? 'text-[var(--caes-lime)]' : 'text-[#DDE9E1]'
                    }`}
            >
                {value}
            </span>
            <span className="text-[12.5px] leading-[1.45] text-[rgba(221,233,225,.5)]">{sub}</span>
        </div>
    )
}

export default function InstallerEarnings({ dict, locale }: Props) {
    const t = dict.ganancias
    const s = dict.simulator

    const [instalaciones, setInstalaciones] = useState(20)
    const [comision, setComision] = useState(25)
    const [superficie, setSuperficie] = useState(SUPERFICIE_TIPO)
    const [zona, setZona] = useState('D3')
    const [sustituido, setSustituido] = useState<string>('caldera_gas')

    const r = useMemo(
        () =>
            estimate({
                superficieM2: superficie,
                zona,
                sustituido,
                comisionInstaladorPct: comision,
            }),
        [superficie, zona, sustituido, comision]
    )

    const porProyecto = r.parteInstalador
    const alAno = porProyecto * instalaciones
    const atrasado = alAno * ANOS_RECUPERABLES
    const primerAno = alAno + atrasado
    const horas = (instalaciones * MINUTOS_POR_EXPEDIENTE) / 60
    const porHora = horas > 0 ? alAno / horas : 0

    const money = (n: number) => eur(n, dict.intlLocale)
    const num = (n: number) =>
        new Intl.NumberFormat(dict.intlLocale, { maximumFractionDigits: 0 }).format(n)

    return (
        <div className="overflow-hidden rounded-[12px] border border-[var(--caes-line)] bg-[var(--caes-panel)] shadow-[0_2px_4px_rgba(6,35,26,.05),0_34px_60px_-30px_rgba(6,35,26,.4)]">
            {/* --------------------------------------- CONTROLLI, IN BARRA */}
            <div className="flex flex-col border-b border-[var(--caes-line-2)] lg:flex-row">
                <Select
                    label={s.fields.superficie}
                    value={superficie}
                    onChange={(v) => setSuperficie(Number(v))}
                >
                    {SUPERFICIES.map((m) => (
                        <option key={m} value={m}>
                            {m} m²
                        </option>
                    ))}
                </Select>
                <Select label={s.fields.zona} value={zona} onChange={setZona}>
                    {ZONAS.map((z) => (
                        <option key={z} value={z}>
                            {z} · {ZONA_CIUDAD[z] ?? z}
                        </option>
                    ))}
                </Select>
                <Select
                    label={s.fields.sustituido}
                    value={sustituido}
                    onChange={setSustituido}
                >
                    {SUSTITUIDOS.map((k) => (
                        <option key={k} value={k}>
                            {s.substitutes[k]}
                        </option>
                    ))}
                </Select>
                <div className="flex flex-col border-t border-[var(--caes-line-2)] lg:w-[44%] lg:shrink-0 lg:flex-row lg:border-l lg:border-t-0">
                    <Slider
                        id="earn-inst"
                        label={t.controls.instalaciones}
                        value={instalaciones}
                        min={1}
                        max={40}
                        onChange={setInstalaciones}
                        display={num(instalaciones)}
                    />
                    <Slider
                        id="earn-com"
                        label={t.controls.comision}
                        value={comision}
                        min={0}
                        max={COMISION_MAXIMA_PCT}
                        onChange={setComision}
                        display={`${comision} %`}
                    />
                </div>
            </div>

            {/* ------------------------------------------------- RISULTATI */}
            <div className="bg-[var(--caes-deep)] text-[#DDE9E1]">
                {/* I due numeri che contano: il ricorrente e l'arretrato.
                    Stesso peso visivo: sono due argomenti diversi, non uno
                    scomposto in parti. */}
                <div className="grid grid-cols-1 sm:grid-cols-2">
                    <div className="border-b border-white/[.1] px-6 py-8 sm:border-b-0 sm:border-r sm:px-9">
                        <span className="label-mono text-[rgba(221,233,225,.5)]">
                            {t.results.headYear}
                        </span>
                        <div className="mt-2.5 font-mono tabular text-[clamp(34px,4.4vw,52px)] font-medium leading-[1] tracking-[-0.04em] text-[#DDE9E1]">
                            {money(alAno)}
                        </div>
                        <p className="mt-2 text-[13px] text-[rgba(221,233,225,.5)]">
                            {t.results.headYearSub.replace('{n}', num(instalaciones))}
                        </p>
                    </div>
                    <div className="px-6 py-8 sm:px-9">
                        <span className="label-mono text-[var(--caes-lime)]">
                            {t.results.headBacklog}
                        </span>
                        <div className="mt-2.5 font-mono tabular text-[clamp(34px,4.4vw,52px)] font-medium leading-[1] tracking-[-0.04em] text-[var(--caes-lime)]">
                            {money(atrasado)}
                        </div>
                        <p className="mt-2 text-[13px] text-[rgba(221,233,225,.5)]">
                            {t.results.headBacklogSub.replace(
                                '{n}',
                                num(instalaciones * ANOS_RECUPERABLES)
                            )}
                        </p>
                    </div>
                </div>

                {/* La catena del calcolo, in chiaro: senza questa riga il
                    totale sembra il certificato moltiplicato per il numero di
                    pratiche, e la commissione sembra ignorata. */}
                <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-white/[.1] px-6 py-4 sm:px-9">
                    <span className="font-mono text-[11.5px] tracking-[.02em] text-[rgba(221,233,225,.55)]">
                        {t.results.chain
                            .replace('{cert}', money(r.valorTotal))
                            .replace('{pct}', `${comision} %`)
                            .replace('{each}', money(porProyecto))
                            .replace('{n}', num(instalaciones))}
                    </span>
                    <span className="rounded-full border border-[rgba(199,240,74,.28)] bg-[rgba(199,240,74,.08)] px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-[.11em] text-[var(--caes-lime)]">
                        {t.results.windowChip}
                    </span>
                </div>

                {!r.cumpleMinimo ? (
                    <p className="mx-6 mb-6 flex items-start gap-2.5 rounded-[6px] border border-[rgba(255,196,84,.28)] bg-[rgba(255,196,84,.08)] px-3.5 py-3 text-[13px] leading-[1.5] text-[rgba(255,214,140,.92)] sm:mx-9">
                        <AlertTriangle className="mt-[2px] h-3.5 w-3.5 shrink-0" />
                        {t.belowMin}
                    </p>
                ) : null}

                {/* le tre cose che deve portarsi via */}
                <div className="grid grid-cols-1 border-t border-white/[.1] sm:grid-cols-3 sm:px-9">
                    <Block
                        label={t.results.certValue}
                        value={money(r.valorTotal)}
                        sub={t.results.certSub.replace('{kwh}', num(r.kwhAhorrados))}
                    />
                    <Block
                        label={t.results.hours}
                        value={`${num(horas)} h`}
                        sub={t.results.yearSub
                            .replace('{each}', money(porProyecto))
                            .replace('{h}', num(horas))
                            .replace('{hour}', money(porHora))}
                    />
                    <Block
                        label={t.results.forQuote}
                        value={money(r.parteCliente)}
                        sub={t.results.clientSub}
                    />
                </div>

                {/* piede */}
                <div className="flex flex-wrap items-center justify-between gap-5 border-t border-white/[.1] px-6 py-6 sm:px-9">
                    <p className="max-w-[58ch] text-[12px] leading-[1.5] text-[rgba(221,233,225,.4)]">
                        {t.disclaimer}
                    </p>
                    <Link
                        href={`/${locale}/instaladores#empezar`}
                        className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-lime)] px-6 py-3 text-[14.5px] font-medium text-[var(--caes-lime-ink)] transition-opacity hover:opacity-90"
                    >
                        {t.cta}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
