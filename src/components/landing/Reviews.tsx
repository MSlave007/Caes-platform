'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Quote } from 'lucide-react'
import { EASE } from './motion'
import type { ConsumerDict } from '@/lib/i18n/consumer'

/**
 * ⚠️ Le testimonianze qui dentro sono SCRITTE DA NOI come segnaposto di
 * impaginazione. Non sono clienti reali. Prima di mandare traffico su questa
 * pagina vanno sostituite con recensioni vere e autorizzate: pubblicare
 * testimonianze inventate è pubblicità ingannevole, e su un prodotto che vive
 * di fiducia è il danno peggiore che possiamo farci.
 *
 * Il cartellino "pendientes de recoger" resta visibile finché sono finte.
 */
export default function Reviews({ dict }: { dict: ConsumerDict }) {
    const r = dict.reviews
    const reduce = useReducedMotion()

    return (
        <div className="mx-auto max-w-[1180px] px-6 sm:px-10">
            <div className="flex flex-wrap items-end justify-between gap-6">
                <motion.div
                    initial={reduce ? false : { opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-90px' }}
                    transition={{ duration: 0.8, ease: EASE }}
                >
                    <p className="label-mono text-[var(--caes-mut)]">{r.eyebrow}</p>
                    <h2 className="mt-5 max-w-[18ch] text-balance text-[clamp(28px,4vw,44px)] font-semibold leading-[1.05] tracking-[-0.038em]">
                        {r.title}
                    </h2>
                </motion.div>

                <span className="rounded-[3px] border border-dashed border-[var(--caes-line)] px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[.12em] text-[var(--caes-faint)]">
                    {r.pending}
                </span>
            </div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
                {r.items.map((it, i) => (
                    <motion.figure
                        key={it.name}
                        initial={reduce ? false : { opacity: 0, y: 26 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-70px' }}
                        transition={{ duration: 0.75, delay: i * 0.1, ease: EASE }}
                        className="flex flex-col justify-between rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-8"
                    >
                        <div>
                            <Quote
                                className="h-5 w-5 rotate-180 text-[var(--caes-line)]"
                                strokeWidth={2}
                            />
                            <blockquote className="mt-6 text-[16.5px] leading-[1.6] tracking-[-0.012em]">
                                {it.quote}
                            </blockquote>
                        </div>

                        <figcaption className="mt-9 border-t border-[var(--caes-line-2)] pt-6">
                            <div className="flex items-center gap-3.5">
                                {/* iniziali al posto della foto: nessun volto inventato */}
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--caes-band)] font-mono text-[12px] font-medium text-[var(--caes-ink)]">
                                    {it.name
                                        .split(' ')
                                        .map((w) => w[0])
                                        .join('')}
                                </span>
                                <span>
                                    <span className="block text-[14px] font-semibold tracking-[-0.012em]">
                                        {it.name}
                                    </span>
                                    <span className="block text-[12.5px] text-[var(--caes-mut)]">
                                        {it.city}
                                    </span>
                                </span>
                            </div>
                            <div className="mt-5 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-[var(--caes-band)] px-3 py-1.5 text-[11.5px] text-[var(--caes-mut)]">
                                    {it.system}
                                </span>
                                <span className="rounded-full bg-[var(--caes-lime)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--caes-lime-ink)]">
                                    {it.saving}
                                </span>
                            </div>
                        </figcaption>
                    </motion.figure>
                ))}
            </div>
        </div>
    )
}
