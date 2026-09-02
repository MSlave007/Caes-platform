'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Flame, Droplet, Zap } from 'lucide-react'
import { EASE } from './motion'
import InvestmentResult from './InvestmentResult'
import {
    estimateConsumer,
    HORIZONTE_ANOS,
    type SistemaActual,
    type Zona,
} from '@/lib/caes/consumer'
import type { ConsumerDict } from '@/lib/i18n/consumer'

const SISTEMAS: { key: SistemaActual; Icon: typeof Flame }[] = [
    { key: 'gas', Icon: Flame },
    { key: 'gasoleo', Icon: Droplet },
    { key: 'electrico', Icon: Zap },
]

const ZONAS: Zona[] = ['norte', 'centro', 'levante', 'sur', 'islas']

export default function Calculator({ dict }: { dict: ConsumerDict }) {
    const t = dict.calc
    const r = dict.result
    const reduce = useReducedMotion()

    const [step, setStep] = useState(0)
    const [sistema, setSistema] = useState<SistemaActual | null>(null)
    const [factura, setFactura] = useState(90)
    const [zona, setZona] = useState<Zona | null>(null)
    const [done, setDone] = useState(false)

    const result = useMemo(
        () =>
            sistema && zona
                ? estimateConsumer({ sistema, facturaMensual: factura, zona })
                : null,
        [sistema, factura, zona]
    )

    const money = (n: number) =>
        new Intl.NumberFormat(dict.intlLocale, {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(n)

    const canAdvance = step === 0 ? !!sistema : step === 1 ? true : !!zona

    const slide = reduce
        ? {}
        : {
            initial: { opacity: 0, x: 26 },
            animate: { opacity: 1, x: 0 },
            exit: { opacity: 0, x: -26 },
            transition: { duration: 0.45, ease: EASE },
        }

    /* ------------------------------------------------------ RISULTATO */
    if (done && sistema && zona) {
        return (
            <InvestmentResult
                dict={dict}
                sistema={sistema}
                factura={factura}
                zona={zona}
                onBack={() => {
                    setDone(false)
                    setStep(0)
                }}
            />
        )
    }

    /* -------------------------------------------------------- DOMANDE */
    return (
        <motion.div
            layout={!reduce}
            className="overflow-hidden rounded-[20px] border border-[var(--caes-line)] bg-[var(--caes-panel)] shadow-[0_2px_6px_rgba(6,35,26,.05),0_40px_80px_-40px_rgba(6,35,26,.42)]"
        >
            {/* avanzamento */}
            <div className="flex items-center gap-5 border-b border-[var(--caes-line-2)] px-7 py-4 sm:px-9">
                {t.steps.map((s, i) => (
                    <div key={s} className="flex items-center gap-2.5">
                        <span
                            className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[10.5px] font-medium transition-colors duration-300 ${i < step
                                    ? 'bg-[var(--caes-green)] text-white'
                                    : i === step
                                        ? 'bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                        : 'bg-[var(--caes-line)] text-[var(--caes-faint)]'
                                }`}
                        >
                            {i < step ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                        <span
                            className={`hidden text-[13px] transition-colors duration-300 sm:block ${i === step ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-faint)]'
                                }`}
                        >
                            {s}
                        </span>
                    </div>
                ))}
            </div>

            <div className="px-7 py-9 sm:px-9 sm:py-11">
                <AnimatePresence mode="wait">
                    {/* ---------------------------------------- 1 · SISTEMA */}
                    {step === 0 && (
                        <motion.div key="s0" {...slide}>
                            <h2 className="text-[clamp(21px,2.6vw,27px)] font-semibold tracking-[-0.028em]">
                                {t.q1}
                            </h2>
                            <div className="mt-7 grid gap-3 sm:grid-cols-3">
                                {SISTEMAS.map(({ key, Icon }) => {
                                    const on = sistema === key
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => {
                                                setSistema(key)
                                                setTimeout(() => setStep(1), 220)
                                            }}
                                            className={`group flex flex-col items-start gap-4 rounded-xl border p-6 text-left transition-all duration-300 ${on
                                                    ? 'border-[var(--caes-ink)] bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                                    : 'border-[var(--caes-line)] bg-transparent hover:border-[var(--caes-ink)]/40 hover:bg-white/50'
                                                }`}
                                        >
                                            <Icon
                                                className={`h-6 w-6 ${on ? 'text-[var(--caes-lime)]' : 'text-[var(--caes-green)]'}`}
                                                strokeWidth={1.6}
                                            />
                                            <span>
                                                <span className="block text-[16px] font-semibold tracking-[-0.015em]">
                                                    {t.systems[key].label}
                                                </span>
                                                <span
                                                    className={`mt-1 block text-[13px] ${on ? 'text-[rgba(241,240,233,.6)]' : 'text-[var(--caes-mut)]'}`}
                                                >
                                                    {t.systems[key].hint}
                                                </span>
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}

                    {/* ---------------------------------------- 2 · FACTURA */}
                    {step === 1 && (
                        <motion.div key="s1" {...slide}>
                            <h2 className="text-[clamp(21px,2.6vw,27px)] font-semibold tracking-[-0.028em]">
                                {t.q2}
                            </h2>

                            <div className="mt-9 flex items-baseline gap-3">
                                <span className="font-sans text-[clamp(46px,7vw,68px)] font-semibold leading-none tracking-[-0.045em] tabular">
                                    {money(factura)}
                                </span>
                                <span className="text-[16px] text-[var(--caes-mut)]">
                                    {t.perMonth}
                                </span>
                            </div>

                            <label className="mt-8 block">
                                <span className="sr-only">{t.q2}</span>
                                <input
                                    type="range"
                                    min={30}
                                    max={350}
                                    step={5}
                                    value={factura}
                                    onChange={(e) => setFactura(parseInt(e.target.value))}
                                    className="caes-range w-full"
                                />
                            </label>
                            <div className="mt-3 flex justify-between text-[12px] text-[var(--caes-faint)]">
                                <span>{money(30)}</span>
                                <span>{t.billHint}</span>
                                <span>{money(350)}+</span>
                            </div>
                        </motion.div>
                    )}

                    {/* ------------------------------------------- 3 · ZONA */}
                    {step === 2 && (
                        <motion.div key="s2" {...slide}>
                            <h2 className="text-[clamp(21px,2.6vw,27px)] font-semibold tracking-[-0.028em]">
                                {t.q3}
                            </h2>
                            <div className="mt-7 flex flex-col gap-2.5">
                                {ZONAS.map((z) => {
                                    const on = zona === z
                                    return (
                                        <button
                                            key={z}
                                            type="button"
                                            onClick={() => setZona(z)}
                                            className={`flex items-center justify-between gap-4 rounded-xl border px-6 py-4 text-left transition-all duration-300 ${on
                                                    ? 'border-[var(--caes-ink)] bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                                    : 'border-[var(--caes-line)] hover:border-[var(--caes-ink)]/40 hover:bg-white/50'
                                                }`}
                                        >
                                            <span className="text-[15.5px] font-medium tracking-[-0.012em]">
                                                {t.zones[z]}
                                            </span>
                                            <span
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${on
                                                        ? 'border-[var(--caes-lime)] bg-[var(--caes-lime)]'
                                                        : 'border-[var(--caes-line)]'
                                                    }`}
                                            >
                                                {on && (
                                                    <Check
                                                        className="h-3 w-3 text-[var(--caes-lime-ink)]"
                                                        strokeWidth={3}
                                                    />
                                                )}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* navigazione */}
                <div className="mt-9 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => setStep((s) => Math.max(0, s - 1))}
                        className={`inline-flex items-center gap-2 text-[14px] text-[var(--caes-mut)] transition-opacity hover:text-[var(--caes-ink)] ${step === 0 ? 'pointer-events-none opacity-0' : 'opacity-100'
                            }`}
                    >
                        <ArrowLeft className="h-4 w-4" />
                        {t.back}
                    </button>

                    <button
                        type="button"
                        disabled={!canAdvance}
                        onClick={() => (step === 2 ? setDone(true) : setStep((s) => s + 1))}
                        className="group inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-green)] px-8 py-3.5 text-[15px] font-medium text-white transition-all duration-300 hover:bg-[var(--caes-green-hi)] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        {step === 2 ? t.submit : t.next}
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                </div>
            </div>
        </motion.div>
    )
}
