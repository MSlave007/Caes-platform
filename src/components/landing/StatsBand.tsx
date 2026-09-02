'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { Counter, EASE } from './motion'
import type { ConsumerDict } from '@/lib/i18n/consumer'

/**
 * La fascia dei numeri. Contano quando entrano in campo, una volta sola,
 * sfalsati; e la riga che li separa si disegna sotto di loro.
 */
export default function StatsBand({ dict }: { dict: ConsumerDict }) {
    const reduce = useReducedMotion()
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: true, margin: '-120px' })

    return (
        <div ref={ref} className="mx-auto max-w-[1180px] px-6 sm:px-10">
            <p className="label-mono text-[var(--caes-mut)]">{dict.stats.eyebrow}</p>

            <div className="mt-12 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
                {dict.stats.items.map((s, i) => (
                    <div key={s.label} className="relative">
                        {/* la riga si disegna da sinistra quando il blocco entra */}
                        <motion.span
                            className="absolute left-0 top-0 block h-px bg-[var(--caes-ink)]"
                            initial={reduce ? { width: '100%' } : { width: 0 }}
                            animate={inView ? { width: '100%' } : undefined}
                            transition={{ duration: 0.9, delay: 0.1 + i * 0.12, ease: EASE }}
                        />
                        <div className="pt-7">
                            <div className="flex items-baseline">
                                <Counter
                                    value={s.value}
                                    locale={dict.intlLocale}
                                    suffix={s.suffix}
                                    duration={1.3}
                                    className="font-sans text-[clamp(46px,5.4vw,66px)] font-semibold leading-none tracking-[-0.05em] tabular"
                                />
                            </div>
                            <h3 className="mt-6 text-[16px] font-semibold tracking-[-0.018em]">
                                {s.label}
                            </h3>
                            <p className="mt-2 max-w-[30ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                                {s.note}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
