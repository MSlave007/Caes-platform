'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import {
    estimate,
    eur,
    DEMANDA_CALEFACCION_POR_ZONA,
    COMISION_MAXIMA_PCT,
    CUOTA_CAES_PCT,
    POOL_REPARTIBLE_PCT,
    REPARTO_INSTALADOR_DEFECTO_PCT,
    repartoATotal,
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
 * ── GERARCHIA E INGOMBRO ──────────────────────────────────────────────
 *
 * Il pannello deve stare in una schermata: se per leggere il terzo numero
 * si deve scorrere, i numeri smettono di parlarsi fra loro ed è proprio il
 * confronto il punto di tutta la pagina. Da qui tre scelte.
 *
 * 1) I due totali stanno AFFIANCATI, non impilati: sono lo stesso denaro a
 *    due orizzonti (tre anni e un anno), e uno accanto all'altro si legge
 *    subito che il primo è il secondo moltiplicato per tre. La differenza
 *    di corpo dice qual è il protagonista.
 *
 * 2) Sotto, nella stessa cornice, le due metà del totale annuo: lui e i
 *    suoi clienti. Sono una scomposizione, quindi stanno più in basso e
 *    più in piccolo, ma restano leggibili — è il numero che porta in
 *    trattativa.
 *
 * 3) La gerarchia la fa il FONDO, non il corpo del testo: sul verde scuro
 *    solo risultati, sul chiaro solo materiale di servizio. Così il
 *    materiale di servizio può stare in una riga sola senza sembrare un
 *    secondo gruppo di risultati.
 *
 * Il piatto NON si muove col cursore: il piatto è un fatto, la linea che
 * lo taglia è una decisione dell'installatore. È la ragione per cui non
 * mostriamo solo la sua fetta — chi guarda solo la fetta pensa che alzare
 * la commissione crei valore, mentre sposta soltanto denaro dal cliente
 * a sé.
 *
 * I tre anni di arretrato NON sono un cursore: sono il termine di legge
 * per presentare l'actuación dal fine lavori, uguale per tutti.
 */

/** Superfici tipiche: dall'appartamento alla villa. */
const SUPERFICIES = [70, 90, 110, 130, 150, 180, 220, 260, 300]
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
 * Casa tipo: 220 m².
 *
 * L'aerotermia si mette su case grandi, e nella ficha RES060 è la
 * SUPERFICIE a fare il valore del certificato, non i kW installati.
 */
const SUPERFICIE_TIPO = 220

/** Zona di riferimento: è quella su cui è tarata la DCAL del motore. */
const ZONA_TIPO = 'D3'

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
        <label className="min-w-0 flex-1 cursor-pointer border-b border-[var(--caes-line-2)] px-5 py-3 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
            <span className="label-mono block text-[var(--caes-faint)]">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-0.5 w-full cursor-pointer appearance-none rounded-sm bg-transparent text-[15px] font-medium tracking-[-0.012em] text-[var(--caes-ink)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--caes-green)]/40"
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
    hint,
}: {
    id: string
    label: string
    value: number
    min: number
    max: number
    onChange: (n: number) => void
    display: string
    /** Riga minuscola sotto al cursore: dice cosa succede all'altra parte. */
    hint?: string
}) {
    return (
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 px-5 py-3">
            <label htmlFor={id} className="flex items-baseline justify-between gap-3">
                <span className="label-mono whitespace-nowrap text-[var(--caes-faint)]">
                    {label}
                </span>
                <span className="whitespace-nowrap font-mono tabular text-[15px] font-medium tracking-[-0.02em] text-[var(--caes-ink)]">
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
            <span className="h-[11px] font-mono text-[10.5px] leading-none tracking-[.02em] text-[var(--caes-faint)]">
                {hint ?? ''}
            </span>
        </div>
    )
}

/**
 * Una delle due metà del totale annuo: sua e dei suoi clienti. Corpo
 * ridotto rispetto ai totali, ma non minuscolo — è la cifra che si porta
 * in trattativa.
 */
function Half({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="min-w-0 border-t border-white/[.08] px-6 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:px-7 sm:first:border-l-0 sm:first:pl-0">
            <span className="label-mono text-[rgba(221,233,225,.45)]">{label}</span>
            <div className="mt-1 font-mono tabular text-[clamp(22px,2.5vw,28px)] font-medium leading-[1.06] tracking-[-0.03em] text-[#DDE9E1]">
                {value}
            </div>
            <p className="mt-0.5 text-[11.5px] leading-[1.4] text-[rgba(221,233,225,.4)]">
                {sub}
            </p>
        </div>
    )
}

/**
 * Casella di servizio, su fondo CHIARO: risponde a «da dove esce questo
 * numero». È il cambio di fondo a tenerla fuori dalla gara con i
 * risultati, quindi può stare stretta.
 */
