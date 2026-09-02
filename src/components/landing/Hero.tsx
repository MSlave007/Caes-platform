'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { EASE, WordMask } from './motion'
import type { ConsumerDict } from '@/lib/i18n/consumer'

/**
 * Hero atmosferico. Sei livelli che scorrono a velocità diverse: il fondo
 * quasi fermo, la griglia più veloce, l'orizzonte lentissimo. È la profondità
 * che nei mockup faceva la differenza e che la versione piatta aveva perso.
 *
 * La foto vera va al posto di <Horizon />: quando ce l'avremo, resta tutto
 * il resto (bloom, griglia, grana, vignettatura) come trattamento sopra.
 */
export default function Hero({
    dict,
    photo,
}: {
    dict: ConsumerDict
    photo?: string
}) {
    const reduce = useReducedMotion()
    const ref = useRef<HTMLElement>(null)

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start'],
    })

    // Ogni livello si muove di quantità diverse: è questo che crea la profondità.
    const yBloom = useTransform(scrollYProgress, [0, 1], ['0%', '38%'])
    const yGrid = useTransform(scrollYProgress, [0, 1], ['0%', '62%'])
    const yHorizon = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])
    const yText = useTransform(scrollYProgress, [0, 1], ['0%', '26%'])
    const fadeText = useTransform(scrollYProgress, [0, 0.75], [1, 0])
    const scaleHorizon = useTransform(scrollYProgress, [0, 1], [1, 1.12])

    const P = (v: unknown) => (reduce ? undefined : (v as never))

    return (
        <section
            ref={ref}
            className="relative isolate flex min-h-[94vh] flex-col overflow-hidden bg-[#06140F]"
        >
            {/* 1 · fondo: verde profondo che si schiarisce verso l'orizzonte */}
            <div
                aria-hidden
                className="absolute inset-0 -z-50"
                style={{
                    background:
                        'linear-gradient(178deg,#04100C 0%,#071A13 30%,#0B2419 58%,#113020 80%,#173B26 100%)',
                }}
            />

            {/* 2 · bloom: la luce calda che entra da destra */}
            <motion.div
                aria-hidden
                className="absolute inset-0 -z-40"
                style={{
                    y: P(yBloom),
                    background:
                        'radial-gradient(ellipse 48% 38% at 74% 22%, rgba(199,240,74,.20), rgba(199,240,74,0) 66%),' +
                        'radial-gradient(ellipse 60% 44% at 22% 6%, rgba(120,200,170,.16), rgba(120,200,170,0) 70%)',
                }}
            />

            {/* 3 · griglia tecnica, si dissolve scendendo */}
            <motion.div
                aria-hidden
                className="absolute inset-0 -z-30 opacity-[.55]"
                style={{
                    y: P(yGrid),
                    backgroundImage:
                        'linear-gradient(rgba(255,255,255,.032) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.032) 1px,transparent 1px)',
                    backgroundSize: '72px 72px',
                    maskImage:
                        'linear-gradient(180deg,rgba(0,0,0,.9) 0%,rgba(0,0,0,.5) 55%,transparent 88%)',
                    WebkitMaskImage:
                        'linear-gradient(180deg,rgba(0,0,0,.9) 0%,rgba(0,0,0,.5) 55%,transparent 88%)',
                }}
            />

            {/* 4 · la fotografia, se c'è; altrimenti l'orizzonte disegnato */}
            {photo ? (
                <motion.div
                    aria-hidden
                    className="absolute inset-0 -z-20"
                    style={{ y: P(yHorizon), scale: P(scaleHorizon) }}
                >
                    <Image
                        src={photo}
                        alt=""
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover object-center"
                    />
                </motion.div>
            ) : (
                <motion.div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 -z-20 h-[46%]"
                    style={{ y: P(yHorizon), scale: P(scaleHorizon), transformOrigin: 'bottom' }}
                >
                    <Horizon />
                </motion.div>
            )}

            {/* 5 · grana */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-[.16] mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.82' numOctaves='3'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='.6'/></svg>\")",
                }}
            />

            {/* 6 · vignettatura, per staccare il testo dal fondo */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10"
                style={{
                    background: photo
                        ? 'linear-gradient(95deg,rgba(4,16,12,.94) 0%,rgba(4,16,12,.76) 28%,rgba(4,16,12,.34) 54%,rgba(4,16,12,.04) 76%,rgba(4,16,12,.22) 100%),' +
                          'linear-gradient(180deg,rgba(4,16,12,.42) 0%,rgba(4,16,12,0) 24%,rgba(4,16,12,0) 58%,rgba(4,16,12,.62) 100%)'
                        : 'linear-gradient(180deg,rgba(4,16,12,.5) 0%,rgba(4,16,12,0) 24%,rgba(4,16,12,0) 46%,rgba(4,16,12,.72) 100%)',
                }}
            />

            {/* ------------------------------------------------------ TESTO */}
            <motion.div
                style={{ y: P(yText), opacity: P(fadeText) }}
                className="relative mx-auto flex w-full max-w-[1180px] flex-1 flex-col justify-center px-6 pb-40 pt-36 sm:px-10"
            >
                <motion.p
                    initial={reduce ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: EASE }}
                    className="label-mono flex items-center gap-3 text-[rgba(224,238,228,.62)]"
                >
                    <span className="h-px w-9 bg-[rgba(224,238,228,.4)]" />
                    {dict.hero.eyebrow}
                </motion.p>

                <WordMask
                    text={dict.hero.title}
                    accentFrom={dict.hero.accentFrom}
                    className="mt-8 max-w-[15ch] text-balance text-[clamp(42px,7.2vw,86px)] font-semibold leading-[0.99] tracking-[-0.045em] text-white"
                />

                <motion.p
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
                    className="mt-8 max-w-[46ch] text-[clamp(16px,1.5vw,19px)] leading-[1.6] text-[rgba(224,238,228,.72)]"
                >
                    {dict.hero.sub}
                </motion.p>

                <motion.div
                    initial={reduce ? false : { opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 1.1 }}
                    className="mt-16 flex items-center gap-3"
                >
                    <span className="label-mono text-[rgba(224,238,228,.45)]">
                        {dict.scrollHint}
                    </span>
                    <span className="relative block h-9 w-px overflow-hidden bg-[rgba(224,238,228,.2)]">
                        {!reduce && (
                            <motion.span
                                className="absolute inset-x-0 top-0 block h-3 bg-[var(--caes-lime)]"
                                animate={{ y: [-12, 36] }}
                                transition={{
                                    duration: 1.9,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                }}
                            />
                        )}
                    </span>
                </motion.div>
            </motion.div>
        </section>
    )
}

