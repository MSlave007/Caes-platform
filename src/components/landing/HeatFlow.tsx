'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { EASE } from './motion'
import type { ConsumerDict } from '@/lib/i18n/consumer'

/**
 * Il confronto, come grafico misurato invece che come illustrazione.
 *
 * Disegnare una pompa di calore realistica in SVG non regge: la ventola
 * sembrava uno scarabocchio e l'unità un televisore. Il contenuto vero però
 * è un rapporto fra quantità, e i rapporti si mostrano con delle barre.
 *
 * Entrambe le barre stanno sulla stessa scala e sulla stessa tacca di
 * riferimento — l'unico kWh che l'utente paga. La caldaia ne restituisce
 * meno di quello; la pompa ne restituisce tre, e due arrivano dall'aria.
 * È lo stesso concetto di prima, ma qui non si può capire male.
 */

const MAX = 3 // scala comune: 3 kWh di calore
const BOILER_OUT = 0.9
const PUMP_PAID = 1
const PUMP_FREE = 2

export default function HeatFlow({ dict }: { dict: ConsumerDict }) {
    const dg = dict.why.diagram
    const reduce = useReducedMotion()
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: true, margin: '-120px' })

    const pct = (v: number) => `${(v / MAX) * 100}%`
    const grow = (v: number, delay: number) => ({
        initial: reduce ? { width: pct(v) } : { width: 0 },
        animate: inView ? { width: pct(v) } : undefined,
        transition: { duration: 1, delay, ease: EASE },
    })

    const kwh = (v: number) =>
        `${new Intl.NumberFormat(dict.intlLocale, { maximumFractionDigits: 1 }).format(v)} kWh`

    return (
        <div ref={ref} className="mx-auto max-w-[940px]">
            <p className="max-w-[46ch] text-[13px] leading-[1.5] text-[var(--caes-mut)]">
                {dg.axis}
            </p>

            <div className="mt-12">
                <div className="flex flex-col gap-9">
                    {/* ---------------------------------------- CALDAIA */}
                    <Row
                        title={dg.boilerTitle}
                        note={dg.boilerNote}
                        value={kwh(BOILER_OUT)}
                        markLabel={dg.paidMark}
                        inView={inView}
                        reduce={!!reduce}
                        dim
                    >
                        <motion.div
                            className="h-full rounded-[5px] bg-[#C9A961]"
                            {...grow(BOILER_OUT, 0.45)}
                        />
                    </Row>

                    {/* ------------------------------------ POMPA DI CALORE */}
                    <Row
                        title={dg.pumpTitle}
                        note={dg.pumpNote}
                        value={kwh(PUMP_PAID + PUMP_FREE)}
                        inView={inView}
                        reduce={!!reduce}
                    >
                        <div className="flex h-full">
                            <motion.div
                                className="h-full rounded-l-[5px] bg-[var(--caes-green)]"
                                {...grow(PUMP_PAID, 0.75)}
                            />
                            <motion.div
                                className="h-full rounded-r-[5px] bg-[var(--caes-lime)]"
                                {...grow(PUMP_FREE, 1.15)}
                            />
                        </div>
                    </Row>
                </div>
            </div>

            {/* legenda */}
            <motion.div
                className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[var(--caes-line)] pt-6"
                initial={reduce ? false : { opacity: 0 }}
                animate={inView ? { opacity: 1 } : undefined}
                transition={{ duration: 0.6, delay: 1.6 }}
            >
                <Key color="var(--caes-green)">{dg.paid}</Key>
                <Key color="var(--caes-lime)">{dg.free}</Key>
                <p className="max-w-[46ch] text-[12.5px] leading-[1.55] text-[var(--caes-faint)] sm:ml-auto">
                    {dg.note}
                </p>
            </motion.div>
        </div>
    )
}

function Row({
    title,
    note,
    value,
    dim = false,
    markLabel,
    inView,
    reduce,
    children,
}: {
    title: string
    note: string
    value: string
    dim?: boolean
    /** Solo la prima riga porta la didascalia della tacca */
    markLabel?: string
    inView: boolean
    reduce: boolean
    children: React.ReactNode
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:items-center sm:gap-7">
            <div>
                <h3
                    className={`text-[16px] font-semibold tracking-[-0.02em] ${dim ? 'text-[var(--caes-mut)]' : ''}`}
                >
                    {title}
                </h3>
                <p className="mt-1 max-w-[28ch] text-[12.5px] leading-[1.45] text-[var(--caes-faint)]">
                    {note}
                </p>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative h-[46px] flex-1 rounded-[5px] bg-[var(--caes-line)]/45">
                    {children}

                    {/* tacca del kWh pagato: dentro la traccia, quindi allineata */}
                    <motion.span
                        aria-hidden
                        className="absolute -top-1.5 bottom-[-6px] w-px bg-[var(--caes-ink)]/30"
                        style={{ left: `${(1 / MAX) * 100}%`, originY: 0 }}
                        initial={reduce ? false : { scaleY: 0 }}
                        animate={inView ? { scaleY: 1 } : undefined}
                        transition={{ duration: 0.5, delay: 0.15, ease: EASE }}
                    />
                    {markLabel && (
                        <motion.span
                            className="absolute -top-8 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[.12em] text-[var(--caes-mut)]"
                            style={{ left: `${(1 / MAX) * 100}%` }}
                            initial={reduce ? false : { opacity: 0 }}
                            animate={inView ? { opacity: 1 } : undefined}
                            transition={{ duration: 0.5, delay: 0.35 }}
                        >
                            {markLabel}
                        </motion.span>
                    )}
                </div>
                <span
                    className={`w-[68px] shrink-0 text-right font-mono tabular text-[14px] font-medium ${dim ? 'text-[var(--caes-mut)]' : 'text-[var(--caes-ink)]'}`}
                >
                    {value}
                </span>
            </div>
        </div>
    )
}

function Key({ color, children }: { color: string; children: React.ReactNode }) {
    return (
        <span className="flex items-center gap-2.5 text-[13px] text-[var(--caes-mut)]">
            <i
                className="block h-[10px] w-[10px] shrink-0 rounded-[2px]"
                style={{ background: color }}
            />
            {children}
        </span>
    )
}
