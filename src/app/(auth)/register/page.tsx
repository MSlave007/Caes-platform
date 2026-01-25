'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, Loader2, CheckCircle2, Eye, EyeOff, Building2, Wrench } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function RegisterPage() {
    const searchParams = useSearchParams()
    const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'installer'

    // Form State
    const [role, setRole] = useState<'installer' | 'admin'>(initialRole)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [phone, setPhone] = useState('')

    // UI State
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    // Sync role with URL param if it changes
    useEffect(() => {
        const paramRole = searchParams.get('role')
        if (paramRole === 'admin' || paramRole === 'installer') {
            setRole(paramRole)
        }
    }, [searchParams])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${location.origin}/api/auth/callback`,
                    data: {
                        full_name: fullName,
                        phone: phone,
                        role: role
                    }
                }
            })

            if (error) {
                if (error.message.includes('User already registered')) {
                    throw new Error('This email is already registered. Please login.')
                }
                throw error
            }

            setSuccess(true)
        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Failed to register')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="flex min-h-screen bg-slate-50">
                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">Check your inbox!</h1>
                        <p className="text-slate-500 text-lg leading-relaxed">
                            We've sent a verification link to <span className="font-semibold text-slate-900">{email}</span>.
                            <br />Please confirm your account to continue.
                        </p>
                        <Button asChild className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 text-base">
                            <Link href="/login">Back to Login</Link>
                        </Button>
                    </div>
                </main>
            </div>
        )
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
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Join the Network</h1>
                        <p className="text-slate-500 text-lg">Register to start managing your certificates.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-6">
                        {/* ROLE SELECTOR */}
                        <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
                            <button
                                type="button"
                                onClick={() => setRole('installer')}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${role === 'installer'
                                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Wrench className="h-4 w-4" /> Installer
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('admin')}
                                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${role === 'admin'
                                        ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-200'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                <Building2 className="h-4 w-4" /> Project Manager
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="fullname" className="text-slate-700 font-semibold">Full Name / Company</Label>
                                <Input
                                    id="fullname"
                                    placeholder={role === 'installer' ? "Acme Solar Installations" : "John Doe"}
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-700 font-semibold">Work Email</Label>
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
                                <Label htmlFor="phone" className="text-slate-700 font-semibold">Phone Number</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="+34 600 000 000"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="h-12 rounded-xl bg-slate-50 border-slate-200 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-700 font-semibold">Password</Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Min. 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
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
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3">
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
                                    Creating account...
                                </>
                            ) : (
                                'Get Started'
                            )}
                        </Button>

                        <p className="text-center text-sm text-slate-500 font-medium">
                            Already have an account? <Link href="/login" className="text-emerald-700 hover:underline">Log in</Link>
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
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-emerald-50 font-medium mb-6">
                            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                            Trusted by 500+ professionals
                        </div>
                        <h2 className="text-5xl font-bold text-white mb-6 leading-tight">
                            Empowering your <br /> <span className="text-emerald-400">Green Business</span>
                        </h2>
                        <p className="text-emerald-100/80 text-lg leading-relaxed">
                            Join the platform that simplifies regulatory compliance and maximizes your earnings from day one.
                        </p>
                    </motion.div>

                    {/* Mock Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-3xl text-left max-w-sm mx-auto transform rotate-[-2deg] hover:rotate-0 transition-transform duration-500"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl">
                                MA
                            </div>
                            <div>
                                <div className="text-white font-bold">Miguel Angel</div>
                                <div className="text-emerald-200 text-sm">HVAC Installer</div>
                            </div>
                        </div>
                        <p className="text-white/90 italic text-sm">
                            "I used to spend hours on paperwork. Now I just take a photo and get paid. It's magic."
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}