/**
 * Orizzonte generato: tetti, un'unità esterna di aerotermia e alberi.
 * È un segnaposto d'autore — quando arriva la foto vera si sostituisce
 * questo componente e tutto il resto del trattamento resta identico.
 */
function Horizon() {
    return (
        <svg
            viewBox="0 0 1440 420"
            preserveAspectRatio="none"
            className="h-full w-full"
            aria-hidden
        >
            <defs>
                <linearGradient id="far" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E2A1D" stopOpacity=".55" />
                    <stop offset="100%" stopColor="#0A2016" stopOpacity=".9" />
                </linearGradient>
                <linearGradient id="near" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#061711" />
                    <stop offset="100%" stopColor="#030C08" />
                </linearGradient>
            </defs>

            {/* profilo lontano, appena accennato */}
            <path
                d="M0,420 L0,268 L96,268 L96,236 L232,236 L232,290 L352,290 L352,208 L520,208 L520,252 L668,252 L668,224 L812,224 L812,278 L968,278 L968,240 L1116,240 L1116,196 L1272,196 L1272,262 L1440,262 L1440,420 Z"
                fill="url(#far)"
            />

            {/* profilo vicino */}
            <path
                d="M0,420 L0,330 L180,330 L180,306 L392,306 L392,344 L560,344 L560,286 L820,286 L820,318 L1040,318 L1040,296 L1240,296 L1240,336 L1440,336 L1440,420 Z"
                fill="url(#near)"
            />

            {/* unità esterna sul tetto */}
            <g>
                <rect x="596" y="238" width="126" height="48" rx="4" fill="#03100B" />
                <rect x="608" y="248" width="102" height="28" rx="2" fill="#0C2418" />
                <circle
                    cx="659"
                    cy="262"
                    r="10"
                    fill="none"
                    stroke="#2F6B45"
                    strokeWidth="2.5"
                />
                <rect x="632" y="286" width="54" height="8" fill="#03100B" />
            </g>

            {/* alberi, per rompere la geometria */}
            <g fill="#03100B">
                <ellipse cx="1330" cy="300" rx="46" ry="34" />
                <ellipse cx="1372" cy="312" rx="34" ry="26" />
                <ellipse cx="112" cy="318" rx="38" ry="28" />
            </g>
        </svg>
    )
}
