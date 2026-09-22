'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowLeft, AlertTriangle, Pencil } from 'lucide-react'
import {
    estimate,
    eur,
    DEMANDA_CALEFACCION_POR_ZONA,
    COMISION_MAXIMA_PCT,
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
 * ── DUE PASSI, POI UN NUMERO ──────────────────────────────────────────
 *
 * La versione precedente metteva cinque controlli e otto cifre nella
 * stessa schermata. Chi arrivava non capiva cosa stesse guardando: non
 * c'era un ordine di lettura, solo un cruscotto. Ora la pagina fa una
 * domanda per volta.
 *
 *   passo 1  com'è l'installazione tipo — superficie, zona, cosa toglie
 *   passo 2  quante ne fa in un anno
 *   ↓
 *   risultato  un numero grande, le sue due metà, e il cursore
 *
 * Tutti e due i passi arrivano già compilati con il caso più comune, così
 * chi non vuole pensarci preme due volte «avanti» e vede la cifra: il
 * modulo è un invito a correggere, non un questionario da riempire.
 *
 * Dal risultato si torna indietro con «cambiar los datos», che conserva
 * quello che aveva scelto.
 *
 * ── COSA STA DENTRO E COSA STA SOTTO ──────────────────────────────────
 *
 * Dentro il pannello ci sono solo le cifre che rispondono alla domanda:
 * quanto c'è sul tavolo, quanto ne va a lui, quanto ai suoi clienti. Il
 * valore del certificato, i kWh, le ore di papeleo e la validità NON sono
 * risultati del simulatore: sono argomenti di vendita che si ricavano
 * dagli stessi dati. Stanno fuori dal pannello, sotto, come benefici — e
 * si aggiornano con gli input, perché sono conseguenze di quello che ha
 * appena dichiarato.
 *
 * Il piatto NON si muove col cursore: il piatto è un fatto, la linea che
 * lo taglia è una decisione dell'installatore. Chi guarda solo la propria
 * fetta pensa che alzare la commissione crei valore, mentre sposta
 * soltanto denaro dal cliente a sé.
 */

/** Superfici tipiche: dall'appartamento alla villa. */
const SUPERFICIES = [70, 90, 110, 130, 150, 180, 220, 260, 300]
const ZONAS = Object.keys(DEMANDA_CALEFACCION_POR_ZONA)
const SUSTITUIDOS = ['termo_electrico', 'caldera_gas', 'caldera_gasoleo'] as const

const ZONA_CIUDAD: Record<string, string> = {
    A3: 'Cádiz',
    B3: 'Valencia',
    C1: 'Bilbao',
    C2: 'Barcelona',
    C3: 'Madrid',
    D2: 'Zaragoza',
    D3: 'Valladolid',
    E1: 'Burgos',
}

/** Valori di partenza: il caso più comune, così due clic bastano. */
const SUPERFICIE_TIPO = 220
const ZONA_TIPO = 'C2'
const SUSTITUIDO_TIPO = 'caldera_gas'
const INSTALACIONES_TIPO = 20

/** Termine di legge per presentare l'actuación, anni dal fine lavori. */
const ANOS_RECUPERABLES = 3

/** Minuti dichiarati per pratica: è la promessa del titolo della pagina. */
const MINUTOS_POR_EXPEDIENTE = 15

const PASOS = 2

type Props = { dict: Dict; locale: Locale }

/* ────────────────────────────────────────────────── pezzi del modulo */

function Field({
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
        <label className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 rounded-[8px] border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 transition-colors focus-within:border-[var(--caes-green)]">
            <span className="label-mono text-[var(--caes-faint)]">{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full cursor-pointer appearance-none bg-transparent text-[16px] font-medium tracking-[-0.015em] text-[var(--caes-ink)] outline-none"
            >
                {children}
            </select>
        </label>
    )
}

function Boton({
    children,
    onClick,
    variant = 'primary',
}: {
    children: React.ReactNode
    onClick: () => void
    variant?: 'primary' | 'ghost'
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={
                variant === 'primary'
                    ? 'group inline-flex items-center gap-2 rounded-full bg-[var(--caes-ink)] px-6 py-3 text-[14.5px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90'
                    : 'inline-flex items-center gap-2 rounded-full px-4 py-3 text-[14px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]'
            }
        >
            {children}
        </button>
    )
}

/** Intestazione del passo: a che punto siamo, e cosa stiamo chiedendo. */
function PasoHead({
    n,
    label,
    question,
    hint,
}: {
    n: number
    label: string
    question: string
    hint: string
}) {
    return (
        <div>
            <div className="flex items-center gap-2.5">
                <span className="label-mono text-[var(--caes-faint)]">{label}</span>
                <span className="flex gap-1" aria-hidden>
                    {Array.from({ length: PASOS }, (_, i) => (
                        <i
                            key={i}
                            className={`block h-[5px] w-[5px] rounded-full ${
                                i < n ? 'bg-[var(--caes-green)]' : 'bg-[var(--caes-line)]'
                            }`}
                        />
                    ))}
                </span>
            </div>
            <h3 className="mt-3 text-[clamp(20px,2.2vw,25px)] font-semibold leading-[1.2] tracking-[-0.025em] text-[var(--caes-ink)]">
                {question}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-[1.5] text-[var(--caes-mut)]">
                {hint}
            </p>
        </div>
    )
}

/** Una delle due metà del piatto annuo, dentro il pannello scuro. */
function Half({ label, value, sub }: { label: string; value: string; sub: string }) {
    return (
        <div className="min-w-0 border-t border-white/[.1] px-6 py-5 first:border-t-0 sm:border-l sm:border-t-0 sm:px-8 sm:first:border-l-0 sm:first:pl-0">
            <span className="label-mono text-[rgba(221,233,225,.62)]">{label}</span>
            <div className="num-mid mt-1.5 text-[clamp(25px,2.9vw,34px)] text-[#E6F1E9]">
                {value}
            </div>
            <p className="mt-1.5 text-[13px] leading-[1.45] text-[rgba(221,233,225,.6)]">
                {sub}
            </p>
        </div>
    )
}

function Aviso({ children }: { children: React.ReactNode }) {
    return (
        <p className="mx-6 mb-5 flex items-start gap-2.5 rounded-[6px] border border-[rgba(255,196,84,.28)] bg-[rgba(255,196,84,.08)] px-3 py-2.5 text-[12.5px] leading-[1.45] text-[rgba(255,214,140,.92)] sm:mx-8">
            <AlertTriangle className="mt-[2px] h-3.5 w-3.5 shrink-0" />
            {children}
        </p>
    )
}

/* ─────────────────────────────────────────────────────────── componente */

export default function InstallerEarnings({ dict, locale }: Props) {
    const t = dict.ganancias
    const w = t.wizard
    const s = dict.simulator

    /** 1 e 2 sono i passi; 3 è il risultato. */
    const [paso, setPaso] = useState(1)

    const [superficie, setSuperficie] = useState(SUPERFICIE_TIPO)
    const [zona, setZona] = useState(ZONA_TIPO)
    const [sustituido, setSustituido] = useState<string>(SUSTITUIDO_TIPO)
    const [instalaciones, setInstalaciones] = useState(INSTALACIONES_TIPO)
    // Il cursore parla in percentuale del PIATTO, non del totale: «di questi
    // 70 %, quanto ne tengo io». Il motore lavora sul totale, quindi la
    // conversione sta qui e in un posto solo.
    const [reparto, setReparto] = useState(REPARTO_INSTALADOR_DEFECTO_PCT)

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

    const totalAlAno = r.poolRepartible * instalaciones
    const alAno = r.parteInstalador * instalaciones
    // per differenza: le quote per expediente sono arrotondate al centesimo
    // e su decine di pratiche la somma non tornerebbe col numero grande
    const clienteAlAno = totalAlAno - alAno
    const mesaTotal = totalAlAno * ANOS_RECUPERABLES

    const horas = (instalaciones * MINUTOS_POR_EXPEDIENTE) / 60

    const money = (n: number) => eur(n, dict.intlLocale)
    // useGrouping come in eur(): stessa ragione, stesso pannello.
    const num = (n: number) =>
        new Intl.NumberFormat(dict.intlLocale, {
            maximumFractionDigits: 0,
            useGrouping: 'always',
        }).format(n)

    const resumen = [
        `${superficie} m²`,
        `${zona} · ${ZONA_CIUDAD[zona] ?? zona}`,
        s.substitutes[sustituido as keyof typeof s.substitutes],
        `${num(instalaciones)} ${w.perYear}`,
    ].join('  ·  ')

    /** I benefici stanno FUORI dal simulatore, ma si nutrono dei suoi dati. */
    const beneficios = t.beneficios.items.map((b) => ({
        v: b.v
            .replace('{cert}', money(r.valorTotal))
            .replace('{h}', num(horas)),
        k: b.k,
        s: b.s
            .replace('{kwh}', num(r.kwhAhorrados))
            .replace('{min}', String(MINUTOS_POR_EXPEDIENTE)),
    }))

    // Il guscio non porta il fondo: due utility bg-* sullo stesso elemento
    // si contendono la precedenza e vince quella che sta piu in basso nel
    // CSS generato, non quella scritta dopo nella stringa.
    const shell =
        'overflow-hidden rounded-[12px] shadow-[0_2px_4px_rgba(6,35,26,.05),0_34px_60px_-30px_rgba(6,35,26,.4)]'
    const shellClaro = `${shell} border border-[var(--caes-line)] bg-[var(--caes-panel)]`
    const shellOscuro = `${shell} bg-[var(--caes-deep)] text-[var(--caes-on-deep)]`

    return (
        <div>
            {/* ═══════════════════════════════════ IL SIMULATORE ══════════ */}
            {paso === 1 ? (
                <div className={`${shellClaro} px-6 py-7 sm:px-8 sm:py-8`}>
                    <PasoHead
                        n={1}
                        label={w.stepOf.replace('{n}', '1').replace('{total}', '2')}
                        question={w.q1}
                        hint={w.q1Hint}
                    />
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Field
                            label={s.fields.superficie}
                            value={superficie}
                            onChange={(v) => setSuperficie(Number(v))}
                        >
                            {SUPERFICIES.map((m) => (
                                <option key={m} value={m}>
                                    {m} m²
                                </option>
                            ))}
                        </Field>
                        <Field
                            label={s.fields.zona}
                            value={zona}
                            onChange={setZona}
                        >
                            {ZONAS.map((z) => (
                                <option key={z} value={z}>
                                    {z} · {ZONA_CIUDAD[z] ?? z}
                                </option>
                            ))}
                        </Field>
                        <Field
                            label={s.fields.sustituido}
                            value={sustituido}
                            onChange={setSustituido}
                        >
                            {SUSTITUIDOS.map((k) => (
                                <option key={k} value={k}>
                                    {s.substitutes[k]}
                                </option>
                            ))}
                        </Field>
                    </div>
                    <div className="mt-7 flex justify-end">
                        <Boton onClick={() => setPaso(2)}>
                            {w.next}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Boton>
                    </div>
                </div>
            ) : null}

            {paso === 2 ? (
                <div className={`${shellClaro} px-6 py-7 sm:px-8 sm:py-8`}>
                    <PasoHead
                        n={2}
                        label={w.stepOf.replace('{n}', '2').replace('{total}', '2')}
                        question={w.q2}
                        hint={w.q2Hint}
                    />
                    <div className="mt-7">
                        <div className="font-mono tabular text-[clamp(40px,5vw,56px)] font-medium leading-[1] tracking-[-0.04em] text-[var(--caes-ink)]">
                            {num(instalaciones)}
                        </div>
                        <input
                            id="earn-inst"
                            type="range"
                            min={1}
                            max={40}
                            step={1}
                            value={instalaciones}
                            onChange={(e) => setInstalaciones(Number(e.target.value))}
                            className="earn-range mt-4 w-full cursor-pointer"
                            aria-label={t.controls.instalaciones}
                        />
                        <div className="mt-2 flex justify-between font-mono text-[11px] text-[var(--caes-faint)]">
                            <span>1</span>
                            <span>40</span>
                        </div>
                    </div>
                    <div className="mt-7 flex items-center justify-between">
                        <Boton variant="ghost" onClick={() => setPaso(1)}>
                            <ArrowLeft className="h-4 w-4" />
                            {w.back}
                        </Boton>
                        <Boton onClick={() => setPaso(3)}>
                            {w.see}
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </Boton>
                    </div>
                </div>
            ) : null}

            {paso === 3 ? (
                <div className={shellOscuro}>
                    {/* ① IL NUMERO, e subito sotto una frase che dice cosa
                           è. Prima c'era solo un'etichetta mono di dieci
                           pixel sopra: chi arrivava vedeva una cifra e non
                           sapeva di cosa. */}
                    <div className="px-6 pb-7 pt-7 sm:px-9 sm:pb-8">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="label-mono text-[rgba(199,240,74,.85)]">
                                {t.results.headTable}
                            </span>
                            <span className="rounded-full border border-[rgba(199,240,74,.3)] px-2.5 py-[3px] font-mono text-[9px] uppercase tracking-[.09em] text-[rgba(199,240,74,.8)]">
                                {t.results.windowChip}
                            </span>
                        </div>
                        <div className="num-hero mt-3 text-[clamp(42px,6.4vw,76px)]">
                            {money(mesaTotal)}
                        </div>
                        <p className="mt-4 max-w-[46ch] text-[clamp(15px,1.3vw,16.5px)] leading-[1.5] tracking-[-0.008em] text-[rgba(221,233,225,.82)]">
                            {t.results.headTableSub
                                .replace('{year}', money(totalAlAno))
                                .replace('{n}', num(instalaciones * ANOS_RECUPERABLES))}
                        </p>
                    </div>

                    {/* ② LE DUE METÀ, un gradino sotto */}
                    <div className="grid grid-cols-1 border-t border-white/[.14] bg-white/[.035] sm:grid-cols-2 sm:px-9">
                        <Half
                            label={t.results.forYou}
                            value={money(alAno)}
                            sub={t.results.forYouSub.replace(
                                '{each}',
                                money(r.parteInstalador)
                            )}
                        />
                        <Half
                            label={t.results.forClients}
                            value={money(clienteAlAno)}
                            sub={t.results.forClientsSub.replace(
                                '{each}',
                                money(r.parteCliente)
                            )}
                        />
                    </div>

                    {/* ③ IL CURSORE, l'unica cosa da toccare qui */}
                    <div className="border-t border-white/[.14] bg-white/[.035] px-6 pb-6 pt-5 sm:px-9">
                        <div className="max-w-[440px]">
                            <label
                                htmlFor="earn-com"
                                className="flex items-baseline justify-between gap-4"
                            >
                                <span className="label-mono text-[rgba(221,233,225,.62)]">
                                    {t.controls.comision}
                                </span>
                                <span className="tabular shrink-0 text-[17px] font-semibold tracking-[-0.02em] text-[var(--caes-on-deep)]">
                                    {r.repartoInstaladorPct} %
                                </span>
                            </label>
                            <input
                                id="earn-com"
                                type="range"
                                min={0}
                                max={100}
                                step={1}
                                value={reparto}
                                onChange={(e) => setReparto(Number(e.target.value))}
                                className="earn-range earn-range--dark mt-3 w-full cursor-pointer"
                            />
                            <p className="mt-2 text-[13px] text-[rgba(221,233,225,.62)]">
                                {t.controls.comisionHint.replace(
                                    '{pct}',
                                    String(r.repartoClientePct)
                                )}
                            </p>
                        </div>
                        <p className="mt-4 max-w-[64ch] text-[12.5px] leading-[1.5] text-[rgba(221,233,225,.58)]">
                            {t.results.poolNote}
                        </p>
                    </div>

                    {r.superaTopeLegal ? (
                        <div className="bg-white/[.035] pt-1">
                            <Aviso>
                                {t.results.capAviso.replace(
                                    '{tope}',
                                    String(COMISION_MAXIMA_PCT)
                                )}
                            </Aviso>
                        </div>
                    ) : null}
                    {!r.cumpleMinimo ? (
                        <div className="bg-white/[.035] pt-1">
                            <Aviso>{t.belowMin}</Aviso>
                        </div>
                    ) : null}

                    {/* ④ COSA HA DICHIARATO: qui il mono è al suo posto,
                           è una stringa tecnica e non prosa */}
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-white/[.14] px-6 py-4 sm:px-9">
                        <span className="font-mono text-[11.5px] tracking-[.01em] text-[rgba(221,233,225,.55)]">
                            {resumen}
                        </span>
                        <button
                            type="button"
                            onClick={() => setPaso(1)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/[.18] px-3 py-1.5 text-[12.5px] text-[rgba(221,233,225,.82)] transition-colors hover:border-white/[.4] hover:text-[var(--caes-on-deep)]"
                        >
                            <Pencil className="h-3 w-3" />
                            {w.edit}
                        </button>
                    </div>

                    {/* ⑤ L'ULTIMO GRADINO */}
                    <div className="flex flex-wrap items-center justify-between gap-5 border-t border-white/[.14] px-6 py-5 sm:px-9">
                        <p className="max-w-[58ch] text-[12px] leading-[1.5] text-[rgba(221,233,225,.6)]">
                            {t.disclaimer}
                        </p>
                        <Link
                            href={`/${locale}/instaladores#empezar`}
                            className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--caes-lime)] px-5 py-2.5 text-[13.5px] font-semibold text-[var(--caes-lime-ink)] transition-opacity hover:opacity-90"
                        >
                            {t.cta}
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </Link>
                    </div>
                </div>
            ) : null}

            {/* ═════════════ FUORI DAL SIMULATORE: I BENEFICI ═════════════
                Non sono risultati, sono argomenti — ma si ricavano dagli
                stessi dati, quindi si muovono con gli input invece di stare
                lì come tre righe di brochure. */}
            <div className="mt-10">
                <p className="label-mono text-[var(--caes-faint)]">
                    {t.beneficios.heading}
                </p>
                <ul className="mt-5 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
                    {beneficios.map((b) => (
                        <li key={b.k} className="min-w-0">
                            <div className="font-mono tabular text-[clamp(22px,2.3vw,27px)] font-medium leading-[1.1] tracking-[-0.03em] text-[var(--caes-ink)]">
                                {b.v}
                            </div>
                            <p className="mt-2 text-[13.5px] font-medium leading-[1.4] tracking-[-0.01em] text-[var(--caes-ink)]">
                                {b.k}
                            </p>
                            <p className="mt-1 text-[12.5px] leading-[1.5] text-[var(--caes-mut)]">
                                {b.s}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}
