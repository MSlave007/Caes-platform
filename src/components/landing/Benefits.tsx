'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { FileCheck, ShieldCheck, Receipt, HandCoins, Home } from 'lucide-react'
import { Counter, EASE } from './motion'
import EnergyScale from './EnergyScale'
import { estimateConsumer } from '@/lib/caes/consumer'
import type { ConsumerDict } from '@/lib/i18n/consumer'

const ICONS = [FileCheck, ShieldCheck, Receipt, HandCoins, Home]

/**
 * Il pezzo forte subito dopo il calcolatore: perché conviene farlo con noi.
 * Bento a celle disuguali — la comparativa occupa due colonne e ha il suo
 * grafico animato; le altre sono schede quiete. Mai la stessa cella due volte.
 */
export default function Benefits({ dict }: { dict: ConsumerDict }) {
    const b = dict.benefits
    const reduce = useReducedMotion()
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: true, margin: '-100px' })

    // Caso di riferimento della comparativa: bolletta da 90 €/mese, zona centro.
    const ref90 = estimateConsumer({
        sistema: 'gas',
        facturaMensual: 90,
        zona: 'centro',
    })
    const antes = Math.round(ref90.gastoActual)
    const despues = Math.round(ref90.gastoNuevo)
    const ratio = antes > 0 ? despues / antes : 0

    const money = (n: number) =>
        new Intl.NumberFormat(dict.intlLocale, {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(n)

    return (
        <div className="mx-auto max-w-[1180px] px-6 sm:px-10">
            <motion.div
                initial={reduce ? false : { opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-90px' }}
                transition={{ duration: 0.8, ease: EASE }}
            >
                <p className="label-mono text-[var(--caes-mut)]">{b.eyebrow}</p>
                <h2 className="mt-5 max-w-[19ch] text-balance text-[clamp(30px,4.4vw,50px)] font-semibold leading-[1.04] tracking-[-0.04em]">
                    {b.title}
                </h2>
                <p className="mt-6 max-w-[54ch] text-[clamp(16px,1.4vw,18px)] leading-[1.6] text-[var(--caes-mut)]">
                    {b.sub}
                </p>
            </motion.div>

            <div ref={ref} className="mt-16 grid gap-4 lg:grid-cols-3">
                {/* ---------- cella grande: la comparativa ---------- */}
                <motion.div
                    initial={reduce ? false : { opacity: 0, y: 26 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.8, ease: EASE }}
                    className="relative overflow-hidden rounded-2xl bg-[var(--caes-deep)] p-9 text-[var(--caes-on-deep)] lg:col-span-2 lg:p-11"
                >
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                            background:
                                'radial-gradient(ellipse 50% 60% at 88% 8%, rgba(199,240,74,.14), rgba(199,240,74,0) 68%)',
                        }}
                    />
                    <div className="relative">
                        <h3 className="max-w-[17ch] text-balance text-[clamp(21px,2.4vw,28px)] font-semibold leading-[1.14] tracking-[-0.028em] text-white">
                            {b.compare.title}
                        </h3>

                        <div className="mt-10 flex flex-col gap-7">
                            {/* prima */}
                            <div>
                                <div className="flex items-baseline justify-between gap-4">
                                    <span className="text-[13.5px] text-[rgba(221,233,225,.6)]">
                                        {b.compare.before}
                                    </span>
                                    <span className="font-mono tabular text-[16px] text-[rgba(221,233,225,.85)]">
                                        {money(antes)}
                                    </span>
                                </div>
                                <div className="mt-3 h-[38px] w-full overflow-hidden rounded-[6px] bg-white/[.07]">
                                    <motion.div
                                        className="h-full rounded-[6px] bg-[rgba(221,233,225,.24)]"
                                        initial={reduce ? { width: '100%' } : { width: 0 }}
                                        animate={inView ? { width: '100%' } : undefined}
                                        transition={{ duration: 1.1, delay: 0.15, ease: EASE }}
                                    />
                                </div>
                            </div>

                            {/* dopo */}
                            <div>
                                <div className="flex items-baseline justify-between gap-4">
                                    <span className="text-[13.5px] text-[var(--caes-lime)]">
                                        {b.compare.after}
                                    </span>
                                    <span className="font-mono tabular text-[16px] text-[var(--caes-lime)]">
                                        {money(despues)}
                                    </span>
                                </div>
                                <div className="mt-3 h-[38px] w-full overflow-hidden rounded-[6px] bg-white/[.07]">
                                    <motion.div
                                        className="h-full rounded-[6px] bg-[var(--caes-lime)]"
                                        initial={reduce ? { width: `${ratio * 100}%` } : { width: 0 }}
                                        animate={inView ? { width: `${ratio * 100}%` } : undefined}
                                        transition={{ duration: 1.2, delay: 0.55, ease: EASE }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-t border-white/10 pt-7">
                            <div>
                                <Counter
                                    value={ref90.ahorroAnual}
                                    locale={dict.intlLocale}
                                    suffix=" €"
                                    className="font-sans text-[clamp(38px,5vw,54px)] font-semibold leading-none tracking-[-0.045em] text-white tabular"
                                />
                                <p className="mt-3 max-w-[24ch] text-[13.5px] text-[rgba(221,233,225,.6)]">
                                    {b.compare.unit}
                                </p>
                            </div>
                            <p className="max-w-[34ch] text-[12.5px] leading-[1.55] text-[rgba(221,233,225,.42)]">
                                {b.compare.note}
                            </p>
                        </div>
                    </div>
                </motion.div>

                {/* colonna con due schede, accanto alla cella grande */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                    {b.items.slice(0, 2).map((it, i) => {
                        const Icon = ICONS[i]
                        return (
                            <Card key={it.title} delay={0.1 + i * 0.08} reduce={!!reduce}>
                                <Icon
                                    className="h-[22px] w-[22px] text-[var(--caes-green)]"
                                    strokeWidth={1.6}
                                />
                                <h3 className="mt-6 text-[16.5px] font-semibold tracking-[-0.02em]">
                                    {it.title}
                                </h3>
                                <p className="mt-2.5 text-[14px] leading-[1.55] text-[var(--caes-mut)]">
                                    {it.body}
                                </p>
                            </Card>
                        )
                    })}
                </div>
            </div>

            {/* seconda riga: due schede della stessa larghezza */}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {b.items.slice(2, 4).map((it, i) => {
                    const Icon = ICONS[i + 2]
                    return (
                        <Card key={it.title} delay={0.12 + i * 0.08} reduce={!!reduce}>
                            <Icon
                                className="h-[22px] w-[22px] text-[var(--caes-green)]"
                                strokeWidth={1.6}
                            />
                            <h3 className="mt-6 text-[16.5px] font-semibold tracking-[-0.02em]">
                                {it.title}
                            </h3>
                            <p className="mt-2.5 max-w-[42ch] text-[14px] leading-[1.55] text-[var(--caes-mut)]">
                                {it.body}
                            </p>
                        </Card>
                    )
                })}
            </div>

            {/* terza riga: la scala energetica, a tutta larghezza e in due
                colonne, cosi' le sette bande hanno lo spazio che chiedono */}
            {b.items[4] && (
                <div className="mt-4">
                    <Card delay={0.2} reduce={!!reduce}>
                        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center lg:gap-16">
                            <div>
                                <Home
                                    className="h-[22px] w-[22px] text-[var(--caes-green)]"
                                    strokeWidth={1.6}
                                />
                                <h3 className="mt-6 text-[16.5px] font-semibold tracking-[-0.02em]">
                                    {b.items[4].title}
                                </h3>
                                <p className="mt-2.5 max-w-[42ch] text-[14px] leading-[1.55] text-[var(--caes-mut)]">
                                    {b.items[4].body}
                                </p>
                            </div>
                            <EnergyScale dict={dict} />
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}

function Card({
    children,
    delay,
    reduce,
    className = '',
}: {
    children: React.ReactNode
    delay: number
    reduce: boolean
    className?: string
}) {
    return (
        <motion.div
            initial={reduce ? false : { opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.7, delay, ease: EASE }}
            whileHover={reduce ? undefined : { y: -4 }}
            className={`flex h-full flex-col rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-8 transition-shadow duration-300 hover:shadow-[0_18px_40px_-24px_rgba(6,35,26,.35)] ${className}`}
        >
            {children}
        </motion.div>
    )
}
