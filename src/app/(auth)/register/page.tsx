'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import {
    AlertCircle,
    ArrowRight,
    CheckCircle2,
    Eye,
    EyeOff,
    Home,
    Loader2,
    Wrench,
} from 'lucide-react'
import AuthShell, {
    Field,
    PrimaryButton,
    RoleToggle,
    inputClass,
} from '@/components/auth/AuthShell'
import { image } from '@/lib/landing-images.client'

type Role = 'installer' | 'admin'

function RegisterForm() {
    const searchParams = useSearchParams()
    const initialRole: Role =
        searchParams.get('role') === 'admin' ? 'admin' : 'installer'

    const [role, setRole] = useState<Role>(initialRole)
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        const paramRole = searchParams.get('role')
        if (paramRole === 'admin' || paramRole === 'installer') setRole(paramRole)
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
                    data: {
                        full_name: fullName,
                        phone,
                        role,
                    },
                },
            })
            if (error) throw error
            setSuccess(true)
        } catch (err: unknown) {
            console.error(err)
            setError(err instanceof Error ? err.message : 'No se ha podido crear la cuenta')
        } finally {
            setLoading(false)
        }
    }

    /* ------------------------------------------------ conferma via email */
    if (success) {
        return (
            <AuthShell
                eyebrow="Cuenta creada"
                title="Revisa tu"
                accent="correo."
                sub={`Hemos enviado un enlace de confirmación a ${email}. Ábrelo desde este mismo dispositivo y ya podrás entrar.`}
                photo={image('dusk')}
                aside={{
                    quote: 'Un paso menos entre tú y el certificado.',
                    caption:
                        'Si el correo no llega en unos minutos, mira en la carpeta de spam antes de volver a intentarlo.',
                }}
            >
                <div className="flex flex-col gap-6">
                    <div className="flex items-start gap-3.5 rounded-xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-5">
                        <CheckCircle2 className="mt-[2px] h-5 w-5 shrink-0 text-[var(--caes-green)]" />
                        <p className="text-[14px] leading-[1.6] text-[var(--caes-mut)]">
                            El enlace caduca en 24 horas. Hasta que lo abras, la cuenta
                            queda sin activar y no se puede usar.
                        </p>
                    </div>
                    <PrimaryButton type="button" onClick={() => router.push('/login')}>
                        Ir al acceso
                        <ArrowRight className="h-4 w-4" />
                    </PrimaryButton>
                </div>
            </AuthShell>
        )
    }

    /* ---------------------------------------------------------- modulo */
    return (
        <AuthShell
            eyebrow="Solicitar acceso"
            title="Crea tu"
            accent="cuenta."
            sub="Dinos quién eres y te damos acceso. Sin permanencia y sin coste de alta."
            photo={image('neighbourhood')}
            aside={{
                quote: 'De dos horas por expediente a quince minutos.',
                caption:
                    'La IA lee las facturas, el motor comprueba la normativa y el contrato sale con el reparto ya aplicado.',
            }}
            footer={
                <span>
                    ¿Ya tienes cuenta?{' '}
                    <Link
                        href="/login"
                        className="font-medium text-[var(--caes-ink)] underline-offset-4 hover:underline"
                    >
                        Entrar
                    </Link>
                </span>
            }
        >
            <form onSubmit={handleRegister} className="flex flex-col gap-6">
                <div>
                    <span className="mb-3 block text-[13.5px] font-medium text-[var(--caes-ink)]">
                        ¿Qué eres?
                    </span>
                    <RoleToggle<Role>
                        value={role}
                        onChange={setRole}
                        options={[
                            {
                                value: 'installer',
                                label: 'Instalador',
                                hint: 'Monto equipos',
                                Icon: Wrench,
                            },
                            {
                                value: 'admin',
                                label: 'Agencia',
                                hint: 'Reviso expedientes',
                                Icon: Home,
                            },
                        ]}
                    />
                </div>

                <Field
                    label={role === 'installer' ? 'Nombre de la empresa' : 'Nombre y apellidos'}
                >
                    <input
                        type="text"
                        autoComplete="organization"
                        placeholder={
                            role === 'installer' ? 'Clima Levante S.L.' : 'María García'
                        }
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className={inputClass}
                    />
                </Field>

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

                <Field label="Teléfono" hint="Solo para avisarte cuando se aprueba un expediente.">
                    <input
                        type="tel"
                        autoComplete="tel"
                        placeholder="600 000 000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                    />
                </Field>

                <Field label="Contraseña" hint="Mínimo ocho caracteres.">
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="new-password"
                            placeholder="••••••••"
                            minLength={8}
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
                            Creando la cuenta…
                        </>
                    ) : (
                        <>
                            Crear cuenta
                            <ArrowRight className="h-4 w-4" />
                        </>
                    )}
                </PrimaryButton>
            </form>
        </AuthShell>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[var(--caes-paper)]" />}>
            <RegisterForm />
        </Suspense>
    )
}
