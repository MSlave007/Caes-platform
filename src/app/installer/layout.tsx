'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FolderOpen, LogOut, Plus, User, UserCog, Users } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const NAV = [
    { href: '/installer/dashboard', label: 'Expedientes', Icon: FolderOpen },
    { href: '/installer/documentos', label: 'Nuevo', Icon: Plus },
    // Le schede dei suoi clienti: si creano da sole inviando un
    // espediente, e servono a rispondere quando il cliente chiama.
    { href: '/installer/clientes', label: 'Clientes', Icon: Users },
    { href: '/installer/profile', label: 'Perfil', Icon: User },
    { href: '/installer/cuenta', label: 'Mi cuenta', Icon: UserCog },
]

/**
 * Guscio dell'area installatore.
 *
 * Su desktop la navigazione sta in una pillola in alto, come sulla landing:
 * l'installatore passa dal sito all'applicazione senza sentire il salto.
 * Su telefono scende in basso, dove arriva il pollice — è lì che si usa
 * davvero, in piedi in un cantiere.
 */
export default function InstallerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()
    const [email, setEmail] = useState<string | null>(null)

    useEffect(() => {
        supabase.auth
            .getUser()
            .then(({ data }) => setEmail(data.user?.email ?? null))
            .catch(() => setEmail(null))
    }, [supabase])

    const logout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-[var(--caes-paper)] pb-24 font-sans text-[var(--caes-ink)] md:pb-0">
            <header className="sticky top-0 z-40 border-b border-[var(--caes-line)] bg-[var(--caes-paper)]/90 backdrop-blur-md">
                <div className="mx-auto flex max-w-[var(--caes-ancho)] items-center justify-between gap-6 px-6 py-4 sm:px-10">
                    <Link
                        href="/installer/dashboard"
                        className="flex items-center gap-2.5"
                        aria-label="CAES"
                    >
                        <span className="relative block h-[18px] w-[18px] rounded-[3px] bg-[var(--caes-ink)]">
                            <span className="absolute bottom-[4px] left-[4px] block h-[6px] w-[6px] rounded-[1px] bg-[var(--caes-lime)]" />
                        </span>
                        <span className="font-mono text-[14px] font-medium tracking-[.15em]">
                            CAES
                        </span>
                    </Link>

                    {/* navigazione desktop */}
                    <nav className="hidden items-center gap-1 rounded-full border border-[var(--caes-line)] bg-[var(--caes-panel)] p-1 md:flex">
                        {NAV.map(({ href, label, Icon }) => {
                            const active = pathname.startsWith(href)
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    className="relative flex items-center gap-2 rounded-full px-4 py-2 text-[13.5px] transition-colors"
                                >
                                    {active && (
                                        <motion.span
                                            layoutId="installer-nav"
                                            className="absolute inset-0 rounded-full bg-[var(--caes-ink)]"
                                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                        />
                                    )}
                                    <span
                                        className={`relative flex items-center gap-2 ${active
                                                ? 'font-medium text-[var(--caes-paper)]'
                                                : 'text-[var(--caes-mut)]'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" strokeWidth={1.7} />
                                        {label}
                                    </span>
                                </Link>
                            )
                        })}
                    </nav>

                    <div className="flex items-center gap-4">
                        <span className="hidden text-[13px] text-[var(--caes-faint)] lg:block">
                            {email ?? '—'}
                        </span>
                        <button
                            type="button"
                            onClick={logout}
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--caes-line)] px-4 py-2 text-[13px] text-[var(--caes-mut)] transition-colors hover:border-[var(--caes-ink)]/40 hover:text-[var(--caes-ink)]"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-[var(--caes-ancho)] px-6 py-10 sm:px-10 sm:py-14">
                {children}
            </main>

            {/* navigazione telefono, dove arriva il pollice */}
            <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--caes-line)] bg-[var(--caes-panel)]/95 backdrop-blur-md md:hidden">
                <div className="flex items-stretch">
                    {NAV.map(({ href, label, Icon }) => {
                        const active = pathname.startsWith(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10.5px] font-medium transition-colors ${active ? 'text-[var(--caes-ink)]' : 'text-[var(--caes-faint)]'
                                    }`}
                            >
                                <span className="relative">
                                    <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
                                    {active && (
                                        <motion.span
                                            layoutId="installer-nav-mobile"
                                            className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--caes-green)]"
                                        />
                                    )}
                                </span>
                                {label}
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}
