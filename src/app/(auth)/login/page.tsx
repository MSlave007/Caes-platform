'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff, Building2 } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const router = useRouter()
    const searchParams = useSearchParams()
    const supabase = createClient()
    const redirectUrl = searchParams.get('redirect')

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error, data } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (error) {
                // Friendly error messages
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please try again.')
                }
                throw error
            }

            // --- REDIRECT LOGIC ---
            // 1. If explicit redirect param is set, go there.
            // 2. Otherwise default to installer dashboard.
            // 3. (Optional) Check user profile role to redirect admin vs installer.

            if (redirectUrl) {
                router.push(redirectUrl)
            } else {
                // Fetch profile role
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single()

                router.refresh()

                if (profile?.role === 'admin') {
                    router.push('/admin/dashboard')
                } else {
                    router.push('/installer/dashboard')
                }
            }

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to login')
            setLoading(false) // Only stop loading on error, on success we want to keep spinner until redirect
        }
    }

    return (
        <div className="flex min-h-screen bg-white">
            {/* LEFT COLUMN: Form */}
            <div className="flex-1 flex flex-col justify-center px-4 sm:px-12 lg:px-24 xl:px-32 py-12 relative z-10 bg-white">
                <Link href="/" className="absolute top-8 left-8 sm:left-12 flex items-center gap-2 font-bold text-xl tracking-tight text-slate-900">
                    <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                        <Building2 className="h-4 w-4" />
                    </div>
                    CAES
                </Link>

                <div className="max-w-md w-full mx-auto space-y-10">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Welcome Back</h1>
                        <p className="text-slate-500 text-lg">Log in to manage your energy certificates.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 font-semibold">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
                                    <Link href="#" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline">
                                        Forgot password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium pr-10"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <AlertCircle className="h-5 w-5 shrink-0" />
                                <span className="font-medium">{error}</span>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-14 bg-[#064e3b] hover:bg-[#065f46] text-white text-lg font-bold rounded-xl shadow-xl shadow-emerald-900/10 transition-all hover:scale-[1.02]"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Log In'
                            )}
                        </Button>

                        <p className="text-center text-sm text-slate-500 font-medium">
                            Don't have an account? <Link href="/register" className="text-emerald-700 hover:underline">Sign up for free</Link>
                        </p>
                    </form>
                </div>
            </div>

            {/* RIGHT COLUMN: Brand/Image */}
            <div className="hidden lg:flex flex-1 bg-[#064e3b] relative overflow-hidden items-center justify-center p-12">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-900/40 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 max-w-lg text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-12"
                    >
                        <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                            Smart tools for <br /> <span className="text-emerald-400">Smart Installers</span>
                        </h2>
                        <p className="text-emerald-100/80 text-lg leading-relaxed">
                            Access your dashboard, track your projects, and generate certificates instantly.
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
