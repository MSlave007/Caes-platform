'use client'

import { useRef } from 'react'
import Image from 'next/image'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { EASE } from './motion'
import type { ConsumerDict } from '@/lib/i18n/consumer'

/**
 * Fascia a tutta larghezza con l'immagine in parallax: il visuale scorre
 * più lento della pagina, il testo più veloce.
 *
 * Quando avremo le foto vere basta passare `src` e il segnaposto disegnato
 * sparisce — trattamento (grana, vignettatura, verde) resta identico sopra.
 */
export default function ParallaxBand({
    dict,
    src,
}: {
    dict: ConsumerDict
    src?: string
}) {
    const reduce = useReducedMotion()
    const ref = useRef<HTMLElement>(null)

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start end', 'end start'],
    })

    // Il fondo entra già spostato in alto e scende: è l'effetto che si nota.
    const yImage = useTransform(scrollYProgress, [0, 1], ['-14%', '14%'])
    const scaleImage = useTransform(scrollYProgress, [0, 0.5, 1], [1.14, 1.06, 1.14])
    const yText = useTransform(scrollYProgress, [0, 1], ['16%', '-16%'])

    const P = (v: unknown) => (reduce ? undefined : (v as never))

    return (
        <section
            ref={ref}
            className="relative isolate min-h-[76vh] overflow-hidden bg-[#061711]"
        >
            <motion.div
                aria-hidden
                className="absolute inset-[-16%] -z-30"
                style={{ y: P(yImage), scale: P(scaleImage) }}
            >
                {src ? (
                    <Image
                        src={src}
                        alt=""
                        fill
                        sizes="100vw"
                        className="object-cover"
                    />
                ) : (
                    <PlaceholderScene />
                )}
            </motion.div>

            {/* grana + velo verde: tengono insieme foto vera e segnaposto */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-20 opacity-[.14] mix-blend-overlay"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3'/></filter><rect width='180' height='180' filter='url(%23n)' opacity='.6'/></svg>\")",
                }}
            />
            <div
                aria-hidden
                className="absolute inset-0 -z-10"
                style={{
                    background:
                        'linear-gradient(100deg,rgba(4,16,12,.92) 0%,rgba(4,16,12,.72) 38%,rgba(4,16,12,.28) 72%,rgba(4,16,12,.4) 100%)',
                }}
            />

            <motion.div
                style={{ y: P(yText) }}
                className="relative mx-auto flex min-h-[76vh] max-w-[1180px] items-center px-6 py-24 sm:px-10"
            >
                <div className="max-w-[46ch]">
                    <motion.p
                        initial={reduce ? false : { opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="label-mono text-[rgba(224,238,228,.6)]"
                    >
                        {dict.band.eyebrow}
                    </motion.p>
                    <motion.h2
                        initial={reduce ? false : { opacity: 0, y: 22 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.85, delay: 0.08, ease: EASE }}
                        className="mt-5 text-balance text-[clamp(30px,4.4vw,52px)] font-semibold leading-[1.04] tracking-[-0.04em] text-white"
                    >
                        {dict.band.title}
                    </motion.h2>
                    <motion.p
                        initial={reduce ? false : { opacity: 0, y: 18 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-100px' }}
                        transition={{ duration: 0.85, delay: 0.16, ease: EASE }}
                        className="mt-6 text-[clamp(16px,1.5vw,18px)] leading-[1.65] text-[rgba(224,238,228,.74)]"
                    >
                        {dict.band.body}
                    </motion.p>
                </div>
            </motion.div>

            {!src && (
                <span className="absolute bottom-6 right-6 rounded-[3px] border border-dashed border-[rgba(224,238,228,.28)] px-2.5 py-1.5 font-mono text-[9.5px] uppercase tracking-[.12em] text-[rgba(224,238,228,.45)]">
                    {dict.band.caption}
                </span>
            )}
        </section>
    )
}

/** Segnaposto disegnato: una facciata con l'unità esterna, in controluce. */
function PlaceholderScene() {
    return (
        <svg
            viewBox="0 0 1600 900"
            preserveAspectRatio="xMidYMid slice"
            className="h-full w-full"
            aria-hidden
        >
            <defs>
                <linearGradient id="sky2" x1="0" y1="0" x2="0.3" y2="1">
                    <stop offset="0%" stopColor="#1B4A30" />
                    <stop offset="45%" stopColor="#123524" />
                    <stop offset="100%" stopColor="#061711" />
                </linearGradient>
                <radialGradient id="sun2" cx="72%" cy="26%" r="42%">
                    <stop offset="0%" stopColor="#D9F58C" stopOpacity=".38" />
                    <stop offset="100%" stopColor="#D9F58C" stopOpacity="0" />
                </radialGradient>
            </defs>

            <rect width="1600" height="900" fill="url(#sky2)" />
            <rect width="1600" height="900" fill="url(#sun2)" />

            {/* facciata */}
            <rect x="880" y="120" width="620" height="780" fill="#0A2317" opacity=".92" />
            {/* finestre */}
            <g fill="#15402A" opacity=".85">
                {[0, 1, 2, 3].map((r) =>
                    [0, 1, 2].map((c) => (
                        <rect
                            key={`${r}-${c}`}
                            x={930 + c * 180}
                            y={190 + r * 165}
                            width={112}
                            height={104}
                            rx="3"
                        />
                    ))
                )}
            </g>

            {/* unità esterna sulla facciata */}
            <g>
                <rect x="1080" y="560" width="230" height="150" rx="8" fill="#04120C" />
                <rect x="1104" y="586" width="182" height="98" rx="4" fill="#0E2B1D" />
                <circle cx="1195" cy="635" r="38" fill="none" stroke="#3B7F52" strokeWidth="6" />
                <circle cx="1195" cy="635" r="9" fill="#3B7F52" />
                <rect x="1140" y="710" width="110" height="16" fill="#04120C" />
            </g>

            {/* vegetazione in primo piano */}
            <g fill="#030D09">
                <ellipse cx="180" cy="880" rx="300" ry="150" />
                <ellipse cx="520" cy="900" rx="240" ry="120" />
                <ellipse cx="1480" cy="900" rx="260" ry="130" />
            </g>
        </svg>
    )
}
