'use client'

import {
    motion,
    useInView,
    useMotionValue,
    useReducedMotion,
    useSpring,
    useTransform,
    type Variants,
} from 'framer-motion'
import { useEffect, useRef, type ReactNode } from 'react'

/** Curva unica di tutto il sito: uscita morbida, nessun rimbalzo. */
export const EASE = [0.16, 1, 0.3, 1] as const

/* ------------------------------------------------------------------ *
 * Reveal — il blocco entra dal basso quando lo scroll lo raggiunge.
 * Una volta sola: le landing che rianimano a ogni passaggio stancano.
 * ------------------------------------------------------------------ */
export function Reveal({
    children,
    delay = 0,
    y = 22,
    className,
}: {
    children: ReactNode
    delay?: number
    y?: number
    className?: string
}) {
    const reduce = useReducedMotion()
    if (reduce) return <div className={className}>{children}</div>

    return (
        <motion.div
            className={className}
            initial={{ opacity: 0, y }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.75, delay, ease: EASE }}
        >
            {children}
        </motion.div>
    )
}

/* ------------------------------------------------------------------ *
 * Stagger — contenitore e figli, per liste e griglie.
 * ------------------------------------------------------------------ */
export const staggerParent: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

export const staggerChild: Variants = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

export function Stagger({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    const reduce = useReducedMotion()
    if (reduce) return <div className={className}>{children}</div>

    return (
        <motion.div
            className={className}
            variants={staggerParent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-70px' }}
        >
            {children}
        </motion.div>
    )
}

export function StaggerItem({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    const reduce = useReducedMotion()
    if (reduce) return <div className={className}>{children}</div>
    return (
        <motion.div className={className} variants={staggerChild}>
            {children}
        </motion.div>
    )
}

/* ------------------------------------------------------------------ *
 * WordMask — il titolo si scopre parola per parola da dietro una
 * maschera. È l'unico effetto "da esposizione" della pagina: sta solo
 * nell'hero e non si ripete più sotto.
 * ------------------------------------------------------------------ */
export function WordMask({
    text,
    className,
    accentFrom,
    accentClass = 'serif-accent',
    delay = 0.1,
}: {
    text: string
    className?: string
    /** Indice della prima parola da comporre con l'accento corsivo */
    accentFrom?: number
    accentClass?: string
    delay?: number
}) {
    const reduce = useReducedMotion()
    const words = text.split(' ')

    if (reduce) {
        return (
            <h1 className={className}>
                {words.map((w, i) => (
                    <span
                        key={i}
                        className={accentFrom !== undefined && i >= accentFrom ? accentClass : undefined}
                    >
                        {w}{' '}
                    </span>
                ))}
            </h1>
        )
    }

    return (
        <h1 className={className}>
            {words.map((w, i) => (
                <span
                    key={i}
                    className="inline-block overflow-hidden align-bottom"
                    style={{ paddingBottom: '0.08em', marginBottom: '-0.08em' }}
                >
                    <motion.span
                        className={`inline-block ${accentFrom !== undefined && i >= accentFrom ? accentClass : ''
                            }`}
                        initial={{ y: '110%' }}
                        animate={{ y: 0 }}
                        transition={{ duration: 0.9, delay: delay + i * 0.055, ease: EASE }}
                    >
                        {w}
                    </motion.span>
                    {i < words.length - 1 && <span>&nbsp;</span>}
                </span>
            ))}
        </h1>
    )
}

/* ------------------------------------------------------------------ *
 * Counter — la cifra sale fino al valore. Il valore finale sta nel DOM
 * fin da subito: se il JS non parte, o l'utente ha le animazioni
 * ridotte, il numero è comunque lì e leggibile.
 * ------------------------------------------------------------------ */
export function Counter({
    value,
    locale = 'es-ES',
    prefix = '',
    suffix = '',
    className,
    duration = 1.1,
    decimals = 0,
}: {
    value: number
    locale?: string
    prefix?: string
    suffix?: string
    className?: string
    duration?: number
    /** Cifre decimali: "5,7 anni" ne vuole una, gli importi nessuna. */
    decimals?: number
}) {
    const reduce = useReducedMotion()
    const ref = useRef<HTMLSpanElement>(null)
    const inView = useInView(ref, { once: true, margin: '-60px' })
    const mv = useMotionValue(0)
    const spring = useSpring(mv, { duration: duration * 1000, bounce: 0 })
    const text = useTransform(spring, (v) =>
        new Intl.NumberFormat(locale, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        }).format(v)
    )

    useEffect(() => {
        if (inView) mv.set(value)
    }, [inView, value, mv])

    // Se il valore cambia (l'utente muove uno slider) e siamo già in vista,
    // la molla insegue il nuovo target senza ripartire da zero.
    const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value)

    if (reduce) {
        return (
            <span ref={ref} className={className}>
                {prefix}
                {formatted}
                {suffix}
            </span>
        )
    }

    return (
        <span ref={ref} className={className}>
            {prefix}
            <motion.span>{text}</motion.span>
            {suffix}
        </span>
    )
}

/** Bottone che reagisce al passaggio, solo su dispositivi con puntatore. */
export function LiftOnHover({
    children,
    className,
}: {
    children: ReactNode
    className?: string
}) {
    const reduce = useReducedMotion()
    if (reduce) return <div className={className}>{children}</div>
    return (
        <motion.div
            className={className}
            whileHover={{ y: -3 }}
            transition={{ duration: 0.35, ease: EASE }}
        >
            {children}
        </motion.div>
    )
}

export { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
