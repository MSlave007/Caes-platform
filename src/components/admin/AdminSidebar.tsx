'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CheckSquare, List, Settings, LogOut, Shield, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/auth/supabaseClient'
import { useRouter } from 'next/navigation'

export function AdminSidebar() {
    const pathname = usePathname()
    const router = useRouter()
    const supabase = createClient()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const navItems = [
        { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/admin/review', label: 'Review Queue', icon: CheckSquare, badge: 5 },
        { href: '/admin/projects', label: 'All Projects', icon: List },
        { href: '/admin/installers', label: 'Installers', icon: Users },
        { href: '/admin/settings', label: 'Settings', icon: Settings },
    ]

    return (
        <div className="w-64 h-screen bg-sidebar border-r border-border flex flex-col fixed left-0 top-0 z-50">
            {/* Brand */}
            <div className="h-16 flex items-center px-6 border-b border-border">
                <div className="font-bold text-lg tracking-tight flex items-center gap-2 text-foreground">
                    <div className="h-8 w-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                        <Shield className="h-5 w-5" />
                    </div>
                    CAES Admin
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    const Icon = item.icon
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <Icon className="h-4 w-4" />
                                {item.label}
                            </div>
                            {item.badge && (
                                <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-border">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="h-8 w-8 rounded-full bg-muted border border-border"></div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-medium text-foreground truncate">Admin User</p>
                        <p className="text-xs text-muted-foreground truncate">admin@caes.com</p>
                    </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-900">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                </Button>
            </div>
        </div>
    )
}
