'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, ArrowLeft, Check, Loader2 } from 'lucide-react'
import AuthShell, {
    Field,
    PrimaryButton,
    inputClass,
} from '@/components/auth/AuthShell'
import { image } from '@/lib/landing-images.client'

/**
 * Recuperare la password.
 *
 * ── PERCHÉ ESISTE ADESSO ──────────────────────────────────────────────
 *
 * La pagina di accesso aveva già «¿La has olvidado?» e puntava a
 * /forgot-password, che era 404. Chi perdeva la password restava fuori
 * e l'unica strada era scrivere a qualcuno. Per un installatore che
 * entra una volta al mese è lo scenario normale, non il caso raro.
 *
 * ── PERCHÉ NON DICE SE L'INDIRIZZO ESISTE ─────────────────────────────
 *
 * La risposta è la stessa sia che l'account ci sia sia che non ci sia.
 * Dire «questo correo no está registrado» regala a chiunque un modo per
 * scoprire chi ha un account: si provano gli indirizzi e si guarda quale
 * risponde diverso. Costa una frase leggermente più vaga e toglie un
 * modo di fare un elenco dei vostri installatori.
 */
export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [enviado, setEnviado] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const supabase = createClient()

    const enviar = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
                // Dove atterra chi clicca il link della email.
                redirectTo: `${window.location.origin}/reset-password`,
            })
            // Un errore di rete si dice; uno di «non esiste» no — vedi sopra.
            if (error && !/user|not found|invalid/i.test(error.message)) throw error
            setEnviado(true)
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se ha podido enviar el correo. Inténtalo de nuevo.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <AuthShell
            eyebrow="Acceso"
            title="Volver a"
            accent="entrar."
            sub="Te mandamos un enlace para poner una contraseña nueva. Vale una vez y caduca en una hora."
            photo={image('terrace')}
            aside={{
                quote: 'Perder la contraseña no debería costarte una llamada.',
                caption:
                    'El enlace llega al correo de la cuenta, vale una sola vez y caduca en una hora. Nadie más puede usarlo.',
            }}
        >
            {enviado ? (
                <div className="flex flex-col gap-6">
                    <div className="flex gap-4 rounded-2xl border border-[var(--caes-green)]/35 bg-[var(--caes-green)]/[.05] p-5">
                        <span className="mt-px flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--caes-green)] text-white">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </span>
                        <div>
                            <p className="text-[14.5px] font-semibold text-[var(--caes-ink)]">
                                Si ese correo tiene cuenta, ya está enviado
                            </p>
                            <p className="mt-1.5 max-w-[46ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                                Mira la bandeja de <b>{email.trim()}</b>. El enlace vale una
                                vez y caduca en una hora. Si no llega en unos minutos,
                                mira en spam.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/login"
                        className="group inline-flex items-center gap-2.5 text-[14px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                        Volver a entrar
                    </Link>
                </div>
            ) : (
                <form onSubmit={enviar} className="flex flex-col gap-6">
                    <Field label="Tu correo">
                        <input
                            type="email"
                            required
                            autoFocus
                            autoComplete="email"
                            className={inputClass}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="tu@empresa.es"
                        />
                    </Field>

                    {error && (
                        <p
                            role="alert"
                            className="flex items-start gap-2.5 rounded-xl border border-[var(--caes-falta)] bg-[var(--caes-falta-bg)] px-4 py-3 text-[13.5px] leading-[1.5] text-[var(--caes-falta-deep)]"
                        >
                            <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                            {error}
                        </p>
                    )}

                    <PrimaryButton type="submit" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando…
                            </>
                        ) : (
                            'Mandar el enlace'
                        )}
                    </PrimaryButton>

                    <Link
                        href="/login"
                        className="group inline-flex items-center gap-2.5 text-[14px] text-[var(--caes-mut)] transition-colors hover:text-[var(--caes-ink)]"
                    >
                        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
                        Me acuerdo, volver a entrar
                    </Link>
                </form>
            )}
        </AuthShell>
    )
}