function Aside({
    label,
    children,
    sub,
}: {
    label: string
    children: React.ReactNode
    sub?: string
}) {
    return (
        <div className="min-w-0 border-t border-[var(--caes-line-2)] px-6 py-3.5 sm:border-l sm:border-t-0 sm:px-7 sm:first:border-l-0">
            <span className="label-mono text-[var(--caes-faint)]">{label}</span>
            <div className="mt-1.5">{children}</div>
            {sub ? (
                <p className="mt-1 text-[11px] leading-[1.4] text-[var(--caes-faint)]">
                    {sub}
                </p>
            ) : null}
        </div>
    )
}

function AsideValue({ children }: { children: React.ReactNode }) {
    return (
        <span className="font-mono tabular text-[17px] font-medium tracking-[-0.025em] text-[var(--caes-ink)]">
            {children}
        </span>
    )
}

function Aviso({ children }: { children: React.ReactNode }) {
    return (
        <p className="mx-6 mb-4 flex items-start gap-2.5 rounded-[6px] border border-[rgba(255,196,84,.28)] bg-[rgba(255,196,84,.08)] px-3 py-2.5 text-[12.5px] leading-[1.45] text-[rgba(255,214,140,.92)] sm:mx-9">
            <AlertTriangle className="mt-[2px] h-3.5 w-3.5 shrink-0" />
            {children}
        </p>
    )
}

