'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Counter, EASE } from './motion'
import { estimateConsumer } from '@/lib/caes/consumer'
import type { ConsumerDict } from '@/lib/i18n/consumer'

/**
 * La sezione che spinge senza spingere.
 *
 * Il freno vero non è il prezzo: è il rimandare. Quindi non ripetiamo i
 * benefici — mettiamo un numero sul costo dell'attesa, con un tono che
 * ammette che nessuno cambia una caldaia per divertimento. La foto fa
 * metà del lavoro: quella stanchezza da "lo faccio la settimana prossima"
 * la riconosce chiunque.
 */
export default function Nudge({
    dict,
    photo,
}: {
    dict: ConsumerDict
    photo?: string
}) {
    const n = dict.nudge
    const reduce = useReducedMotion()
    const ref = useRef<HTMLElement>(null)

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    })
    const yPhoto = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])
    const P = (v: unknown) => (reduce ? undefined : (v as never))

    // Stesso caso di riferimento del resto della pagina: 90 €/mese, gas, centro.
    const r = estimateConsumer({ sistema: 'gas', facturaMensual: 90, zona: 'centro' })
    const perMes = Math.round(r.ahorroAnual / 12)

    const money = (v: number) =>
        new Intl.NumberFormat(dict.intlLocale, {
            style: 'currency',
            currency: 'EUR',
            maximumFractionDigits: 0,
        }).format(v)

    return (
        <section ref={ref} className="border-t border-[var(--caes-line)] bg-[var(--caes-band)]">
            <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-6 py-24 sm:px-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20">
                {/* foto */}
                {photo && (
                    <motion.div
                        initial={reduce ? false : { opacity: 0, y: 26 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-90px' }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--caes-line)]"
                    >
                        <motion.div className="absolute inset-[-8%]" style={{ y: P(yPhoto) }}>
                            <Image
                                src={photo}
                                alt=""
                                fill
                                sizes="(min-width:1024px) 34rem, 100vw"
                                className="object-cover"
                            />
                        </motion.div>
                    </motion.div>
                )}

                {/* testo */}
                <motion.div
                    initial={reduce ? false : { opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-90px' }}
                    transition={{ duration: 0.8, delay: 0.08, ease: EASE }}
                >
                    <p className="label-mono text-[var(--caes-mut)]">{n.eyebrow}</p>
                    <h2 className="mt-5 max-w-[20ch] text-balance text-[clamp(27px,3.8vw,42px)] font-semibold leading-[1.08] tracking-[-0.036em]">
                        {n.title}
                    </h2>
                    <p className="mt-6 max-w-[50ch] text-[clamp(15px,1.4vw,17px)] leading-[1.65] text-[var(--caes-mut)]">
                        {n.body}
                    </p>

                    {/* il costo dell'attesa, in tre scaglioni */}
                    <div className="mt-10 rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
                        <p className="text-[13px] text-[var(--caes-mut)]">{n.counterLabel}</p>
                        <div className="mt-3 flex items-baseline gap-1.5">
                            <span className="font-sans text-[clamp(40px,5.5vw,58px)] font-semibold leading-none tracking-[-0.05em] text-[var(--caes-ink)]">
                                −
                            </span>
                            <Counter
                                value={perMes}
                                locale={dict.intlLocale}
                                suffix=" €"
                                className="font-sans text-[clamp(40px,5.5vw,58px)] font-semibold leading-none tracking-[-0.05em] tabular"
                            />
                        </div>

                        <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-[var(--caes-line)]">
                            {[
                                { l: n.scale[0], v: r.ahorroAnual },
                                { l: n.scale[1], v: r.ahorroAnual * 5 },
                            ].map((x) => (
                                <div key={x.l.when} className="bg-[var(--caes-panel)] px-5 py-4">
                                    <div className="text-[12px] text-[var(--caes-mut)]">
                                        {x.l.when} {x.l.unit}
                                    </div>
                                    <div className="mt-1.5 font-mono tabular text-[19px] font-medium tracking-[-0.02em]">
                                        {money(x.v)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="mt-5 text-[11.5px] leading-[1.5] text-[var(--caes-faint)]">
                            {n.counterNote}
                        </p>
                    </div>

                    <p className="mt-8 max-w-[46ch] text-[15px] leading-[1.6] text-[var(--caes-ink)]">
                        {n.kicker}
                    </p>

                    <a
                        href="#calculadora"
                        className="group mt-6 inline-flex items-center gap-2.5 rounded-full bg-[var(--caes-ink)] px-7 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-opacity hover:opacity-90"
                    >
                        {n.cta}
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </a>
                </motion.div>
            </div>
        </section>
    )
}
