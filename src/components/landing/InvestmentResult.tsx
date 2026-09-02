'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { Counter, EASE } from './motion'
import { estimateInvestment, VIDA_UTIL_ANOS } from '@/lib/caes/investment'
import type { SistemaActual, Zona } from '@/lib/caes/consumer'
import type { ConsumerDict } from '@/lib/i18n/consumer'

/**
 * Il risultato, riscritto per chi non ha una fattura e non sa cos'è un CAES.
 *
 * L'ordine è quello del pensiero di chi ha casa: prima quanto costa, poi
 * quanto glielo abbassiamo, poi quanto risparmia ogni mese, e solo alla fine
 * in quanti anni rientra. Il numero grande non è il valore del certificato —
 * quello non gli dice niente — ma quello che gli costa davvero.
 */
export default function InvestmentResult({
    dict,
    sistema,
    factura,
    zona,
    onBack,
}: {
    dict: ConsumerDict
    sistema: SistemaActual
    factura: number
    zona: Zona
    onBack: () => void
}) {
    const t = dict.invest
    const r = estimateInvestment({ sistema, facturaMensual: factura, zona })

    const money = (n: number) =>
        new Intl.NumberFormat(dict.intlLocale, {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(n)

    const cutPct = Math.round(((r.costeBruto - r.costeNeto) / r.costeBruto) * 100)

    return (
        <div className="overflow-hidden rounded-[20px] border border-[var(--caes-line)] bg-[var(--caes-panel)] shadow-[0_2px_6px_rgba(6,35,26,.05),0_40px_80px_-40px_rgba(6,35,26,.42)]">
            {/* 1 - la cifra */}
            <div className="bg-[var(--caes-deep)] px-8 py-14 text-center sm:px-14">
                <p className="label-mono text-[rgba(221,233,225,.45)]">{t.eyebrow}</p>
                <p className="mt-7 text-[15px] text-[rgba(221,233,225,.6)]">
                    {t.leadIn} <span className="line-through">{money(r.costeBruto)}</span>
                </p>
                <p className="mt-6 text-[16px] text-[rgba(221,233,225,.78)]">{t.costLabel}</p>
                <div className="mt-1">
                    <Counter
                        value={r.costeNeto}
                        locale={dict.intlLocale}
                        suffix=" €"
                        className="font-sans text-[clamp(56px,11vw,104px)] font-semibold leading-none tracking-[-0.055em] text-white tabular"
                    />
                </div>
                <p className="mt-6 text-[14.5px] text-[var(--caes-lime)]">
                    {t.netNote.replace('{pct}', String(cutPct))}
                </p>
            </div>

            <div className="px-8 py-12 sm:px-14">
                {/* 2 - da dove esce */}
                <div className="mx-auto max-w-[30rem]">
                    <Line label={t.listPrice} value={money(r.costeBruto)} />
                    <Line
                        label={t.caes}
                        note={t.caesNoteShare}
                        value={`− ${money(r.pagoCaes)}`}
                        green
                    />
                    <Line
                        label={t.deduction}
                        note={t.dedNoteTiming}
                        value={`− ${money(r.deduccion)}`}
                        green
                    />
                    <Line label={t.costLabel} value={money(r.costeNeto)} strong />
                    <p className="mt-3 text-[11.5px] leading-[1.5] text-[var(--caes-faint)]">
                        {t.listNote}
                    </p>
                </div>

                {/* il confronto, in due righe di testo invece che in un riquadro */}
                <div className="mx-auto mt-14 max-w-[36rem] border-t border-[var(--caes-line)] pt-10 text-center">
                    <p className="text-[clamp(19px,2.2vw,23px)] font-semibold leading-[1.25] tracking-[-0.024em]">
                        {t.vsLead}
                    </p>
                    <p className="mx-auto mt-3.5 max-w-[46ch] text-[14.5px] leading-[1.6] text-[var(--caes-mut)]">
                        {t.vsShort
                            .replace('{same}', money(r.costeMismo))
                            .replace('{extra}', money(r.sobrecoste))}
                    </p>
                </div>

                <div className="mt-16 grid gap-12 border-t border-[var(--caes-line)] pt-16 sm:grid-cols-3 sm:gap-8">
                    <Gain
                        dict={dict}
                        value={r.ahorroMensual}
                        suffix=" €"
                        label={t.g1}
                        delay={0}
                    />
                    <Gain
                        dict={dict}
                        value={r.anosRetorno}
                        suffix={` ${t.years}`}
                        decimals={1}
                        label={t.g2}
                        delay={0.14}
                    />
                    <Gain
                        dict={dict}
                        value={r.balanceVida}
                        prefix="+ "
                        suffix=" €"
                        label={t.g3.replace('20', String(VIDA_UTIL_ANOS))}
                        delay={0.28}
                        accent
                    />
                </div>

                <p className="mx-auto mt-10 max-w-[62ch] border-t border-[var(--caes-line-2)] pt-6 text-center text-[12.5px] leading-[1.6] text-[var(--caes-faint)]">
                    {t.disclaimer}
                </p>

                {/* 4 - il contatto */}
                <LeadForm dict={dict} r={r} sistema={sistema} factura={factura} zona={zona} />

                <button
                    type="button"
                    onClick={onBack}
                    className="mx-auto mt-8 flex items-center gap-2 text-[13px] text-[var(--caes-mut)] underline-offset-4 hover:underline"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    {t.again}
                </button>
            </div>
        </div>
    )
}

/** Riga della sottrazione: filetto sottile, nessun riquadro. */
function Line({
    label,
    note,
    value,
    green = false,
    strong = false,
}: {
    label: string
    note?: string
    value: string
    green?: boolean
    strong?: boolean
}) {
    return (
        <div
            className={`flex items-start justify-between gap-6 py-3.5 ${strong ? 'mt-1 border-t-2 border-[var(--caes-ink)]' : 'border-b border-[var(--caes-line-2)]'}`}
        >
            <span className="min-w-0">
                <span
                    className={`block text-[14.5px] ${strong ? 'font-semibold' : 'text-[var(--caes-mut)]'}`}
                >
                    {label}
                </span>
                {note && (
                    <span className="mt-1 block max-w-[34ch] text-[11.5px] leading-[1.45] text-[var(--caes-faint)]">
                        {note}
                    </span>
                )}
            </span>
            <span
                className={`font-mono tabular font-medium ${strong ? 'text-[21px]' : 'text-[15px]'} ${green ? 'text-[var(--caes-green)]' : ''}`}
            >
                {value}
            </span>
        </div>
    )
}

/**
 * La cifra grande.
 *
 * Il grafico e' stato tolto perche' spiegava una cosa che questi tre numeri
 * dicevano gia'. Restando soli devono reggere da soli: filetto che si allunga
 * sopra, contatore che sale, etichetta che entra dopo. Le tre colonne partono
 * sfalsate di 140 ms, cosi' si leggono in ordine invece che tutte insieme.
 */
function Gain({
    dict,
    value,
    prefix = '',
    suffix = '',
    decimals = 0,
    label,
    delay = 0,
    accent = false,
}: {
    dict: ConsumerDict
    value: number
    prefix?: string
    suffix?: string
    decimals?: number
    label: string
    delay?: number
    accent?: boolean
}) {
    const reduce = useReducedMotion()

    return (
        <motion.div
            initial={reduce ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay, ease: EASE }}
            className="text-center sm:text-left"
        >
            <motion.span
                aria-hidden
                className={`mx-auto block h-px sm:mx-0 ${accent ? 'bg-[var(--caes-green)]' : 'bg-[var(--caes-ink)]'}`}
                initial={reduce ? { width: '2.5rem' } : { width: 0 }}
                whileInView={{ width: '2.5rem' }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7, delay: delay + 0.1, ease: EASE }}
            />

            <div
                className={`mt-6 font-sans text-[clamp(34px,4.4vw,50px)] font-semibold leading-none tracking-[-0.05em] tabular ${accent ? 'text-[var(--caes-green)]' : ''}`}
            >
                <Counter
                    value={value}
                    locale={dict.intlLocale}
                    prefix={prefix}
                    suffix={suffix}
                    decimals={decimals}
                    duration={1.2}
                />
            </div>

            <motion.p
                initial={reduce ? false : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: delay + 0.45, ease: EASE }}
                className="mx-auto mt-4 max-w-[20ch] text-[14px] leading-[1.5] text-[var(--caes-mut)] sm:mx-0"
            >
                {label}
            </motion.p>
        </motion.div>
    )
}


