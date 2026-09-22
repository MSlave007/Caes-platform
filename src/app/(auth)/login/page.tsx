'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react'
import AuthShell, {
    Field,
    PrimaryButton,
    inputClass,
} from '@/components/auth/AuthShell'
import { image } from '@/lib/landing-images.client'

function LoginForm() {
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
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error(
                        'El correo o la contraseña no son correctos. Vuelve a intentarlo.'
                    )
                }
                throw error
            }

            // 1. Se c'è un redirect esplicito, si va lì.
            // 2. Altrimenti si legge il ruolo dal profilo e si smista.
            if (redirectUrl) {
                router.push(redirectUrl)
            } else {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', data.user.id)
                    .single()

                router.refresh()
                router.push(
                    profile?.role === 'admin'
                        ? '/admin/dashboard'
                        : '/installer/dashboard'
                )
            }
        } catch (err: unknown) {
            console.error(err)
            setError(err instanceof Error ? err.message : 'No se ha podido acceder')
            // Sul percorso felice teniamo lo spinner fino al cambio pagina.
            setLoading(false)
        }
    }

    return (
        <AuthShell
            eyebrow="Acceso"
            title="Bienvenido de"
            accent="vuelta."
            sub="Entra para seguir tus expedientes y ver en qué estado está cada uno."
            photo={image('terrace')}
            aside={{
                quote: 'El papeleo ya está hecho. Tú sigue instalando.',
                caption:
                    'Cada expediente guarda las fotos originales, los datos extraídos y la fecha de cada paso. Si un día llega una auditoría, está todo.',
            }}
            footer={
                <span>
                    ¿Todavía no tienes cuenta?{' '}
                    <Link
                        href="/register"
                        className="font-medium text-[var(--caes-ink)] underline-offset-4 hover:underline"
                    >
                        Solicitar acceso
                    </Link>
                </span>
            }
        >
            <form onSubmit={handleLogin} className="flex flex-col gap-5">
                <Field label="Correo electrónico">
                    <input
                        type="email"
                        autoComplete="email"
                        placeholder="nombre@empresa.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className={inputClass}
                    />
                </Field>

                <Field
                    label="Contraseña"
                    right={
                        <Link
                            href="/forgot-password"
                            className="text-[12.5px] text-[var(--caes-mut)] underline-offset-4 hover:text-[var(--caes-ink)] hover:underline"
                        >
                            ¿La has olvidado?
                        </Link>
                    }
                >
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={`${inputClass} pr-12`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={
                                showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-[var(--caes-faint)] transition-colors hover:text-[var(--caes-ink)]"
                        >
                            {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </Field>

                {error && (
                    <p
                        role="alert"
                        className="flex items-start gap-2.5 rounded-xl border border-[var(--caes-falta)] bg-[var(--caes-falta-bg)] px-4 py-3 text-[13.5px] leading-[1.5] text-[var(--caes-falta-deep)]"
                    >
                        <AlertCircle className="mt-[2px] h-4 w-4 shrink-0" />
                        {error}
                    </p>
                )}

                <PrimaryButton type="submit" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Entrando…
                        </>
                    ) : (
                        <>
                            Entrar
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </PrimaryButton>
            </form>
        </AuthShell>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--caes-paper)]" />}>
            <LoginForm />
        </Suspense>
    )
}
