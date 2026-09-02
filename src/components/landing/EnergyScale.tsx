'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { EASE } from './motion'
import type { ConsumerDict } from '@/lib/i18n/consumer'

/**
 * La scala energetica A–G, disegnata invece che fotografata.
 *
 * Lo scatto stock aveva un arcobaleno che litigava col nostro verde e un
 * fondo grigio che stonava sulla carta. Disegnandola teniamo la nostra
 * gamma, e soprattutto possiamo animare la cosa che conta davvero: il salto
 * da E ad A, che è il beneficio, non la scala in sé.
 */

const BANDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const

// Dal verde del marchio all'ambra. Niente rosso: non stiamo spaventando
// nessuno, stiamo mostrando un miglioramento.
const COLORS: Record<string, string> = {
    A: '#0B6E48',
    B: '#3E9159',
    C: '#7FB755',
    D: '#C7F04A',
    E: '#E4CE5A',
    F: '#D9A94F',
    G: '#C08A46',
}

const FROM = 'E'
const TO = 'A'

export default function EnergyScale({ dict }: { dict: ConsumerDict }) {
    const t = dict.rating
    const reduce = useReducedMotion()
    const ref = useRef<HTMLDivElement>(null)
    const inView = useInView(ref, { once: true, margin: '-80px' })

    const fromIdx = BANDS.indexOf(FROM as (typeof BANDS)[number])
    const toIdx = BANDS.indexOf(TO as (typeof BANDS)[number])

    return (
        <div ref={ref} className="w-full">
            <div className="flex items-end justify-between gap-4">
                <span className="label-mono text-[var(--caes-faint)]">{t.eyebrow}</span>
                <span className="font-mono text-[10px] uppercase tracking-[.1em] text-[var(--caes-faint)]">
                    {t.from} {FROM} → {t.to} {TO}
                </span>
            </div>

            {/* le sette bande: larghezza crescente, come su un'etichetta vera */}
            <div className="mt-5 flex flex-col gap-[5px]">
                {BANDS.map((b, i) => {
                    const active = i === toIdx
                    const was = i === fromIdx
                    return (
                        <div key={b} className="flex items-center gap-3">
                            <span
                                className={`w-3 shrink-0 font-mono text-[11px] ${active || was ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-faint)]'
                                    }`}
                            >
                                {b}
                            </span>
                            <div className="relative h-[13px] flex-1">
                                <motion.div
                                    className="h-full rounded-[3px]"
                                    style={{ background: COLORS[b] }}
                                    initial={
                                        reduce
                                            ? { width: `${42 + i * 9}%`, opacity: active || was ? 1 : 0.28 }
                                            : { width: 0, opacity: active || was ? 1 : 0.28 }
                                    }
                                    animate={
                                        inView
                                            ? { width: `${42 + i * 9}%`, opacity: active || was ? 1 : 0.28 }
                                            : undefined
                                    }
                                    transition={{ duration: 0.7, delay: 0.1 + i * 0.07, ease: EASE }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* il marcatore che risale: è questo il beneficio */}
            <div className="relative mt-5 h-[34px]">
                <motion.div
                    className="absolute left-0 flex items-center gap-2.5"
                    initial={reduce ? false : { opacity: 0, x: -10 }}
                    animate={inView ? { opacity: 1, x: 0 } : undefined}
                    transition={{ duration: 0.6, delay: 0.85, ease: EASE }}
                >
                    <span className="rounded-full bg-[var(--caes-band)] px-3 py-1.5 font-mono text-[11px] text-[var(--caes-mut)]">
                        {t.from} · {FROM}
                    </span>
                    <motion.span
                        className="block h-px bg-[var(--caes-line)]"
                        initial={reduce ? { width: 28 } : { width: 0 }}
                        animate={inView ? { width: 28 } : undefined}
                        transition={{ duration: 0.5, delay: 1.05, ease: EASE }}
                    />
                    <motion.span
                        className="rounded-full bg-[var(--caes-green)] px-3 py-1.5 font-mono text-[11px] font-medium text-white"
                        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
                        animate={inView ? { opacity: 1, scale: 1 } : undefined}
                        transition={{ duration: 0.5, delay: 1.25, ease: EASE }}
                    >
                        {t.to} · {TO}
                    </motion.span>
                </motion.div>
            </div>

            <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--caes-faint)]">
                {t.pending}
            </p>
        </div>
    )
}
