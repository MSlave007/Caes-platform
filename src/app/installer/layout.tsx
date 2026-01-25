'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlusCircle, Settings, FileText, Menu, LogOut, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { createClient } from '@/lib/auth/supabaseClient'
import { useRouter } from 'next/navigation'

export default function InstallerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const navItems = [
        { href: '/installer/dashboard', label: 'My Projects', icon: Home },
        { href: '/installer/project/new', label: 'New Project', icon: PlusCircle },
        { href: '/installer/profile', label: 'Profile', icon: Settings },
    ]

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0 font-sans">
            {/* Top Header (Mobile & Desktop) */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4 md:px-6">
                <div className="font-bold text-lg tracking-tight flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                        <FileText className="h-5 w-5" />
                    </div>
                    CAES Installer
                </div>

                {/* Desktop Logout */}
                <div className="hidden md:flex items-center gap-4">
                    <span className="text-sm text-slate-400">marco@installer.com</span>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>

                {/* Mobile Menu Toggle (if needed for extra options) */}
                <button className="md:hidden text-slate-400" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </header>

            {/* Main Content Area */}
            <main className="pt-20 px-4 md:px-8 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
                {children}
            </main>

            {/* Bottom Navigation (Mobile Only) */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-50 flex items-center justify-around px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-emerald-500' : 'text-slate-400'
                                }`}
                        >
                            <Icon className={`h-6 w-6 ${isActive ? 'fill-current/20' : ''}`} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* Mobile Drawer/Menu (Optional overlay) */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 bg-slate-950/90 backdrop-blur-sm pt-20 px-6 md:hidden">
                    <div className="flex flex-col gap-4">
                        <div className="p-4 bg-slate-900 rounded-lg border border-slate-800">
                            <p className="text-sm text-slate-400 label">Signed in as</p>
                            <p className="font-medium">marco@installer.com</p>
                        </div>
                        <Button variant="destructive" className="w-full justify-start" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
