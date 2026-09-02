'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { EASE } from './motion'
import type { ConsumerDict } from '@/lib/i18n/consumer'
import { LOCALES, type Locale } from '@/lib/i18n/landing'

/**
 * Sull'hero scuro la barra è trasparente e chiara; appena si scende
 * diventa la pillola su carta. Due stati, una transizione sola.
 */
export default function Nav({
    dict,
    locale,
}: {
    dict: ConsumerDict
    locale: Locale
}) {
    const reduce = useReducedMotion()
    const [solid, setSolid] = useState(false)
    const other: Locale = locale === 'es' ? 'en' : 'es'

    useEffect(() => {
        const onScroll = () => setSolid(window.scrollY > 90)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    const ink = solid ? 'var(--caes-ink)' : '#F1F0E9'
    const muted = solid ? 'var(--caes-mut)' : 'rgba(241,240,233,.72)'

    return (
        <header className="fixed inset-x-0 top-0 z-50 px-4 pt-5">
            <motion.nav
                initial={reduce ? false : { y: -18, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.7, ease: EASE }}
                className="mx-auto flex max-w-fit items-center gap-6 rounded-full py-[7px] pl-6 pr-[7px] backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-500"
                style={{
                    backgroundColor: solid ? 'rgba(253,253,250,.88)' : 'rgba(255,255,255,.06)',
                    border: `1px solid ${solid ? 'var(--caes-line)' : 'rgba(255,255,255,.14)'}`,
                    boxShadow: solid
                        ? '0 1px 2px rgba(6,35,26,.04),0 10px 30px -18px rgba(6,35,26,.3)'
                        : 'none',
                }}
            >
                <Link href={`/${locale}`} aria-label="CAES" className="flex items-center gap-2.5">
                    <span
                        className="relative block h-[18px] w-[18px] rounded-[3px] transition-colors duration-500"
                        style={{ backgroundColor: ink }}
                    >
                        <span className="absolute bottom-[4px] left-[4px] block h-[6px] w-[6px] rounded-[1px] bg-[var(--caes-lime)]" />
                    </span>
                    <span
                        className="font-mono text-[14px] font-medium tracking-[.15em] transition-colors duration-500"
                        style={{ color: ink }}
                    >
                        CAES
                    </span>
                </Link>

                <div
                    className="hidden items-center gap-6 text-[13px] transition-colors duration-500 md:flex"
                    style={{ color: muted }}
                >
                    <a href="#como-funciona" className="hover:opacity-70">
                        {dict.nav.how}
                    </a>
                    <a href="#preguntas" className="hover:opacity-70">
                        {dict.nav.faq}
                    </a>
                    <Link href={`/${locale}/instaladores`} className="hover:opacity-70">
                        {dict.nav.installers}
                    </Link>
                </div>

                {/* L'accesso non stava da nessuna parte: senza questo, chi ha
                    già un account non ha modo di entrare dalla landing. */}
                <Link
                    href="/login"
                    className="text-[13px] font-medium transition-colors duration-500 hover:opacity-70"
                    style={{ color: ink }}
                >
                    {dict.nav.login}
                </Link>

                <a
                    href="#calculadora"
                    className="rounded-full px-[18px] py-2 text-[13px] font-semibold transition-colors duration-500"
                    style={{
                        backgroundColor: solid ? 'var(--caes-ink)' : 'var(--caes-lime)',
                        color: solid ? 'var(--caes-paper)' : 'var(--caes-lime-ink)',
                    }}
                >
                    {dict.nav.cta}
                </a>

                <span
                    className="hidden pl-4 pr-1 font-mono text-[10.5px] tracking-[.1em] transition-colors duration-500 sm:block"
                    style={{
                        color: muted,
                        borderLeft: `1px solid ${solid ? 'var(--caes-line)' : 'rgba(255,255,255,.14)'}`,
                    }}
                >
                    {LOCALES.map((l, i) => (
                        <span key={l}>
                            {i > 0 && ' · '}
                            {l === locale ? (
                                <span style={{ color: ink, fontWeight: 500 }}>
                                    {l.toUpperCase()}
                                </span>
                            ) : (
                                <Link href={`/${other}`} className="hover:opacity-70">
                                    {l.toUpperCase()}
                                </Link>
                            )}
                        </span>
                    ))}
                </span>
            </motion.nav>
        </header>
    )
}