export default function InstallerEarnings({ dict, locale }: Props) {
    const t = dict.ganancias
    const s = dict.simulator

    const [instalaciones, setInstalaciones] = useState(24)
    // Il cursore parla in percentuale del PIATTO, non del totale: «di questi
    // 70 %, quanto ne tengo io». Il motore lavora sul totale, quindi la
    // conversione sta qui e in un posto solo.
    const [reparto, setReparto] = useState(REPARTO_INSTALADOR_DEFECTO_PCT)
    const [superficie, setSuperficie] = useState(SUPERFICIE_TIPO)
    const [zona, setZona] = useState(ZONA_TIPO)
    const [sustituido, setSustituido] = useState<string>('caldera_gas')

    const r = useMemo(
        () =>
            estimate({
                superficieM2: superficie,
                zona,
                sustituido,
                comisionInstaladorPct: repartoATotal(reparto),
                // sulla landing il cursore può arrivare in fondo al piatto:
                // il tetto normativo lo segnaliamo, non lo imponiamo qui
                topeComisionPct: POOL_REPARTIBLE_PCT,
            }),
        [superficie, zona, sustituido, reparto]
    )

    // Per expediente
    const porProyecto = r.parteInstalador
    const porCliente = r.parteCliente

    // All'anno: prima il totale, poi le sue due metà.
    const totalAlAno = r.poolRepartible * instalaciones
    const alAno = porProyecto * instalaciones
    const clienteAlAno = totalAlAno - alAno

    // Sui tre anni recuperabili. Le metà si ricavano per differenza dal
    // totale: le quote per expediente sono arrotondate al centesimo e su
    // decine di pratiche la somma non tornerebbe col numero grande.
    const mesaTotal = totalAlAno * ANOS_RECUPERABLES
    const mesaMia = alAno * ANOS_RECUPERABLES
    const mesaCliente = mesaTotal - mesaMia

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
                        value={reparto}
                        min={0}
                        max={100}
                        onChange={setReparto}
                        display={`${r.repartoInstaladorPct} %`}
                        hint={t.controls.comisionHint.replace(
                            '{pct}',
                            String(r.repartoClientePct)
                        )}
                    />
                </div>
            </div>

            {/* ══════════════════════════ FONDO SCURO: SOLO I RISULTATI ═══ */}
            <div className="bg-[var(--caes-deep)] text-[#DDE9E1]">
                {/* I DUE TOTALI, AFFIANCATI. Stesso denaro, due orizzonti:
                    accostati si legge da soli che uno è il triplo dell'altro. */}
                <div className="grid grid-cols-1 sm:grid-cols-[1.32fr_1fr]">
                    <div className="min-w-0 px-6 pb-5 pt-6 sm:px-9">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <span className="label-mono text-[var(--caes-lime)]">
                                {t.results.headTable}
                            </span>
                            <span className="rounded-full border border-[rgba(199,240,74,.22)] px-2 py-[3px] font-mono text-[9px] uppercase tracking-[.09em] text-[rgba(199,240,74,.7)]">
                                {t.results.windowChip}
                            </span>
                        </div>
                        <div className="mt-2 font-mono tabular text-[clamp(36px,5.2vw,62px)] font-medium leading-[1] tracking-[-0.045em] text-[var(--caes-lime)]">
                            {money(mesaTotal)}
                        </div>
                        <p className="mt-2 font-mono text-[12px] leading-[1.5] tracking-[.01em] text-[rgba(221,233,225,.55)]">
                            {t.results.headTableSub.replace(
                                '{n}',
                                num(instalaciones * ANOS_RECUPERABLES)
                            )}
                            {' · '}
                            {t.results.headTableSplit
                                .replace('{mine}', money(mesaMia))
                                .replace('{client}', money(mesaCliente))}
                        </p>
                    </div>

                    <div className="min-w-0 border-t border-white/[.1] px-6 pb-5 pt-6 sm:border-l sm:border-t-0 sm:px-8">
                        <span className="label-mono text-[rgba(221,233,225,.5)]">
                            {t.results.headYearTotal}
                        </span>
                        <div className="mt-2 font-mono tabular text-[clamp(26px,3.2vw,36px)] font-medium leading-[1.04] tracking-[-0.038em] text-[#DDE9E1]">
                            {money(totalAlAno)}
                        </div>
                        <p className="mt-2 font-mono text-[12px] leading-[1.5] tracking-[.01em] text-[rgba(221,233,225,.45)]">
                            {t.results.headYearTotalSub
                                .replace('{n}', num(instalaciones))
                                .replace('{each}', money(r.poolRepartible))}
                        </p>
                    </div>
                </div>

                {/* Le due metà del totale annuo. */}
                <div className="grid grid-cols-1 border-t border-white/[.1] bg-white/[.03] sm:grid-cols-2 sm:px-9">
                    <Half
                        label={t.results.headYear}
                        value={money(alAno)}
                        sub={t.results.headYearSub.replace('{each}', money(porProyecto))}
                    />
                    <Half
                        label={t.results.headClient}
                        value={money(clienteAlAno)}
                        sub={t.results.headClientSub.replace('{each}', money(porCliente))}
                    />
                </div>

                <p className="bg-white/[.03] px-6 pb-4 text-[11.5px] leading-[1.45] text-[rgba(221,233,225,.34)] sm:px-9">
                    {t.results.poolNote}
                </p>

                {r.superaTopeLegal ? (
                    <div className="bg-white/[.03] pt-1">
                        <Aviso>
                            {t.results.capAviso.replace(
                                '{tope}',
                                String(COMISION_MAXIMA_PCT)
                            )}
                        </Aviso>
                    </div>
                ) : null}
                {!r.cumpleMinimo ? (
                    <div className="bg-white/[.03] pt-1">
                        <Aviso>{t.belowMin}</Aviso>
                    </div>
                ) : null}
            </div>

            {/* ════════════════ FONDO CHIARO: MATERIALE DI SERVIZIO ═══════ */}
            <div className="bg-[var(--caes-panel)] text-[var(--caes-ink)]">
                <div className="grid grid-cols-1 sm:grid-cols-3">
                    <Aside
                        label={t.results.certValue}
                        sub={t.results.certSub.replace('{kwh}', num(r.kwhAhorrados))}
                    >
                        <AsideValue>{money(r.valorTotal)}</AsideValue>
                    </Aside>

                    <Aside
                        label={t.results.reparto}
                        sub={t.results.repartoSub
                            .replace('{pool}', money(r.poolRepartible))
                            .replace('{pct}', String(r.repartoInstaladorPct))
                            .replace('{cpct}', String(r.repartoClientePct))}
                    >
                        {/* barra impilata sul certificato intero: la gestione
                            è fissa, la linea fra le altre due la muove il
                            cursore */}
                        <div className="flex h-[5px] w-full overflow-hidden rounded-full bg-[var(--caes-line-2)]">
                            <div
                                className="h-full bg-[var(--caes-line)]"
                                style={{ width: `${CUOTA_CAES_PCT}%` }}
                            />
                            <div
                                className="h-full bg-[var(--caes-green)]"
                                style={{ width: `${r.comisionPct}%` }}
                            />
                            <div
                                className="h-full bg-[var(--caes-lime)]"
                                style={{ width: `${r.clientePct}%` }}
                            />
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3.5 gap-y-0.5 font-mono text-[10.5px] text-[var(--caes-mut)]">
                            {[
                                {
                                    k: t.results.legendGestion,
                                    v: r.parteCaes,
                                    c: 'bg-[var(--caes-line)]',
                                },
                                {
                                    k: t.results.legendYou,
                                    v: porProyecto,
                                    c: 'bg-[var(--caes-green)]',
                                },
                                {
                                    k: t.results.legendClient,
                                    v: porCliente,
                                    c: 'bg-[var(--caes-lime)]',
                                },
                            ].map((x) => (
                                <span key={x.k} className="whitespace-nowrap">
                                    <i
                                        className={`mr-1 inline-block h-[6px] w-[6px] rounded-full align-middle not-italic ${x.c}`}
                                    />
                                    {x.k} {money(x.v)}
                                </span>
                            ))}
                        </div>
                    </Aside>

                    <Aside
                        label={t.results.hours}
                        sub={t.results.hoursSub
                            .replace('{h}', num(horas))
                            .replace('{hour}', money(porHora))}
                    >
                        <AsideValue>{num(horas)} h</AsideValue>
                    </Aside>
                </div>

                {/* piede */}
                <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-[var(--caes-line-2)] px-6 py-4 sm:px-9">
                    <p className="max-w-[62ch] text-[11.5px] leading-[1.45] text-[var(--caes-faint)]">
                        {t.disclaimer}
                    </p>
                    <Link
                        href={`/${locale}/instaladores#empezar`}
                        className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--caes-ink)] px-5 py-2.5 text-[13.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        {t.cta}
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>
            </div>
        </div>
    )
}