/* ------------------------------------------------------------------ *
 * Modulo di contatto.
 *
 * Cinque campi e un consenso: ogni campo in più costa conversione, e questi
 * sono il minimo perché un installatore possa fare una telefonata utile.
 * «¿Para cuándo?» è quello che vale di più — separa chi compra adesso da chi
 * sta guardando, e ci permette di non bruciare un installatore su un lead
 * freddo.
 * ------------------------------------------------------------------ */
function LeadForm({
    dict,
    r,
    sistema,
    factura,
    zona,
}: {
    dict: ConsumerDict
    r: ReturnType<typeof estimateInvestment>
    sistema: SistemaActual
    factura: number
    zona: Zona
}) {
    const L = dict.lead
    const [f, setF] = useState({
        name: '',
        phone: '',
        email: '',
        postal: '',
        when: 'ya',
        housing: 'piso',
        owner: 'si',
        consent: false,
    })
    const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        setState('sending')
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...f,
                    sistema,
                    factura_mensual: factura,
                    zona,
                    // Alleghiamo la stima: l'installatore chiama sapendo già di
                    // che numeri si parla, invece di ripartire da zero.
                    estimacion: {
                        potencia_kw: r.potenciaKw,
                        coste_bruto: r.costeBruto,
                        pago_caes: r.pagoCaes,
                        deduccion: r.deduccion,
                        coste_neto: r.costeNeto,
                        ahorro_anual: r.ahorroAnual,
                        anos_retorno: r.anosRetorno,
                    },
                }),
            })
            if (!res.ok) throw new Error('failed')
            setState('ok')
        } catch {
            setState('error')
        }
    }

    if (state === 'ok') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="mt-8 rounded-2xl border border-[var(--caes-green)]/35 bg-[var(--caes-green)]/[.05] p-7"
            >
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--caes-green)] text-white">
                        <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                    <h3 className="text-[18px] font-semibold tracking-[-0.024em]">
                        {L.okTitle}
                    </h3>
                </div>
                <p className="mt-4 max-w-[52ch] text-[14.5px] leading-[1.6] text-[var(--caes-mut)]">
                    {L.okBody}
                </p>
            </motion.div>
        )
    }

    const inp =
        'w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12'

    return (
        <form
            onSubmit={submit}
            id="presupuesto"
            className="mt-8 scroll-mt-28 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-band)] p-7"
        >
            <p className="label-mono text-[var(--caes-green)]">{L.eyebrow}</p>
            <h3 className="mt-3 text-[clamp(21px,2.6vw,28px)] font-semibold tracking-[-0.03em]">
                {L.title}
            </h3>
            <p className="mt-2 max-w-[52ch] text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                {L.body}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="text-[13px] font-medium">{L.name}</span>
                    <input
                        required
                        autoComplete="name"
                        value={f.name}
                        onChange={(e) => setF({ ...f, name: e.target.value })}
                        className={`${inp} mt-2`}
                    />
                </label>
                <label className="block">
                    <span className="text-[13px] font-medium">{L.phone}</span>
                    <input
                        required
                        type="tel"
                        autoComplete="tel"
                        value={f.phone}
                        onChange={(e) => setF({ ...f, phone: e.target.value })}
                        className={`${inp} mt-2`}
                    />
                </label>
                <label className="block">
                    <span className="text-[13px] font-medium">{L.email}</span>
                    <input
                        type="email"
                        autoComplete="email"
                        value={f.email}
                        onChange={(e) => setF({ ...f, email: e.target.value })}
                        className={`${inp} mt-2`}
                    />
                </label>
                <label className="block">
                    <span className="text-[13px] font-medium">{L.postal}</span>
                    <input
                        required
                        inputMode="numeric"
                        pattern="[0-9]{5}"
                        maxLength={5}
                        autoComplete="postal-code"
                        value={f.postal}
                        onChange={(e) => setF({ ...f, postal: e.target.value })}
                        className={`${inp} mt-2`}
                    />
                    <span className="mt-1.5 block text-[12px] text-[var(--caes-faint)]">
                        {L.postalHint}
                    </span>
                </label>
            </div>

            <Chips
                legend={L.housing}
                options={L.housingOptions}
                value={f.housing}
                onChange={(v) => setF({ ...f, housing: v })}
            />
            <Chips
                legend={L.owner}
                options={L.ownerOptions}
                value={f.owner}
                onChange={(v) => setF({ ...f, owner: v })}
                hint={f.owner === 'alquiler' ? L.ownerHint : undefined}
            />
            <Chips
                legend={L.when}
                options={L.whenOptions}
                value={f.when}
                onChange={(v) => setF({ ...f, when: v })}
            />

            <label className="mt-6 flex items-start gap-3 text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                <input
                    type="checkbox"
                    required
                    checked={f.consent}
                    onChange={(e) => setF({ ...f, consent: e.target.checked })}
                    className="mt-[3px] h-4 w-4 shrink-0 accent-[var(--caes-green)]"
                />
                {L.consent}
            </label>

            {state === 'error' && (
                <p role="alert" className="mt-4 text-[13.5px] text-[#9B4526]">
                    {L.error}
                </p>
            )}

            <button
                type="submit"
                disabled={state === 'sending'}
                className="group mt-6 inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-7 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
                {state === 'sending' ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {L.sending}
                    </>
                ) : (
                    <>
                        {L.submit}
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                )}
            </button>

            <p className="mt-4 text-[12px] leading-[1.5] text-[var(--caes-faint)]">
                {L.privacy}
            </p>
        </form>
    )
}


/** Gruppo di scelte a pastiglia: si risponde con un tocco, non digitando. */
function Chips({
    legend,
    options,
    value,
    onChange,
    hint,
}: {
    legend: string
    options: readonly { id: string; label: string }[]
    value: string
    onChange: (v: string) => void
    hint?: string
}) {
    return (
        <fieldset className="mt-7">
            <legend className="text-[13px] font-medium">{legend}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
                {options.map((o) => (
                    <button
                        key={o.id}
                        type="button"
                        onClick={() => onChange(o.id)}
                        className={`rounded-full px-4 py-2.5 text-[13.5px] transition-colors ${value === o.id ? 'bg-[var(--caes-ink)] font-medium text-[var(--caes-paper)]' : 'border border-[var(--caes-line)] text-[var(--caes-mut)] hover:border-[var(--caes-ink)]/30'}`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
            {hint && (
                <p className="mt-2.5 text-[12.5px] leading-[1.5] text-[var(--caes-mut)]">
                    {hint}
                </p>
            )}
        </fieldset>
    )
}
