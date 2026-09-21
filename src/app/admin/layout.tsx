'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Gauge, Inbox, LogOut, Settings, Sparkles, UserCog, Users, Wrench } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

const NAV = [
    { href: '/admin/dashboard', label: 'Resumen', Icon: Gauge },
    { href: '/admin/leads', label: 'Leads', Icon: Sparkles },
    { href: '/admin/review', label: 'Revisión', Icon: Inbox },
    { href: '/admin/projects', label: 'Expedientes', Icon: Wrench },
    { href: '/admin/installers', label: 'Instaladores', Icon: Users },
    { href: '/admin/settings', label: 'Ajustes', Icon: Settings },
    // La propria utenza, non quella dell'agenzia: password, correo,
    // foto. Stessa pagina per tutti e due i ruoli.
    { href: '/cuenta', label: 'Mi cuenta', Icon: UserCog },
]

/**
 * Guscio dell'area agenzia.
 *
 * Qui, a differenza del lato installatore, si sta seduti davanti a uno
 * schermo grande e si lavora a lungo: colonna laterale fissa, densità
 * maggiore, niente animazioni che rallentino il lavoro ripetitivo.
 */
export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const logout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    return (
        <div className="min-h-screen bg-[var(--caes-paper)] font-sans text-[var(--caes-ink)]">
            {/* colonna laterale */}
            <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[var(--caes-line)] bg-[var(--caes-panel)] lg:flex">
                <div className="px-7 py-7">
                    <Link href="/admin/dashboard" className="flex items-center gap-2.5">
                        <span className="relative block h-[18px] w-[18px] rounded-[3px] bg-[var(--caes-ink)]">
                            <span className="absolute bottom-[4px] left-[4px] block h-[6px] w-[6px] rounded-[1px] bg-[var(--caes-lime)]" />
                        </span>
                        <span className="font-mono text-[14px] font-medium tracking-[.15em]">
                            CAES
                        </span>
                        <span className="ml-1 rounded-full bg-[var(--caes-band)] px-2.5 py-1 text-[10.5px] text-[var(--caes-mut)]">
                            Agencia
                        </span>
                    </Link>
                </div>

                <nav className="flex flex-1 flex-col gap-1 px-4">
                    {NAV.map(({ href, label, Icon }) => {
                        const active = pathname.startsWith(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                className="relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] transition-colors"
                            >
                                {active && (
                                    <motion.span
                                        layoutId="admin-nav"
                                        className="absolute inset-0 rounded-xl bg-[var(--caes-ink)]"
                                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    />
                                )}
                                <span
                                    className={`relative flex items-center gap-3 ${active
                                            ? 'font-medium text-[var(--caes-paper)]'
                                            : 'text-[var(--caes-mut)]'
                                        }`}
                                >
                                    <Icon className="h-[17px] w-[17px]" strokeWidth={1.7} />
                                    {label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="border-t border-[var(--caes-line)] p-4">
                    <button
                        type="button"
                        onClick={logout}
                        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] text-[var(--caes-mut)] transition-colors hover:bg-[var(--caes-band)] hover:text-[var(--caes-ink)]"
                    >
                        <LogOut className="h-[17px] w-[17px]" strokeWidth={1.7} />
                        Salir
                    </button>
                </div>
            </aside>

            {/* barra su schermi stretti */}
            <div className="sticky top-0 z-40 border-b border-[var(--caes-line)] bg-[var(--caes-paper)]/92 backdrop-blur-md lg:hidden">
                <div className="flex items-center gap-1 overflow-x-auto px-4 py-3">
                    {NAV.map(({ href, label, Icon }) => {
                        const active = pathname.startsWith(href)
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[13px] transition-colors ${active
                                        ? 'bg-[var(--caes-ink)] font-medium text-[var(--caes-paper)]'
                                        : 'text-[var(--caes-mut)]'
                                    }`}
                            >
                                <Icon className="h-4 w-4" strokeWidth={1.7} />
                                {label}
                            </Link>
                        )
                    })}
                </div>
            </div>

            <main className="px-6 py-10 sm:px-10 lg:ml-[248px] lg:px-12 lg:py-12">
                <div className="mx-auto max-w-[1140px]">{children}</div>
            </main>
        </div>
    )
}
