'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react'

const MINIMO = 8

/**
 * Cambiare password e indirizzo email dal proprio profilo.
 *
 * ── PERCHÉ DAL BROWSER E NON DA UNA ROTTA NOSTRA ──────────────────────
 *
 * Le due cose si fanno con `supabase.auth.updateUser`, che agisce sulla
 * sessione viva di chi sta guardando. Una rotta nostra che cambia la
 * password di un id sarebbe una rotta che, se un giorno perde un
 * controllo, regala gli account. Qui l'id non esiste: c'è la sessione,
 * e la sessione è per definizione di chi la possiede.
 *
 * ── PERCHÉ L'EMAIL NON CAMBIA SUBITO ──────────────────────────────────
 *
 * Supabase manda un messaggio al vecchio indirizzo E al nuovo, e il
 * cambio avviene solo quando si conferma. Non è un intoppo: se qualcuno
 * entrasse nella sessione di un altro, cambiare l'email sarebbe il
 * primo passo per chiuderlo fuori per sempre. La conferma sul vecchio
 * indirizzo è quello che glielo impedisce.
 */
export default function Seguridad({ email }: { email: string | null }) {
    const supabase = createClient()

    const [nuevoCorreo, setNuevoCorreo] = useState('')
    const [correoEnviado, setCorreoEnviado] = useState(false)
    const [correoError, setCorreoError] = useState<string | null>(null)
    const [correoOcupado, setCorreoOcupado] = useState(false)

    const [pass, setPass] = useState('')
    const [pass2, setPass2] = useState('')
    const [ver, setVer] = useState(false)
    const [passHecho, setPassHecho] = useState(false)
    const [passError, setPassError] = useState<string | null>(null)
    const [passOcupado, setPassOcupado] = useState(false)

    const cambiarCorreo = async (e: React.FormEvent) => {
        e.preventDefault()
        setCorreoOcupado(true)
        setCorreoError(null)
        setCorreoEnviado(false)
        try {
            const { error } = await supabase.auth.updateUser({
                email: nuevoCorreo.trim(),
            })
            if (error) throw error
            setCorreoEnviado(true)
            setNuevoCorreo('')
        } catch (err) {
            setCorreoError(
                err instanceof Error ? err.message : 'No se ha podido cambiar'
            )
        } finally {
            setCorreoOcupado(false)
        }
    }

    const cambiarPass = async (e: React.FormEvent) => {
        e.preventDefault()
        setPassError(null)
        setPassHecho(false)

        if (pass.length < MINIMO) {
            setPassError(`Tiene que tener al menos ${MINIMO} caracteres.`)
            return
        }
        if (pass !== pass2) {
            setPassError('Las dos no coinciden.')
            return
        }

        setPassOcupado(true)
        try {
            const { error } = await supabase.auth.updateUser({ password: pass })
            if (error) throw error
            setPassHecho(true)
            setPass('')
            setPass2('')
        } catch (err) {
            setPassError(
                err instanceof Error ? err.message : 'No se ha podido cambiar'
            )
        } finally {
            setPassOcupado(false)
        }
    }

    const campo =
        'w-full rounded-xl border border-[var(--caes-line)] bg-[var(--caes-paper)] px-4 py-3 text-[14.5px] text-[var(--caes-ink)] outline-none transition-colors focus:border-[var(--caes-green)]'
    const etiqueta = 'label-mono block text-[var(--caes-faint)]'

    return (
        <section className="rounded-2xl border border-[var(--caes-line)] bg-[var(--caes-panel)] p-7">
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                Acceso y seguridad
            </h2>
            <p className="mt-2 max-w-[56ch] text-[13.5px] leading-[1.55] text-[var(--caes-mut)]">
                Con lo que entras. Si cambias el correo, te lo pedimos confirmar en
                el antiguo y en el nuevo.
            </p>

            {/* ------------------------------------------------- il correo */}
            <form onSubmit={cambiarCorreo} className="mt-7">
                <label htmlFor="correo-actual" className={etiqueta}>
                    Correo actual
                </label>
                <input
                    id="correo-actual"
                    readOnly
                    value={email ?? ''}
                    className={`${campo} mt-2 cursor-not-allowed opacity-60`}
                />

                <label htmlFor="correo-nuevo" className={`${etiqueta} mt-5`}>
                    Cambiarlo por
                </label>
                <div className="mt-2 flex flex-wrap gap-2.5">
                    <input
                        id="correo-nuevo"
                        type="email"
                        value={nuevoCorreo}
                        onChange={(e) => setNuevoCorreo(e.target.value)}
                        placeholder="nuevo@empresa.es"
                        className={`${campo} flex-1`}
                    />
                    <button
                        type="submit"
                        disabled={correoOcupado || nuevoCorreo.trim().length < 5}
                        className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[var(--caes-ink)] px-5 py-3 text-[14px] font-medium text-[var(--caes-ink)] transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                        {correoOcupado && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Cambiar correo
                    </button>
                </div>

                {correoEnviado && (
                    <p className="mt-3 flex items-start gap-2 text-[13px] leading-[1.5] text-[var(--caes-green)]">
                        <Check className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                        Te hemos mandado un correo a las dos direcciones. Hasta que no
                        confirmes, sigues entrando con la de siempre.
                    </p>
                )}
                {correoError && (
                    <p className="mt-3 flex items-start gap-2 text-[13px] leading-[1.5] text-[var(--caes-bloqueo-ink)]">
                        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                        {correoError}
                    </p>
                )}
            </form>

            {/* ---------------------------------------------- la password */}
            <form
                onSubmit={cambiarPass}
                className="mt-8 border-t border-[var(--caes-line-2)] pt-7"
            >
                <label htmlFor="pass-nueva" className={etiqueta}>
                    Contraseña nueva
                </label>
                <div className="relative mt-2">
                    <input
                        id="pass-nueva"
                        type={ver ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                        className={campo}
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

                <label htmlFor="pass-repetida" className={`${etiqueta} mt-5`}>
                    Repítela
                </label>
                <input
                    id="pass-repetida"
                    type={ver ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={pass2}
                    onChange={(e) => setPass2(e.target.value)}
                    className={`${campo} mt-2`}
                />

                <div className="mt-5 flex flex-wrap items-center gap-4">
                    <button
                        type="submit"
                        disabled={passOcupado || pass.length === 0}
                        className="inline-flex items-center gap-2 rounded-xl border border-[var(--caes-ink)] px-5 py-3 text-[14px] font-medium text-[var(--caes-ink)] transition-colors hover:bg-[var(--caes-ink)] hover:text-[var(--caes-paper)] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                        {passOcupado && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Cambiar contraseña
                    </button>
                    <span className="text-[12.5px] text-[var(--caes-faint)]">
                        Mínimo {MINIMO} caracteres.
                    </span>
                </div>

                {passHecho && (
                    <p className="mt-3 flex items-start gap-2 text-[13px] text-[var(--caes-green)]">
                        <Check className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={3} />
                        Cambiada. La próxima vez entra con esta.
                    </p>
                )}
                {passError && (
                    <p className="mt-3 flex items-start gap-2 text-[13px] text-[var(--caes-bloqueo-ink)]">
                        <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                        {passError}
                    </p>
                )}
            </form>
        </section>
    )
}
