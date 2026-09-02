'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'

const EASE = [0.16, 1, 0.3, 1] as const

/**
 * Guscio comune di accesso e registrazione.
 *
 * Impianto della landing portato qui: carta calda a sinistra dove si lavora,
 * pannello verde profondo a destra con la fotografia. Il modulo sta sulla
 * carta perché è lì che l'occhio va a leggere; l'immagine fa da ancoraggio
 * e sparisce sotto i 1024px, dove serve solo compilare in fretta.
 */
export default function AuthShell({
    eyebrow,
    title,
    accent,
    sub,
    aside,
    photo,
    children,
    footer,
}: {
    eyebrow: string
    title: string
    /** Parte finale del titolo, in corsivo serif */
    accent?: string
    sub: string
    /** Testo sul pannello scuro */
    aside: { quote: string; caption: string }
    photo?: string
    children: React.ReactNode
    footer?: React.ReactNode
}) {
    const reduce = useReducedMotion()

    return (
        <div className="grid min-h-screen bg-[var(--caes-paper)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.86fr)]">
            {/* ------------------------------------------------ colonna modulo */}
            <div className="relative flex flex-col px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
                <Link
                    href="/es"
                    className="group inline-flex w-fit items-center gap-2.5 text-[13px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                >
                    <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                    <span className="flex items-center gap-2.5">
                        <span className="relative block h-[16px] w-[16px] rounded-[3px] bg-[var(--caes-ink)]">
                            <span className="absolute bottom-[3px] left-[3px] block h-[5px] w-[5px] rounded-[1px] bg-[var(--caes-lime)]" />
                        </span>
                        <span className="font-mono text-[13px] font-medium tracking-[.15em] text-[var(--caes-ink)]">
                            CAES
                        </span>
                    </span>
                </Link>

                <motion.div
                    initial={reduce ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    className="mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center py-12"
                >
                    <p className="label-mono text-[var(--caes-mut)]">{eyebrow}</p>
                    <h1 className="mt-4 text-balance text-[clamp(28px,3.6vw,38px)] font-semibold leading-[1.06] tracking-[-0.038em] text-[var(--caes-ink)]">
                        {title}
                        {accent && <em className="serif-accent"> {accent}</em>}
                    </h1>
                    <p className="mt-3.5 max-w-[42ch] text-[15px] leading-[1.55] text-[var(--caes-mut)]">
                        {sub}
                    </p>

                    <div className="mt-10">{children}</div>

                    {footer && (
                        <div className="mt-8 border-t border-[var(--caes-line)] pt-6 text-[14px] text-[var(--caes-mut)]">
                            {footer}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* ----------------------------------------------- pannello scuro */}
            {/* sticky: su moduli lunghi il pannello non deve scivolare via */}
            <div className="relative hidden overflow-hidden bg-[var(--caes-deep)] lg:sticky lg:top-0 lg:block lg:h-screen">
                {photo && (
                    <Image
                        src={photo}
                        alt=""
                        fill
                        sizes="46vw"
                        className="object-cover"
                        priority
                    />
                )}
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        background: photo
                            ? 'linear-gradient(200deg,rgba(4,16,12,.72) 0%,rgba(4,16,12,.5) 45%,rgba(4,16,12,.92) 100%)'
                            : 'radial-gradient(ellipse 60% 50% at 70% 15%, rgba(199,240,74,.16), rgba(199,240,74,0) 68%)',
                    }}
                />

                <div className="relative flex h-full flex-col justify-end p-14 xl:p-16">
                    <motion.blockquote
                        initial={reduce ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.15, ease: EASE }}
                        className="max-w-[24ch] text-balance text-[clamp(24px,2.6vw,34px)] font-semibold leading-[1.14] tracking-[-0.03em] text-white"
                    >
                        {aside.quote}
                    </motion.blockquote>
                    <motion.p
                        initial={reduce ? false : { opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, delay: 0.28, ease: EASE }}
                        className="mt-6 max-w-[36ch] text-[14.5px] leading-[1.6] text-[rgba(224,238,228,.66)]"
                    >
                        {aside.caption}
                    </motion.p>
                </div>
            </div>
        </div>
    )
}

/* ------------------------------------------------------------------ *
 * Campi: stesso stile in accesso, registrazione e piattaforma.
 * ------------------------------------------------------------------ */

export function Field({
    label,
    hint,
    children,
    right,
}: {
    label: string
    hint?: string
    children: React.ReactNode
    right?: React.ReactNode
}) {
    return (
        <label className="block">
            <span className="flex items-baseline justify-between gap-3">
                <span className="text-[13.5px] font-medium text-[var(--caes-ink)]">
                    {label}
                </span>
                {right}
            </span>
            <div className="mt-2">{children}</div>
            {hint && (
                <span className="mt-1.5 block text-[12px] text-[var(--caes-faint)]">
                    {hint}
                </span>
            )}
        </label>
    )
}

export const inputClass =
    'w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-panel)] px-4 py-3.5 text-[15px] text-[var(--caes-ink)] outline-none transition-colors placeholder:text-[var(--caes-faint)] focus:border-[var(--caes-green)] focus:ring-4 focus:ring-[var(--caes-green)]/12'

export function PrimaryButton({
    children,
    ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            {...rest}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-[var(--caes-ink)] px-6 py-3.5 text-[15px] font-medium text-[var(--caes-paper)] transition-all duration-300 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
            {children}
        </button>
    )
}

/** Selettore di ruolo a due tasti, condiviso con la piattaforma. */
export function RoleToggle<T extends string>({
    value,
    onChange,
    options,
}: {
    value: T
    onChange: (v: T) => void
    options: { value: T; label: string; hint: string; Icon: React.ElementType }[]
}) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {options.map((o) => {
                const on = o.value === value
                return (
                    <button
                        key={o.value}
                        type="button"
                        onClick={() => onChange(o.value)}
                        className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all duration-300 ${on
                                ? 'border-[var(--caes-ink)] bg-[var(--caes-ink)] text-[var(--caes-paper)]'
                                : 'border-[var(--caes-line)] bg-transparent hover:border-[var(--caes-ink)]/40'
                            }`}
                    >
                        <o.Icon
                            className={`h-[18px] w-[18px] ${on ? 'text-[var(--caes-lime)]' : 'text-[var(--caes-green)]'}`}
                            strokeWidth={1.7}
                        />
                        <span>
                            <span className="block text-[14.5px] font-semibold tracking-[-0.015em]">
                                {o.label}
                            </span>
                            <span
                                className={`mt-0.5 block text-[12.5px] ${on ? 'text-[rgba(241,240,233,.6)]' : 'text-[var(--caes-mut)]'}`}
                            >
                                {o.hint}
                            </span>
                        </span>
                    </button>
                )
            })}
        </div>
    )
}
