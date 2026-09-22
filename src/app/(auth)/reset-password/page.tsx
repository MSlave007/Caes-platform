'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react'
import AuthShell, {
    Field,
    PrimaryButton,
    inputClass,
} from '@/components/auth/AuthShell'
import { image } from '@/lib/landing-images.client'

/** Sotto questa lunghezza non si accetta. È il minimo di Supabase. */
const MINIMO = 8

/**
 * Dove atterra il link della email: si sceglie la password nuova.
 *
 * ── COME FUNZIONA ─────────────────────────────────────────────────────
 *
 * Il link della email porta qui con un token nell'indirizzo, e la
 * libreria di Supabase lo trasforma in una sessione temporanea. Da lì
 * `updateUser` cambia la password. Se si arriva su questa pagina senza
 * essere passati dalla email, quella sessione non c'è: invece di
 * mostrare un modulo che fallirebbe al momento di salvare, lo si dice
 * subito.
 *
 * ── PERCHÉ SI CHIEDE DUE VOLTE ────────────────────────────────────────
 *
 * Perché non si vede quello che si scrive e non c'è modo di accorgersi
 * di un errore di battitura finché non si prova a entrare — e a quel
 * punto si è chiusi fuori con una password che nessuno conosce.
 */
export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [repetida, setRepetida] = useState('')
    const [ver, setVer] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [listo, setListo] = useState<boolean | null>(null)

    const router = useRouter()
    const supabase = createClient()

    // La sessione temporanea del link arriva in modo asincrono.
    useEffect(() => {
        let vivo = true
        supabase.auth.getSession().then(({ data }) => {
            if (vivo) setListo(Boolean(data.session))
        })
        const { data: sub } = supabase.auth.onAuthStateChange((_e, sesion) => {
            if (vivo && sesion) setListo(true)
        })
        return () => {
            vivo = false
            sub.subscription.unsubscribe()
        }
    }, [supabase])

    const guardar = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password.length < MINIMO) {
            setError(`La contraseña tiene que tener al menos ${MINIMO} caracteres.`)
            return
        }
        if (password !== repetida) {
            setError('Las dos no coinciden. Míralas otra vez.')
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase.auth.updateUser({ password })
            if (error) throw error

            // Si entra direttamente: chi ha appena scelto la password non
            // deve riscriverla dieci secondi dopo.
            const { data } = await supabase.auth.getUser()
            const { data: perfil } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user?.id ?? '')
                .single()

            router.refresh()
            router.push(
                perfil?.role === 'admin' ? '/admin/dashboard' : '/installer/dashboard'
            )
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'No se ha podido cambiar la contraseña.'
            )
            setLoading(false)
        }
    }

    return (
        <AuthShell
            eyebrow="Acceso"
            title="Una contraseña"
            accent="nueva."
            sub="La anterior deja de valer en cuanto guardes esta."
            photo={image('terrace')}
            aside={{
                quote: 'La contraseña la eliges tú, y no la ve nadie.',
                caption:
                    'Ni nosotros: se guarda cifrada. Si algún día alguien te la pide por teléfono, no somos nosotros.',
            }}
        >
            {listo === false ? (
                <div className="flex flex-col gap-6">
                    <p className="flex items-start gap-2.5 rounded-xl border border-[var(--caes-falta)] bg-[var(--caes-falta-bg)] px-4 py-3.5 text-[13.5px] leading-[1.55] text-[var(--caes-falta-deep)]">
                        <AlertCircle className="mt-px h-4 w-4 shrink-0" />
                        Este enlace ya no vale: o ha caducado, o se ha usado antes. Pide
                        uno nuevo, tarda un segundo.
                    </p>
                    <Link
                        href="/forgot-password"
                        className="text-[14px] text-[var(--caes-ink)] underline underline-offset-4"
                    >
                        Pedir otro enlace
                    </Link>
                </div>
            ) : listo === null ? (
                <p className="flex items-center gap-3 text-[14px] text-[var(--caes-mut)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Comprobando el enlace…
                </p>
            ) : (
                <form onSubmit={guardar} className="flex flex-col gap-6">
                    <Field label="Contraseña nueva" hint={`Mínimo ${MINIMO} caracteres.`}>
                        <div className="relative">
                            <input
                                type={ver ? 'text' : 'password'}
                                required
                                autoFocus
                                autoComplete="new-password"
                                className={inputClass}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => setVer((v) => !v)}
                                aria-label={ver ? 'Ocultar' : 'Ver'}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[var(--caes-faint)] transition-colors hover:text-[var(--caes-ink)]"
                            >
                                {ver ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </Field>

                    <Field label="Repítela">
                        <input
                            type={ver ? 'text' : 'password'}
                            required
                            autoComplete="new-password"
                            className={inputClass}
                            value={repetida}
                            onChange={(e) => setRepetida(e.target.value)}
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
                                Guardando…
                            </>
                        ) : (
                            'Guardar y entrar'
                        )}
                    </PrimaryButton>
                </form>
            )}
        </AuthShell>
    )
}
